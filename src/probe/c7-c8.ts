/** C7 HTTP header validation · C8 legacy pre-initialize answering. */
import { finding, type Finding, type RuleMeta } from "../schema/finding.js";
import type { AuditContext, Rule } from "../rules/types.js";
import { fail, pass } from "../rules/types.js";
import { HEADER_MISMATCH } from "../protocol/types.js";
import { HttpTransport } from "../transport/http.js";
import { McpClient } from "../protocol/client.js";
import { StdioTransport } from "../transport/stdio.js";

// ─── C7 ───────────────────────────────────────────────────────────────────────

export const c7Meta: RuleMeta = {
  id: "C7_HTTP_HEADERS",
  lane: "conformance",
  title: "HTTP header/body agreement is enforced",
  why:
    "Streamable HTTP mirrors the protocol version, method and target name into headers so " +
    "load balancers and gateways can route without parsing the body. If a server does not verify " +
    "that the headers match the body, an intermediary can route on one value while the server " +
    "executes another — the exact confused-deputy split the spec added -32020 to close. Servers " +
    "MUST reject a mismatch with 400 and -32020.",
  appliesTo: ["modern"],
  defaultSeverity: "warn",
  httpOnly: true,
  falsePositiveModes: [
    "stdio servers have no header layer and are skipped.",
    "A gateway that normalises or rewrites headers before the origin server can mask a genuine " +
      "mismatch, or manufacture one.",
  ],
  remediation:
    "Compare MCP-Protocol-Version, Mcp-Method and Mcp-Name against the request body and reject " +
    "mismatches with HTTP 400 and JSON-RPC -32020; answer GET and DELETE with 405.",
  specRef:
    "https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http",
  cwe: "CWE-444",
};

export const c7: Rule = {
  meta: c7Meta,
  async run(ctx: AuditContext) {
    const findings: Finding[] = [];
    const transport = ctx.client.transport;
    if (!(transport instanceof HttpTransport)) return pass(c7Meta);

    // Header says one version, body says another.
    const mismatch = await ctx.client.listTools({
      headerOverrides: { "MCP-Protocol-Version": "2020-01-01" },
    });

    if (mismatch.outcome === "result") {
      findings.push(
        finding(c7Meta, {
          id: "C7_MISMATCH_ACCEPTED",
          severity: "error",
          title: "Server accepted a request whose header contradicted its body",
          detail:
            "MCP-Protocol-Version said 2020-01-01 while the body's _meta said " +
            `${ctx.client.protocolVersion}, and the server answered normally. It MUST reject ` +
            "this with HTTP 400 and -32020, otherwise an intermediary routing on the header can " +
            "be desynchronised from what the server actually executes.",
          evidence: {
            path: "tools/list (mismatched MCP-Protocol-Version)",
            ...(mismatch.http ? { httpStatus: mismatch.http.status } : {}),
          },
        }),
      );
    } else if (mismatch.outcome === "error" && mismatch.error) {
      if (mismatch.error.code !== HEADER_MISMATCH) {
        findings.push(
          finding(c7Meta, {
            id: "C7_MISMATCH_WRONG_CODE",
            severity: "low",
            title: `Header mismatch rejected with ${mismatch.error.code} instead of -32020`,
            detail:
              "The server did refuse the request, but -32020 (HeaderMismatch) is the allocated " +
              "code and is what intermediaries look for.",
            evidence: {
              path: "tools/list (mismatched MCP-Protocol-Version)",
              errorCode: mismatch.error.code,
              ...(mismatch.http ? { httpStatus: mismatch.http.status } : {}),
            },
          }),
        );
      } else if (mismatch.http && mismatch.http.status !== 400) {
        findings.push(
          finding(c7Meta, {
            id: "C7_MISMATCH_WRONG_STATUS",
            severity: "low",
            title: `Header mismatch returned HTTP ${mismatch.http.status} instead of 400`,
            detail: "The spec requires 400 Bad Request alongside -32020.",
            evidence: {
              path: "tools/list (mismatched MCP-Protocol-Version)",
              httpStatus: mismatch.http.status,
            },
          }),
        );
      }
    }

    // GET and DELETE belonged to the removed session/stream mechanics.
    for (const method of ["GET", "DELETE"] as const) {
      const status = await transport.probeMethod(method, Math.min(ctx.timeoutMs, 5000));
      if (status !== undefined && status !== 405 && status < 500) {
        findings.push(
          finding(c7Meta, {
            id: "C7_NON_POST_NOT_405",
            severity: "low",
            title: `${method} on the MCP endpoint returned ${status}, not 405`,
            detail:
              `Revision 2026-07-28 removed the GET stream and DELETE session teardown. A server ` +
              `supporting only this revision SHOULD answer ${method} with 405 Method Not Allowed.`,
            evidence: { path: `${method} (MCP endpoint)`, httpStatus: status },
          }),
        );
      }
    }

    return findings.length ? fail(c7Meta, findings) : pass(c7Meta);
  },
};

// ─── C8 ───────────────────────────────────────────────────────────────────────

export const c8Meta: RuleMeta = {
  id: "C8_LEGACY_PREINIT",
  lane: "conformance",
  title: "Legacy server answers requests before initialize",
  why:
    "The spec warns about this case directly: some initialize-era servers do not check that a " +
    "request arrived after the handshake, so an era-ambiguous method such as tools/call is " +
    "processed under legacy semantics even when the client believes it is speaking the stateless " +
    "protocol. The result is a client and server disagreeing about the negotiated version while " +
    "both think the exchange succeeded. It is also why probing with server/discover first is " +
    "RECOMMENDED even for clients that only support modern revisions.",
  appliesTo: ["legacy"],
  defaultSeverity: "warn",
  falsePositiveModes: [
    "Answering before initialize is not forbidden by the older revisions — it is a robustness " +
      "and version-negotiation hazard, not a specification violation, and is reported as such.",
    "The official @modelcontextprotocol/server-everything behaves this way, so seeing it does " +
      "not imply an unusual or untrustworthy server.",
  ],
  remediation:
    "Reject requests that arrive before a successful initialize handshake, or migrate to " +
    "2026-07-28 where every request carries its own protocol version.",
  specRef:
    "https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio#backward-compatibility",
};

export const c8: Rule = {
  meta: c8Meta,
  async run(ctx: AuditContext) {
    // Needs a pristine connection: our audit client already handshook.
    const transport = ctx.client.transport;
    if (!(transport instanceof StdioTransport)) {
      return {
        ruleId: c8Meta.id,
        status: "skip" as const,
        skipReason: "needs a fresh stdio connection to test the pre-handshake state",
        findings: [],
      };
    }

    const fresh = new McpClient(new StdioTransport(transport.describe), {
      timeoutMs: Math.min(ctx.timeoutMs, 5000),
    });
    try {
      const res = await fresh.listTools({ omitMeta: true });
      if (res.outcome === "result") {
        return fail(c8Meta, [
          finding(c8Meta, {
            id: "C8_ANSWERS_BEFORE_INITIALIZE",
            severity: "warn",
            title: "Server answered tools/list before any initialize handshake",
            detail:
              "On a fresh connection, with no initialize sent, this server returned a full " +
              "tools/list. A client that supports both eras can therefore get a legacy-semantics " +
              "answer while believing it negotiated a modern version. Probing with " +
              "server/discover first turns this ambiguity into a deterministic failure.",
            evidence: { path: "tools/list (before initialize)" },
          }),
        ]);
      }
      return pass(c8Meta);
    } finally {
      await fresh.close();
    }
  },
};
