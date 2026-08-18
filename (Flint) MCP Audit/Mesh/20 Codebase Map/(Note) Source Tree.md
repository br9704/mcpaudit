---
id: 10c56465-4a99-4480-8843-419fee03fdde
title: "Source Tree"
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
source_path: "/Users/brunojaamaa/Desktop/mcpaudit/src"
---

# Source Tree

**35 files, 5,396 lines, 276 KB.** Seven directories, each one a layer. No file imports
upward.

## Entry and orchestration

| File | Bytes | What it does |
|---|---|---|
| `cli.ts` | 7,757 | The binary. Parses argv, runs the engine over each target, picks a renderer, sets the exit code. Published as `dist/cli.js` under the `mcpaudit` bin name. |
| `args.ts` | 4,483 | The hand-rolled argument parser that replaced `commander`. Roughly 60 lines of intent in 4 KB of careful edge handling, including the `--pin=path` rule. |
| `engine.ts` | 6,497 | The only file that knows the whole sequence: transport, era, filtered registry, findings, report. |
| `registry.ts` | 1,397 | The rule registry. Adding a rule is one file plus one line here. |
| `brand.ts` | 1,081 | The single name constant. Amendment A8 proved this was **not** a one-line rename, but it is still the one place the name is authored. |
| `version.ts` | 474 | Version string, read by `--version`. |
| `index.ts` | 340 | The library export declared in `package.json` `exports`. |

## `transport/` - 4 files

| File | Bytes | What it does |
|---|---|---|
| `stdio.ts` | 9,458 | Spawns with `shell: false` and a hand-written tokenizer, so a crafted target cannot smuggle shell metacharacters. Caps line size, body size and stderr. |
| `http.ts` | 8,057 | Streamable HTTP over Node's built-in `fetch`, with a hand-rolled SSE parser. |
| `detect.ts` | 924 | URL means HTTP, anything else means a command. |
| `types.ts` | 1,020 | The transport outcome union. |

## `protocol/` - 3 files

| File | Bytes | What it does |
|---|---|---|
| `era.ts` | 6,847 | `server/discover` first, `initialize` fallback, era resolved before anything else runs. |
| `client.ts` | 4,546 | The JSON-RPC client that never throws. Every request returns an outcome. |
| `types.ts` | 4,869 | Protocol types plus `LATEST_PROTOCOL_VERSION`, which `spec-drift.yml` greps. |

## `probe/` - 6 files, Lane A

| File | Bytes | Checks |
|---|---|---|
| `c0-protocol-era.ts` | 3,834 | `C0_PROTOCOL_ERA` |
| `c1-discover.ts` | 5,778 | `C1_DISCOVER` |
| `c2-tools-hygiene.ts` | 9,384 | `C2_TOOLS_HYGIENE`, including the determinism check |
| `c3-meta-validation.ts` | 4,793 | `C3_META_VALIDATION` |
| `c4-c5-c6.ts` | 13,828 | `C4_UNKNOWN_METHOD`, `C5_BOUNDED_TIME`, `C6_RESULT_SHAPE`. The largest source file, grouped because the three share probe traffic. |
| `c7-c8.ts` | 8,494 | `C7_HTTP_HEADERS`, `C8_LEGACY_PREINIT` |

## `rules/` - 7 files, Lane B

| File | Bytes | Checks |
|---|---|---|
| `s5-s6-s7.ts` | 15,180 | `S5_CROSS_SERVER_SHADOWING`, `S6_CONTROL_SEQUENCES`, `S7_ICON_URI` |
| `s2-destructive.ts` | 8,075 | `S2_DESTRUCTIVE_ANNOTATION` |
| `s3-credentials.ts` | 7,906 | `S3_CREDENTIAL_EXPOSURE` |
| `text.ts` | 7,902 | Shared matchers, including the two-tier destructive-verb model |
| `s4-schema-egress.ts` | 7,030 | `S4_SCHEMA_EGRESS_DOS` |
| `s1-tool-poisoning.ts` | 6,980 | `S1_TOOL_POISONING` |
| `types.ts` | 1,735 | The rule interface, where `falsePositiveModes` is required |

## `pin/` - 2 files

| File | Bytes | What it does |
|---|---|---|
| `diff.ts` | 9,103 | Produces `D1_SURFACE_DRIFT`. Field-level diff with old and new values inline. |
| `baseline.ts` | 5,213 | Writes a canonicalised snapshot. **Keys are sorted before hashing**, so key reordering is not mistaken for a rug pull. |

## `report/` - 5 files

| File | Bytes | What it does |
|---|---|---|
| `terminal.ts` | 6,093 | The styled report. Collapses to plain monospace off-TTY or under `NO_COLOR`. |
| `sarif.ts` | 5,643 | SARIF 2.1.0 for GitHub code scanning. |
| `theme.ts` | 4,677 | The ccline-derived ANSI-16 palette and icon duality. Reads the same TOML shape, so existing theme files drop in. |
| `rules-doc.ts` | 4,236 | Generates `RULES.md` from rule metadata. |
| `json.ts` | 632 | Smallest file in the layer, because the report object is already the JSON contract. |

## `schema/` - 1 file

`finding.ts`, **6,272 bytes**. The Finding, Baseline and AuditReport contracts, hand-written
types plus runtime validators, in place of `zod`.

## Stale documentation warning ⚠️

`CLAUDE.md`'s architecture index still describes `cli.ts` as using `commander` and `src/schema/`
as using `zod`. Amendment **A5** removed both. The code is right. Logged in
[[(Report) Gaps & Questions]].

## Related

[[(Note) System Architecture]] · [[(Note) Fixture Servers]] · [[(Report) Folder Audit]] ·
[[(Index) Complete File Inventory]] · [[(Index) 20 Codebase Map]]
