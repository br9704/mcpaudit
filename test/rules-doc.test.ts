import { describe, expect, it } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { renderRulesDoc } from "../src/report/rules-doc.js";
import { CONFORMANCE_RULES, SAFETY_RULES } from "../src/registry.js";
import { meta as driftMeta } from "../src/pin/diff.js";

const RULES_PATH = fileURLToPath(new URL("../RULES.md", import.meta.url));

function currentDoc(): string {
  return renderRulesDoc(
    CONFORMANCE_RULES.map((r) => r.meta),
    // Drift runs outside the registry but is a shipped check, so it belongs in
    // the documentation alongside the rest.
    [...SAFETY_RULES.map((r) => r.meta), driftMeta],
  );
}

describe("RULES.md", () => {
  it("is up to date with the rule metadata in code", async () => {
    const expected = currentDoc();

    // `npm run rules:gen` sets this to rewrite the file, snapshot-style.
    if (process.env["UPDATE_RULES"]) {
      await writeFile(RULES_PATH, expected, "utf8");
      return;
    }

    const actual = await readFile(RULES_PATH, "utf8");
    expect(
      actual,
      "RULES.md is stale — run `npm run rules:gen` and commit the result",
    ).toBe(expected);
  });

  it("documents every shipped check, including drift", () => {
    const doc = currentDoc();
    for (const rule of [...CONFORMANCE_RULES, ...SAFETY_RULES]) {
      expect(doc, rule.meta.id).toContain(`\`${rule.meta.id}\``);
    }
    expect(doc).toContain(`\`${driftMeta.id}\``);
  });

  it("reproduces the locked framing verbatim", async () => {
    const { FRAMING } = await import("../src/brand.js");
    // Capitalised at the start of the sentence, so compare on the tail.
    expect(currentDoc()).toContain(FRAMING.slice(1));
  });

  it("prints every false-positive mode, not a summary of them", () => {
    const doc = currentDoc();
    for (const rule of [...CONFORMANCE_RULES, ...SAFETY_RULES]) {
      for (const fp of rule.meta.falsePositiveModes) {
        expect(doc, `${rule.meta.id}: ${fp.slice(0, 40)}`).toContain(fp);
      }
    }
  });
});
