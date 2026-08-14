import { finding, sanitizeSnippet, type Finding, type RuleMeta } from "../schema/finding.js";
import type { AuditContext, Rule } from "../rules/types.js";
import { fail, pass } from "../rules/types.js";
import { isJsonObject, META_SERVER_INFO } from "../protocol/types.js";

export const meta: RuleMeta = {
  id: "C1_DISCOVER",
  lane: "conformance",
  title: "server/discover is present and well-formed",
  why:
    "In revision 2026-07-28 servers MUST implement server/discover: it is the only way a client " +
    "can learn the server's supported protocol versions, capabilities and identity without a " +
    "handshake. A DiscoverResult must carry supportedVersions and capabilities, and — because it " +
    "is a CacheableResult — ttlMs and cacheScope. serverInfo in the result's _meta is a SHOULD.",
  appliesTo: ["modern"],
  defaultSeverity: "error",
  falsePositiveModes: [
    "Only meaningful for 2026-07-28 servers; pre-2026 servers legitimately lack the method and " +
      "are skipped rather than failed.",
    "A server behind a gateway that rewrites results may lose ttlMs/cacheScope in transit, " +
      "making the origin server look non-conformant when it is not.",
  ],
  remediation:
    "Implement server/discover returning supportedVersions[], capabilities{}, ttlMs and " +
    "cacheScope, and include io.modelcontextprotocol/serverInfo in the result's _meta.",
  specRef: "https://modelcontextprotocol.io/specification/2026-07-28/server/discover",
};

export const rule: Rule = {
  meta,
  run(ctx: AuditContext) {
    const result = ctx.era.discoverResult;

    if (!result) {
      return fail(meta, [
        finding(meta, {
          id: "C1_DISCOVER_MISSING",
          severity: "error",
          title: "server/discover did not return a result",
          detail:
            "The server was classified as speaking the 2026-07-28 protocol, but server/discover " +
            "produced no usable result. This method is mandatory for this revision.",
          evidence: { path: "server/discover" },
        }),
      ]);
    }

    const findings: Finding[] = [];

    const versions = result["supportedVersions"];
    if (!Array.isArray(versions) || versions.length === 0) {
      findings.push(
        finding(meta, {
          id: "C1_NO_SUPPORTED_VERSIONS",
          severity: "error",
          title: "DiscoverResult is missing supportedVersions",
          detail:
            "supportedVersions is required and must be a non-empty array of protocol version " +
            "strings; a client cannot pick a version without it.",
          evidence: {
            path: "server/discover → supportedVersions",
            snippet: sanitizeSnippet(versions ?? null),
          },
        }),
      );
    } else if (!versions.every((v) => typeof v === "string")) {
      findings.push(
        finding(meta, {
          id: "C1_SUPPORTED_VERSIONS_NOT_STRINGS",
          severity: "error",
          title: "supportedVersions contains non-string entries",
          detail: "Every entry of supportedVersions must be a protocol version string.",
          evidence: {
            path: "server/discover → supportedVersions",
            snippet: sanitizeSnippet(versions),
          },
        }),
      );
    }

    if (!isJsonObject(result["capabilities"])) {
      findings.push(
        finding(meta, {
          id: "C1_NO_CAPABILITIES",
          severity: "error",
          title: "DiscoverResult is missing capabilities",
          detail:
            "capabilities is required. An empty object is valid and means the server offers no " +
            "optional features; omitting the field entirely is not.",
          evidence: { path: "server/discover → capabilities" },
        }),
      );
    }

    // ttlMs / cacheScope are required on every CacheableResult in this revision.
    if (typeof result["ttlMs"] !== "number" || (result["ttlMs"] as number) < 0) {
      findings.push(
        finding(meta, {
          id: "C1_NO_TTLMS",
          severity: "warn",
          title: "DiscoverResult is missing a valid ttlMs",
          detail:
            "ttlMs is required on cacheable results and must be a non-negative number of " +
            "milliseconds. Without it, clients cannot cache discovery and will re-probe.",
          evidence: {
            path: "server/discover → ttlMs",
            snippet: sanitizeSnippet(result["ttlMs"] ?? null),
          },
        }),
      );
    }

    const scope = result["cacheScope"];
    if (scope !== "public" && scope !== "private") {
      findings.push(
        finding(meta, {
          id: "C1_NO_CACHESCOPE",
          severity: "warn",
          title: "DiscoverResult is missing a valid cacheScope",
          detail: 'cacheScope is required and must be exactly "public" or "private".',
          evidence: {
            path: "server/discover → cacheScope",
            snippet: sanitizeSnippet(scope ?? null),
          },
        }),
      );
    }

    const metaObj = result["_meta"];
    const serverInfo = isJsonObject(metaObj) ? metaObj[META_SERVER_INFO] : undefined;
    if (!isJsonObject(serverInfo)) {
      findings.push(
        finding(meta, {
          id: "C1_NO_SERVERINFO",
          severity: "low",
          title: "Result does not identify the server",
          detail:
            `Servers SHOULD include ${META_SERVER_INFO} in each result's _meta. Without it a ` +
            "client cannot show the user which software it is talking to. (Self-reported and " +
            "unverified by the protocol — for display and debugging only.)",
          evidence: { path: `server/discover → _meta.${META_SERVER_INFO}` },
        }),
      );
    }

    return findings.length ? fail(meta, findings) : pass(meta);
  },
};
