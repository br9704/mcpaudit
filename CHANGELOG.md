# Changelog

All notable changes to this project are documented here. This project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.1.0

First release.

### Added

- **Two transports.** stdio (spawned with `shell: false` and a hand-written tokenizer, so
  a crafted target string cannot smuggle shell metacharacters) and Streamable HTTP.
- **Era detection.** `server/discover` is attempted first; a non-modern error response
  falls back to the legacy `initialize` handshake. The detected era is resolved before any
  check runs, and checks that do not apply to it are skipped with a stated reason rather
  than failed.
- **17 checks.** Nine conformance (`C0`–`C8`), seven safety (`S1`–`S7`), and
  `D1_SURFACE_DRIFT`, which runs outside the rule registry because it needs a
  caller-supplied baseline.
- **Rug-pull detection.** `--pin` writes a canonicalised baseline of the tool surface;
  `--baseline` diffs against it. Description and schema changes are errors; annotation
  changes that weaken a safety claim are called out separately.
- **Three output modes.** A styled terminal report (ANSI-16, `NO_COLOR` respected,
  collapsing to plain monospace off-TTY), `--json`, and `--sarif` for GitHub code
  scanning.
- **RULES.md generated from rule metadata**, with every rule's false-positive modes
  printed in full. CI fails when the committed copy is stale.
- **113 tests** across 13 files, on Node 20, 22 and 24. Eight fixture servers, including a
  hostile one serving a 2000-tool list, a 400-deep schema, a 500-notification flood,
  truncated JSON, garbage on stdout, and a server that exits mid-conversation.

### Verified

- Audited four official reference servers; raw `--json` for each is committed under
  `audits/`. All four speak `2025-11-25`; no error-severity finding was produced against
  any of them, and no vulnerability disclosure was necessary.
- Zero runtime dependencies, and no install lifecycle scripts — both enforced by
  `test/supply-chain.test.ts` rather than asserted.
- Packed with `npm pack`, installed into a clean directory, and run via `npx` with an
  empty dependency tree.

### Notes

- Release is tag-driven through npm trusted publishing (OIDC) with automatic provenance.
  No npm token exists in the repository or in CI.
- `inputSchema` validation is structural, not full JSON Schema 2020-12 meta-validation.
  See Limitations in the README.
