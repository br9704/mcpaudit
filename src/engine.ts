import { McpClient } from "./protocol/client.js";
import { detectEra } from "./protocol/era.js";
import { createTransport, detectTargetKind } from "./transport/detect.js";
import { isJsonObject, type RawTool } from "./protocol/types.js";
import type { AuditContext, Rule } from "./rules/types.js";
import type { AuditReport, CheckResult } from "./schema/finding.js";
import { summarize } from "./schema/finding.js";
import { PKG_NAME } from "./brand.js";
import { VERSION } from "./version.js";

export interface AuditOptions {
  target: string;
  passthrough?: readonly string[];
  timeoutMs?: number;
  rules: readonly Rule[];
  /** Tool surfaces from other targets, for the cross-server shadowing rule. */
  siblings?: { target: string; tools: RawTool[] }[];
}

function extractTools(result: unknown): RawTool[] {
  if (!isJsonObject(result)) return [];
  const tools = result["tools"];
  if (!Array.isArray(tools)) return [];
  // Keep non-object entries out, but do not otherwise validate: checking
  // whether the server got these right is precisely the job of the rules.
  return tools.filter((t) => isJsonObject(t)) as unknown as RawTool[];
}

/**
 * Run every applicable rule against one target.
 *
 * Era is resolved first and rules that do not apply to it are skipped with a
 * reason rather than failed. As of 2026-08 nothing implements 2026-07-28, so
 * without this the tool would report a wall of false failures against every
 * real server — the fastest way to lose credibility on first contact.
 */
export async function audit(opts: AuditOptions): Promise<AuditReport> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  const timeoutMs = opts.timeoutMs ?? 10_000;

  const transport = createTransport(opts.target, opts.passthrough ?? []);
  const client = new McpClient(transport, { timeoutMs });

  const results: CheckResult[] = [];

  try {
    const era = await detectEra(client);

    // Shared, so N rules do not trigger N round trips.
    const toolsResponse = await client.listTools();
    const tools = extractTools(toolsResponse.result);

    const ctx: AuditContext = {
      client,
      era,
      timeoutMs,
      tools,
      ...(toolsResponse ? { toolsResponse } : {}),
      ...(era.discoverResult ?? era.initializeResult
        ? { handshakeResult: era.discoverResult ?? era.initializeResult }
        : {}),
      ...(opts.siblings ? { siblings: opts.siblings } : {}),
    };

    for (const rule of opts.rules) {
      if (!rule.meta.appliesTo.includes(era.era)) {
        results.push({
          ruleId: rule.meta.id,
          status: "skip",
          skipReason:
            era.era === "unknown"
              ? "server era could not be determined"
              : `applies to ${rule.meta.appliesTo.join("/")} servers; this one is ${era.era}`,
          findings: [],
        });
        continue;
      }
      if (rule.meta.httpOnly && transport.kind !== "http") {
        results.push({
          ruleId: rule.meta.id,
          status: "skip",
          skipReason: "HTTP transport only",
          findings: [],
        });
        continue;
      }

      const started = Date.now();
      try {
        const res = await rule.run(ctx);
        results.push({ ...res, elapsedMs: Date.now() - started });
      } catch (err) {
        // A rule that throws is our bug, not the server's. Report it as an
        // errored check and keep auditing — never abort the whole run.
        results.push({
          ruleId: rule.meta.id,
          status: "error",
          skipReason: err instanceof Error ? err.message : String(err),
          findings: [],
          elapsedMs: Date.now() - started,
        });
      }
    }

    const report: AuditReport = {
      tool: { name: PKG_NAME, version: VERSION },
      startedAt,
      elapsedMs: Date.now() - t0,
      target: {
        raw: opts.target,
        kind: detectTargetKind(opts.target),
        describe: transport.describe,
      },
      era: era.era,
      ...(era.protocolVersion ? { protocolVersion: era.protocolVersion } : {}),
      ...(era.serverInfo ? { serverInfo: era.serverInfo } : {}),
      results,
      findings: results.flatMap((r) => r.findings),
      summary: summarize(results),
    };
    return report;
  } finally {
    await client.close();
  }
}

/** Connect just far enough to read a tool surface — used for sibling targets. */
export async function readToolSurface(
  target: string,
  passthrough: readonly string[] = [],
  timeoutMs = 10_000,
): Promise<RawTool[]> {
  const client = new McpClient(createTransport(target, passthrough), { timeoutMs });
  try {
    await detectEra(client);
    const res = await client.listTools();
    return extractTools(res.result);
  } catch {
    return [];
  } finally {
    await client.close();
  }
}
