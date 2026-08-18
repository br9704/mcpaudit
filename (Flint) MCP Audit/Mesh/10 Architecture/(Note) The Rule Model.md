---
id: 1b49af15-efea-4f01-90c4-2417f9c846ed
title: "The Rule Model"
type: "note"
project: "MCP Audit"
tags:
  - "#note"
  - "#project"
  - "#ld/living"
  - "#stack/node"
  - "#status/shipped"
  - "#cluster/personal"
status: shipped
created: "2026-08-17"
updated: "2026-08-17"
source_path: "/Users/brunojaamaa/Desktop/mcpaudit/src/rules/types.ts"
---

# The Rule Model

**A rule that cannot state its own false-positive modes has no business shipping.** That
sentence is printed at the top of the generated `RULES.md`, and it is enforced by the type
system: `falsePositiveModes` is a **required field** on every rule.

## What a rule declares

| Field | Why it exists |
|---|---|
| stable id | `C0_PROTOCOL_ERA`, `S1_TOOL_POISONING`. Findings carry both a `ruleId` and a finding `id`, so a rule can emit several distinct findings. |
| lane | `conformance` or `safety`. Determines which section of `RULES.md` it lands in. |
| default severity | `error`, `warn`, `low` or `info`. |
| `appliesTo` | Which eras the check is meaningful for. The engine filters on this before running anything. |
| specification link | A URL that can be checked against the spec. Conformance rules cite the revision changelog. |
| what and why | Prose, printed verbatim into `RULES.md`. |
| **`falsePositiveModes`** | At least two, honest. Required. |
| remediation | What the server author should actually do. |

## Severity and the exit code

| Severity | Meaning | Effect |
|---|---|---|
| `error` | A specification MUST, or a strong safety signal | fails at `--fail-on error` and below |
| `warn` | A specification SHOULD, or worth a human look | fails at the default `--fail-on warn` |
| `low` | Hygiene or privacy note | only fails at `--fail-on low` |
| `info` | Informational | only fails at `--fail-on info` |

Exit codes: **0** clean, **1** findings at or above `--fail-on`, **2** a tool or connection
error including a server that could not be talked to at all. Designed for CI.

## Documentation that cannot drift

`RULES.md` is **26,924 bytes and entirely generated** by `src/report/rules-doc.ts` from the
rule metadata. It is regenerated with `npm run rules:gen`, which is
`UPDATE_RULES=1 vitest run test/rules-doc.test.ts`. Without that env var the same test is a
**staleness gate**: CI runs `npm run rules:gen` and then `git diff --exit-code RULES.md`, so a
rule whose prose changed without regenerating the doc fails the build.

This is the mechanism behind the tool's entire credibility argument. The claim is "every check
documents how it misfires", and the doc is derived from the code rather than written alongside
it, so the claim cannot quietly become false.

## The two-tier destructive-verb model

Worth recording because it is the shape of every heuristic repair in this codebase. `S2`
originally matched any destructive-sounding verb anywhere in a tool's name or description.
That produced false positives on `remove_background` and on the word "clearly", which contains
`clear`.

The model now in `src/rules/text.ts`:

- **Strong verbs** (`delete`, `drop`, `purge`, `wipe`) count on their own.
- **Weak verbs** (`remove`, `reset`, `clear`) count **only** when paired with a stateful
  object, and **only in the tool name**. Prose is too noisy to carry that signal.

Regression tests pin the exact strings that misfired.

## Adding a rule

`CONTRIBUTING.md` states the bar: a stable id, a `why` that can be checked against the
specification, **at least two honest false-positive modes**, a remediation, and **both** a
fixture that triggers it and one that must not. The `.github/ISSUE_TEMPLATE/` directory
carries a `new-rule` template and, tellingly, a `false-positive` template.

The mechanical steps are: add a file under `src/rules/`, register it in `src/registry.ts`, add
or extend a fixture under `fixtures/`, add cases to `test/safety.test.ts`, then run
`npm run rules:gen`.

## Related

[[(Note) Rule Catalogue]] · [[(Note) Era Detection and the Protocol Client]] ·
[[(Note) System Architecture]] · [[(Note) Test Suite]] · [[(Note) Fixture Servers]] ·
[[(Index) 10 Architecture]]
