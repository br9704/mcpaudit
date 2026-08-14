import { PKG_NAME, REPO_URL } from "../brand.js";
import type { AuditReport, Finding, RuleMeta, Severity } from "../schema/finding.js";

/**
 * SARIF 2.1.0 output, for GitHub code scanning and any other CI that speaks it.
 * Almost no competitor in this space emits SARIF, and it is what makes the tool
 * droppable into an existing pipeline rather than a thing you read by eye.
 */
const SARIF_SCHEMA =
  "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json";

type SarifLevel = "error" | "warning" | "note" | "none";

function levelFor(sev: Severity): SarifLevel {
  switch (sev) {
    case "error":
      return "error";
    case "warn":
      return "warning";
    case "low":
    case "info":
      return "note";
  }
}

interface SarifRule {
  id: string;
  name: string;
  shortDescription: { text: string };
  fullDescription: { text: string };
  help: { text: string; markdown: string };
  defaultConfiguration: { level: SarifLevel };
  properties: Record<string, unknown>;
}

function ruleFromMeta(meta: RuleMeta): SarifRule {
  const fpText = meta.falsePositiveModes.map((m) => `- ${m}`).join("\n");
  const markdown = [
    `**${meta.title}**`,
    "",
    meta.why,
    "",
    `**Remediation:** ${meta.remediation}`,
    "",
    "**Known false-positive modes:**",
    fpText,
    meta.specRef ? `\n**Spec:** ${meta.specRef}` : "",
    meta.source ? `\n**Source:** ${meta.source}` : "",
  ].join("\n");

  const tags = [meta.lane, ...(meta.cwe ? [meta.cwe] : []), ...(meta.owaspMcp ? [meta.owaspMcp] : [])];

  return {
    id: meta.id,
    name: meta.id,
    shortDescription: { text: meta.title },
    fullDescription: { text: meta.why },
    help: {
      text: `${meta.why}\n\nRemediation: ${meta.remediation}`,
      markdown,
    },
    defaultConfiguration: { level: levelFor(meta.defaultSeverity) },
    properties: {
      tags,
      lane: meta.lane,
      appliesTo: meta.appliesTo,
      falsePositiveModes: meta.falsePositiveModes,
      ...(meta.specRef ? { specRef: meta.specRef } : {}),
      ...(meta.source ? { source: meta.source } : {}),
      ...(meta.cwe ? { cwe: meta.cwe } : {}),
      ...(meta.owaspMcp ? { owaspMcp: meta.owaspMcp } : {}),
    },
  };
}

function resultFor(f: Finding, ruleIndex: number, targetUri: string) {
  const locationText = f.evidence?.path ?? f.evidence?.toolName ?? "server";
  return {
    ruleId: f.ruleId,
    ruleIndex,
    level: levelFor(f.severity),
    message: {
      text: f.evidence?.snippet
        ? `${f.detail}\n\nSaw: ${f.evidence.snippet}`
        : f.detail,
    },
    locations: [
      {
        physicalLocation: {
          // MCP servers have no file/line, so we use a logical URI for the
          // target and put the real position in `logicalLocations`.
          artifactLocation: { uri: targetUri },
          region: { startLine: 1 },
        },
        logicalLocations: [{ name: locationText, kind: "member" }],
      },
    ],
    properties: {
      severity: f.severity,
      lane: f.lane,
      falsePositiveModes: f.falsePositiveModes,
      remediation: f.remediation,
      ...(f.evidence?.errorCode !== undefined ? { errorCode: f.evidence.errorCode } : {}),
      ...(f.evidence?.httpStatus !== undefined ? { httpStatus: f.evidence.httpStatus } : {}),
    },
  };
}

/**
 * @param report the audit result
 * @param rules  metadata for every rule that ran, so the SARIF driver
 *               advertises the full ruleset rather than only rules that fired
 */
export function renderSarif(report: AuditReport, rules: readonly RuleMeta[]): string {
  const sarifRules = rules.map(ruleFromMeta);
  const indexById = new Map(sarifRules.map((r, i) => [r.id, i]));

  // A URI is required; a stdio command is not one, so encode it safely.
  const targetUri =
    report.target.kind === "http"
      ? report.target.raw
      : `mcp-stdio:${encodeURIComponent(report.target.raw)}`;

  const sarif = {
    $schema: SARIF_SCHEMA,
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: PKG_NAME,
            version: report.tool.version,
            informationUri: REPO_URL,
            rules: sarifRules,
          },
        },
        invocations: [
          {
            executionSuccessful: true,
            startTimeUtc: report.startedAt,
            commandLine: report.target.describe,
          },
        ],
        results: report.findings.map((f) =>
          resultFor(f, indexById.get(f.ruleId) ?? 0, targetUri),
        ),
        properties: {
          era: report.era,
          ...(report.protocolVersion ? { protocolVersion: report.protocolVersion } : {}),
          summary: report.summary,
        },
      },
    ],
  };

  return JSON.stringify(sarif, null, 2) + "\n";
}

/**
 * Multi-target runs become multiple SARIF runs in one log, which is exactly
 * what the format is for.
 */
export function renderSarifMany(
  reports: readonly AuditReport[],
  rules: readonly RuleMeta[],
): string {
  const runs = reports.map((r) => {
    const single = JSON.parse(renderSarif(r, rules)) as { runs: unknown[] };
    return single.runs[0];
  });
  return JSON.stringify({ $schema: SARIF_SCHEMA, version: "2.1.0", runs }, null, 2) + "\n";
}
