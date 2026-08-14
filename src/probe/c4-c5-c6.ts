/**
 * C4 unknown-method handling · C5 bounded response time · C6 result/error shape.
 *
 * Grouped in one module because they share a single probe round trip each and
 * are meaningless apart; each still exports its own self-describing metadata.
 */
import { finding, sanitizeSnippet, type Finding, type RuleMeta } from "../schema/finding.js";
import type { AuditContext, Rule } from "../rules/types.js";
import { fail, pass } from "../rules/types.js";
import {
  INVALID_PARAMS,
  METHOD_NOT_FOUND,
  RESERVED_RANGE_END,
  RESERVED_RANGE_START,
  SPEC_DEFINED_RESERVED_CODES,
  isJsonObject,
} from "../protocol/types.js";

// ─── C4 ───────────────────────────────────────────────────────────────────────

export const c4Meta: RuleMeta = {
  id: "C4_UNKNOWN_METHOD",
  lane: "conformance",
  title: "Unknown methods are rejected with -32601",
  why:
    "A method the server does not implement must produce JSON-RPC -32601 (Method not found). On " +
    "Streamable HTTP the status MUST also be 404, which is what lets a client tell 'this endpoint " +
    "does not implement that RPC' apart from 'this is not an MCP endpoint at all'. Servers that " +
    "answer unknown methods with a success result, or hang, break client fallback logic.",
  appliesTo: ["modern", "legacy"],
  defaultSeverity: "warn",
  falsePositiveModes: [
    "A server may legitimately implement an extension method whose name resembles our probe; we " +
      "use a deliberately absurd method name to make that vanishingly unlikely.",
    "Proxies can rewrite a 404 to 200 or vice versa, so the HTTP half of this check reflects the " +
      "whole path, not only the origin server.",
  ],
  remediation: "Return JSON-RPC error -32601 for unimplemented methods; on HTTP, with status 404.",
  specRef: "https://modelcontextprotocol.io/specification/2026-07-28/basic#error-codes",
};

const ABSURD_METHOD = "mcpaudit/definitely-not-a-real-method";

export const c4: Rule = {
  meta: c4Meta,
  async run(ctx: AuditContext) {
    const res = await ctx.client.request(ABSURD_METHOD);
    const findings: Finding[] = [];

    if (res.outcome === "result") {
      findings.push(
        finding(c4Meta, {
          id: "C4_UNKNOWN_METHOD_SUCCEEDED",
          severity: "error",
          title: "Server returned a success result for an unknown method",
          detail:
            `Calling "${ABSURD_METHOD}" produced a result instead of -32601. A server that ` +
            "answers arbitrary methods cannot be probed for capabilities and may be routing " +
            "unknown input somewhere unintended.",
          evidence: { path: ABSURD_METHOD, snippet: sanitizeSnippet(res.result ?? null) },
        }),
      );
    } else if (res.outcome === "error" && res.error) {
      if (res.error.code !== METHOD_NOT_FOUND) {
        findings.push(
          finding(c4Meta, {
            id: "C4_WRONG_ERROR_CODE",
            severity: "warn",
            title: `Unknown method rejected with ${res.error.code} instead of -32601`,
            detail:
              "The server refused the call, but the spec reserves -32601 for an unimplemented " +
              "method. Clients use this code to drive capability fallback.",
            evidence: { path: ABSURD_METHOD, errorCode: res.error.code },
          }),
        );
      }
      if (ctx.era.era === "modern" && res.http && res.http.status !== 404) {
        findings.push(
          finding(c4Meta, {
            id: "C4_WRONG_HTTP_STATUS",
            severity: "low",
            title: `Unknown method returned HTTP ${res.http.status} instead of 404`,
            detail:
              "Revision 2026-07-28 requires status 404 alongside -32601 so clients can " +
              "distinguish an unimplemented RPC from a non-MCP endpoint.",
            evidence: { path: ABSURD_METHOD, httpStatus: res.http.status },
          }),
        );
      }
    } else {
      findings.push(
        finding(c4Meta, {
          id: "C4_NO_CLEAN_REJECTION",
          severity: "warn",
          title: "Server did not cleanly reject an unknown method",
          detail:
            `The call finished as "${res.outcome}"` +
            (res.message ? ` (${res.message})` : "") +
            " rather than returning -32601.",
          evidence: { path: ABSURD_METHOD },
        }),
      );
    }

    return findings.length ? fail(c4Meta, findings) : pass(c4Meta);
  },
};

