---
id: 2fc2d634-93f3-404a-8a26-58df18256bb9
title: "Flint Init"
type: "system"
project: "MCP Audit"
tags:
  - "#system"
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

# Flint Init

**This is the knowledge vault for `mcpaudit`, not the codebase.** The codebase is a
separate tree at `/Users/brunojaamaa/Desktop/mcpaudit`, and this vault sits inside it as
`(Flint) MCP Audit/`. Everything here describes that repo. Nothing here builds it.

Resolve the code properly rather than hardcoding a path:

```bash
flint resolve codebase "MCP Audit"
```

## The contract

| | |
|---|---|
| Registered Flint name | `MCP Audit` |
| Vault path | `/Users/brunojaamaa/Desktop/mcpaudit/(Flint) MCP Audit` |
| Codebase | `/Users/brunojaamaa/Desktop/mcpaudit` |
| Codebase reference | fulfilled, `flint reference list` shows a green tick |
| Hub | `BRUNO` at `/Users/brunojaamaa/Desktop/Main Vault/Main` |
| Project log | `/Users/brunojaamaa/Desktop/mcpaudit/OBSIDIANLOG.md` |

## Where things go

| Folder | What lives there |
|---|---|
| `Mesh/` | Every note. This is the only place you write prose. |
| `Mesh/00` to `Mesh/90` | The ten numbered sections. Each has an `(Index)` note that lists its own contents. |
| `Sources/` | Read-only material pulled in from elsewhere. Indexed by [[(Index) Sources]]. |
| `Media/` | Images and binaries. See [[(Note) Media]]. |
| `Exports/` | Anything generated for an audience outside the vault. See [[(Note) Exports]]. |
| `Shards/` | Repeatable jobs. `Shards/project/` holds the four written for this repo. |
| `Workspace/` | Scratch. Nothing durable. |

## Naming, without exceptions

Every file is `(Type) Name.md`. The types in use are `(System)`, `(Dashboard)`, `(Plan)`,
`(Notepad)`, `(Note)`, `(Report)`, `(Task)`, `(Index)`, `(Map)`, `(Guide)`. No new types.

Every note carries frontmatter with a fresh lowercase UUID:

```bash
uuidgen | tr 'A-Z' 'a-z'
```

Required keys: `id`, `title`, `type`, `project`, `tags`, `status`, `created`, `updated`,
plus `source_path` wherever the note describes something on disk.

**Tag list items are quoted.** `- "#note"`, never `- #note`. An unquoted hash starts a YAML
comment and silently empties the whole tag list, so the note loses every tag without
erroring.

Wikilinks carry the full `(Type) Name` and are never aliased. Lists of links are joined
with a middle dot.

## Safety rules

1. **Read-only outside this vault.** Never `git commit`, `git push`, `git checkout`,
   `git reset`, `git clean` or `git rebase` in the repo. Read-only git only.
2. **Never open** `.env*`, `*.pem`, `*.key`, or anything under a secrets directory. Record
   variable names, never values. `.mcp.json`, `.cursor/mcp.json` and `.vscode/mcp.json` in
   this repo hold a live bearer token and are gitignored; they were **not opened** by the
   audit that built this vault, only grepped for key names.
3. **Never copy large files in.** Link by absolute path in `source_path:`.
4. **REPO WINS OVER NOTE.** If a note here and the code disagree, the code is right and the
   note gets fixed.
5. Log material actions with the shared writer. See [[(Guide) BRUNO HQ]].
6. Run `flint sync` after adding notes.

## Start

[[(Map) Master Map]] · [[(Report) Project Summary]] · [[(Guide) BRUNO HQ]]
