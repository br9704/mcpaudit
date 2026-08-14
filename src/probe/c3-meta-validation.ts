import { finding, type Finding, type RuleMeta } from "../schema/finding.js";
import type { AuditContext, Rule } from "../rules/types.js";
import { fail, pass } from "../rules/types.js";
import { INVALID_PARAMS, META_CLIENT_CAPABILITIES, META_PROTOCOL_VERSION } from "../protocol/types.js";

export const meta: RuleMeta = {
  id: "C3_META_VALIDATION",
  lane: "conformance",
  title: "Required _meta fields are validated",
  why:
    "The protocol is stateless: every request carries its own protocol version and client " +
    "capabilities in _meta, and a server MUST NOT infer them from earlier requests. A request " +
    "missing a required field is malformed and the server MUST reject it with -32602 (and HTTP " +
    "400 on Streamable HTTP). A server that answers anyway is silently guessing what the client " +
    "supports, which is exactly what the stateless rewrite set out to remove.",
  appliesTo: ["modern"],
  defaultSeverity: "error",
  falsePositiveModes: [
    "Skipped for pre-2026 servers, which have no _meta requirement at all.",
    "A permissive gateway in front of the server may inject the missing fields before the origin " +
      "server sees the request, making a strict origin look lax.",
  ],
  remediation:
    "Validate that params._meta carries io.modelcontextprotocol/protocolVersion and " +
    "io.modelcontextprotocol/clientCapabilities on every request, and reject the request with " +
    "-32602 when either is absent.",
  specRef: "https://modelcontextprotocol.io/specification/2026-07-28/basic#meta",
};

export const rule: Rule = {
  meta,
  async run(ctx: AuditContext) {
    const findings: Finding[] = [];

    const cases: { label: string; opts: Parameters<typeof ctx.client.listTools>[0] }[] = [
      { label: "_meta omitted entirely", opts: { omitMeta: true } },
      {
        label: `_meta.${META_PROTOCOL_VERSION} omitted`,
        opts: { omitMetaKeys: [META_PROTOCOL_VERSION] },
      },
      {
        label: `_meta.${META_CLIENT_CAPABILITIES} omitted`,
        opts: { omitMetaKeys: [META_CLIENT_CAPABILITIES] },
      },
    ];

    for (const c of cases) {
      const res = await ctx.client.listTools(c.opts);

      if (res.outcome === "result") {
        findings.push(
          finding(meta, {
            id: "C3_ACCEPTS_MALFORMED_META",
            severity: "error",
            title: `Server answered a request with ${c.label}`,
            detail:
              `A request with ${c.label} is malformed under revision 2026-07-28 and MUST be ` +
              "rejected with -32602. This server returned a normal result instead, so it is not " +
              "enforcing per-request capability negotiation.",
            evidence: {
              path: "tools/list",
              ...(res.http ? { httpStatus: res.http.status } : {}),
            },
          }),
        );
        continue;
      }

      if (res.outcome === "error" && res.error) {
        if (res.error.code !== INVALID_PARAMS) {
          findings.push(
            finding(meta, {
              id: "C3_WRONG_ERROR_CODE",
              severity: "warn",
              title: `Rejected ${c.label} with ${res.error.code} instead of -32602`,
              detail:
                "The server correctly refused the malformed request, but the spec requires " +
                "-32602 (Invalid params) for a missing required _meta field.",
              evidence: {
                path: "tools/list",
                errorCode: res.error.code,
                ...(res.http ? { httpStatus: res.http.status } : {}),
              },
            }),
          );
        } else if (res.http && res.http.status !== 400) {
          findings.push(
            finding(meta, {
              id: "C3_WRONG_HTTP_STATUS",
              severity: "low",
              title: `Returned -32602 with HTTP ${res.http.status} instead of 400`,
              detail:
                "On Streamable HTTP the response status MUST be 400 Bad Request when a required " +
                "_meta field is missing.",
              evidence: { path: "tools/list", errorCode: res.error.code, httpStatus: res.http.status },
            }),
          );
        }
        continue;
      }

      findings.push(
        finding(meta, {
          id: "C3_NO_CLEAN_REJECTION",
          severity: "warn",
          title: `Server did not cleanly reject a request with ${c.label}`,
          detail:
            `Expected a -32602 error; the request finished as "${res.outcome}"` +
            (res.message ? ` (${res.message})` : "") +
            ". A malformed request should produce a clear error, not a hang or a broken envelope.",
          evidence: { path: "tools/list" },
        }),
      );
    }

    return findings.length ? fail(meta, findings) : pass(meta);
  },
};
