---
id: 079141d9-649d-44db-85f0-1c1e3466101b
title: "Gaps & Questions"
type: "report"
project: "MCP Audit"
tags:
  - "#report"
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

# Gaps & Questions

**Everything this vault could not establish, plus every contradiction found between the repo's
own documents.** Nothing here is invented. Where a fact is unknown, the row says where it was
looked for.

## Contradictions inside the repo

| # | Finding | Evidence | Severity |
|---|---|---|---|
| 1 | **`CLAUDE.md`'s architecture index is stale.** It describes `cli.ts` as using `commander` and `src/schema/` as using `zod`. Amendment **A5** removed both, and `test/supply-chain.test.ts` enforces their absence | `CLAUDE.md` architecture index versus `package.json`, which declares no `dependencies` | 🟡 misleading to an agent reading the file as a contract |
| 2 | **`CLAUDE.md`'s architecture index names `ENGINEERPROMPT.md`, which does not exist** in this repo. The root has `DOCS-ENGINEERPROMPT.md`, a different, gitignored document | `ls` of the repo root | 🟡 |
| 3 | **The check count is stated two ways.** The README says 9 conformance plus 7 safety plus `D1` equals 17. `RULES.md` says "17 checks: 9 conformance, 8 safety". Both reach 17; they disagree on which lane `D1` belongs to | `README.md` versus generated `RULES.md` | ⚫ cosmetic, but a reader counting files in `src/rules/` will find seven and be confused |
| 4 | **`package.json` says `0.1.0` and there are zero git tags.** Deliberate, and the reason is recorded, but a reader checking releases by tag will conclude nothing has shipped | `git tag` returns empty; npm has 0.1.0 | ⚫ documented in `masterplan.md` |

## Security and hygiene

| # | Finding | Evidence | Severity |
|---|---|---|---|
| 5 | ⚠️ **An Aethereum room join code is committed to a public repository.** `CLAUDE.md` line 133 records the room as live with its join code inline. `CLAUDE.md` is tracked by git and `br9704/mcpaudit` is public, so anyone reading the file can run `npx aethereum join <code>` and add an agent to that room. The code is not repeated in this vault | `git ls-files` lists `CLAUDE.md`; the line is in the Sprint 0 close block | ⚠️ **worth acting on** |
| 6 | ⚠️ **A live bearer token sits in four gitignored files**: `.mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json`, `opencode.json`. Only `.codex/config.toml` uses env-var indirection. Nothing leaked to git. **None of these files was opened**; they were grepped for key names only | `.gitignore` plus a key-name grep | 🟡 same pattern as the `hive` repo, so a habit rather than a one-off |
| 7 | **Three root documents are mode `600`**: `masterplan.md`, `CLAUDE.md`, `DOCS-ENGINEERPROMPT.md`. Two of the three are tracked by git and therefore public anyway, so the file mode buys nothing | `stat` on the root | ⚫ |

## Not verified, and why

| # | Question | Where it was looked for | Why unresolved |
|---|---|---|---|
| 8 | Is the npm trusted publisher configured yet? | `masterplan.md` Sprint 11, `release.yml` | > [!todo] Missing - not found in the repo. It is a registry-side setting with no local artefact. The repo's last word, 2026-08-15, is that it is **not** configured. **No network call was made by this audit** |
| 9 | What is the current published version and download count? | `package.json`, `CHANGELOG.md`, `masterplan.md` | > [!todo] Missing - not found in the repo. The repo asserts `0.1.0` published 2026-08-15 08:09:25Z. **The registry was not queried** |
| 10 | Is `brunojaamaa.dev/projects/mcpaudit` live? | `PROJECT.json` `links.caseStudy`, README, `masterplan.md` | > [!todo] Missing - not found in the repo. `masterplan.md` states the promotion was deliberately **not** executed, so the case study is probably staged rather than live, but the URL was **not fetched** |
| 11 | Are the four `audits/*.json` still accurate against today's reference servers? | `audits/` | > [!todo] Missing - the audits date from 2026-08-15. Re-running them requires network and spawning npm packages, neither of which this read-only audit did |
| 12 | Does the hub vault know about this project? | `/Users/brunojaamaa/Desktop/Main Vault/Main/Mesh/` | **No.** The hub's project index was written 2026-08-06 and this repo's first commit is 2026-08-14. This vault is the first record of mcpaudit anywhere in the knowledge system. See [[(Guide) BRUNO HQ]] for what the hub should gain |
| 13 | Is there a CI badge status or an open issue list? | `.github/`, README badges | > [!todo] Missing - the README carries badges that render from live services. **No network call was made**, so their current state is unknown. `masterplan.md` records CI as green on Node 20, 22 and 24 as of 2026-08-15 |

## Coverage gaps in the tool itself

These are stated by the project, not discovered by this audit. They are listed here so a
reader does not have to reconstruct them.

| # | Gap |
|---|---|
| 14 | **Resources and prompt templates are not checked at all**, though they carry the same injection surface as tool descriptions |
| 15 | **Schema validation is structural, not JSON Schema 2020-12.** A schema can pass and still be rejected by a strict validator |
| 16 | **The modern lane has never met a real modern server.** `C7_HTTP_HEADERS` in particular has never run against one, because none exists |
| 17 | **No token-passthrough or OAuth-metadata SSRF check.** Blocked on there being a live `2026-07-28` auth server to test against |
| 18 | **`S5_CROSS_SERVER_SHADOWING` is skipped** unless a run names two or more targets |

## Questions for Bruno

1. Do you want the Aethereum room join code scrubbed from `CLAUDE.md`, and the room rotated?
   It is the only finding here that is live rather than cosmetic.
2. Is the `@aethereumdev` scope the permanent home for this package, or does it move if the
   `mcp-audit` dispute ever lands?
3. Should the four config files holding the bearer token be converted to env-var indirection
   across every repo at once, given the same pattern exists in `hive`?

## Related

[[(Note) Honest State]] · [[(Report) Folder Audit]] · [[(Note) Roadmap]] ·
[[(Report) Project Summary]] · [[(Report) Build Log]]
