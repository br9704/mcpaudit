---
id: 01178e43-8512-479e-ac3c-acf6d84a8986
title: "Command Surface"
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
source_path: "/Users/brunojaamaa/Desktop/mcpaudit/src/args.ts"
---

# Command Surface

**One command, one or more targets, ten flags.** Parsed by `src/args.ts`, the hand-rolled
parser that replaced `commander` under amendment A5.

```
mcpaudit <target...> [options] [-- passthrough args]
```

A **target** is either a command to spawn over stdio or a URL for Streamable HTTP.
`detectTargetKind` decides. Anything after `--` is passed through verbatim to a stdio server
command.

## Flags

| Flag | Meaning |
|---|---|
| `--json` | Machine-readable report on stdout. Never styled |
| `--sarif` | SARIF 2.1.0, for GitHub code scanning. Never styled |
| `--fail-on <level>` | `info` \| `low` \| `warn` \| `error`. Default **`warn`** |
| `--pin[=<path>]` | Write a baseline snapshot. Default `.mcpaudit-baseline.json` |
| `--baseline <path>` | Diff against a baseline. Drift becomes a finding |
| `--timeout <ms>` | Per-request timeout. Default **`10000`** |
| `--color` / `--no-color` | Force or disable ANSI. `NO_COLOR` is respected |
| `--icons <mode>` | `auto` \| `plain` \| `nerd` \| `none`. Default `auto` |
| `-h, --help` | |
| `-v, --version` | |

⚠️ **`--pin` takes its optional path with `=` only.** `--pin=path` works; a bare `--pin path`
reads `path` as **another target**. This is a deliberate parser rule and it is tested.

## Exit codes

| Code | Meaning |
|---|---|
| **0** | Clean |
| **1** | Findings at or above `--fail-on` |
| **2** | Tool or connection error, including a server that could not be talked to at all |

Designed for CI. A server that will not start is a **2**, not a silent **0**.

## The four shapes of invocation

```bash
# stdio - a command
npx @aethereumdev/mcp-audit "npx -y @modelcontextprotocol/server-memory"

# Streamable HTTP - a URL
npx @aethereumdev/mcp-audit https://example.com/mcp

# CI - SARIF for GitHub code scanning
npx @aethereumdev/mcp-audit https://example.com/mcp --sarif > mcp.sarif

# Cross-server shadowing needs more than one target
npx @aethereumdev/mcp-audit "npx -y server-a" "npx -y server-b"
```

## Rug-pull detection, the two-step

```bash
npx @aethereumdev/mcp-audit "npx -y my-server" --pin
npx @aethereumdev/mcp-audit "npx -y my-server" --baseline .mcpaudit-baseline.json
```

Drift reports **which field changed**, with old and new values inline. Description and schema
changes are **errors**, because they alter what the model is told. An annotation change that
**weakens** a safety claim, such as `destructiveHint` flipping to `false`, is called out
separately, because that is the shape of a deliberate downgrade rather than an ordinary
release edit.

Drift means "changed since you approved it". It does not mean "malicious".

The repo gitignores `.mcpaudit-baseline*.json`, which is the tool's own baseline output when
run against itself.

## Related

[[(Note) Install and Run]] · [[(Note) Rule Catalogue]] · [[(Note) Data Models]] ·
[[(Index) 30 Setup & Run]]
