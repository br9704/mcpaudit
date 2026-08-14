import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import type { JsonRpcRequest, JsonObject, RpcResponse } from "../protocol/types.js";
import { isJsonObject } from "../protocol/types.js";
import type { SendOptions, Transport } from "./types.js";

const MAX_RAW_EVIDENCE = 4000;
/** Hard ceiling on a single line from the server, so a hostile server cannot
 * exhaust our memory by never emitting a newline. */
const MAX_LINE_BYTES = 8 * 1024 * 1024;
const MAX_STDERR_BYTES = 64 * 1024;

/**
 * Split a command string into argv, honouring single/double quotes.
 *
 * We deliberately do NOT use `shell: true`: the target string comes from the
 * user's shell already, and re-expanding it would let a crafted server spec run
 * arbitrary shell constructs (`;`, `$(…)`) that the user did not intend.
 */
export function tokenizeCommand(command: string): string[] {
  const argv: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  let started = false;

  for (let i = 0; i < command.length; i++) {
    const ch = command[i]!;
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      started = true;
      continue;
    }
    if (ch === " " || ch === "\t") {
      if (started || current.length > 0) argv.push(current);
      current = "";
      started = false;
      continue;
    }
    current += ch;
  }
  if (started || current.length > 0) argv.push(current);
  return argv;
}

interface Pending {
  resolve: (r: RpcResponse) => void;
  startedAt: number;
  notifications: JsonObject[];
  timer: NodeJS.Timeout;
}

/**
 * stdio transport: newline-delimited JSON-RPC over a child process's stdio.
 *
 * This is the differentiator — the official conformance suite cannot drive
 * stdio servers at all (its `server` subcommand only accepts `--url`).
 */
export class StdioTransport implements Transport {
  readonly kind = "stdio" as const;
  readonly describe: string;

  #child: ChildProcessWithoutNullStreams;
  #buffer = "";
  #stderr = "";
  #pending = new Map<string | number, Pending>();
  #closed = false;
  #exit?: { code: number | null; signal: NodeJS.Signals | null };

