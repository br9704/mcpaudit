---
id: ed634535-b1ce-49f3-af6c-ccd9e73c9154
title: "What mcpaudit Is"
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
source_path: "/Users/brunojaamaa/Desktop/mcpaudit/README.md"
---

# What mcpaudit Is

**mcpaudit audits MCP servers.** That is the whole answer, and it is worth stating plainly
because the name does not say it: the thing being audited is a Model Context Protocol server,
and the two questions it answers are "does this server follow the specification" and "does
this server look dangerous".

```bash
npx @aethereumdev/mcp-audit "npx -y @modelcontextprotocol/server-filesystem /tmp"
```

## Why an MCP server is worth auditing

An MCP server hands a model a list of tools. Each tool carries a name, a description, an
input schema and a set of annotations. **The model reads those descriptions as
instructions.** That single fact turns the tool surface into two problems at once:

1. **A conformance problem.** If a server answers the wrong error code, returns the wrong
   result shape, orders its tool list non-deterministically or answers requests before a
   handshake, clients built against the specification will misbehave in ways that are hard to
   trace back.
2. **An injection surface.** A tool description is untrusted text that the model follows.
   Instruction-like content, hidden characters, a name that shadows another server's tool, a
   schema `$ref` pointing at an attacker-controlled host, ANSI escapes rendered into a
   terminal: all of these are attacks that need no code execution at all.

Before this repo there was no single local CLI covering both. The official conformance suite
covers protocol only, carries **11** runtime dependencies, and says nothing about safety.

## The three things it does

**Lane A, conformance.** Nine checks, `C0` to `C8`, built against revision `2026-07-28` first
with a back-compat lane for `initialize`-era servers. Protocol era, `server/discover` shape,
`tools/list` hygiene, `_meta` validation, unknown-method handling, bounded response time,
result and error shape, HTTP header and body agreement, and legacy pre-initialize answering.

**Lane B, safety.** Seven checks, `S1` to `S7`. Tool poisoning and hidden characters,
destructive-sounding tools that contradict their own annotations, credential material in
schemas or defaults or errors, schema `$ref` pointing off-host or expensive enough to be a
denial of service, cross-server tool-name shadowing, ANSI and control sequences in rendered
text, unsafe icon URI schemes. These are heuristics. They surface signals a human should look
at. They prove nothing, and every one of them documents how it misfires.

**Drift, the rug-pull detector.** `--pin` writes a canonicalised baseline of the tool surface.
`--baseline` diffs against it and reports `D1_SURFACE_DRIFT`. This catches the specific attack
where a server passes review and then quietly rewrites a tool description, changing what the
model is told with no version bump and no code change on your side. Description and schema
changes are errors. An annotation change that **weakens** a safety claim, such as
`destructiveHint` flipping to `false`, is called out separately, because that is the shape of a
deliberate downgrade rather than an ordinary release edit.

## What it deliberately is not

> A first-pass linter that catches common issues, not a security audit.

That framing is load-bearing and it is repeated verbatim in the README, in `RULES.md` and in
`PROJECT.json`. The tool reads what a server **says about itself**. It does not execute tools
in a sandbox, it does not analyse server source, and it proves nothing. A clean report means
"nothing common was found", never "this server is safe".

The discipline that backs the framing: `falsePositiveModes` is a **required field on every
rule**, `RULES.md` is generated from that metadata so the documentation cannot drift, and CI
fails when the committed copy is stale.

## The finding that shaped the whole tool

**No shipping MCP server implements the current specification.** Revision `2026-07-28` removed
the `initialize` handshake and made `server/discover` mandatory. Every official reference
server, and every SDK the research could find, still speaks an `initialize`-era revision. The
four audited servers all report `2025-11-25`.

That is not a defect in those servers, it is where the ecosystem is. It is also why every
check is **era-aware**: the era is resolved before any check runs, and a check that does not
apply is **skipped with a stated reason, never failed**. Without that, the README's findings
table would be a wall of false failures and the tool would have lost credibility on first
contact.

## Related

[[(Note) Honest State]] · [[(Note) System Architecture]] ·
[[(Note) Era Detection and the Protocol Client]] · [[(Note) Rule Catalogue]] ·
[[(Note) Audited Reference Servers]] · [[(Index) 00 Overview]]
