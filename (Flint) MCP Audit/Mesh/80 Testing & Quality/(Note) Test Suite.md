---
id: 037e2107-db36-407e-9676-f6ff76e26acb
title: "Test Suite"
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
source_path: "/Users/brunojaamaa/Desktop/mcpaudit/test"
---

# Test Suite

**114 tests, 13 files, 1,425 lines, no network.** vitest, run by `npm test`, which builds
first because two of the tests exercise the built output rather than the source.

| File | Bytes | What it guards |
|---|---|---|
| `safety.test.ts` | 8,811 | Lane B. The largest test file. Carries the regression cases for the four false positives that "clearly" caused |
| `report.test.ts` | 6,218 | All three renderers, plus `sanitizeSnippet`. Holds two hard-coded package-name literals left deliberately as a rename canary |
| `drift.test.ts` | 6,233 | `D1_SURFACE_DRIFT`, including the key-ordering case that a real bug required |
| `http-integration.test.ts` | 6,087 | Streamable HTTP end to end, against a local server |
| `conformance.test.ts` | 4,950 | Lane A, `C0` to `C8` |
| `hostile.test.ts` | 4,388 | The fuzz pass. **Passed on the first run** |
| `transport.test.ts` | 4,208 | stdio and HTTP transports, including the tokenizer |
| `era.test.ts` | 3,471 | Era detection and the discover-then-initialize fallback |
| `exit-codes.test.ts` | 3,035 | 0, 1 and 2, and the `--fail-on` thresholds |
| `args.test.ts` | 2,147 | The hand-rolled parser, including the `--pin=path` rule |
| `rules-doc.test.ts` | 2,061 | ⚙️ **Policy, not testing.** Generates `RULES.md` under `UPDATE_RULES=1`, and is a staleness gate without it |
| `cli.test.ts` | 1,640 | `--help` and `--version` on the built binary |
| `supply-chain.test.ts` | 1,230 | ⚙️ **Policy, not testing.** Asserts `package.json` declares no `dependencies` and no install lifecycle scripts |
| `helpers/fixtures.ts` | 732 | Shared harness for spawning the fixture servers |

## The two tests that are policy

`supply-chain.test.ts` and `rules-doc.test.ts` do not test behaviour. They enforce claims the
project makes publicly, which is the difference between a README assertion and a guarantee.

- **Zero runtime dependencies** would be a claim. It is a failing test instead.
- **Every rule documents its false-positive modes** would be a claim. Instead `RULES.md` is
  generated from the metadata, and CI runs `npm run rules:gen` then `git diff --exit-code
  RULES.md`.

## Quality signals

| Signal | Value |
|---|---|
| `TODO` / `FIXME` / `HACK` / `XXX` in `src`, `test`, `scripts` | **0** |
| eslint | clean, run in CI |
| `tsc --noEmit` | clean, run in CI |
| Node versions covered | **20, 22, 24** |
| Network required to run tests | **none** |
| Packed-binary smoke test | in CI, added after a real escape |

## What the suite does not cover

- **Real modern servers.** The `2026-07-28` lane runs only against `fixtures/modern-good` and
  `fixtures/modern-bad`, because no shipping server implements the revision.
  `C7_HTTP_HEADERS` in particular has never met one.
- **Resources and prompts.** Not implemented, so not tested.
- **Full JSON Schema 2020-12 validation.** Deliberately out of scope under amendment A5.

## Related

[[(Note) Fixture Servers]] · [[(Note) The Rule Model]] · [[(Note) Release and CI]] ·
[[(Note) Honest State]] · [[(Index) 80 Testing & Quality]]
