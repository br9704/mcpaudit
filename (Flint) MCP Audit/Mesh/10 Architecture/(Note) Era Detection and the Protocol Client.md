---
id: cb76a0ce-039e-4308-bffa-16f0a756ed86
title: "Era Detection and the Protocol Client"
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
source_path: "/Users/brunojaamaa/Desktop/mcpaudit/src/protocol/era.ts"
---

# Era Detection and the Protocol Client

**Era detection is the centrepiece of the tool, and it was not in the original plan.** It
became mandatory once research established that no shipping server implements the current
specification revision. Amendment **A3** in `masterplan.md` records the decision and the
reason: firing modern checks at legacy servers would produce a wall of false positives and
destroy the tool's credibility on contact.

## The two eras

| Era | Revision | What defines it |
|---|---|---|
| **modern** | `2026-07-28` | No `initialize` handshake. `server/discover` is mandatory. Required `_meta` keys per request. `resultType` on every result. |
| **legacy** | pre-2026, in practice `2025-11-25` and `2025-06-18` | The `initialize` handshake exists. `server/discover` is absent. |
| **unknown** | neither answered | Often means the server failed to start in this environment, for example missing env vars or credentials, rather than that it speaks no known protocol. `C0` says so explicitly as a documented false-positive mode. |

## The probe order

1. Attempt `server/discover`.
2. If it answers well-formed, the server is **modern**.
3. If it returns an error, in practice `-32601` for an unknown method, fall back to the
   `initialize` handshake.
4. If `initialize` completes, the server is **legacy**, and its reported `protocolVersion` is
   recorded.
5. If neither works, the era is **unknown** and most checks are skipped.

Two protocol facts the codebase encodes, both re-verified against the live schema on
2026-08-14: an unknown **method** returns `-32601` and HTTP `404`, while an unknown **tool**
returns `-32602`; and implementations must not emit codes in the reserved `-32020` to `-32099`
range that the specification does not define. `C4_UNKNOWN_METHOD` and `C6_RESULT_SHAPE` check
these, and `fixtures/reserved-code/server.mjs` exists to trip the second.

## Why the era is resolved first

Every rule declares `appliesTo: Era[]`. The engine filters the registry by the resolved era
**before running anything**. An inapplicable check is **skipped with a stated reason, never
failed**.

The measurable payoff is in the README's own table. Era-awareness reduced the four
reference-server audits from a wall of false failures to **two findings each**. The recurring
one is `C8_ANSWERS_BEFORE_INITIALIZE` at `warn`, from rule `C8_LEGACY_PREINIT`: all four
answer `tools/list` on a fresh connection with no handshake sent. The specification calls this
out directly as a version-negotiation hazard.

## The client that never throws

`src/protocol/client.ts` is **4,546 bytes** and its contract is one line: every request
returns an outcome, never an exception. The outcome union is `result`, `error`, `timeout`,
`transport-error`, `invalid-json`, `invalid-envelope`.

This is the load-bearing decision for hostile-server handling. Combined with the size caps in
the transports, it is why the hostile fixture, which serves a 2000-tool list, a 400-deep
schema, a 500-notification flood, garbage on stdout, truncated JSON, a frame with no trailing
newline, silence and a mid-conversation exit, passed its tests on the first run rather than
after a debugging cycle.

## The consequence nobody can fix yet

**The modern lane has never met a real modern server.** It is exercised entirely against
`fixtures/modern-good/server.mjs` and `fixtures/modern-bad/server.mjs`. `C7_HTTP_HEADERS` in
particular has never run against a real modern HTTP server, because none exists. The
`spec-drift.yml` workflow exists precisely so that a new revision, or the ecosystem finally
catching up, surfaces as a red build rather than as silently wrong findings.

## Related

[[(Note) System Architecture]] · [[(Note) The Rule Model]] · [[(Note) Rule Catalogue]] ·
[[(Note) Fixture Servers]] · [[(Note) Locked Decisions]] · [[(Index) 10 Architecture]]
