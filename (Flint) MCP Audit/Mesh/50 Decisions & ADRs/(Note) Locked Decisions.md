---
id: 1e83c071-239b-4277-ae0c-d2ca54c351bc
title: "Locked Decisions"
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

# Locked Decisions

**Eight numbered amendments in `masterplan.md`, A1 to A8, plus the locked block in
`CLAUDE.md`.** Historical entries are left as written even when superseded, which is why A1
still argues for a scope that A8 replaced. That is deliberate: the reasoning was accurate when
it was made.

## The four that shape the product

### Zero runtime dependencies, over commander, zod and undici (A5)

**Why.** A security tool's own supply chain is part of its pitch. The incumbent conformance
suite carries **11** runtime dependencies. Shipping instead: a hand-rolled arg parser, hand
written types plus runtime validators, Node's built-in `fetch`, and a hand-rolled SSE parser.

**The price, stated openly.** `inputSchema` validation is **structural**, not full JSON Schema
2020-12 meta-validation, because that would need `ajv`. This is printed in `RULES.md` and the
README's Limitations section rather than hidden. A test asserts `package.json` has no
`dependencies`.

### Era-aware checks, over a flat conformance suite (A3)

**Why.** No shipping server implements `2026-07-28`. The official `server-everything@2026.7.4`
is a `2025-06-18` server and SDK 1.30.0 tops out below it. Firing modern checks at legacy
servers would produce a wall of false positives and destroy credibility on contact.

**How.** Every rule declares `appliesTo: Era[]`. The era is resolved before any check runs. An
inapplicable check is **skipped with a reason, never failed**. This superseded the flat check
list in the original Sprint 3 plan.

### Linter framing, never "security audit"

**Why.** Overclaiming security invites public dismantling by people who do this
professionally. So: every check documents how it misfires, `falsePositiveModes` is a required
field, and `RULES.md` is generated from that metadata so it cannot drift.

### All owner-gated work batched at the very end (A4)

**Why.** npm 2FA confirmation, trusted-publisher configuration, publish approval, the
repo-public flip and every disclosure contact were moved into a single Sprint 11 block, so
sprints 0 to 10 could be built without blocking on a human. Sprint 8 **authored** the
disclosure policy without sending anything; Sprint 9 **built** the publish rails without
publishing.

## The naming decisions, in order

| Amendment | Decision |
|---|---|
| **A1** | Name locked as `@br9704/mcp-audit`, scoped. The unscoped `mcp-audit` is squatted by a stub, and npm's dispute page says verbatim that it "does not resolve squatting claims on demand". Filing a ticket was planned as a zero-cost lottery ticket, with nothing depending on it |
| **A8** | ⚠️ **Superseded.** Changed to `@aethereumdev/mcp-audit` on 2026-08-15 after a live publish attempt returned `E404 PUT`, which is what npm returns for an unauthorised scope rather than a 403. The workstation's npm session is `aethereum-dev`, which owns exactly one org. The GitHub repo stays `br9704/mcpaudit` and `REPO_URL` is unchanged; only the registry scope moved |

**What A8 validated.** The one-line-rename premise from `CLAUDE.md` mostly held but not
entirely: the blast radius was `brand.ts`, `package.json`, `package-lock.json`, the README
badge and seven `npx` invocations, `PROJECT.json`, `docs/media/demo.svg`, two hard-coded
literals in `test/report.test.ts` left deliberately as a canary, the generated `RULES.md`, and
all four `audits/*.json`. **113 of 113** tests were green after the change, lint and typecheck
clean.

## The publishing decisions

| Amendment | Decision |
|---|---|
| **A2** | OIDC trusted publishing with provenance, no postinstall. Granular npm tokens are now capped at 7-day lifetimes, which makes OIDC effectively mandatory for CI publishing |
| **A7** | Verified environment pins as of 2026-08-14. Trusted publishing needs npm ≥ 11.5.1, Node ≥ 22.14.0, `id-token: write`, GitHub-hosted runners, and a public repo and package. **Provenance is automatic under trusted publishing, so do not pass `--provenance`** |

**The post-close hardening is worth reading.** The owner asked whether the trusted-publisher
step could be avoided entirely. It can be deferred but not worked around. The apparent
alternative, an npm token in GitHub Secrets, was **rejected on the facts**: `npm token create`
still prompts for a 2FA OTP, so it saves no interaction, and it would put a long-lived publish
credential in CI, contradicting A2 and falsifying the README's claim that no npm token exists
in the repo or in CI. For a tool whose pitch is supply-chain hygiene, that is a bad trade for
zero saved effort.

## The design decision

**A6, the design system is inherited from ccline.** `report/terminal.ts` adopts the
`~/.claude/ccline/themes/*.toml` shape: ANSI-16 palette only, plain and nerd icon duality, a
`" | "` separator, plain and powerline modes, `text_bold` emphasis. Existing theme files drop
in unchanged. `NO_COLOR`, `--no-color` or a non-TTY collapses to plain monospace with box
drawing. `--json` and `--sarif` are never styled.

## Related

[[(Note) Era Detection and the Protocol Client]] · [[(Note) The Rule Model]] ·
[[(Note) Release and CI]] · [[(Note) Git History]] · [[(Index) 50 Decisions & ADRs]]
