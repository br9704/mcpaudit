import { describe, expect, it } from "vitest";
import {
  atOrAbove,
  finding,
  maxSeverity,
  sanitizeSnippet,
  summarize,
  type AuditReport,
  type RuleMeta,
} from "../src/schema/finding.js";
import { renderTerminal } from "../src/report/terminal.js";
import { renderJson } from "../src/report/json.js";
import { renderSarif } from "../src/report/sarif.js";
import { Theme } from "../src/report/theme.js";
import { FRAMING } from "../src/brand.js";

const META: RuleMeta = {
  id: "T1_STUB",
  lane: "safety",
  title: "Stub finding",
  why: "Exercises the report pipeline.",
  appliesTo: ["modern", "legacy"],
  defaultSeverity: "warn",
  falsePositiveModes: ["Always, it is a stub."],
  remediation: "Nothing to do.",
  specRef: "https://example.invalid/spec",
  cwe: "CWE-77",
  owaspMcp: "MCP-01",
};

function stubReport(): AuditReport {
  const f = finding(META, { detail: "A stub finding for format tests." });
  const results = [{ ruleId: META.id, status: "fail" as const, findings: [f] }];
  return {
    tool: { name: "@aethereumdev/mcp-audit", version: "0.1.0" },
    startedAt: "2026-08-14T00:00:00.000Z",
    elapsedMs: 42,
    target: { raw: "npx -y demo", kind: "stdio", describe: "npx -y demo" },
    era: "legacy",
    protocolVersion: "2025-06-18",
    serverInfo: { name: "demo", version: "1.0.0" },
    results,
    findings: [f],
    summary: summarize(results),
  };
}

describe("severity helpers", () => {
  it("orders severities for --fail-on", () => {
    expect(atOrAbove("error", "warn")).toBe(true);
    expect(atOrAbove("warn", "warn")).toBe(true);
    expect(atOrAbove("info", "warn")).toBe(false);
    expect(atOrAbove("info", "info")).toBe(true);
  });

  it("finds the worst severity present", () => {
    const mk = (severity: "info" | "warn" | "error") => finding(META, { detail: "x", severity });
    expect(maxSeverity([mk("info"), mk("error"), mk("warn")])).toBe("error");
    expect(maxSeverity([])).toBeUndefined();
  });
});

describe("sanitizeSnippet", () => {
  it("escapes ANSI so a hostile server cannot inject into our own report", () => {
    const out = sanitizeSnippet("[31mRED[0m");
    expect(out).not.toContain("");
    expect(out).toContain("\\x1b");
  });

  it("renders zero-width and bidi characters visibly", () => {
    expect(sanitizeSnippet("a​b")).toContain("\\u{200b}");
    expect(sanitizeSnippet("a‮b")).toContain("\\u{202e}");
  });

  it("escapes newlines and truncates", () => {
    expect(sanitizeSnippet("a\nb")).toBe("a\\nb");
    expect(sanitizeSnippet("x".repeat(500), 50)).toHaveLength(51); // 50 + ellipsis
  });
});

describe("report formats", () => {
  it("renders the terminal report with the locked framing and no ANSI when colour is off", () => {
    const out = renderTerminal(stubReport(), new Theme({ color: false, icons: "none", width: 80 }));
    expect(out).toContain("Stub finding");
    expect(out).toContain("Lane B · safety");
    expect(out).toContain(FRAMING);
    expect(out).not.toContain("[");
  });

  it("emits ANSI when colour is on", () => {
    const out = renderTerminal(stubReport(), new Theme({ color: true, icons: "plain", width: 80 }));
    expect(out).toContain("[");
  });

  it("renders valid JSON carrying the finding and summary", () => {
    const parsed = JSON.parse(renderJson(stubReport())) as {
      schemaVersion: number;
      findings: { id: string; falsePositiveModes: string[] }[];
      summary: { total: number };
    };
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.findings[0]?.id).toBe("T1_STUB");
    // False-positive modes travel with every finding, not just the docs.
    expect(parsed.findings[0]?.falsePositiveModes.length).toBeGreaterThan(0);
    expect(parsed.summary.total).toBe(1);
  });

  it("renders SARIF 2.1.0 with a well-formed driver, rules and results", () => {
    const sarif = JSON.parse(renderSarif(stubReport(), [META])) as {
      $schema: string;
      version: string;
      runs: {
        tool: { driver: { name: string; rules: { id: string }[] } };
        results: { ruleId: string; ruleIndex: number; level: string; locations: unknown[] }[];
      }[];
    };

    expect(sarif.version).toBe("2.1.0");
    expect(sarif.$schema).toContain("sarif-schema-2.1.0.json");
    expect(sarif.runs).toHaveLength(1);

    const run = sarif.runs[0]!;
    expect(run.tool.driver.name).toBe("@aethereumdev/mcp-audit");
    expect(run.tool.driver.rules.map((r) => r.id)).toContain("T1_STUB");

    const result = run.results[0]!;
    expect(result.ruleId).toBe("T1_STUB");
    // ruleIndex must point at the matching rule in driver.rules.
    expect(run.tool.driver.rules[result.ruleIndex]?.id).toBe("T1_STUB");
    expect(result.level).toBe("warning");
    expect(result.locations).toHaveLength(1);
  });

  it("maps severities onto SARIF levels", () => {
    const levels = (["error", "warn", "low", "info"] as const).map((severity) => {
      const r = stubReport();
      const f = finding(META, { detail: "x", severity });
      r.findings = [f];
      r.results = [{ ruleId: META.id, status: "fail", findings: [f] }];
      const parsed = JSON.parse(renderSarif(r, [META])) as {
        runs: { results: { level: string }[] }[];
      };
      return parsed.runs[0]!.results[0]!.level;
    });
    expect(levels).toEqual(["error", "warning", "note", "note"]);
  });
});
