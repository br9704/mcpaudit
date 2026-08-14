import { createHash } from "node:crypto";
import type { EraDetection, RawTool } from "../protocol/types.js";
import { isJsonObject } from "../protocol/types.js";

/**
 * CONTRACT: the baseline snapshot format.
 *
 * A baseline pins the *surface a model sees* — names, descriptions, schemas and
 * annotations. That is the attack surface for a rug pull: a server can behave
 * perfectly while you evaluate it, then quietly rewrite a tool description to
 * carry an injection payload. Nothing about the transport or the server version
 * has to change for that to happen, which is why we hash the surface itself.
 */
export const BASELINE_VERSION = 1;
export const DEFAULT_BASELINE_PATH = ".mcpaudit-baseline.json";

export interface ToolFingerprint {
  name: string;
  /** Hash over the whole pinned surface of this tool. */
  hash: string;
  /** Per-field hashes, so a diff can say *which* field moved. */
  fields: {
    title: string;
    description: string;
    inputSchema: string;
    outputSchema: string;
    annotations: string;
  };
  /** Kept in the clear so a diff can show old→new without a second connection. */
  values: {
    title?: string;
    description?: string;
    annotations?: Record<string, unknown>;
  };
}

export interface Baseline {
  baselineVersion: number;
  createdAt: string;
  tool: { name: string; version: string };
  target: { kind: "stdio" | "http"; spec: string };
  server: {
    name?: string;
    version?: string;
    era: string;
    protocolVersion?: string;
  };
  instructionsHash: string;
  instructions?: string;
  tools: ToolFingerprint[];
}

/**
 * Canonical JSON: keys sorted at every level, no insignificant whitespace.
 * Without this, a server that merely reorders its JSON keys would look like it
 * had changed, and every re-audit would cry rug pull.
 */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`).join(",")}}`;
}

export function sha256(value: unknown): string {
  return "sha256:" + createHash("sha256").update(canonicalize(value)).digest("hex");
}

export function fingerprintTool(tool: RawTool): ToolFingerprint {
  const name = typeof tool.name === "string" ? tool.name : "";
  const values: ToolFingerprint["values"] = {};
  if (typeof tool.title === "string") values.title = tool.title;
  if (typeof tool.description === "string") values.description = tool.description;
  if (isJsonObject(tool.annotations)) {
    values.annotations = tool.annotations as Record<string, unknown>;
  }

  return {
    name,
    hash: sha256({
      name,
      title: tool.title ?? null,
      description: tool.description ?? null,
      inputSchema: tool.inputSchema ?? null,
      outputSchema: tool.outputSchema ?? null,
      annotations: tool.annotations ?? null,
    }),
    fields: {
      title: sha256(tool.title ?? null),
      description: sha256(tool.description ?? null),
      inputSchema: sha256(tool.inputSchema ?? null),
      outputSchema: sha256(tool.outputSchema ?? null),
      annotations: sha256(tool.annotations ?? null),
    },
    values,
  };
}

export function buildBaseline(opts: {
  toolName: string;
  toolVersion: string;
  target: { kind: "stdio" | "http"; spec: string };
  era: EraDetection;
  tools: readonly RawTool[];
  now: string;
}): Baseline {
  const server: Baseline["server"] = { era: opts.era.era };
  if (opts.era.serverInfo?.name !== undefined) server.name = opts.era.serverInfo.name;
  if (opts.era.serverInfo?.version !== undefined) server.version = opts.era.serverInfo.version;
  if (opts.era.protocolVersion !== undefined) server.protocolVersion = opts.era.protocolVersion;

  return {
    baselineVersion: BASELINE_VERSION,
    createdAt: opts.now,
    tool: { name: opts.toolName, version: opts.toolVersion },
    target: opts.target,
    server,
    instructionsHash: sha256(opts.era.instructions ?? null),
    ...(opts.era.instructions !== undefined ? { instructions: opts.era.instructions } : {}),
    // Sorted by name: a baseline must not churn just because the server
    // returned its tools in a different order.
    tools: [...opts.tools]
      .map(fingerprintTool)
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)),
  };
}

export function parseBaseline(text: string): Baseline {
  const parsed: unknown = JSON.parse(text);
  if (!isJsonObject(parsed)) throw new Error("baseline is not a JSON object");
  const v = parsed["baselineVersion"];
  if (v !== BASELINE_VERSION) {
    throw new Error(
      `unsupported baseline version ${String(v)} (this build writes v${BASELINE_VERSION}); re-pin with --pin`,
    );
  }
  if (!Array.isArray(parsed["tools"])) throw new Error("baseline has no tools array");
  return parsed as unknown as Baseline;
}

export function serializeBaseline(b: Baseline): string {
  return JSON.stringify(b, null, 2) + "\n";
}