  constructor(command: string, extraArgs: readonly string[] = []) {
    const argv = tokenizeCommand(command);
    const bin = argv[0];
    if (!bin) throw new Error(`empty stdio command: "${command}"`);
    const args = [...argv.slice(1), ...extraArgs];
    this.describe = [bin, ...args].join(" ");

    this.#child = spawn(bin, args, {
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
      env: process.env,
    }) as ChildProcessWithoutNullStreams;

    this.#child.stdout.setEncoding("utf8");
    this.#child.stdout.on("data", (chunk: string) => this.#onStdout(chunk));

    this.#child.stderr.setEncoding("utf8");
    this.#child.stderr.on("data", (chunk: string) => {
      // Captured for evidence only. Spec: clients SHOULD NOT assume stderr
      // output indicates an error condition.
      if (this.#stderr.length < MAX_STDERR_BYTES) this.#stderr += chunk;
    });

    this.#child.on("exit", (code, signal) => {
      this.#exit = { code, signal };
      this.#failAllPending(
        `server process exited (code=${String(code)} signal=${String(signal)})`,
      );
    });

    this.#child.on("error", (err) => {
      this.#failAllPending(`failed to spawn server: ${err.message}`);
    });
  }

  get stderr(): string {
    return this.#stderr;
  }

  get exitInfo(): { code: number | null; signal: NodeJS.Signals | null } | undefined {
    return this.#exit;
  }

  #onStdout(chunk: string): void {
    this.#buffer += chunk;
    if (this.#buffer.length > MAX_LINE_BYTES) {
      this.#failAllPending("server exceeded the maximum line length without a newline");
      this.#buffer = "";
      return;
    }
    let idx: number;
    while ((idx = this.#buffer.indexOf("\n")) >= 0) {
      const line = this.#buffer.slice(0, idx).trim();
      this.#buffer = this.#buffer.slice(idx + 1);
      if (line) this.#onLine(line);
    }
  }

  #onLine(line: string): void {
    let msg: unknown;
    try {
      msg = JSON.parse(line);
    } catch {
      // A server writing non-JSON to stdout violates the spec. Attribute it to
      // the oldest in-flight request so the probe can report it as evidence.
      const first = this.#pending.entries().next();
      if (!first.done) {
        const [id, p] = first.value;
        this.#settle(id, p, {
          outcome: "invalid-json",
          notifications: p.notifications,
          raw: line.slice(0, MAX_RAW_EVIDENCE),
          elapsedMs: Date.now() - p.startedAt,
          message: "server wrote non-JSON to stdout",
        });
      }
      return;
    }

    if (!isJsonObject(msg)) return;

    // A notification (no id) — attach to whichever request is in flight.
    if (msg["id"] === undefined) {
      const first = this.#pending.values().next();
      if (!first.done) first.value.notifications.push(msg);
      return;
    }

    const id = msg["id"] as string | number;
    const pending = this.#pending.get(id);
    if (!pending) return; // response to something we never sent; ignore

    const elapsedMs = Date.now() - pending.startedAt;
    const raw = line.slice(0, MAX_RAW_EVIDENCE);

    if (isJsonObject(msg["error"])) {
      const e = msg["error"];
      this.#settle(id, pending, {
        outcome: "error",
        error: {
          code: typeof e["code"] === "number" ? e["code"] : NaN,
          message: typeof e["message"] === "string" ? e["message"] : "",
          ...(e["data"] !== undefined ? { data: e["data"] } : {}),
        },
        notifications: pending.notifications,
        raw,
        elapsedMs,
      });
      return;
    }

    if (isJsonObject(msg["result"])) {
      this.#settle(id, pending, {
        outcome: "result",
        result: msg["result"],
        notifications: pending.notifications,
        raw,
        elapsedMs,
      });
      return;
    }

    this.#settle(id, pending, {
      outcome: "invalid-envelope",
      notifications: pending.notifications,
      raw,
      elapsedMs,
      message: "response had neither a result object nor an error object",
    });
  }

  #settle(id: string | number, p: Pending, res: RpcResponse): void {
    clearTimeout(p.timer);
    this.#pending.delete(id);
    p.resolve(res);
  }

  #failAllPending(message: string): void {
    for (const [id, p] of [...this.#pending]) {
      this.#settle(id, p, {
        outcome: "transport-error",
        notifications: p.notifications,
        elapsedMs: Date.now() - p.startedAt,
        message,
      });
    }
  }

  send(req: JsonRpcRequest, opts: SendOptions = {}): Promise<RpcResponse> {
    const timeoutMs = opts.timeoutMs ?? 10_000;
    const startedAt = Date.now();

    if (this.#closed || this.#child.exitCode !== null) {
      return Promise.resolve({
        outcome: "transport-error",
        notifications: [],
        elapsedMs: 0,
        message: "server process is not running",
      });
    }

    return new Promise<RpcResponse>((resolve) => {
      const timer = setTimeout(() => {
        const p = this.#pending.get(req.id);
        if (!p) return;
        this.#pending.delete(req.id);
        resolve({
          outcome: "timeout",
          notifications: p.notifications,
          elapsedMs: Date.now() - startedAt,
          message: `no response within ${timeoutMs}ms`,
        });
      }, timeoutMs);
      // Never keep the process alive just for a probe timer.
      timer.unref?.();

      this.#pending.set(req.id, { resolve, startedAt, notifications: [], timer });

      // Spec: messages MUST NOT contain embedded newlines.
      const line = JSON.stringify(req).replace(/\n/g, "") + "\n";
      this.#child.stdin.write(line, (err) => {
        if (!err) return;
        const p = this.#pending.get(req.id);
        if (p) {
          this.#settle(req.id, p, {
            outcome: "transport-error",
            notifications: p.notifications,
            elapsedMs: Date.now() - startedAt,
            message: `write failed: ${err.message}`,
          });
        }
      });
    });
  }

  notify(method: string, params?: Record<string, unknown>): void {
    if (this.#closed || this.#child.exitCode !== null) return;
    const msg = JSON.stringify({ jsonrpc: "2.0", method, ...(params ? { params } : {}) });
    this.#child.stdin.write(msg.replace(/\n/g, "") + "\n");
  }

  /** Spec shutdown sequence: close stdin, wait, then escalate. */
  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    this.#failAllPending("transport closed");

    if (this.#child.exitCode !== null || this.#child.signalCode !== null) return;

    try {
      this.#child.stdin.end();
    } catch {
      /* already gone */
    }

    const exited = await new Promise<boolean>((resolve) => {
      const t = setTimeout(() => resolve(false), 2000);
      t.unref?.();
      this.#child.once("exit", () => {
        clearTimeout(t);
        resolve(true);
      });
    });
    if (exited) return;

    this.#child.kill("SIGTERM");
    const died = await new Promise<boolean>((resolve) => {
      const t = setTimeout(() => resolve(false), 1500);
      t.unref?.();
      this.#child.once("exit", () => {
        clearTimeout(t);
        resolve(true);
      });
    });
    if (!died) this.#child.kill("SIGKILL");
  }
}
