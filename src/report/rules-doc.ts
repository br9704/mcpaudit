/**
 * Renders RULES.md from rule metadata.
 *
 * This lives in `src/` rather than in a build script so it can be imported from
 * TypeScript directly. `test/rules-doc.test.ts` regenerates the document and
 * fails if the committed copy differs, which is what makes "the docs cannot
 * drift from the code" an enforced property rather than an intention.
 */
import type { RuleMeta, Severity } from "../schema/finding.js";
import { FRAMING, PKG_NAME } from "../brand.js";

const SEVERITY_NOTE: Record<Severity, string> = {
  error: "**error** — a specification MUST, or a strong safety signal",
  warn: "**warn** — a specification SHOULD, or a signal worth a human look",
  low: "**low** — a hygiene or privacy note",
  info: "**info** — informational; never a failure on its own",
};

function section(m: RuleMeta): string {
  const lines: string[] = [];
  lines.push(`### \`${m.id}\` — ${m.title}`);
  lines.push("");
  lines.push(`| | |`);
  lines.push(`|---|---|`);
  lines.push(`| Lane | ${m.lane === "conformance" ? "A · conformance" : "B · safety"} |`);
  lines.push(`| Default severity | ${SEVERITY_NOTE[m.defaultSeverity]} |`);
  lines.push(
    `| Applies to | ${m.appliesTo.join(", ")} servers${m.httpOnly ? " (HTTP transport only)" : ""} |`,
  );
  if (m.specRef) lines.push(`| Specification | ${m.specRef} |`);
  if (m.source) lines.push(`| Source | ${m.source} |`);
  if (m.cwe) lines.push(`| CWE | ${m.cwe} |`);
  if (m.owaspMcp) lines.push(`| OWASP MCP | ${m.owaspMcp} |`);
  lines.push("");
  lines.push("**What it checks and why**");
  lines.push("");
  lines.push(m.why);
  lines.push("");
  lines.push("**Known false-positive modes**");
  lines.push("");
  for (const fp of m.falsePositiveModes) lines.push(`- ${fp}`);
  lines.push("");
  lines.push(`**Remediation** — ${m.remediation}`);
  lines.push("");
  return lines.join("\n");
}

export function renderRulesDoc(
  conformance: readonly RuleMeta[],
  safety: readonly RuleMeta[],
): string {
  const total = conformance.length + safety.length;

  return `<!--
  GENERATED FILE — do not edit by hand.
  Produced from rule metadata by src/report/rules-doc.ts.
  Regenerate with \`npm run rules:gen\`; CI fails if it is out of date.
-->

# Rules

Every check ${PKG_NAME} performs, what it looks for, why it matters, and — most
importantly — **how it misfires**. ${FRAMING.charAt(0).toUpperCase() + FRAMING.slice(1)}
A check that cannot state its own false-positive modes has no business shipping,
so \`falsePositiveModes\` is a required field on every rule and this page is
generated from it.

${total} checks: ${conformance.length} conformance, ${safety.length} safety.

## How to read severity

| Severity | Meaning | Effect on exit code |
|---|---|---|
| \`error\` | A specification MUST, or a strong safety signal | fails at \`--fail-on error\` and below |
| \`warn\` | A specification SHOULD, or worth a human look | fails at the default \`--fail-on warn\` |
| \`low\` | Hygiene or privacy note | only fails at \`--fail-on low\` |
| \`info\` | Informational | only fails at \`--fail-on info\` |

## Era-awareness

Revision \`2026-07-28\` removed the \`initialize\` handshake, so a check written
for it is meaningless against an older server. Every rule declares which eras it
applies to; the era is resolved **before** any check runs, and inapplicable
checks are **skipped with a stated reason, never failed**. This matters more
than it sounds: as of this release no shipping SDK implements \`2026-07-28\`, so
nearly every real server is legitimately legacy.

---

## Lane A — Conformance

Does the server implement the protocol correctly?

${conformance.map(section).join("\n")}
---

## Lane B — Safety

Is the server dangerous? These are **heuristics**. They find signals a human
should look at; they do not prove anything.

${safety.map(section).join("\n")}
---

## Contributing a rule

A new rule needs: a stable id, a \`why\` a maintainer can check against the
specification, at least two honest \`falsePositiveModes\`, a \`remediation\`, and
both a fixture that triggers it and one that must not. False-positive reports
are as welcome as new rules — if a check fires on your legitimate server, that
is a bug in the check.
`;
}
