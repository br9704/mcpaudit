---
id: f5c7b7d2-7219-41ff-9b46-49875860dd3e
title: "Honest State"
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

# Honest State

**Verdict: 🟢 finished, published and honest about its own limits. The gaps are administrative
rather than technical.** Health **green**.

Eleven sprints plus a documentation pass, all closed, in **two days**. The package is live on
npm, the repo is public, CI is green on three Node versions, the working tree is clean and
nothing is unpushed. There is no half-built feature in this repo, which is unusual.

## What is genuinely working 🚀

| | Evidence |
|---|---|
| Published on npm | `@aethereumdev/mcp-audit@0.1.0`, 2026-08-15 08:09:25Z |
| Clean-room install verified | Fresh directory, `npm i`, `npm ls --all` prints one package with **no transitive dependencies**, a real audit of `server-memory` reproduces the committed `audits/server-memory.json` exactly |
| **17** checks | 9 conformance `C0`-`C8`, 7 safety `S1`-`S7`, plus `D1_SURFACE_DRIFT` outside the registry |
| **114** tests | 13 files, green on Node 20, 22 and 24 |
| **0** runtime dependencies | Enforced by `test/supply-chain.test.ts`, which also asserts no install lifecycle scripts |
| Both transports | stdio with `shell: false` and a hand-written tokenizer, plus Streamable HTTP with a hand-rolled SSE parser |
| Three output modes | Terminal (ANSI-16, `NO_COLOR` respected, collapses off-TTY), `--json`, `--sarif` 2.1.0 |
| Documentation cannot drift | `RULES.md` is generated from rule metadata and CI fails when it is stale |
| Real evidence committed | Four official reference servers audited, raw `--json` under `audits/` |
| Hostile input handled | The hostile fixture serves a 2000-tool list, a 400-deep schema, a 500-notification flood, garbage on stdout, truncated JSON, a frame with no trailing newline, silence, and a mid-conversation exit. Those tests passed on the first run |
| Code hygiene | **0** `TODO`, `FIXME`, `HACK` or `XXX` markers in `src`, `test` or `scripts` |
| Git hygiene | Working tree clean, **0** unpushed, one branch, one remote |

## What is unfinished ⚠️

| Thing | State |
|---|---|
| **Provenance attestation** | 0.1.0 was published by hand with 2FA, so `dist.attestations` is empty, and it **can never be added retroactively**. Only a CI publish produces one. The README says so rather than letting a reader discover it. |
| **npm trusted publishing** | Not configured. It is web-UI only; npm 11.6.2 exposes no CLI surface for it, so it is an owner action. Until it is done, `release.yml` is inert by design rather than broken. |
| **brunojaamaa.dev cross-link** | Deliberately not executed. mcpaudit is staged in the portfolio's `stagedProjects` and the promotion gate is satisfied, but the portfolio tree holds **57** uncommitted files including exactly the files promotion touches. |
| **The npm dispute ticket** | Optional. The unscoped `mcp-audit` name is squatted by a stub. npm's own page says it "does not resolve squatting claims on demand", so this was always a zero-cost lottery ticket. |

## What is only ever tested against fixtures 🟡

This is the honest technical limitation, and it is not the project's fault.

- **The modern lane has never met a real modern server.** No shipping SDK implements
  `2026-07-28`. `C7_HTTP_HEADERS` in particular has never run against a real modern HTTP
  server because none exists.
- **No token-passthrough or OAuth-metadata SSRF check.** Deferred for the same reason: there
  is no live `2026-07-28` auth server to test against. It is listed as `S8` in the backlog.
- **`S5_CROSS_SERVER_SHADOWING` needs two or more targets** in a single run and is skipped
  otherwise, so the single-server case never exercises it.

## Stated limitations, printed on the tin

Every one of these is in the README's Limitations section and in `RULES.md`. They are
boundaries, not oversights.

- **Schema validation is structural, not semantic.** `inputSchema` is checked for being
  parseable, an object, `type: "object"` at the root, and bounded in depth and `$ref` count.
  It is not validated against JSON Schema 2020-12, which would need a validator dependency and
  break the zero-dependency claim. A schema can pass this and still be rejected by a strict
  validator.
- **Only tools are inspected.** Resource descriptions and prompt templates carry the same
  injection surface and are not covered.
- **No sandboxed execution, no source analysis, no spec-completeness claim.**
- **Heuristics misfire.** Every rule ships at least two documented false-positive modes.

## The four bugs a green test suite was hiding

Worth recording because each one is a class of mistake, not a one-off.

1. **The packed CLI produced no output at all under `npx`**, because the
   `import.meta.url === file://argv[1]` entry-point guard fails when npm installs `bin` as a
   symlink. Every unit test passed throughout. Only an acceptance test that ran the **packed
   binary** caught it, so packing and running is now a CI step.
2. **A determinism check never fired because the fixture was a palindrome.** The broken fixture
   reversed its tool order to trip `C2_NONDETERMINISTIC_ORDER`, but its tool names were
   symmetrical, so reversal was a no-op. A fourth tool broke the symmetry.
3. **`S6` scanned raw wire bytes**, where an ESC always arrives JSON-escaped, so it could never
   match. It now scans decoded text.
4. **The drift detector hashed uncanonicalised JSON**, so a server that merely reordered its
   keys would have looked like a rug pull on every re-audit. Keys are sorted before hashing
   now, and that is tested explicitly.

Two more of the same shape: the report sanitises every finding before display, because
otherwise a server flagged for ANSI injection could inject ANSI into the report flagging it.
And the first spec-drift job was **circular**, reading the protocol version out of the
versioned file that always matches itself.

## The false positives that were caught by hand

Auditing the official filesystem server produced **four findings at error severity that were
all wrong**: the word "clearly" matched the destructive verb `clear` for lack of a trailing
word boundary. They were caught by hand-reviewing every finding before publishing the README
table. The fix was a two-tier verb model, strong verbs count alone and weak verbs count only
when paired with a stateful object and only in the tool name. Regression tests now pin the
exact strings.

Sprint D found **nine more defects**, four of which would have shipped publicly. The worst:
all four committed `audits/*.json` leaked an absolute scratchpad path containing the macOS
username and a session UUID, in the exact files the README cites as proof. Also corrected: a
README column citing versions its own evidence did not contain, a wrong severity order in
`--help`, and **three false `[x]` marks in the plan claiming the repo was public when the
GitHub repo did not exist at all**.

## Security posture, stated plainly ⚠️

**A live bearer token for the hosted Aethereum MCP server sits in four config files in the
working tree**: `.mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json` and `opencode.json`. All
four are gitignored, so nothing leaked to git. Only `.codex/config.toml` uses the correct
env-var indirection. None of these files was opened by this audit. This is the same pattern
found in the `hive` repo, which makes it a habit rather than an accident.

Nothing was found in any audited server that needed disclosure. That is stated in the README
directly: no exploitable vulnerability was found, and nothing was disclosed privately first
because there was nothing to disclose.

## Honest one-line verdict

**A finished, published, well-tested tool whose only open items are two clicks on the npm
website and a portfolio update blocked by a different repo's dirty tree.**

## Related

[[(Note) What mcpaudit Is]] · [[(Note) Git History]] · [[(Report) Gaps & Questions]] ·
[[(Note) Roadmap]] · [[(Report) Project Summary]] · [[(Index) 00 Overview]]
