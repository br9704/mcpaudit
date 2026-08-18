# CLAUDE.md — Agent Bootstrap

**You are working inside the `(Flint) MCP Audit` vault — the knowledge vault for `mcpaudit`.**

This vault is not the codebase. The codebase is the tree one level up, at
`/Users/brunojaamaa/Desktop/mcpaudit`. Resolve it properly rather than hardcoding the path:

```bash
flint resolve codebase "MCP Audit"
```

## What mcpaudit is, in one line

A conformance and safety linter for **MCP servers**. Point it at a Model Context Protocol
server, either a command it spawns over stdio or a Streamable HTTP URL, and it reports whether
the server implements the specification correctly and whether its tool surface looks
dangerous. Published as `@aethereumdev/mcp-audit@0.1.0`.

## Read this first

**`Mesh/(System) Flint Init.md`** — the workspace contract. What is where, the conventions,
and the safety rules. Read it before you write anything.

## Then

1. `Mesh/(Report) Project Summary.md` — one page, the whole project.
2. `Mesh/(Map) Master Map.md` — the graph and the "start here if you want to…" list.
3. The numbered section index you need: `00 Overview`, `10 Architecture`, `20 Codebase Map`,
   `30 Setup & Run`, `40 Data & Integrations`, `50 Decisions & ADRs`,
   `60 Roadmap, Tasks & Ideas`, `70 Ops, Deploy & Env`, `80 Testing & Quality`,
   `90 Reference`.

## Order of trust

`masterplan.md` in the repo, then `CLAUDE.md` in the repo, then this vault. And above all
three, the code.

⚠️ The repo's `CLAUDE.md` architecture index is **stale**: it names `commander` and `zod`, both
removed by amendment A5, and `ENGINEERPROMPT.md`, which does not exist. See
`Mesh/(Report) Gaps & Questions.md`.

## Hard rules

- **Read-only outside this vault.** Never `git commit`, `git push`, `git checkout`,
  `git reset`, `git clean` or `git rebase` in `/Users/brunojaamaa/Desktop/mcpaudit`.
- **Never open** `.env*`, `*.pem`, `*.key`, `.mcp.json`, `.cursor/mcp.json`,
  `.vscode/mcp.json` or `opencode.json`. Four of those hold a live bearer token. Record
  variable names only, never values.
- **REPO WINS OVER NOTE.** If a note here and the code disagree, the code is right and the note
  gets fixed. Edit the fact, do not rewrite the note.
- **Tag list items must be quoted** in frontmatter: `- "#note"`. An unquoted `#` starts a YAML
  comment and silently empties the tag list.
- **Every new note gets a fresh lowercase UUID**: `uuidgen | tr 'A-Z' 'a-z'`.
- **Log material actions** with
  `node "/Users/brunojaamaa/Desktop/Main Vault/Main/Shards/tools/obsidianlog.mjs"`.
- Run `flint sync` after adding notes.

## Repeatable jobs

`Shards/project/` holds four: `codebase-map-refresh`, `changelog-from-git`,
`onboarding-guide`, `vault-audit`.

Up: `Mesh/(Guide) BRUNO HQ.md` → the hub at `/Users/brunojaamaa/Desktop/Main Vault/Main`.
