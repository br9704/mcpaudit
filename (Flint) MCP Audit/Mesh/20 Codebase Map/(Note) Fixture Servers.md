---
id: 40e86d7a-94f3-45c3-8046-4248fedbeae8
title: "Fixture Servers"
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
source_path: "/Users/brunojaamaa/Desktop/mcpaudit/fixtures"
---

# Fixture Servers

**Eight hand-rolled MCP servers, 44 KB total, zero dependencies, no network.** Each one is a
single `.mjs` file speaking raw newline-delimited JSON-RPC over stdio. The whole test suite
runs offline because of them.

| Fixture | Bytes | What it is for |
|---|---|---|
| `benign/server.mjs` | 6,025 | A well-behaved server that must produce **no findings**. The false-positive canary. It is why `S1` no longer fires on the zero-width joiners inside an emoji sequence and `S2` no longer fires on `remove_background`. |
| `malicious/server.mjs` | 5,742 | The other end of the range. Produces **12 error and 10 warn**, exit 1. |
| `modern-good/server.mjs` | 5,820 | A correct `2026-07-28` server. The only way the modern lane is exercised at all. |
| `modern-bad/server.mjs` | 3,340 | A `2026-07-28` server that breaks the rules. Also carries the tool-order reversal for the determinism check, which needed a **fourth tool** because the original three had palindromic names and reversing them was a no-op. |
| `hostile/server.mjs` | 3,709 | The fuzz target. A 2000-tool list, a 400-deep schema, a 500-notification flood, garbage on stdout, truncated JSON, a wrong-shaped envelope, a frame with no trailing newline, total silence, and a mid-conversation exit. |
| `legacy/server.mjs` | 2,401 | An `initialize`-era server, the common case in the real world. |
| `shadow/server.mjs` | 3,702 | The second target needed for `S5_CROSS_SERVER_SHADOWING`, which is skipped unless a run has two or more servers. |
| `reserved-code/server.mjs` | 3,007 | Emits an error code in the reserved `-32020` to `-32099` range that the specification does not define, which implementations must not do. |

## Reproduce both ends yourself

```bash
npm run build
node dist/cli.js "node fixtures/malicious/server.mjs"   # 12 error, 10 warn - exit 1
node dist/cli.js "node fixtures/benign/server.mjs"      # clean - exit 0
```

No network required for either.

## Why the hostile fixture matters

The hostile tests **passed on their first run**. That is the payoff for two earlier decisions
rather than luck: the size caps in `transport/stdio.ts` and the never-throws contract in
`protocol/client.ts`. A server that emits an unbounded stream cannot exhaust memory, and a
server that emits nonsense produces a finding rather than a stack trace.

## Related

[[(Note) Test Suite]] · [[(Note) The Rule Model]] ·
[[(Note) Era Detection and the Protocol Client]] · [[(Index) 20 Codebase Map]]
