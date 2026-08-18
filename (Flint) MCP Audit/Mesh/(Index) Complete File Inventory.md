---
id: 1860134e-1523-4f2d-a3d0-2bde09212042
title: "Complete File Inventory"
type: "index"
project: "MCP Audit"
tags:
  - "#index"
  - "#project"
  - "#ld/living"
  - "#stack/node"
  - "#status/shipped"
  - "#cluster/personal"
status: shipped
created: "2026-08-17"
updated: "2026-08-17"
source_path: "/Users/brunojaamaa/Desktop/mcpaudit"
---

# Complete File Inventory

Every file in `/Users/brunojaamaa/Desktop/mcpaudit` outside the exclusions listed in
[[(Report) Folder Audit]]. Counted **2026-08-17** on branch `main` at `0628ab3`.

**277 files on disk · 87 tracked by git · 118 MB total, 46 MB of it outside `node_modules`.**

## Tracked file types

| Extension | Count |
|---|---|
| `.ts` | **50** |
| `.md` | 11 |
| `.mjs` | 10 |
| `.json` | 9 |
| `.yml` | 3 |
| `.svg` | 1 |
| `.js` | 1 |
| `.gitignore` | 1 |
| `LICENSE` | 1 |

## Root - 25 files

`.gitignore` · `.mcp.json` ⚠️ **never opened** · `AGENTS.md` · `CHANGELOG.md` · `CLAUDE.md` ·
`CONTRIBUTING.md` · `DOCS-ENGINEERPROMPT.md` · `LICENSE` · `OBSIDIANLOG.md` ·
`PROJECT.json` · `README.md` · `RULES.md` ⚙️ generated · `SECURITY.md` ·
`eslint.config.js` · `masterplan.md` · `opencode.json` ⚠️ **never opened** ·
`package-lock.json` · `package.json` · `tsconfig.build.json` · `tsconfig.json` ·
`vitest.config.ts` · `.DS_Store`

Plus the directories `audits/`, `dist/` ⚫ excluded, `docs/`, `fixtures/`, `node_modules/`
⚫ excluded, `scripts/`, `src/`, `test/`, `.claude/`, `.codex/`, `.cursor/`, `.github/`,
`.git/` ⚫ excluded, `.vscode/`, and `(Flint) MCP Audit/` (this vault).

## `src/` - 35 files, 276 KB

**Root (8)**: `args.ts` (4,483 B, the hand-rolled parser) · `brand.ts` (1,081 B, the single
name constant) · `cli.ts` (7,757 B) · `engine.ts` (6,497 B, orchestrates era then rules then
report) · `index.ts` (340 B, library export) · `registry.ts` (1,397 B, the rule registry) ·
`version.ts` (474 B)

**`src/transport/` (4)**: `detect.ts` (924 B) · `http.ts` (8,057 B) · `stdio.ts` (9,458 B) ·
`types.ts` (1,020 B)

**`src/protocol/` (3)**: `client.ts` (4,546 B) · `era.ts` (6,847 B) · `types.ts` (4,869 B)

**`src/probe/` (6)**: `c0-protocol-era.ts` (3,834 B) · `c1-discover.ts` (5,778 B) ·
`c2-tools-hygiene.ts` (9,384 B) · `c3-meta-validation.ts` (4,793 B) · `c4-c5-c6.ts`
(13,828 B, the largest source file) · `c7-c8.ts` (8,494 B)

**`src/rules/` (6)**: `s1-tool-poisoning.ts` (6,980 B) · `s2-destructive.ts` (8,075 B) ·
`s3-credentials.ts` (7,906 B) · `s4-schema-egress.ts` (7,030 B) · `s5-s6-s7.ts` (15,180 B) ·
`text.ts` (7,902 B) · `types.ts` (1,735 B)

**`src/pin/` (2)**: `baseline.ts` (5,213 B) · `diff.ts` (9,103 B)

**`src/report/` (5)**: `json.ts` (632 B) · `rules-doc.ts` (4,236 B) · `sarif.ts` (5,643 B) ·
`terminal.ts` (6,093 B) · `theme.ts` (4,677 B)

**`src/schema/` (1)**: `finding.ts` (6,272 B)

## `test/` - 14 files, 88 KB

`args.test.ts` (2,147 B) · `cli.test.ts` (1,640 B) · `conformance.test.ts` (4,950 B) ·
`drift.test.ts` (6,233 B) · `era.test.ts` (3,471 B) · `exit-codes.test.ts` (3,035 B) ·
`helpers/fixtures.ts` (732 B) · `hostile.test.ts` (4,388 B) ·
`http-integration.test.ts` (6,087 B) · `report.test.ts` (6,218 B) ·
`rules-doc.test.ts` (2,061 B) · `safety.test.ts` (8,811 B, the largest test) ·
`supply-chain.test.ts` (1,230 B) · `transport.test.ts` (4,208 B)

## `fixtures/` - 8 files, 44 KB

`benign/server.mjs` (6,025 B) · `hostile/server.mjs` (3,709 B) ·
`legacy/server.mjs` (2,401 B) · `malicious/server.mjs` (5,742 B) ·
`modern-bad/server.mjs` (3,340 B) · `modern-good/server.mjs` (5,820 B) ·
`reserved-code/server.mjs` (3,007 B) · `shadow/server.mjs` (3,702 B)

## `audits/` - 4 files, 48 KB

`server-everything.json` (8,295 B, 20 rule results) ·
`server-filesystem.json` (8,251 B, 20) ·
`server-memory.json` (8,222 B, 20) ·
`server-sequential-thinking.json` (11,872 B, 22)

## `scripts/` - 2 files

`chmod-bin.mjs` · `make-demo-svg.mjs`

## `docs/` - 1 file

`media/demo.svg` (14,356 B) ⚙️ generated

## `.github/` - 6 files

`workflows/ci.yml` · `workflows/release.yml` · `workflows/spec-drift.yml` ·
`ISSUE_TEMPLATE/bug.md` · `ISSUE_TEMPLATE/false-positive.md` ·
`ISSUE_TEMPLATE/new-rule.md`

## Agent and editor wiring - 7 files, all gitignored

`.claude/settings.json` · `.codex/config.toml` (the only one using env-var indirection) ·
`.codex/hooks.json` · `.cursor/hooks.json` · `.cursor/mcp.json` ⚠️ **never opened** ·
`.cursor/rules/aethereum.mdc` · `.vscode/mcp.json` ⚠️ **never opened**

## Excluded, counted only

| Path | Files | Size |
|---|---|---|
| `node_modules/` | not counted | **71 MB** |
| `dist/` | **105** | **636 KB** |
| `.git/` | not counted | **3.6 MB** |

## Related

[[(Report) Folder Audit]] · [[(Note) Source Tree]] · [[(Map) Master Map]]
