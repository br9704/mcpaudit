---
id: f3f825bd-2e06-4fce-9b6b-d226468ab28e
title: "Data Models"
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
source_path: "/Users/brunojaamaa/Desktop/mcpaudit/src/schema/finding.ts"
---

# Data Models

**Three contracts, all in `src/schema/finding.ts` (6,272 bytes), all hand-written.** There is
no zod, no ajv and no runtime schema library, because that would break the zero-dependency
claim. Types plus hand-written runtime validators do the same job.

## AuditReport

The top-level object. Everything a run produces. This is exactly what `--json` prints, which
is why `src/report/json.ts` is only **632 bytes**.

Its shape, read from the committed `audits/*.json`:

| Field | Example |
|---|---|
| `schemaVersion` | `1` |
| `tool.name` · `tool.version` | `@aethereumdev/mcp-audit` · `0.1.0` |
| `startedAt` | `2026-08-15T08:06:44.532Z` |
| `elapsedMs` | `1560` |
| `target.raw` · `target.kind` · `target.describe` | the command string · `stdio` · a printable form |
| `era` | `legacy` |
| `protocolVersion` | `2025-11-25` |
| `serverInfo.name` · `serverInfo.version` | `secure-filesystem-server` · `0.2.0` |
| `results[]` | one entry per rule, each with `ruleId`, `status` and `findings[]` |

`status` per rule is `pass`, `fail` or `skip`. A **skip carries a stated reason**, which is
the mechanism behind era-awareness: an inapplicable check is never a failure.

⚠️ `tool.name` inside these files records the auditing tool. That is why the npm scope change
in amendment A8 forced all four audits to be **re-run live** rather than string-replaced, so
the committed evidence stayed real.

## Finding

One observation. Read from `audits/server-filesystem.json`:

| Field | Meaning |
|---|---|
| `id` | The specific finding, for example `C0_PRE_2026_PROTOCOL` |
| `ruleId` | The rule that produced it, for example `C0_PROTOCOL_ERA` |
| `lane` | `conformance` or `safety` |
| `severity` | `error` \| `warn` \| `low` \| `info` |
| `title` | One line, human readable |
| `detail` | The evidence, sanitised before display |

A rule can emit several distinct findings, which is why `id` and `ruleId` are separate fields.

Every finding passes through `sanitizeSnippet` before it reaches the terminal renderer,
because a server flagged for ANSI injection would otherwise be able to inject ANSI into the
report that flags it. That is tested.

## Baseline

Written by `--pin`, read by `--baseline`, default path `.mcpaudit-baseline.json`. It is a
**canonicalised** snapshot of the tool surface: names, descriptions, schemas and annotations.

**Keys are sorted before hashing.** Without that, a server that merely reordered its JSON keys
would have looked like a deliberate downgrade on every re-audit. That was a real bug, and it
is now pinned by a test.

`src/pin/diff.ts` (9,103 bytes) produces `D1_SURFACE_DRIFT` from two baselines, reporting
which field changed with old and new values inline.

## The three output formats

| Format | Renderer | Contract |
|---|---|---|
| Terminal | `report/terminal.ts` plus `report/theme.ts` | ANSI-16 only, plain and nerd icon duality, `" | "` separator, plain and powerline modes. Collapses to plain monospace with box drawing under `NO_COLOR`, `--no-color`, or a non-TTY stdout |
| JSON | `report/json.ts` | The `AuditReport` object verbatim. Never styled |
| SARIF | `report/sarif.ts` | SARIF **2.1.0**, for GitHub code scanning. Never styled |

The terminal theme shape is inherited from ccline's TOML palettes, so an existing ccline theme
file drops straight in. `--theme` loading for those files is on the roadmap but not shipped.

## Related

[[(Note) System Architecture]] · [[(Note) Command Surface]] ·
[[(Note) Audited Reference Servers]] · [[(Index) 40 Data & Integrations]]
