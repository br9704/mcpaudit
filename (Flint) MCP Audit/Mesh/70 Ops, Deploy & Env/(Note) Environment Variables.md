---
id: 60c774a1-1fa8-4682-84fc-0f1a7161a2bc
title: "Environment Variables"
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
source_path: "/Users/brunojaamaa/Desktop/mcpaudit"
---

# Environment Variables

**Three variables, none of them secret, and no `.env` file exists in the repo.** That is
unusual and it is a consequence of the design: the tool needs no credential to do its job.

## Every variable the code reads

| Name | Read by | Purpose |
|---|---|---|
| `NO_COLOR` | `src/report/theme.ts` | The community standard. Disables ANSI styling. Respected alongside `--no-color` and a non-TTY check |
| `TERM` | `src/report/theme.ts` | Terminal capability detection, which feeds the `--icons auto` decision |
| `UPDATE_RULES` | `test/rules-doc.test.ts` | Set to `1` by `npm run rules:gen`. Without it the same test is a staleness gate instead of a generator |

That is the complete list, grepped from `src/`, `test/`, `scripts/` and `.github/`.

## CI

| Name | Where | Value |
|---|---|---|
| `GH_TOKEN` | `.github/workflows/spec-drift.yml` | `${{ github.token }}`, the built-in token. Nothing else |

**No npm token exists in the repository or in CI**, by design, per amendment A2. Publishing
authenticates solely through trusted publishing once configured.

## The credentials that are on disk and gitignored ⚠️

`.gitignore` has a block added by `aethereum init` covering `.mcp.json`, `.cursor/mcp.json`,
`.vscode/mcp.json` and `opencode.json`, plus a separate block for `.env` and `.env.*`, and a
third for `.claude/`, `.codex/`, `.cursor/` and `.vscode/` as "per-developer agent and editor
wiring, not a repo artifact".

Four of those config files carry an `Authorization` bearer header for the hosted Aethereum MCP
server. **None was opened by this audit**; they were grepped for key names only, and the key
names are `mcpServers`, `aethereum`, `type`, `url`, `headers`, `Authorization`, `command`,
`args`.

Only `.codex/config.toml` uses env-var indirection, which is the correct pattern. Moving the
other four to match it is on the roadmap. Nothing leaked to git.

## What the tool never sends

No telemetry. No analytics. No licence check. No update ping. The README states it as a
promise: "the only network traffic is to the server you asked it to audit".

## Related

[[(Note) External Services]] · [[(Note) Release and CI]] · [[(Report) Gaps & Questions]] ·
[[(Index) 70 Ops, Deploy & Env]]
