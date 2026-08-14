import type { McpClient } from "./client.js";
import {
  HEADER_MISMATCH,
  LATEST_PROTOCOL_VERSION,
  LEGACY_PROTOCOL_VERSIONS,
  META_SERVER_INFO,
  MISSING_REQUIRED_CLIENT_CAPABILITY,
  UNSUPPORTED_PROTOCOL_VERSION,
  asString,
  isJsonObject,
  type EraDetection,
  type EraProbeStep,
  type JsonObject,
  type RpcResponse,
  type ServerIdentity,
} from "./types.js";

/** Error codes that only a 2026-07-28-era server can legitimately produce. */
const MODERN_ERROR_CODES: ReadonlySet<number> = new Set([
  HEADER_MISMATCH,
  MISSING_REQUIRED_CLIENT_CAPABILITY,
  UNSUPPORTED_PROTOCOL_VERSION,
]);

function extractServerInfo(result: JsonObject | undefined): ServerIdentity | undefined {
  if (!result) return undefined;
  const meta = result["_meta"];
  const fromMeta = isJsonObject(meta) ? meta[META_SERVER_INFO] : undefined;
  // Legacy `initialize` puts it at the top level instead.
  const src = isJsonObject(fromMeta) ? fromMeta : result["serverInfo"];
  if (!isJsonObject(src)) return undefined;
  const out: ServerIdentity = {};
  const name = asString(src["name"]);
  const version = asString(src["version"]);
  const title = asString(src["title"]);
  if (name !== undefined) out.name = name;
  if (version !== undefined) out.version = version;
  if (title !== undefined) out.title = title;
  return out;
}

/** A `DiscoverResult` must at minimum carry these two fields. */
function looksLikeDiscoverResult(result: JsonObject): boolean {
  return Array.isArray(result["supportedVersions"]) || isJsonObject(result["capabilities"]);
}

function versionsFromError(res: RpcResponse): string[] | undefined {
  const data = res.error?.data;
  if (!isJsonObject(data)) return undefined;
  const list = data["supported"] ?? data["supportedVersions"];
  if (!Array.isArray(list)) return undefined;
  const out = list.filter((v): v is string => typeof v === "string");
  return out.length ? out : undefined;
}

/**
 * Resolve which protocol era the server speaks, before any check runs.
 *
 * Implements the backward-compatibility probe from the spec's stdio transport
 * page. The critical rule, stated normatively there: the fallback **MUST NOT**
 * be keyed to one specific error code, because legacy servers answer an unknown
 * pre-`initialize` method with -32601, -32602, or nothing at all. So we treat
 * "not a recognized modern response" as the legacy signal.
 *
 * This matters more than it looks: as of 2026-08 nothing in the ecosystem
 * implements 2026-07-28 — the official `server-everything` is a 2025-06-18
 * server — so the legacy branch is the common case, not the exception.
 */
export async function detectEra(client: McpClient): Promise<EraDetection> {
  const trace: EraProbeStep[] = [];

  const discover = await client.discover();
  trace.push({
    step: "server/discover",
    outcome: discover.outcome,
    ...(discover.error ? { errorCode: discover.error.code } : {}),
  });

  // ── Modern: a well-formed DiscoverResult ────────────────────────────────
  if (discover.outcome === "result" && discover.result) {
    const result = discover.result;
    if (looksLikeDiscoverResult(result)) {
      const supported = Array.isArray(result["supportedVersions"])
        ? result["supportedVersions"].filter((v): v is string => typeof v === "string")
        : [];
      const chosen = supported.includes(LATEST_PROTOCOL_VERSION)
        ? LATEST_PROTOCOL_VERSION
        : (supported[0] ?? LATEST_PROTOCOL_VERSION);
      client.protocolVersion = chosen;

      const detection: EraDetection = {
        era: "modern",
        protocolVersion: chosen,
        supportedVersions: supported,
        discoverResult: result,
        trace,
      };
      const caps = result["capabilities"];
      if (isJsonObject(caps)) detection.capabilities = caps;
      const info = extractServerInfo(result);
      if (info) detection.serverInfo = info;
      const instructions = asString(result["instructions"]);
      if (instructions !== undefined) detection.instructions = instructions;
      return detection;
    }
    // Answered server/discover but with something that isn't a DiscoverResult.
    // Still modern-era (it knows the method), just non-conformant — C1 reports it.
    trace.push({
      step: "classify",
      outcome: "result",
      note: "server/discover returned a result lacking supportedVersions/capabilities",
    });
    return { era: "modern", protocolVersion: client.protocolVersion, discoverResult: result, trace };
  }

  // ── Modern: a recognized modern error means it speaks the new protocol ──
  if (discover.outcome === "error" && discover.error) {
    const code = discover.error.code;
    if (MODERN_ERROR_CODES.has(code)) {
      const supported = versionsFromError(discover);
      const chosen = supported?.[0] ?? client.protocolVersion;
      client.protocolVersion = chosen;
      trace.push({
        step: "classify",
        outcome: "error",
        errorCode: code,
        note: "recognized modern error — do NOT fall back to initialize",
      });
      const detection: EraDetection = {
        era: "modern",
        protocolVersion: chosen,
        trace,
      };
      if (supported) detection.supportedVersions = supported;
      return detection;
    }
  }

  // ── Legacy: anything else. Try the initialize handshake. ────────────────
  trace.push({
    step: "classify",
    outcome: discover.outcome,
    ...(discover.error ? { errorCode: discover.error.code } : {}),
    note: "not a recognized modern response — falling back to initialize",
  });

  for (const version of LEGACY_PROTOCOL_VERSIONS) {
    const init = await client.initialize(version);
    trace.push({
      step: `initialize(${version})`,
      outcome: init.outcome,
      ...(init.error ? { errorCode: init.error.code } : {}),
    });

    if (init.outcome === "result" && init.result) {
      client.notifyInitialized();
      const negotiated = asString(init.result["protocolVersion"]) ?? version;
      const detection: EraDetection = {
        era: "legacy",
        protocolVersion: negotiated,
        initializeResult: init.result,
        trace,
      };
      const caps = init.result["capabilities"];
      if (isJsonObject(caps)) detection.capabilities = caps;
      const info = extractServerInfo(init.result);
      if (info) detection.serverInfo = info;
      const instructions = asString(init.result["instructions"]);
      if (instructions !== undefined) detection.instructions = instructions;
      return detection;
    }

    // A version-mismatch error is worth retrying with another version; a
    // transport failure is not.
    if (init.outcome === "transport-error" || init.outcome === "timeout") break;
  }

  return { era: "unknown", trace };
}
