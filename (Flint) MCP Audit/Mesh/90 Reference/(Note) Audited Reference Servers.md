---
id: 7a85959e-4e60-4b40-9a91-911fbc798df8
title: "Audited Reference Servers"
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
source_path: "/Users/brunojaamaa/Desktop/mcpaudit/audits"
---

# Audited Reference Servers

**Four official MCP reference servers, audited for real at v0.1.0 on 2026-08-15.** Raw
`--json` for every row is committed under `audits/`, **48 KB across four files**. Nothing in
the README's table was summarised by hand.

| Server (npm) | Reports itself as | Protocol | Findings |
|---|---|---|---|
| `@modelcontextprotocol/server-everything` | `mcp-servers/everything` 2.0.0 | `2025-11-25` | 1 warn, 1 info |
| `@modelcontextprotocol/server-filesystem` | `secure-filesystem-server` 0.2.0 | `2025-11-25` | 1 warn, 1 info |
| `@modelcontextprotocol/server-memory` | `memory-server` 0.6.3 | `2025-11-25` | 1 warn, 1 info |
| `@modelcontextprotocol/server-sequential-thinking` | `sequential-thinking-server` 0.2.0 | `2025-11-25` | 1 warn, 1 low, 1 info |

The **Reports itself as** column is the server's own `serverInfo`, which is what the audit
records. It does not always match the npm package name, and that mismatch is itself worth
knowing.

## The headline is the Protocol column

**All four speak `2025-11-25`. The current revision is `2026-07-28`.** Every server above, and
every SDK the research could find, still speaks an `initialize`-era revision.

That is not a defect in these servers. It is where the ecosystem is. It is also the reason
every check in this tool is era-aware: without skipping the modern checks with a stated
reason, this table would be a wall of false failures.

**Era-awareness reduced these four audits from that wall to two findings each.**

## The recurring finding

`C8_ANSWERS_BEFORE_INITIALIZE`, at `warn`, from rule `C8_LEGACY_PREINIT`. All four answer
`tools/list` on a fresh connection with **no handshake sent**. The specification calls this
out directly as a version-negotiation hazard, and it is why the spec recommends probing with
`server/discover` first even for clients that only speak modern revisions.

## What was not found

**No exploitable vulnerability in any audited server, and no error-severity finding against
any of them.** Nothing was disclosed privately first because there was nothing to disclose.
These are, by design, demonstration and reference implementations, and what the audit produced
is hygiene and spec-currency observations.

`SECURITY.md` still carries the full disclosure policy, authored in Sprint 8 and never needed.

## Why the raw JSON matters

Two reasons, both recorded in `masterplan.md`:

1. **The evidence is re-runnable.** When the npm scope changed under amendment A8, `tool.name`
   inside all four files became wrong. They were **re-run live** rather than string-replaced,
   and produced identical findings, the same protocols and the same `serverInfo`.
2. **Sprint D caught a leak in exactly these files.** All four had leaked an absolute
   scratchpad path containing the macOS username and a session UUID, in the very files the
   README cites as proof. That was found and fixed before publication.

Each file holds **20 rule results**, except `server-sequential-thinking.json` which holds
**22** and is **11,872 bytes**, the largest of the four.

## Related

[[(Note) Rule Catalogue]] · [[(Note) What mcpaudit Is]] ·
[[(Note) Era Detection and the Protocol Client]] · [[(Note) Data Models]] ·
[[(Index) 90 Reference]]
