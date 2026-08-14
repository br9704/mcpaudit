import { finding, type RuleMeta } from "../schema/finding.js";
import type { AuditContext, Rule } from "../rules/types.js";
import { pass } from "../rules/types.js";
import { LATEST_PROTOCOL_VERSION } from "../protocol/types.js";

export const meta: RuleMeta = {
  id: "C0_PROTOCOL_ERA",
  lane: "conformance",
  title: "Protocol revision in use",
  why:
    "Revision 2026-07-28 removed the initialize handshake and made server/discover mandatory. " +
    "A server still speaking an initialize-era revision is not broken, but it is behind the " +
    "current specification, and clients built for the stateless protocol will not negotiate " +
    "with it without a compatibility path.",
  appliesTo: ["modern", "legacy", "unknown"],
  defaultSeverity: "info",
  falsePositiveModes: [
    "Reporting a pre-2026 revision is expected today, not a defect: as of this release no " +
      "shipping SDK implements 2026-07-28, so almost every real server is legitimately legacy.",
    "A server may deliberately support only older revisions for compatibility with existing clients.",
    "'unknown' can mean the server failed to start in this environment (missing env vars, " +
      "missing credentials) rather than that it speaks no known protocol.",
  ],
  remediation:
    "Track the 2026-07-28 revision when your SDK supports it: implement server/discover, " +
    "validate the required _meta keys per request, and emit resultType on every result.",
  specRef: "https://modelcontextprotocol.io/specification/2026-07-28/changelog",
};

export const rule: Rule = {
  meta,
  run(ctx: AuditContext) {
    const { era } = ctx;

    if (era.era === "unknown") {
      return {
        ruleId: meta.id,
        status: "fail",
        findings: [
          finding(meta, {
            id: "C0_ERA_UNKNOWN",
            severity: "error",
            title: "Could not determine the protocol revision",
            detail:
              "Neither server/discover nor any initialize handshake produced a usable response, " +
              "so no further checks could be run against this server. " +
              `Probe trace: ${era.trace.map((s) => `${s.step}→${s.outcome}${s.errorCode !== undefined ? `(${s.errorCode})` : ""}`).join(", ")}.`,
          }),
        ],
      };
    }

    if (era.era === "legacy") {
      return {
        ruleId: meta.id,
        status: "fail",
        findings: [
          finding(meta, {
            id: "C0_PRE_2026_PROTOCOL",
            severity: "info",
            title: `Server speaks a pre-2026 revision (${era.protocolVersion ?? "unknown version"})`,
            detail:
              `This server answered server/discover with an error and completed an initialize ` +
              `handshake at ${era.protocolVersion ?? "an unspecified version"}. The current ` +
              `revision is ${LATEST_PROTOCOL_VERSION}, which removed the handshake entirely. ` +
              "Conformance checks specific to the stateless protocol were skipped for this server.",
            evidence: { path: "initialize" },
          }),
        ],
      };
    }

    // Modern. Note when the server does not actually advertise the latest.
    if (era.supportedVersions && !era.supportedVersions.includes(LATEST_PROTOCOL_VERSION)) {
      return {
        ruleId: meta.id,
        status: "fail",
        findings: [
          finding(meta, {
            id: "C0_LATEST_NOT_SUPPORTED",
            severity: "low",
            title: "Server does not advertise the current revision",
            detail:
              `server/discover advertised [${era.supportedVersions.join(", ")}], which does not ` +
              `include ${LATEST_PROTOCOL_VERSION}.`,
            evidence: { path: "server/discover → supportedVersions" },
          }),
        ],
      };
    }

    return pass(meta);
  },
};