// ─── C5 ───────────────────────────────────────────────────────────────────────

export const c5Meta: RuleMeta = {
  id: "C5_BOUNDED_TIME",
  lane: "conformance",
  title: "Well-formed requests return within a bounded time",
  why:
    "A server that accepts a request and never answers hangs the client. There is no protocol " +
    "deadline, so clients impose their own; a list call that cannot answer inside a normal " +
    "timeout will appear broken to every client that talks to it.",
  appliesTo: ["modern", "legacy"],
  defaultSeverity: "error",
  falsePositiveModes: [
    "A cold-start server (container spin-up, large index load) can exceed the timeout on the " +
      "first call and be perfectly healthy afterwards. Raise --timeout before believing this.",
    "Network latency to a remote HTTP server counts toward the measured time.",
  ],
  remediation:
    "Answer list requests promptly; for genuinely long work return a handle and let the client " +
    "poll, rather than holding the request open.",
  specRef: "https://modelcontextprotocol.io/specification/2026-07-28/server/tools",
};

export const c5: Rule = {
  meta: c5Meta,
  run(ctx: AuditContext) {
    const res = ctx.toolsResponse;
    if (!res) return pass(c5Meta);

    if (res.outcome === "timeout") {
      return fail(c5Meta, [
        finding(c5Meta, {
          id: "C5_TIMEOUT",
          severity: "error",
          title: "tools/list did not answer within the timeout",
          detail:
            `A well-formed tools/list call exceeded ${ctx.timeoutMs}ms. ${res.message ?? ""}`.trim(),
          evidence: { path: "tools/list" },
        }),
      ]);
    }

    // Slow but not fatal: worth surfacing, not worth failing a build over.
    if (res.elapsedMs > ctx.timeoutMs / 2) {
      return fail(c5Meta, [
        finding(c5Meta, {
          id: "C5_SLOW_RESPONSE",
          severity: "low",
          title: `tools/list took ${res.elapsedMs}ms`,
          detail:
            `That is more than half the ${ctx.timeoutMs}ms budget. Clients with tighter timeouts ` +
            "than ours may already be failing against this server.",
          evidence: { path: "tools/list" },
        }),
      ]);
    }

    return pass(c5Meta);
  },
};

// ─── C6 ───────────────────────────────────────────────────────────────────────

export const c6Meta: RuleMeta = {
  id: "C6_RESULT_SHAPE",
  lane: "conformance",
  title: "Results and error codes have the required shape",
  why:
    "Every result in revision 2026-07-28 MUST carry resultType, so a client can tell a completed " +
    "result from one awaiting input. Separately, the range -32020..-32099 is reserved for codes " +
    "the MCP specification defines: an implementation MUST NOT emit a code from that range that " +
    "the spec has not allocated, because a client is entitled to interpret it by its spec meaning.",
  appliesTo: ["modern", "legacy"],
  defaultSeverity: "warn",
  falsePositiveModes: [
    "resultType is only required from 2026-07-28 onward; for pre-2026 servers its absence is " +
      "correct and is not reported.",
    "The reserved-range check inspects only the errors our probes provoke, so it can miss a bad " +
      "code emitted on a path we never exercise. Absence of a finding is not proof of absence.",
    "-32002 from a pre-2026 server is legacy resource-not-found, not a violation; we note it " +
      "without penalising it.",
  ],
  remediation:
    "Emit resultType:\"complete\" on ordinary results, and keep implementation-specific error " +
    "codes outside -32020..-32099 (use -32000..-32019 or a code outside the JSON-RPC reserved range).",
  specRef: "https://modelcontextprotocol.io/specification/2026-07-28/basic#error-codes",
};

