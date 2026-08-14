import type { AuditReport } from "../schema/finding.js";

/**
 * Machine-readable report. Stable field names — Sprint 6 commits raw `--json`
 * output for every audited server, so this shape is part of the public record
 * and should not churn without a version bump.
 */
export function renderJson(report: AuditReport): string {
  return JSON.stringify({ schemaVersion: 1, ...report }, null, 2) + "\n";
}

/** Multi-target runs emit an array, so a consumer can tell them apart. */
export function renderJsonMany(reports: readonly AuditReport[]): string {
  return JSON.stringify({ schemaVersion: 1, reports }, null, 2) + "\n";
}
