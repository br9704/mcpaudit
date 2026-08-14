import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { audit, readToolSurface } from "../src/engine.js";
import { SAFETY_RULES, ALL_RULES } from "../src/registry.js";
import type { AuditReport } from "../src/schema/finding.js";
import { findHiddenChars, findHomoglyphWords, findControlSequences } from "../src/rules/text.js";

const fx = (name: string) =>
  `node ${fileURLToPath(new URL(`../fixtures/${name}/server.mjs`, import.meta.url))}`;

const auditFixture = (name: string): Promise<AuditReport> =>
  audit({ target: fx(name), rules: SAFETY_RULES, timeoutMs: 5000 });

const ids = (r: AuditReport) => r.findings.map((f) => f.id);

describe("Lane B — malicious fixture", () => {
  it("catches every attack class the fixture plants", async () => {
    const found = ids(await auditFixture("malicious"));

    // S1 tool poisoning
    expect(found).toContain("S1_INJECTION_PHRASE");
    expect(found).toContain("S1_PSEUDO_TAG");
    expect(found).toContain("S1_HIDDEN_CHARACTERS");
    expect(found).toContain("S1_HTML_COMMENT");
    expect(found).toContain("S1_HOMOGLYPH");

    // S2 annotation contradiction
    expect(found).toContain("S2_DESTRUCTIVE_CLAIMS_READONLY");

    // S3 credentials, including the x-mcp-header rule the spec introduced
    expect(found).toContain("S3_CREDENTIAL_DEFAULT");
    expect(found).toContain("S3_KEY_MATERIAL_IN_SCHEMA");
    expect(found).toContain("S3_SENSITIVE_X_MCP_HEADER");
    expect(found).toContain("S3_CREDENTIAL_IN_ERROR");

    // S4 schema egress
    expect(found).toContain("S4_REF_INTERNAL_ADDRESS");
    expect(found).toContain("S4_REF_UNSAFE_SCHEME");
    expect(found).toContain("S4_REF_NETWORK_URI");

    // S6 control sequences, in descriptions AND in tool output
    expect(found).toContain("S6_CONTROL_IN_DESCRIPTION");
    expect(found).toContain("S6_CONTROL_IN_OUTPUT");

    // S7 icons
    expect(found).toContain("S7_UNSAFE_ICON_SCHEME");
    expect(found).toContain("S7_INSECURE_ICON_SCHEME");
  });

  it("flags poisoned server instructions, not just tool descriptions", async () => {
    const r = await auditFixture("malicious");
    const instr = r.findings.find(
      (f) => f.ruleId === "S1_TOOL_POISONING" && f.evidence?.path?.includes("instructions"),
    );
    expect(instr).toBeDefined();
  });

  it("never emits raw control characters into its own report", async () => {
    const r = await auditFixture("malicious");
    const blob = JSON.stringify(r);
    // A server flagged for ANSI injection must not be able to inject ANSI into
    // the report doing the flagging.
    expect(blob).not.toContain(String.fromCharCode(0x1b)); // ESC
    expect(blob).not.toContain(String.fromCharCode(0x200b)); // ZERO WIDTH SPACE
  });
});

describe("Lane B — benign fixture (false-positive guard)", () => {
  it("reports nothing against a legitimate server written like a real one", async () => {
    const r = await auditFixture("benign");
    // This fixture deliberately contains: instructional prose ("You must
    // provide…", "Always call list_repositories first"), a credential-named
    // parameter without a value, a placeholder default, a UUID, a destructive
    // tool with honest annotations, remove_background, a local $defs $ref, a
    // ZWJ family emoji, and a data: icon. Any finding here is a false positive.
    expect(r.findings.map((f) => `${f.id}@${f.evidence?.toolName ?? "-"}`)).toEqual([]);
  });
});

describe("Lane B — cross-server shadowing", () => {
  it("only runs with more than one target", async () => {
    const r = await auditFixture("benign");
    const s5 = r.results.find((x) => x.ruleId === "S5_CROSS_SERVER_SHADOWING");
    expect(s5?.status).toBe("skip");
    expect(s5?.skipReason).toContain("more than one target");
  });

  it("detects a duplicated tool name and a description naming a foreign tool", async () => {
    const benignTools = await readToolSurface(fx("benign"), [], 5000);
    const r = await audit({
      target: fx("shadow"),
      rules: SAFETY_RULES,
      timeoutMs: 5000,
      siblings: [{ target: fx("benign"), tools: benignTools }],
    });
    const found = ids(r);
    expect(found).toContain("S5_DUPLICATE_ACROSS_SERVERS");
    expect(found).toContain("S5_REFERENCES_FOREIGN_TOOL");
  });
});

describe("text heuristics", () => {
  it("treats a ZWJ emoji sequence as legitimate, not as hidden text", () => {
    // 👨‍👩‍👧 is three people joined by zero-width joiners.
    expect(findHiddenChars("family 👨‍👩‍👧 here")).toEqual([]);
    // ...but a bare zero-width space between letters is not.
    expect(findHiddenChars("a​b").length).toBe(1);
  });

  it("flags mixed-script words but not wholly non-Latin text", () => {
    expect(findHomoglyphWords("Аlways")).toHaveLength(1); // Cyrillic А + latin
    expect(findHomoglyphWords("привет мир")).toEqual([]); // genuinely Russian
    expect(findHomoglyphWords("hello world")).toEqual([]);
  });

  it("finds escapes and carriage returns but ignores ordinary whitespace", () => {
    expect(findControlSequences("[31mred").length).toBeGreaterThan(0);
    expect(findControlSequences("line\rover").length).toBe(1);
    expect(findControlSequences("tabs\tand\nnewlines")).toEqual([]);
  });
});

describe("Lane B — rule metadata discipline", () => {
  it("every safety rule documents FP modes, remediation and a mapping", () => {
    for (const rule of SAFETY_RULES) {
      expect(rule.meta.falsePositiveModes.length, rule.meta.id).toBeGreaterThan(1);
      expect(rule.meta.remediation.length, rule.meta.id).toBeGreaterThan(20);
      expect(rule.meta.why.length, rule.meta.id).toBeGreaterThan(80);
      // Credibility: every safety finding maps to CWE and an OWASP MCP category.
      expect(rule.meta.cwe, rule.meta.id).toBeTruthy();
      expect(rule.meta.owaspMcp, rule.meta.id).toBeTruthy();
    }
  });

  it("ships at least the five safety checks the plan requires", () => {
    expect(SAFETY_RULES.length).toBeGreaterThanOrEqual(5);
  });

  it("has globally unique rule ids across both lanes", () => {
    const all = ALL_RULES.map((r) => r.meta.id);
    expect(new Set(all).size).toBe(all.length);
  });
});
