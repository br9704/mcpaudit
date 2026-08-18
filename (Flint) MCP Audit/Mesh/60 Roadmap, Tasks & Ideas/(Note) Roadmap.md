---
id: 3ab68f56-df49-433b-852c-75dcb6d6e84d
title: "Roadmap"
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
source_path: "/Users/brunojaamaa/Desktop/mcpaudit/masterplan.md"
---

# Roadmap

**Sprints 0 to 11 plus Sprint D are all closed.** The repo has no in-flight work. Everything
below is either an owner action or a post-v1 idea.

## The sprints, all closed

| Sprint | What it delivered |
|---|---|
| **0** | Scaffold, brand constant, CLI shell, zero-dep supply chain, CI and release rails |
| **1** | stdio and Streamable HTTP transports, the stateless client, era detection |
| **2** | The Finding contract, the rule-plugin interface, terminal, JSON and SARIF reports |
| **3** | Lane A: nine era-aware conformance checks, `C0` to `C8` |
| **4** | Lane B: seven safety rules, `S1` to `S7`, with OWASP and CWE mapping |
| **5** | Rug-pull drift detection via pinned baselines |
| **6** | Audited four official reference servers, README plus generated `RULES.md` |
| **7 + 8** | Hostile-server fuzz pass, `SECURITY.md`, `CONTRIBUTING.md`, disclosure policy authored but nothing sent |
| **9 + 10** | Release rails, the weekly spec-drift job, contributor scaffolding |
| **11** | The owner gate. Published to npm, verified from the registry |
| **D** | Documentation pass, which ran as an audit and found **nine defects**, four of which would have shipped publicly |

## Owner actions, the only real blockers

- [ ] Configure the npm trusted publisher for `@aethereumdev/mcp-audit`, so `v0.1.1` onward carries provenance. **Web UI only**, npm 11.6.2 exposes no CLI surface for it #task [project:: MCP Audit] [priority:: high]
- [ ] Optional: file the `mcp-audit` npm name-dispute ticket. Zero-cost lottery ticket per A1, plan nothing around it #task [project:: MCP Audit] [priority:: low]

## Blocked on another repo

- [ ] Promote mcpaudit out of `stagedProjects` in the portfolio repo. The 6-step promotion procedure's only gate was "a real npm page", now satisfied. It was **not** executed because the portfolio working tree holds **57** uncommitted files including `lib/projects.ts`, `public/llms.txt` and 30 SEO baselines, which are exactly the files promotion touches #task [project:: MCP Audit] [priority:: high]
- [ ] While doing that, fix two now-false claims there: every portfolio document still says `@br9704/mcp-audit`, and `docs/CLAIMS-REGISTER.md` asserts mcpaudit 404s on npm #task [project:: MCP Audit] [priority:: high]

## Post-v1 backlog, in the order the README ranks it

1. **Resource and prompt coverage.** Resource descriptions and prompt templates carry the same
   injection surface as tool descriptions and are not checked at all. This is the largest real
   gap in coverage.
2. **An env-dump rule** for tools that return the whole environment. Listed as a good first
   issue in `CONTRIBUTING.md`.
3. **`S8`, token passthrough and OAuth-metadata SSRF.** Deferred because there is no live
   `2026-07-28` auth server to test against. Blocked on the ecosystem, not on effort.
4. **`--theme` loading** for the ccline TOML palettes the terminal report already understands.
   The parsing exists; the flag does not.

## Housekeeping worth doing

- [ ] Fix the architecture index in `CLAUDE.md`, which still names `commander` and `zod`, both removed by amendment A5 #task [project:: MCP Audit]
- [ ] Move the bearer token out of `.mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json` and `opencode.json` into env-var indirection, matching `.codex/config.toml` #task [project:: MCP Audit]

## Related

[[(Note) Honest State]] · [[(Report) Gaps & Questions]] · [[(Note) Release and CI]] ·
[[(Note) Locked Decisions]] · [[(Index) 60 Roadmap, Tasks & Ideas]]
