import type { McpClient } from "../protocol/client.js";
import type { EraDetection, JsonObject, RawTool, RpcResponse } from "../protocol/types.js";
import type { CheckResult, RuleMeta } from "../schema/finding.js";

/**
 * Everything a check is given. Expensive calls (`tools/list`) are made once by
 * the engine and shared, so twenty rules do not hammer the server twenty times —
 * which would both be slow and change the thing we are measuring.
 */
export interface AuditContext {
  client: McpClient;
  era: EraDetection;
  timeoutMs: number;
  /** Cached `tools/list` response, or undefined if the call failed. */
  toolsResponse?: RpcResponse;
  /** Tools parsed out of `toolsResponse`; empty when the server exposed none. */
  tools: RawTool[];
  /** A second `tools/list`, used to check deterministic ordering. */
  toolsResponseSecond?: RpcResponse;
  /** `server/discover` result (modern) or `initialize` result (legacy). */
  handshakeResult?: JsonObject;
  /** Tool surfaces of the other targets, for cross-server shadowing. */
  siblings?: { target: string; tools: RawTool[] }[];
}

export interface Rule {
  meta: RuleMeta;
  run(ctx: AuditContext): Promise<CheckResult> | CheckResult;
}

/** Helpers so a rule body stays about the check, not about bookkeeping. */
export function pass(meta: RuleMeta): CheckResult {
  return { ruleId: meta.id, status: "pass", findings: [] };
}

export function skip(meta: RuleMeta, reason: string): CheckResult {
  return { ruleId: meta.id, status: "skip", skipReason: reason, findings: [] };
}

export function fail(meta: RuleMeta, findings: CheckResult["findings"]): CheckResult {
  return {
    ruleId: meta.id,
    status: findings.length ? "fail" : "pass",
    findings,
  };
}
