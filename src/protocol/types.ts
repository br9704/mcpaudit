/**
 * JSON-RPC 2.0 + MCP wire types, hand-written (amendment A5: zero runtime deps).
 *
 * These mirror `schema/2026-07-28/schema.ts` but stay deliberately permissive:
 * we audit hostile and malformed servers, so nothing here may assume the peer
 * is well-behaved. Every field a real server might omit or corrupt is optional
 * and validated at the point of use, never at parse time.
 */

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

export const LATEST_PROTOCOL_VERSION = "2026-07-28";

/** Revisions that used the `initialize` handshake, newest first. */
export const LEGACY_PROTOCOL_VERSIONS = [
  "2025-11-25",
  "2025-06-18",
  "2025-03-26",
  "2024-11-05",
] as const;

/** `_meta` keys reserved by the spec. */
export const META_PROTOCOL_VERSION = "io.modelcontextprotocol/protocolVersion";
export const META_CLIENT_INFO = "io.modelcontextprotocol/clientInfo";
export const META_CLIENT_CAPABILITIES = "io.modelcontextprotocol/clientCapabilities";
export const META_SERVER_INFO = "io.modelcontextprotocol/serverInfo";

/** Standard JSON-RPC codes. */
export const PARSE_ERROR = -32700;
export const INVALID_REQUEST = -32600;
export const METHOD_NOT_FOUND = -32601;
export const INVALID_PARAMS = -32602;
export const INTERNAL_ERROR = -32603;

/** MCP-allocated codes (spec-reserved sub-range -32020..-32099). */
export const HEADER_MISMATCH = -32020;
export const MISSING_REQUIRED_CLIENT_CAPABILITY = -32021;
export const UNSUPPORTED_PROTOCOL_VERSION = -32022;

/** Codes defined by earlier revisions; reserved and never reused. */
export const LEGACY_RESOURCE_NOT_FOUND = -32002;
export const LEGACY_URL_ELICITATION_REQUIRED = -32042;

/** The set of codes the spec defines inside the reserved sub-range. */
export const SPEC_DEFINED_RESERVED_CODES: ReadonlySet<number> = new Set([
  HEADER_MISMATCH,
  MISSING_REQUIRED_CLIENT_CAPABILITY,
  UNSUPPORTED_PROTOCOL_VERSION,
]);

export const RESERVED_RANGE_START = -32099;
export const RESERVED_RANGE_END = -32020;

export interface JsonRpcError {
  code: number;
  message: string;
  data?: JsonValue;
}

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: JsonObject;
}

/** How a single request finished. Nothing throws: a hostile server failing in
 * an interesting way is data we want to report, not an exception. */
export type RpcOutcome =
  | "result"
  | "error"
  | "timeout"
  | "transport-error"
  | "invalid-json"
  | "invalid-envelope";

export interface HttpMeta {
  status: number;
  headers: Record<string, string>;
  /** "json" | "sse" — which response mode the server chose. */
  contentMode: "json" | "sse" | "other";
}

export interface RpcResponse {
  outcome: RpcOutcome;
  /** Present when outcome === "result". */
  result?: JsonObject;
  /** Present when outcome === "error". */
  error?: JsonRpcError;
  /** Notifications received on this request's stream, in order. */
  notifications: JsonObject[];
  /** Raw response text, truncated, kept as finding evidence. */
  raw?: string;
  /** Set for the HTTP transport only. */
  http?: HttpMeta;
  elapsedMs: number;
  /** Human-readable reason for timeout / transport-error / invalid-*. */
  message?: string;
}

/** Which protocol era the target server speaks. */
export type Era = "modern" | "legacy" | "unknown";

export interface ServerIdentity {
  name?: string;
  version?: string;
  title?: string;
}

export interface EraDetection {
  era: Era;
  /** The version we will use on subsequent requests. */
  protocolVersion?: string;
  /** From `server/discover` (modern) or `initialize` (legacy). */
  supportedVersions?: string[];
  capabilities?: JsonObject;
  serverInfo?: ServerIdentity;
  instructions?: string;
  /** The discover result verbatim, for conformance checks on its shape. */
  discoverResult?: JsonObject;
  /** The initialize result verbatim, when we fell back. */
  initializeResult?: JsonObject;
  /** Ordered log of what we sent and what came back, for evidence. */
  trace: EraProbeStep[];
}

export interface EraProbeStep {
  step: string;
  outcome: RpcOutcome;
  errorCode?: number;
  note?: string;
}

/** A tool as advertised by `tools/list`. Every field optional: we are checking
 * whether the server got this right, so we cannot presume it did. */
export interface RawTool {
  name?: unknown;
  title?: unknown;
  description?: unknown;
  inputSchema?: unknown;
  outputSchema?: unknown;
  annotations?: unknown;
  icons?: unknown;
  _meta?: unknown;
  [key: string]: unknown;
}

export function isJsonObject(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}
