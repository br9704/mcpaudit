---
id: 61e43962-0235-4f08-a246-863d75692259
title: "mcpaudit — Project Summary"
type: project-summary
project: "MCP Audit"
kind: coding
stack: "TypeScript · Node ≥20 · zero runtime dependencies · vitest · eslint · SARIF"
status: shipped
health: green
health_note: "published and CI-green, but 0.1.0 carries no provenance attestation and the npm trusted publisher is still unconfigured, so no release can be attested yet"
last_commit: "2026-08-15"
last_commit_note: "0628ab3 · docs: link the case study on brunojaamaa.dev"
path: "/Users/brunojaamaa/Desktop/mcpaudit"
live_url: "https://www.npmjs.com/package/@aethereumdev/mcp-audit"
repo: "https://github.com/br9704/mcpaudit"
cluster: "personal"
tags:
  - "#report"
  - "#project"
  - "#ld/living"
  - "#stack/node"
  - "#status/shipped"
  - "#cluster/personal"
created: "2026-08-17"
updated: "2026-08-17"
source_path: "/Users/brunojaamaa/Desktop/mcpaudit"
---

# mcpaudit — Project Summary

**mcpaudit audits MCP servers.** Point it at any Model Context Protocol server, either a
command it spawns over stdio or a Streamable HTTP URL, and it reports two things: whether
the server implements the protocol correctly, and whether the server looks dangerous. It is
a linter, and it says so on every page rather than calling itself a security audit.

🚀 **shipped** in **two days**, 2026-08-14 to 2026-08-15, across **19 commits** and eleven
numbered sprints, published to npm on the second day.

## Purpose

An MCP server hands a model a list of tools with names, descriptions, schemas and
annotations. The model follows those descriptions as instructions. That makes the tool
surface both a conformance problem and an injection surface, and before this repo there was
no single local CLI covering both. mcpaudit reads what a server says about itself and
applies **17 documented checks** in two lanes:

- **Lane A, conformance.** Nine checks, `C0` to `C8`. Does it implement the specification.
- **Lane B, safety.** Seven checks, `S1` to `S7`. Tool poisoning, annotation contradictions,
  credential exposure, schema `$ref` egress and denial of service, cross-server shadowing,
  terminal escape injection, unsafe icon URIs.
- **Plus drift.** `D1_SURFACE_DRIFT` diffs a server against a baseline pinned earlier, which
  is how you catch a rug pull: a server that passes review and then quietly rewrites a tool
  description, changing the instructions your model follows with no version bump.

## State

Published, public and green. Every sprint is closed. The working tree is clean, nothing is
unpushed, and the only remaining work is two owner actions on the npm website.

| | |
|---|---|
| npm | `@aethereumdev/mcp-audit@0.1.0`, published **2026-08-15 08:09:25Z** |
| Repo | `github.com/br9704/mcpaudit`, public, **8** topics |
| Commits | **19**, 2026-08-14 to 2026-08-15 |
| Branches | `main` only. **0** tags |
| Working tree | ✅ clean · **0** unpushed |
| Tracked files | **87** · **277** on disk outside `node_modules`, `.git` and `dist` |
| On disk | **118 MB**, of which `node_modules` is **71 MB** and `.git` is **3.6 MB** |
| Source | **5,396** lines across **35** TypeScript files in `src/` |
| Tests | **114**, across **13** test files, on Node 20, 22 and 24 |
| Runtime dependencies | **0**, enforced by `test/supply-chain.test.ts` |
| TODO / FIXME / HACK markers | **0** in `src`, `test` and `scripts` |

## Key numbers

**Zero runtime dependencies** is the load-bearing claim, and it is enforced by a test rather
than asserted in a README. The arg parser, the JSON-RPC client, the SSE parser and the type
validators are all hand written, in place of `commander`, `undici` and `zod`. The stated
price is that `inputSchema` validation is structural rather than full JSON Schema 2020-12,
and that limitation is printed in `RULES.md` and the README rather than buried.

**Four official reference servers were audited for real**, with raw `--json` committed under
`audits/`. All four speak protocol revision `2025-11-25`. None produced a single
error-severity finding, so nothing needed a private disclosure.

## Top risks

1. ⚠️ **0.1.0 has no provenance attestation and never can.** It was published by hand with
   2FA. Only a CI publish generates one, and it cannot be added retroactively. The first
   attestable release is `v0.1.1`, and it is blocked on the next item.
2. 🟡 **npm trusted publishing is still unconfigured.** It is web-UI only, npm 11.6.2 exposes
   no CLI surface for it, so it is an owner action. Until it is done, `release.yml` is inert
   by design: it refuses a tag that disagrees with the manifest, skips a version already on
   the registry, and prints setup instructions on auth failure.
3. 🟡 **The brunojaamaa.dev cross-link is not done.** mcpaudit sits in the portfolio repo's
   `stagedProjects` and the promotion gate is now satisfied, but the portfolio working tree
   holds **57** uncommitted files including the exact files promotion touches. The portfolio's
   `docs/CLAIMS-REGISTER.md` still asserts mcpaudit 404s on npm, which is now false, and every
   portfolio document still says `@br9704/mcp-audit` rather than `@aethereumdev/mcp-audit`.
4. ⚠️ **A live bearer token sits in four gitignored config files** in the working tree:
   `.mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json` and `opencode.json`. Nothing leaked to
   git. Only `.codex/config.toml` uses env-var indirection. This is the same pattern found in
   the `hive` repo, so it is a habit rather than a one-off.
5. **The modern lane has never met a real modern server.** No shipping SDK implements
   `2026-07-28`, so `C7_HTTP_HEADERS` in particular is exercised only against hand-written
   fixtures. This is honest and documented, but it means part of the tool is untested against
   reality through no fault of its own.

## Next 5 actions

- [ ] Configure the npm trusted publisher for `@aethereumdev/mcp-audit` so `v0.1.1` onward carries provenance #task [project:: MCP Audit] [priority:: high] ^t-dt5pdvxn
- [ ] Promote mcpaudit out of `stagedProjects` on brunojaamaa.dev once the portfolio tree is clean, and fix the two false claims about it there #task [project:: MCP Audit] [priority:: high] ^t-m28krmcz
- [ ] Move the bearer token in `.mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json` and `opencode.json` to env-var indirection, matching `.codex/config.toml` #task [project:: MCP Audit] ^t-rogc5rbc
- [ ] Extend coverage to resources and prompt templates, which carry the same injection surface and are not checked #task [project:: MCP Audit] ^t-tq1mkc63
- [ ] Add the env-dump rule for tools that return the whole environment, listed as a good first issue #task [project:: MCP Audit] ^t-yljk6ty0

## The ten links that matter

[[(Map) Master Map]] · [[(System) Flint Init]] · [[(Note) What mcpaudit Is]] ·
[[(Note) Honest State]] · [[(Note) System Architecture]] ·
[[(Note) Era Detection and the Protocol Client]] · [[(Note) Rule Catalogue]] ·
[[(Note) Audited Reference Servers]] · [[(Note) Release and CI]] ·
[[(Report) Gaps & Questions]]

## Related

[[(Guide) BRUNO HQ]] · [[(Map) BRUNO HQ]] · [[(Report) Folder Audit]] ·
[[(Index) Complete File Inventory]] · [[(Report) Build Log]]
