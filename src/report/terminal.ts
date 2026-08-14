import { DISPLAY_NAME, FRAMING } from "../brand.js";
import type { AuditReport, CheckResult, Finding, Lane, Severity } from "../schema/finding.js";
import { SEVERITY_ORDER } from "../schema/finding.js";
import { Theme } from "./theme.js";

const SEVERITY_LABEL: Record<Severity, string> = {
  error: "ERROR",
  warn: " WARN",
  low: "  LOW",
  info: " INFO",
};

const LANE_LABEL: Record<Lane, string> = {
  conformance: "Lane A · conformance",
  safety: "Lane B · safety",
};

function iconFor(sev: Severity): "error" | "warn" | "low" | "info" {
  return sev;
}

function wrap(text: string, width: number, indent: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if (line && (line + " " + w).length + indent.length > width) {
      lines.push(indent + line);
      line = w;
    } else {
      line = line ? line + " " + w : w;
    }
  }
  if (line) lines.push(indent + line);
  return lines;
}

function renderFinding(f: Finding, theme: Theme): string[] {
  const out: string[] = [];
  const badge = theme.badge(iconFor(f.severity));
  const label = theme.severity(f.severity, theme.bold(SEVERITY_LABEL[f.severity]));
  const head = theme.segments([
    `${label} ${badge}`.trim(),
    theme.bold(f.title),
    theme.dim(f.id),
  ]);
  out.push(`  ${head}`);

  for (const line of wrap(f.detail, theme.width - 8, "")) out.push(`      ${line}`);

  if (f.evidence?.toolName) {
    out.push(`      ${theme.dim("tool:")} ${f.evidence.toolName}`);
  }
  if (f.evidence?.path) {
    out.push(`      ${theme.dim("at:")}   ${f.evidence.path}`);
  }
  if (f.evidence?.snippet) {
    // Already sanitized upstream; never emit raw server bytes to a terminal.
    out.push(`      ${theme.dim("saw:")}  ${f.evidence.snippet}`);
  }
  if (f.evidence?.errorCode !== undefined) {
    out.push(`      ${theme.dim("code:")} ${f.evidence.errorCode}`);
  }
  const fixLines = wrap(f.remediation, theme.width - 13, "");
  out.push(`      ${theme.dim("fix:")}  ${fixLines[0] ?? ""}`);
  for (const extra of fixLines.slice(1)) out.push(`            ${extra}`);

  const refs = [
    f.specRef ? `spec: ${f.specRef}` : "",
    f.cwe ?? "",
    f.owaspMcp ?? "",
  ].filter(Boolean);
  if (refs.length) out.push(`      ${theme.dim(refs.join(" · "))}`);

  out.push("");
  return out;
}

export function renderTerminal(report: AuditReport, theme: Theme): string {
  const L: string[] = [];
  const { summary } = report;

  // ── header ───────────────────────────────────────────────────────────────
  L.push("");
  L.push(
    theme.segments([
      theme.paint(14, theme.bold(DISPLAY_NAME)),
      theme.dim(`v${report.tool.version}`),
      report.target.describe,
    ]),
  );

  const eraLabel =
    report.era === "modern"
      ? "2026-07-28 (stateless)"
      : report.era === "legacy"
        ? `pre-2026 handshake${report.protocolVersion ? ` · ${report.protocolVersion}` : ""}`
        : "unknown";
  L.push(
    theme.segments([
      `${theme.badge("server")} ${report.serverInfo?.name ?? "unidentified server"}`.trim(),
      report.serverInfo?.version ? `v${report.serverInfo.version}` : "",
      `protocol: ${eraLabel}`,
    ]),
  );
  L.push(theme.rule());
  L.push("");

  // ── findings, grouped by lane then severity ──────────────────────────────
  const lanes: Lane[] = ["conformance", "safety"];
  let printed = 0;
  for (const lane of lanes) {
    const laneFindings = report.findings
      .filter((f) => f.lane === lane)
      .sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]);
    if (!laneFindings.length) continue;
    printed += laneFindings.length;
    L.push(`${theme.badge("lane")} ${theme.bold(LANE_LABEL[lane])}`.trim());
    L.push("");
    for (const f of laneFindings) L.push(...renderFinding(f, theme));
  }

  if (printed === 0) {
    L.push(`  ${theme.status("pass", theme.badge("pass"))} No findings.`);
    L.push("");
  }

  // ── skipped checks: shown, never silent ──────────────────────────────────
  const skipped = report.results.filter((r) => r.status === "skip");
  if (skipped.length) {
    L.push(theme.dim(`Skipped (${skipped.length}) — not applicable to this server:`));
    for (const s of skipped) {
      L.push(theme.dim(`  ${s.ruleId} — ${s.skipReason ?? "not applicable"}`));
    }
    L.push("");
  }

  const errored = report.results.filter((r) => r.status === "error");
  if (errored.length) {
    L.push(theme.status("error", `Checks that could not run (${errored.length}):`));
    for (const e of errored) {
      L.push(`  ${e.ruleId} — ${e.skipReason ?? "internal error"}`);
    }
    L.push("");
  }

  // ── summary ──────────────────────────────────────────────────────────────
  L.push(theme.rule());
  const counts: string[] = [];
  for (const sev of ["error", "warn", "low", "info"] as Severity[]) {
    const n = summary.bySeverity[sev];
    if (n > 0) counts.push(theme.severity(sev, `${n} ${sev}`));
  }
  L.push(
    theme.segments([
      counts.length ? counts.join(", ") : theme.status("pass", "clean"),
      `${summary.passed} passed`,
      `${summary.failed} failed`,
      `${summary.skipped} skipped`,
      `${(report.elapsedMs / 1000).toFixed(1)}s`,
    ]),
  );
  // The framing is locked (CLAUDE.md) and belongs on the report itself, not
  // only in the README, so it travels with any screenshot.
  L.push(theme.dim(FRAMING));
  L.push("");

  return L.join("\n");
}

export function renderCheckLine(r: CheckResult, theme: Theme): string {
  const icon = r.status === "pass" ? "pass" : r.status === "skip" ? "skip" : "error";
  return `${theme.status(r.status, theme.badge(icon))} ${r.ruleId}`;
}
