---
id: acd6d7f5-35a4-42bd-821c-df3b8252d9ac
title: "External Services"
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

# External Services

**At runtime the tool talks to exactly one thing: the server you named.** No telemetry, no
licence check, no analytics, no update ping. Everything else on this page is build-time or
publish-time.

## Runtime

| Service | Role |
|---|---|
| **The audited MCP server** | The only network destination. Either a spawned local process over stdio, or an HTTPS endpoint over Streamable HTTP. Stated in the README as a promise, not an implementation detail |

## Publish and distribution

| Service | Role | State |
|---|---|---|
| **npm registry** | Publishes `@aethereumdev/mcp-audit`. Scope owned by the `aethereum-dev` account | 🟢 live at 0.1.0 since 2026-08-15 |
| **npm trusted publishing (OIDC)** | Intended release path, produces provenance automatically | 🟡 **not configured**. Web UI only; npm 11.6.2 has no CLI surface. Owner action |
| **GitHub** | `br9704/mcpaudit`, public, 8 topics. Also runs CI | 🟢 |
| **GitHub Actions** | `ci.yml`, `release.yml`, `spec-drift.yml` | 🟢 green on Node 20, 22, 24 |
| **modelcontextprotocol schema repository** | `spec-drift.yml` lists the dated revision directories via `gh api` every Monday and fails if a revision newer than the pinned one appears | 🟢 |
| **brunojaamaa.dev** | Case study at `/projects/mcpaudit`, consuming `PROJECT.json` | 🟡 **staged, not promoted**. See [[(Report) Gaps & Questions]] |

## Developer-side integrations, not part of the package

| Service | Where | Note |
|---|---|---|
| **Aethereum MCP server** | `.mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json`, `opencode.json`, `.codex/config.toml` | The agent coordination room for this repo, described in `AGENTS.md`. ⚠️ Four of those five files hold a plaintext bearer token; only `.codex/config.toml` uses env-var indirection. All are gitignored and **none was opened by this audit** |

## Runtime dependencies

**Zero.** Enforced by `test/supply-chain.test.ts`, which also asserts that `package.json`
declares no install lifecycle scripts, so nothing executes on `npm install`. Development uses
`typescript`, `vitest`, `eslint`, `@typescript-eslint/*` and `@types/node`, and none of it
ships.

Verified from the registry rather than from a local tarball: a fresh directory, `npm i`, then
`npm ls --all` prints exactly one package with no transitive dependencies.

## Related

[[(Note) Environment Variables]] · [[(Note) Release and CI]] · [[(Note) Locked Decisions]] ·
[[(Index) 40 Data & Integrations]]
