---
id: 2ccf2bc1-229c-4b13-8fcc-12797ae4c173
title: "00 Overview"
type: "index"
project: "MCP Audit"
tags:
  - "#index"
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

# 00 Overview

**What mcpaudit is, what it audits, and what state it is actually in.** Start here if you
have never seen this project.

## Notes

| Note | What it answers |
|---|---|
| [[(Note) What mcpaudit Is]] | What it audits, in plain terms, and why that is a real problem |
| [[(Note) Honest State]] | 🟢 What works, what is unfinished, what is only ever tested against fixtures |
| [[(Note) Git History]] | **19 commits** over **two days**. One branch, no tags |

## The thirty-second version

mcpaudit is **a conformance and safety linter for MCP servers**. You give it a server, either
a command it spawns over stdio or a Streamable HTTP URL, and it reports whether the server
implements the Model Context Protocol correctly and whether its tool surface looks dangerous.

It runs **17 checks** in two lanes plus a drift detector, it has **zero runtime dependencies**
enforced by a test, it makes no network call other than to the server you named, and it calls
itself a linter rather than a security audit on every page.

## Key numbers, all verified 2026-08-17

| | |
|---|---|
| Commits | **19** |
| First commit | 2026-08-14 |
| Last commit | 2026-08-15 (`0628ab3`, docs: link the case study) |
| Branches | `main` only · **0** tags |
| Tracked files | **87** · **277** on disk outside exclusions |
| Repo on disk | **118 MB** (`node_modules` **71 MB**, `.git` **3.6 MB**) |
| Source | **5,396** lines across **35** files |
| Tests | **114** across **13** files, on Node 20, 22, 24 |
| Checks | **17**: 9 conformance, 7 safety, plus `D1_SURFACE_DRIFT` |
| Runtime dependencies | **0** |
| npm | `@aethereumdev/mcp-audit@0.1.0`, published 2026-08-15 08:09:25Z |
| Working tree | clean · **0** unpushed |

## Up

[[(Map) Master Map]] · [[(System) Flint Init]] · [[(Report) Project Summary]]