export const c6: Rule = {
  meta: c6Meta,
  async run(ctx: AuditContext) {
    const findings: Finding[] = [];

    if (ctx.era.era === "modern") {
      const checks: { label: string; result: unknown }[] = [
        { label: "server/discover", result: ctx.era.discoverResult },
        { label: "tools/list", result: ctx.toolsResponse?.result },
      ];
      for (const c of checks) {
        if (!isJsonObject(c.result)) continue;
        if (typeof c.result["resultType"] !== "string") {
          findings.push(
            finding(c6Meta, {
              id: "C6_NO_RESULT_TYPE",
              severity: "warn",
              title: `${c.label} result is missing resultType`,
              detail:
                "Servers implementing 2026-07-28 MUST include resultType on every result. " +
                'Clients treat an absent value as "complete" only for earlier revisions.',
              evidence: { path: `${c.label} → resultType` },
            }),
          );
        } else if (
          c.result["resultType"] !== "complete" &&
          c.result["resultType"] !== "input_required"
        ) {
          findings.push(
            finding(c6Meta, {
              id: "C6_UNKNOWN_RESULT_TYPE",
              severity: "low",
              title: `${c.label} returned an unrecognized resultType`,
              detail:
                "A resultType a client does not recognize MUST be treated as invalid. Only " +
                "core values or values advertised by a supported extension are usable.",
              evidence: {
                path: `${c.label} → resultType`,
                snippet: sanitizeSnippet(c.result["resultType"]),
              },
            }),
          );
        }
      }
    }

    // Provoke an error and inspect the code range. Unknown tool is the cheapest
    // reliable way to make a server produce one.
    const errRes = await ctx.client.callTool("mcpaudit_nonexistent_tool_probe", {});
    const code = errRes.error?.code;

    if (code !== undefined && Number.isFinite(code)) {
      if (code <= RESERVED_RANGE_END && code >= RESERVED_RANGE_START) {
        if (!SPEC_DEFINED_RESERVED_CODES.has(code)) {
          findings.push(
            finding(c6Meta, {
              id: "C6_RESERVED_CODE_MISUSE",
              severity: "error",
              title: `Server emitted ${code}, a reserved code the spec does not define`,
              detail:
                "The range -32020..-32099 is reserved for error codes defined by the MCP " +
                "specification. Emitting an unallocated code from it means a conforming client " +
                "may interpret this error as something the server did not intend.",
              evidence: { path: "tools/call", errorCode: code },
            }),
          );
        }
      } else if (code === -32002) {
        findings.push(
          finding(c6Meta, {
            id: "C6_LEGACY_ERROR_CODE",
            severity: "info",
            title: "Server uses the pre-2026 resource-not-found code -32002",
            detail:
              "-32002 was replaced by -32602 in this revision. Clients SHOULD still accept it " +
              "from older servers, so this is a compatibility note rather than a defect.",
            evidence: { path: "tools/call", errorCode: code },
          }),
        );
      }
    }

    // Unknown tool is a protocol error (-32602), or a tool-execution error
    // reported in-band with isError:true. Both are legitimate; neither is a
    // success result with no error signal at all.
    if (errRes.outcome === "result" && isJsonObject(errRes.result)) {
      if (errRes.result["isError"] !== true) {
        findings.push(
          finding(c6Meta, {
            id: "C6_UNKNOWN_TOOL_NOT_AN_ERROR",
            severity: "warn",
            title: "Calling a nonexistent tool returned a plain success result",
            detail:
              "A call to a tool that does not exist should produce either JSON-RPC -32602 or a " +
              "result with isError:true. Returning an ordinary success result hides the mistake " +
              "from the model, which will treat the output as a real answer.",
            evidence: {
              path: "tools/call",
              toolName: "mcpaudit_nonexistent_tool_probe",
              snippet: sanitizeSnippet(errRes.result),
            },
          }),
        );
      }
    } else if (
      errRes.outcome === "error" &&
      code !== undefined &&
      code !== INVALID_PARAMS &&
      code !== METHOD_NOT_FOUND &&
      !(code >= RESERVED_RANGE_START && code <= RESERVED_RANGE_END) &&
      code !== -32002 &&
      ctx.era.era === "modern"
    ) {
      findings.push(
        finding(c6Meta, {
          id: "C6_UNKNOWN_TOOL_ODD_CODE",
          severity: "low",
          title: `Unknown tool produced error code ${code}`,
          detail:
            "The spec illustrates an unknown tool with -32602 (Invalid params). Another code is " +
            "not forbidden, but it is unidiomatic and harder for clients to handle uniformly.",
          evidence: { path: "tools/call", errorCode: code },
        }),
      );
    }

    return findings.length ? fail(c6Meta, findings) : pass(c6Meta);
  },
};
