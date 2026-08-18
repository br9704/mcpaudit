---
id: 34623a62-1b30-4e01-ae37-e4546bb05bb5
title: "Release and CI"
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
source_path: "/Users/brunojaamaa/Desktop/mcpaudit/.github/workflows"
---

# Release and CI

**Three workflows. One is the gate, one is inert by design, one watches the specification.**

## `ci.yml` - the gate

Runs on push to `main`, on every pull request, and **weekly on Monday at 06:00 UTC**, because
the MCP specification moves fast and the checks encode it. Permissions are `contents: read`
only.

Matrix: Node **20, 22 and 24**, `fail-fast: false`.

| Step | What it proves |
|---|---|
| `npm ci` | The lockfile installs |
| `npm run lint` | eslint clean |
| `npm run typecheck` | `tsc --noEmit` clean |
| `npm test` | **114 tests** green |
| `npm run rules:gen` then `git diff --exit-code RULES.md` | ⚙️ **The generated docs are not stale.** A rule whose prose changed without regenerating fails the build |
| `npm pack`, install into a clean directory, `npx mcpaudit --help` and `--version` | 🚀 **The packed CLI actually runs.** This step exists because a symlinked `bin` once made the packed binary produce no output at all while every unit test passed |

## `release.yml` - tag-driven, and currently inert on purpose

Fires on a `v*` tag and runs a bare `npm publish` through **npm trusted publishing (OIDC)**.
No npm token exists in the repository or in CI, by design.

⚠️ **Trusted publishing is not configured yet**, and it is a web-UI-only setting: npm 11.6.2
exposes no CLI surface for it, so it is an owner action. Rather than let the workflow rot into
a trap, commit `03ca09f` gave it three guards:

1. It **refuses a tag whose version disagrees with `package.json`**, which is the silent-lie
   case.
2. It **skips a version already on the registry**, so a stray `v0.1.0` tag no longer fails a
   run for no reason.
3. On any failure it **prints the one-time trusted-publisher setup** instead of leaving an
   opaque auth error to decode.

The result is inert but correct. Once the owner configures OIDC, tagged releases start
carrying provenance with no further code change.

## `spec-drift.yml` - the specification watchdog

Runs **Mondays at 07:00 UTC** and on manual dispatch. It greps `LATEST_PROTOCOL_VERSION` out
of `src/protocol/types.ts`, then lists the dated revision directories in the
`modelcontextprotocol/modelcontextprotocol` schema repository via `gh api`, and fails if a
revision newer than the pinned one has appeared.

**The first version of this job was circular**: it read the protocol version out of the
versioned file, which always matches itself. It now compares against the published revision
directory listing. This is the mechanism by which a new specification revision surfaces as a
red build rather than as silently wrong findings.

Uses `GH_TOKEN: ${{ github.token }}`, the built-in token, and nothing else.

## The 0.1.0 publish, and the two lessons

Published **manually with 2FA on 2026-08-15 at 08:09:25Z** after the scope change in
amendment A8.

⚠️ **0.1.0 carries no provenance attestation and never can.** `dist.attestations` is absent.
Only a CI publish generates one, and it cannot be added retroactively, so the first attestable
release is `v0.1.1`. The README states this openly in its Status section, and the provenance
badge was deliberately **not** added.

**Registry propagation gotcha, worth knowing.** For roughly **four minutes** after publishing
a brand-new scoped package, the packument endpoint returned **404** while the search index and
the shields.io badge already showed 0.1.0. A clean-machine install fails during that window in
a way that looks exactly like a failed publish. Poll
`https://registry.npmjs.org/@scope%2Fname` until it returns 200 before concluding anything.

## Clean-room verification, done from the registry

Fresh directory, `npm i @aethereumdev/mcp-audit`, then `npm ls --all` prints exactly one
package with **no transitive dependencies**, `mcpaudit --version` prints `0.1.0`, and a real
audit of `@modelcontextprotocol/server-memory` returns **1 warn, 1 info, 10 passed, 2 failed,
4 skipped**, exit 1, identical to the committed `audits/server-memory.json`.

The supply-chain claim is therefore demonstrated from the published artefact, not just from a
local `npm pack`.

## Issue templates

`.github/ISSUE_TEMPLATE/` carries `bug.md`, `new-rule.md` and, tellingly,
`false-positive.md`. A tool that ships a false-positive template is a tool that expects to
misfire and wants to hear about it.

## Related

[[(Note) Environment Variables]] · [[(Note) Locked Decisions]] · [[(Note) Test Suite]] ·
[[(Note) Git History]] · [[(Index) 70 Ops, Deploy & Env]]
