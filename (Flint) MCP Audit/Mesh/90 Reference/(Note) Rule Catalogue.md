---
id: 58ea3cd7-3133-413b-a631-c19c84d51d6d
title: "Rule Catalogue"
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
source_path: "/Users/brunojaamaa/Desktop/mcpaudit/RULES.md"
---

# Rule Catalogue

**17 checks: 9 conformance, 7 safety, plus `D1_SURFACE_DRIFT`.** The repo's own `RULES.md`
counts them as "9 conformance, 8 safety" because it groups `D1` with Lane B. Both counts are
correct; `D1` lives outside the rule registry because it needs a caller-supplied baseline,
which is also why `src/rules/` holds seven rule files rather than eight.

⚠️ **This table is a map, not the source.** `RULES.md` in the repo is generated from rule
metadata and carries every false-positive mode in full. Read it before acting on a finding.

## Lane A - conformance

| Rule | What it checks |
|---|---|
| `C0_PROTOCOL_ERA` | Which protocol revision the server speaks. **info** severity, never a failure on its own. Reporting a pre-2026 revision is expected today |
| `C1_DISCOVER` | `server/discover` is present and well-formed |
| `C2_TOOLS_HYGIENE` | `tools/list` entries are well-formed, including deterministic ordering |
| `C3_META_VALIDATION` | Required `_meta` fields are validated |
| `C4_UNKNOWN_METHOD` | Unknown methods are rejected with `-32601`. An unknown **tool** is `-32602`, and the two are different |
| `C5_BOUNDED_TIME` | Well-formed requests return within a bounded time |
| `C6_RESULT_SHAPE` | Results and error codes have the required shape. Implementations must not emit undefined codes in the reserved `-32020` to `-32099` range |
| `C7_HTTP_HEADERS` | HTTP header and body agreement is enforced. ⚠️ Has never met a real modern HTTP server, because none exists |
| `C8_LEGACY_PREINIT` | A legacy server answers requests before `initialize`. **The most common real-world finding** |

## Lane B - safety

| Rule | What it checks |
|---|---|
| `S1_TOOL_POISONING` | Instruction-like or hidden content in tool descriptions. Once fired on the zero-width joiners inside an emoji sequence, which is now a documented false-positive mode with a regression test |
| `S2_DESTRUCTIVE_ANNOTATION` | A destructive-sounding tool contradicts its own annotations. Uses the two-tier verb model after firing on `remove_background` and on the word "clearly" |
| `S3_CREDENTIAL_EXPOSURE` | Credential material in schemas, defaults or error messages |
| `S4_SCHEMA_EGRESS_DOS` | A schema `$ref` points off-host, or is expensive enough to be a denial of service |
| `S5_CROSS_SERVER_SHADOWING` | Tool names collide across servers, or a description names another server's tools. ⚠️ **Needs two or more targets** in one run; skipped otherwise |
| `S6_CONTROL_SEQUENCES` | ANSI escapes or control characters in text the client will render. Once scanned raw wire bytes where an ESC always arrives JSON-escaped, so it could never match; it now scans decoded text |
| `S7_ICON_URI` | An icon URI uses an unsafe scheme or a third-party origin |

## Outside the registry

| Rule | What it checks |
|---|---|
| `D1_SURFACE_DRIFT` | The tool surface changed since the pinned baseline. Description and schema changes are **errors**. An annotation change that weakens a safety claim is called out separately, because that is the shape of a deliberate downgrade |

## Severity, and what it does

| Severity | Meaning | Effect on exit code |
|---|---|---|
| `error` | A specification MUST, or a strong safety signal | fails at `--fail-on error` and below |
| `warn` | A specification SHOULD, or worth a human look | fails at the default `--fail-on warn` |
| `low` | Hygiene or privacy note | only fails at `--fail-on low` |
| `info` | Informational | only fails at `--fail-on info` |

## Era-awareness, restated

The era is resolved **before** any check runs. Every rule declares which eras it applies to.
An inapplicable check is **skipped with a stated reason, never failed**. Against the four real
reference servers this turns a wall of false failures into **two findings each**.

## Related

[[(Note) The Rule Model]] · [[(Note) Audited Reference Servers]] ·
[[(Note) Era Detection and the Protocol Client]] · [[(Index) 90 Reference]]
