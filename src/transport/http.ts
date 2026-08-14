import type { JsonObject, JsonRpcRequest, RpcResponse } from "../protocol/types.js";
import { isJsonObject, LATEST_PROTOCOL_VERSION } from "../protocol/types.js";
import type { SendOptions, Transport } from "./types.js";

const MAX_RAW_EVIDENCE = 4000;
/** Cap on a response body so a hostile server cannot exhaust memory. */
const MAX_BODY_BYTES = 16 * 1024 * 1024;

/** Methods that must carry an `Mcp-Name` header, and where its value comes from. */
const NAME_SOURCE: Record<string, "name" | "uri"> = {
  "tools/call": "name",
  "prompts/get": "name",
  "resources/read": "uri",
};

/**
 * Header values must be visible ASCII. Anything else is carried in the spec's
 * base64 sentinel form, including plain-ASCII values that would otherwise be
 * mistaken for the sentinel itself.
 */
export function encodeHeaderValue(value: string): string {
  const needsEncoding =
    // eslint-disable-next-line no-control-regex
    /[^\x20-\x7E]/.test(value) ||
    value !== value.trim() ||
    (value.startsWith("=?base64?") && value.endsWith("?="));
  if (!needsEncoding) return value;
  return `=?base64?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

/** Parse an SSE body into its `data:` payloads, ignoring `:` keep-alive comments. */
export function parseSseEvents(body: string): string[] {
  const events: string[] = [];
  let data: string[] = [];
  for (const rawLine of body.split(/\r\n|\r|\n/)) {
    if (rawLine === "") {
      if (data.length) events.push(data.join("\n"));
      data = [];
      continue;
    }
    if (rawLine.startsWith(":")) continue; // comment / keep-alive
    if (rawLine.startsWith("data:")) {
      const v = rawLine.slice(5);
      data.push(v.startsWith(" ") ? v.slice(1) : v);
    }
    // `event:`/`id:`/`retry:` carry no payload we need.
  }
  if (data.length) events.push(data.join("\n"));
  return events;
}

/**
 * Streamable HTTP transport for the 2026-07-28 revision: a single POST endpoint,
 * no sessions, no GET stream, no resumability. Responses arrive as either a
 * single JSON object or an SSE stream scoped to the request.
 */
export class HttpTransport implements Transport {
  readonly kind = "http" as const;
  readonly describe: string;

  #url: string;
  #protocolVersion: string;

  constructor(url: string, protocolVersion: string = LATEST_PROTOCOL_VERSION) {
    this.#url = url;
    this.#protocolVersion = protocolVersion;
    this.describe = url;
  }

  set protocolVersion(v: string) {
    this.#protocolVersion = v;
  }

  /** The standard request headers the spec requires on every POST. */
  buildHeaders(req: JsonRpcRequest, overrides: Record<string, string | null> = {}): Headers {
    const h = new Headers({
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": this.#protocolVersion,
      "Mcp-Method": req.method,
    });

    const nameKey = NAME_SOURCE[req.method];
    if (nameKey) {
      const v = req.params?.[nameKey];
      if (typeof v === "string") h.set("Mcp-Name", encodeHeaderValue(v));
    }

    for (const [k, v] of Object.entries(overrides)) {
      if (v === null) h.delete(k);
      else h.set(k, v);
    }
    return h;
  }

  async send(req: JsonRpcRequest, opts: SendOptions = {}): Promise<RpcResponse> {
    const timeoutMs = opts.timeoutMs ?? 10_000;
    const startedAt = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    timer.unref?.();

    try {
      const res = await fetch(this.#url, {
        method: "POST",
        headers: this.buildHeaders(req, opts.headerOverrides ?? {}),
        body: JSON.stringify(req),
        signal: controller.signal,
        redirect: "manual",
      });

      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => (headers[k.toLowerCase()] = v));
      const ctype = (headers["content-type"] ?? "").toLowerCase();
      const contentMode = ctype.includes("text/event-stream")
        ? "sse"
        : ctype.includes("application/json")
          ? "json"
          : "other";

      const body = await this.#readBody(res);
      const http = { status: res.status, headers, contentMode } as const;
      const elapsedMs = Date.now() - startedAt;
      const raw = body.slice(0, MAX_RAW_EVIDENCE);

      const payloads = contentMode === "sse" ? parseSseEvents(body) : [body];
      const notifications: JsonObject[] = [];
      let responseMsg: JsonObject | undefined;

      for (const p of payloads) {
        if (!p.trim()) continue;
        let parsed: unknown;
        try {
          parsed = JSON.parse(p);
        } catch {
          continue;
        }
        if (!isJsonObject(parsed)) continue;
        if (parsed["id"] === undefined) notifications.push(parsed);
        else if (responseMsg === undefined) responseMsg = parsed;
      }

      if (!responseMsg) {
        // 202 with no body is the correct answer to a notification POST.
        return {
          outcome: body.trim() === "" ? "invalid-envelope" : "invalid-json",
          notifications,
          raw,
          http,
          elapsedMs,
          message:
            body.trim() === ""
              ? `empty body (HTTP ${res.status})`
              : `body was not a JSON-RPC response (HTTP ${res.status})`,
        };
      }

      if (isJsonObject(responseMsg["error"])) {
        const e = responseMsg["error"];
        return {
          outcome: "error",
          error: {
            code: typeof e["code"] === "number" ? e["code"] : NaN,
            message: typeof e["message"] === "string" ? e["message"] : "",
            ...(e["data"] !== undefined ? { data: e["data"] } : {}),
          },
          notifications,
          raw,
          http,
          elapsedMs,
        };
      }

      if (isJsonObject(responseMsg["result"])) {
        return {
          outcome: "result",
          result: responseMsg["result"],
          notifications,
          raw,
          http,
          elapsedMs,
        };
      }

      return {
        outcome: "invalid-envelope",
        notifications,
        raw,
        http,
        elapsedMs,
        message: "response had neither a result object nor an error object",
      };
    } catch (err) {
      const aborted = err instanceof Error && err.name === "AbortError";
      return {
        outcome: aborted ? "timeout" : "transport-error",
        notifications: [],
        elapsedMs: Date.now() - startedAt,
        message: aborted
          ? `no response within ${timeoutMs}ms`
          : err instanceof Error
            ? err.message
            : String(err),
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /** Read a body with a hard size ceiling. */
  async #readBody(res: Response): Promise<string> {
    if (!res.body) return await res.text();
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let out = "";
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        out += "\n[truncated: response exceeded size limit]";
        break;
      }
      out += decoder.decode(value, { stream: true });
    }
    return out;
  }

  /** Probe a non-POST method; 2026-07-28 servers must answer 405. */
  async probeMethod(method: "GET" | "DELETE", timeoutMs = 5000): Promise<number | undefined> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    timer.unref?.();
    try {
      const res = await fetch(this.#url, {
        method,
        headers: { Accept: "application/json, text/event-stream" },
        signal: controller.signal,
        redirect: "manual",
      });
      await res.body?.cancel().catch(() => undefined);
      return res.status;
    } catch {
      return undefined;
    } finally {
      clearTimeout(timer);
    }
  }

  async close(): Promise<void> {
    // Stateless: nothing to tear down.
  }
}
