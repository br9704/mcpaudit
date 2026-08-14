import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { audit } from "../src/engine.js";
import { ALL_RULES } from "../src/registry.js";
import { renderJson } from "../src/report/json.js";
import { renderSarif } from "../src/report/sarif.js";
import { renderTerminal } from "../src/report/terminal.js";
import { Theme } from "../src/report/theme.js";
import { ALL_RULE_META } from "../src/registry.js";

const HOSTILE = fileURLToPath(new URL("../fixtures/hostile/server.mjs", import.meta.url));

const MODES = [
  "garbage",
  "truncated",
  "wrong-shape",
  "huge",
  "nulls",
  "deep",
  "silent",
  "crash",
  "flood",
  "nonewline",
] as const;

/**
 * The robustness pass. A linter pointed at a hostile server must degrade, never
 * crash: no throw, no hang, no unhandled rejection, and a report that still
 * renders in every format.
 */
let unhandled: unknown[] = [];
const onUnhandled = (r: unknown) => unhandled.push(r);

beforeEach(() => {
  unhandled = [];
  process.on("unhandledRejection", onUnhandled);
});
afterEach(() => {
  process.off("unhandledRejection", onUnhandled);
});

describe("hostile servers", () => {
  it.each(MODES)("survives mode: %s", async (mode) => {
    const report = await audit({
      target: `node ${HOSTILE} ${mode}`,
      rules: ALL_RULES,
      // Short, so "silent" and "slow" cannot stall the suite.
      timeoutMs: 1200,
    });

    expect(report).toBeDefined();
    expect(report.results.length).toBeGreaterThan(0);
    // Every check must land in a defined state, never undefined or thrown.
    for (const r of report.results) {
      expect(["pass", "fail", "skip", "error"]).toContain(r.status);
    }

    // And the report must still render in all three formats.
    expect(() => renderJson(report)).not.toThrow();
    expect(() => JSON.parse(renderJson(report))).not.toThrow();
    expect(() => renderSarif(report, ALL_RULE_META)).not.toThrow();
    expect(() =>
      renderTerminal(report, new Theme({ color: false, icons: "none", width: 80 })),
    ).not.toThrow();
  });

  it("does not raise unhandled rejections across every hostile mode", async () => {
    for (const mode of MODES) {
      await audit({ target: `node ${HOSTILE} ${mode}`, rules: ALL_RULES, timeoutMs: 800 });
    }
    // Give any stray microtask a chance to reject.
    await new Promise((r) => setTimeout(r, 50));
    expect(unhandled).toEqual([]);
  });

  it("treats a silent server as unknown rather than hanging", async () => {
    const start = Date.now();
    const report = await audit({
      target: `node ${HOSTILE} silent`,
      rules: ALL_RULES,
      timeoutMs: 700,
    });
    expect(report.era).toBe("unknown");
    // Must be bounded by the timeout budget, not by the server's goodwill.
    expect(Date.now() - start).toBeLessThan(20_000);
  });

  it("handles a server that exits mid-conversation", async () => {
    const report = await audit({
      target: `node ${HOSTILE} crash`,
      rules: ALL_RULES,
      timeoutMs: 800,
    });
    expect(report.era).toBe("unknown");
  });

  it("parses a large tool list without falling over", async () => {
    const report = await audit({
      target: `node ${HOSTILE} huge`,
      rules: ALL_RULES,
      timeoutMs: 4000,
    });
    // 2000 tools, each with a 500-char description: it must produce a report.
    expect(report.results.some((r) => r.ruleId === "C2_TOOLS_HYGIENE")).toBe(true);
  });

  it("ignores non-object entries in a tools array", async () => {
    const report = await audit({
      target: `node ${HOSTILE} nulls`,
      rules: ALL_RULES,
      timeoutMs: 2000,
    });
    // null/42/"string"/[] must be dropped rather than crash a rule; the one
    // object without an inputSchema should still be reported.
    const errored = report.results.filter((r) => r.status === "error");
    expect(errored, JSON.stringify(errored)).toEqual([]);
  });

  it("bounds a pathologically deep schema instead of recursing forever", async () => {
    const report = await audit({
      target: `node ${HOSTILE} deep`,
      rules: ALL_RULES,
      timeoutMs: 4000,
    });
    expect(report.results.filter((r) => r.status === "error")).toEqual([]);
    // A 400-deep schema should trip the composition-complexity bound.
    expect(report.findings.map((f) => f.id)).toContain("S4_SCHEMA_COMPLEXITY");
  });
});
