import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { audit } from "../src/engine.js";
import { CONFORMANCE_RULES } from "../src/registry.js";
import type { AuditReport } from "../src/schema/finding.js";

const fx = (name: string) =>
  `node ${fileURLToPath(new URL(`../fixtures/${name}/server.mjs`, import.meta.url))}`;

async function auditFixture(name: string): Promise<AuditReport> {
  return audit({ target: fx(name), rules: CONFORMANCE_RULES, timeoutMs: 5000 });
}

const ids = (r: AuditReport) => r.findings.map((f) => f.id);
const statusOf = (r: AuditReport, ruleId: string) =>
  r.results.find((x) => x.ruleId === ruleId)?.status;

describe("Lane A — pass fixture", () => {
  it("reports nothing at all against a conformant 2026-07-28 server", async () => {
    const r = await auditFixture("modern-good");
    expect(r.era).toBe("modern");
    expect(r.findings).toEqual([]);
    // Every applicable check must actively pass, not silently skip.
    for (const id of ["C0_PROTOCOL_ERA", "C1_DISCOVER", "C2_TOOLS_HYGIENE", "C3_META_VALIDATION", "C4_UNKNOWN_METHOD", "C5_BOUNDED_TIME", "C6_RESULT_SHAPE"]) {
      expect(statusOf(r, id), id).toBe("pass");
    }
  });

  it("skips HTTP-only and legacy-only checks rather than failing them", async () => {
    const r = await auditFixture("modern-good");
    expect(statusOf(r, "C7_HTTP_HEADERS")).toBe("skip");
    expect(statusOf(r, "C8_LEGACY_PREINIT")).toBe("skip");
    const c7 = r.results.find((x) => x.ruleId === "C7_HTTP_HEADERS");
    expect(c7?.skipReason).toBeTruthy();
  });
});

describe("Lane A — fail fixture", () => {
  it("catches every deliberate defect in modern-bad", async () => {
    const r = await auditFixture("modern-bad");
    const found = ids(r);

    // C1: discovery result is incomplete
    expect(found).toContain("C1_NO_CAPABILITIES");
    expect(found).toContain("C1_NO_TTLMS");
    expect(found).toContain("C1_NO_CACHESCOPE");
    expect(found).toContain("C1_NO_SERVERINFO");

    // C2: tool hygiene
    expect(found).toContain("C2_NO_INPUT_SCHEMA");
    expect(found).toContain("C2_INPUT_SCHEMA_ROOT_TYPE");
    expect(found).toContain("C2_TOOL_NAME_CHARSET");
    expect(found).toContain("C2_DUPLICATE_TOOL_NAME");
    expect(found).toContain("C2_NONDETERMINISTIC_ORDER");
    expect(found).toContain("C2_LIST_NO_TTLMS");
    expect(found).toContain("C2_LIST_NO_CACHESCOPE");

    // C3: does not validate required _meta — once per omitted field
    expect(found.filter((i) => i === "C3_ACCEPTS_MALFORMED_META")).toHaveLength(3);

    // C4 / C6
    expect(found).toContain("C4_UNKNOWN_METHOD_SUCCEEDED");
    expect(found).toContain("C6_NO_RESULT_TYPE");
    expect(found).toContain("C6_UNKNOWN_TOOL_NOT_AN_ERROR");
  });

  it("flags a reserved-range error code the spec never defined", async () => {
    const r = await auditFixture("reserved-code");
    const f = r.findings.find((x) => x.id === "C6_RESERVED_CODE_MISUSE");
    expect(f).toBeDefined();
    expect(f?.severity).toBe("error");
    expect(f?.evidence?.errorCode).toBe(-32050);
  });
});

describe("Lane A — legacy lane", () => {
  it("reports the pre-2026 revision without failing modern-only checks", async () => {
    const r = await auditFixture("legacy");
    expect(r.era).toBe("legacy");
    expect(ids(r)).toContain("C0_PRE_2026_PROTOCOL");

    // The whole point of era-awareness: modern-only checks must be skipped.
    expect(statusOf(r, "C1_DISCOVER")).toBe("skip");
    expect(statusOf(r, "C3_META_VALIDATION")).toBe("skip");
    expect(statusOf(r, "C7_HTTP_HEADERS")).toBe("skip");

    // ...while era-independent checks still run.
    expect(statusOf(r, "C2_TOOLS_HYGIENE")).toBe("pass");
    expect(statusOf(r, "C4_UNKNOWN_METHOD")).toBe("pass");
  });

  it("catches a legacy server answering before initialize", async () => {
    const r = await auditFixture("legacy");
    expect(ids(r)).toContain("C8_ANSWERS_BEFORE_INITIALIZE");
  });

  it("does not report resultType as missing on a legacy server", async () => {
    const r = await auditFixture("legacy");
    // Legacy results legitimately omit resultType; flagging it would be the
    // false-positive wall this design exists to prevent.
    expect(ids(r)).not.toContain("C6_NO_RESULT_TYPE");
  });
});

describe("Lane A — rule metadata discipline", () => {
  it("every rule documents its false-positive modes and remediation", () => {
    for (const rule of CONFORMANCE_RULES) {
      expect(rule.meta.falsePositiveModes.length, rule.meta.id).toBeGreaterThan(0);
      expect(rule.meta.remediation.length, rule.meta.id).toBeGreaterThan(10);
      expect(rule.meta.why.length, rule.meta.id).toBeGreaterThan(30);
      expect(rule.meta.appliesTo.length, rule.meta.id).toBeGreaterThan(0);
    }
  });

  it("rule ids are unique", () => {
    const seen = CONFORMANCE_RULES.map((r) => r.meta.id);
    expect(new Set(seen).size).toBe(seen.length);
  });
});
