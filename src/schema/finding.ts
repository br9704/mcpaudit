/**
 * CONTRACT: the Finding model and the rule-plugin interface.
 *
 * Two rules govern this file:
 *  1. Every check is *self-describing* — its metadata lives beside its logic, so
 *     RULES.md can be generated from code and documentation cannot drift.
 *  2. `falsePositiveModes` is REQUIRED, not optional. CLAUDE.md's framing is
 *     "a first-pass linter … not a security audit"; a check that cannot state
 *     how it misfires has no business shipping.
 */
import type { Era, JsonValue } from "../protocol/types.js";

export type Severity = "info" | "low" | "warn" | "error";
export type Lane = "conformance" | "safety";
export type CheckStatus = "pass" | "fail" | "skip" | "error";

export const SEVERITY_ORDER: Record<Severity, number> = {
  info: 0,
  low: 1,
  warn: 2,
  error: 3,
};

export function atOrAbove(s: Severity, threshold: Severity): boolean {
  return SEVERITY_ORDER[s] >= SEVERITY_ORDER[threshold];
}

export interface Evidence {
  /** Where the finding lives, e.g. `tools/list → tools[3].description`. */
  path?: string;
  /** Verbatim excerpt, truncated and control-char escaped before display. */
  snippet?: string;
  toolName?: string;
  /** JSON-RPC error code observed, when the finding is about an error. */
  errorCode?: number;
  httpStatus?: number;
}

export interface Finding {
  /** Stable identifier, e.g. `C1_DISCOVER_MISSING`, `S1_TOOL_POISONING`. */
  id: string;
  /** The rule that produced it (findings from one rule share a ruleId). */
  ruleId: string;
  lane: Lane;
  severity: Severity;
  title: string;
  detail: string;
  evidence?: Evidence;
  /** Link into the spec, so a maintainer can check our reading. */
  specRef?: string;
  cwe?: string;
  owaspMcp?: string;
  /** Copied from rule metadata onto every finding: the reader needs it here. */
  falsePositiveModes: string[];
  remediation: string;
}

export interface RuleMeta {
  id: string;
  lane: Lane;
  title: string;
  /** Why this matters — one or two sentences, used verbatim in RULES.md. */
  why: string;
  /** Eras this rule is meaningful for. Others are skipped, never failed. */
  appliesTo: Era[];
  defaultSeverity: Severity;
  falsePositiveModes: string[];
  remediation: string;
  specRef?: string;
  cwe?: string;
  owaspMcp?: string;
  /** Primary source for a safety heuristic (paper, advisory, CVE). */
  source?: string;
  /** True when the rule needs the HTTP transport. */
  httpOnly?: boolean;
}

export interface CheckResult {
  ruleId: string;
  status: CheckStatus;
  /** Required when status is "skip" — the report shows it, so it must be real. */
  skipReason?: string;
  findings: Finding[];
  elapsedMs?: number;
}

export interface AuditTarget {
  raw: string;
  kind: "stdio" | "http";
  describe: string;
}

export interface AuditReport {
  tool: { name: string; version: string };
  startedAt: string;
  elapsedMs: number;
  target: AuditTarget;
  era: Era;
  protocolVersion?: string;
  serverInfo?: { name?: string; version?: string; title?: string };
  results: CheckResult[];
  findings: Finding[];
  summary: {
    total: number;
    bySeverity: Record<Severity, number>;
    byLane: Record<Lane, number>;
    passed: number;
    failed: number;
    skipped: number;
    errored: number;
  };
}

/** Convenience for rules: build a finding that inherits the rule's metadata. */
export function finding(
  meta: RuleMeta,
  init: {
    id?: string;
    severity?: Severity;
    title?: string;
    detail: string;
    evidence?: Evidence;
  },
): Finding {
  return {
    id: init.id ?? meta.id,
    ruleId: meta.id,
    lane: meta.lane,
    severity: init.severity ?? meta.defaultSeverity,
    title: init.title ?? meta.title,
    detail: init.detail,
    ...(init.evidence ? { evidence: init.evidence } : {}),
    ...(meta.specRef ? { specRef: meta.specRef } : {}),
    ...(meta.cwe ? { cwe: meta.cwe } : {}),
    ...(meta.owaspMcp ? { owaspMcp: meta.owaspMcp } : {}),
    falsePositiveModes: meta.falsePositiveModes,
    remediation: meta.remediation,
  };
}

export function summarize(results: CheckResult[]): AuditReport["summary"] {
  const findings = results.flatMap((r) => r.findings);
  const bySeverity: Record<Severity, number> = { info: 0, low: 0, warn: 0, error: 0 };
  const byLane: Record<Lane, number> = { conformance: 0, safety: 0 };
  for (const f of findings) {
    bySeverity[f.severity]++;
    byLane[f.lane]++;
  }
  return {
    total: findings.length,
    bySeverity,
    byLane,
    passed: results.filter((r) => r.status === "pass").length,
    failed: results.filter((r) => r.status === "fail").length,
    skipped: results.filter((r) => r.status === "skip").length,
    errored: results.filter((r) => r.status === "error").length,
  };
}

/** Highest severity present, or undefined when there are no findings. */
export function maxSeverity(findings: readonly Finding[]): Severity | undefined {
  let max: Severity | undefined;
  for (const f of findings) {
    if (max === undefined || SEVERITY_ORDER[f.severity] > SEVERITY_ORDER[max]) max = f.severity;
  }
  return max;
}

/**
 * Escape control characters and truncate. Findings quote hostile server output
 * verbatim, so nothing may reach a terminal (or a JSON consumer) unescaped —
 * that would let an audited server inject ANSI into the very report that is
 * flagging it for injecting ANSI.
 */
export function sanitizeSnippet(input: unknown, maxLen = 200): string {
  const s = typeof input === "string" ? input : JSON.stringify(input as JsonValue);
  if (s === undefined) return "";
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    if (code < 0x20 || code === 0x7f) {
      out += ch === "\n" ? "\\n" : ch === "\t" ? "\\t" : ch === "\r" ? "\\r" : `\\x${code.toString(16).padStart(2, "0")}`;
    } else if (code >= 0x80 && code <= 0x9f) {
      out += `\\x${code.toString(16)}`;
    } else if (
      // Zero-width and bidi controls: render visibly rather than invisibly.
      code === 0x200b || code === 0x200c || code === 0x200d || code === 0xfeff ||
      code === 0x2060 || (code >= 0x202a && code <= 0x202e)
    ) {
      out += `\\u{${code.toString(16)}}`;
    } else {
      out += ch;
    }
    if (out.length >= maxLen) return out.slice(0, maxLen) + "…";
  }
  return out;
}
