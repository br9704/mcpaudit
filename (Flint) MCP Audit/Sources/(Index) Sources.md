---
id: dd68990a-bbac-4a10-b6e4-29210b9c05ce
title: "Sources"
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

# Sources

**`Sources/` is read-only. Nothing in this vault writes here.** It currently holds two empty
Flint-managed directories, `Repos/` and `Bundles/`, and no material has been imported.

That is deliberate. Everything this vault describes lives in the repo one level up, and
copying it in would create a second copy that drifts. Sources are linked by absolute path in
each note's `source_path:` instead.

## Where the primary sources actually are

| Source | Absolute path | Bytes |
|---|---|---|
| The plan | `/Users/brunojaamaa/Desktop/mcpaudit/masterplan.md` | 63,787 |
| The generated rule documentation | `/Users/brunojaamaa/Desktop/mcpaudit/RULES.md` | 26,924 |
| The public README | `/Users/brunojaamaa/Desktop/mcpaudit/README.md` | 16,730 |
| The agent contract | `/Users/brunojaamaa/Desktop/mcpaudit/CLAUDE.md` | 14,112 |
| The portfolio record | `/Users/brunojaamaa/Desktop/mcpaudit/PROJECT.json` | 5,019 |
| Contribution rules | `/Users/brunojaamaa/Desktop/mcpaudit/CONTRIBUTING.md` | 6,321 |
| Disclosure policy | `/Users/brunojaamaa/Desktop/mcpaudit/SECURITY.md` | 3,515 |
| Release notes | `/Users/brunojaamaa/Desktop/mcpaudit/CHANGELOG.md` | 3,030 |
| Real audit evidence | `/Users/brunojaamaa/Desktop/mcpaudit/audits/` | 48 KB, 4 files |

**Order of trust: `masterplan.md` > `CLAUDE.md` > this vault.** And above all of them, the
code. See [[(System) Flint Init]].

## Never opened

`.mcp.json` · `.cursor/mcp.json` · `.vscode/mcp.json` · `opencode.json`. All four hold a live
bearer token and all four are gitignored. They were grepped for key names only.

## Related

[[(System) Flint Init]] · [[(Report) Folder Audit]] · [[(Map) Master Map]]
