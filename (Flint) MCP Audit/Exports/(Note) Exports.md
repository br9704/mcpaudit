---
id: f62d05b3-2069-42a4-b197-342fc4968d3d
title: "Exports"
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
source_path: "/Users/brunojaamaa/Desktop/mcpaudit/(Flint) MCP Audit/Exports"
---

# Exports

**Empty, on purpose.** `Exports/` is for anything generated out of this vault for an audience
outside it. Nothing has been exported yet.

## What would belong here

| Candidate | Why |
|---|---|
| A case-study draft for `brunojaamaa.dev/projects/mcpaudit` | The promotion is blocked on the portfolio repo's dirty tree, so a draft written here is useful the moment that clears. See [[(Note) Roadmap]] |
| A launch note | The repo is public and published and has never been announced |
| A digest for the hub | The hub has **no** project note for mcpaudit. [[(Report) Project Summary]] is the source for it. See [[(Guide) BRUNO HQ]] |

## What does not belong here

Anything already in the repo. `RULES.md`, `README.md` and `docs/media/demo.svg` are generated
by the repo's own tooling and would drift the moment they were copied.

## How to export

```bash
flint export --help
```

Then log it:

```bash
node "/Users/brunojaamaa/Desktop/Main Vault/Main/Shards/tools/obsidianlog.mjs" \
  --actor "claude:<who>" --op export --target "<what>" --result "<outcome>" \
  --trigger "<why>" --project "/Users/brunojaamaa/Desktop/mcpaudit"
```

## Related

[[(Note) Media]] · [[(Index) Sources]] · [[(Guide) BRUNO HQ]] · [[(Map) Master Map]]
