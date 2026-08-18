---
id: df4e3e6d-6953-403b-930f-6f8cace270bc
title: "10 Architecture"
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
source_path: "/Users/brunojaamaa/Desktop/mcpaudit/src"
---

# 10 Architecture

**Four layers, strictly separated: transport, protocol, rules, report.** Two decisions shape
all of it, and both are in [[(Note) Locked Decisions]]: the era is resolved before any check
runs, and the transport never throws.

## Notes

| Note | What it answers |
|---|---|
| [[(Note) System Architecture]] | The whole pipeline, target string to report, with the flow diagram |
| [[(Note) Era Detection and the Protocol Client]] | How modern versus legacy is decided, and why it decides everything else |
| [[(Note) The Rule Model]] | What a rule is, what it must declare, and how `RULES.md` is generated from it |

## The shape in one sentence

A target string becomes a transport, the transport feeds a JSON-RPC client that never throws,
the client's answers resolve an era, the era filters a rule registry, the surviving rules
produce findings, and the findings render to terminal, JSON or SARIF.

## Up

[[(Map) Master Map]] · [[(Report) Project Summary]]
