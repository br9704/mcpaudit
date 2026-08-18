---
id: 8a876e26-5317-4fb9-8cd2-0285f6b45842
title: "Git History"
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
source_path: "/Users/brunojaamaa/Desktop/mcpaudit/.git"
---

# Git History

**19 commits over two days, one branch, zero tags.** Read as a log of sprints rather than of
features: almost every commit closes a numbered sprint from `masterplan.md`.

| | |
|---|---|
| Commits | **19** |
| First | **2026-08-14** · `47fb408` · Sprint 0 scaffold |
| Last | **2026-08-15** · `0628ab3` · docs: link the case study on brunojaamaa.dev |
| Branches | `main` only, tracking `origin/main` |
| Remotes | **1** · `origin` → `https://github.com/br9704/mcpaudit.git` |
| Tags | **0** |
| Working tree | ✅ clean |
| Unpushed | **0** |

## All 19 commits, newest first

| Commit | Subject |
|---|---|
| `0628ab3` | docs: link the case study on brunojaamaa.dev |
| `03ca09f` | Make the release workflow inert-but-correct until OIDC is configured |
| `3e0501e` | Sync docs to published state and the 114-test count |
| `6a969b9` | Generate the hero image from real CLI output |
| `0066012` | Sprint 11: published to npm, verified from the registry |
| `3f6220c` | Rename package to `@aethereumdev/mcp-audit` (amendment A8) |
| `942dce1` | Record verified publish preconditions in the Sprint 11 owner gate |
| `a4e0307` | Fix garbled clause in the S6 repair paragraph |
| `bc423e8` | Sprint D: documentation pass, and the nine defects it found |
| `dc75c8c` | Sprints 9-10: release rails, spec-drift job, contributor scaffolding |
| `a97e059` | Sprint 7+8 docs: hostile-server fuzz pass, generated RULES.md, SECURITY, CONTRIBUTING |
| `4a34d70` | Sprint 6: audit four official reference servers, README + generated RULES.md |
| `83d3490` | Sprint 5: rug-pull drift detection via pinned baselines |
| `459593a` | Fix lint: avoid control chars in test regexes |
| `b535146` | Sprint 4: Lane B safety, 7 rules (S1-S7) with OWASP/CWE mapping |
| `3aa788a` | Sprint 3: Lane A conformance, 9 era-aware checks (C0-C8) |
| `4db81fc` | Sprint 2: Finding contract, rule-plugin interface, terminal/JSON/SARIF reports |
| `b2941d3` | Sprint 1: stdio + Streamable HTTP transports, stateless client, era detection |
| `47fb408` | Sprint 0: scaffold, brand constant, CLI shell, zero-dep supply chain, CI/release rails |

## What the log tells you

**One commit per sprint, in order, with no reverts and no merge commits.** There is no
branching history to reconstruct, which is the upside of a two-day solo build against a
written plan.

**The rename is a single commit.** `3f6220c` moved the npm scope from `@br9704` to
`@aethereumdev` after a live publish attempt returned `E404 PUT`, which is what npm returns
for an unauthorised scope. The blast radius was wider than the plan predicted: `brand.ts`,
`package.json`, `package-lock.json`, README badge and seven `npx` invocations, `PROJECT.json`,
`docs/media/demo.svg`, two hard-coded literals in `test/report.test.ts` deliberately left as a
canary, the generated `RULES.md`, and all four `audits/*.json`, whose `tool.name` records the
auditing tool. **The audits were re-run live rather than string-replaced**, so the committed
evidence stayed real: identical findings, same protocols, same `serverInfo`.

**Zero tags is a decision, not an omission.** `release.yml` fires on a `v*` tag and runs a bare
`npm publish`. Because 0.1.0 was published manually, tagging `v0.1.0` would make the workflow
attempt to republish an existing version. The recorded resolution is that the next tag is
`v0.1.1`, and the workflow now skips a version already on the registry so a stray tag no longer
fails a run for no reason.

**The last four commits are documentation and release plumbing.** The last commit that changed
the tool's behaviour is `03ca09f`, the release-workflow guards.

## Related

[[(Note) Honest State]] · [[(Note) Release and CI]] · [[(Note) Locked Decisions]] ·
[[(Index) 00 Overview]]
