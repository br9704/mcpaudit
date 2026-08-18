---
id: 92122bee-09c6-4d70-8797-74f374c02401
title: "Media"
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
source_path: "/Users/brunojaamaa/Desktop/mcpaudit/docs/media"
---

# Media

**This folder is empty, and should stay that way.** The project has exactly one media asset
and it lives in the repo, where it is regenerable. Copying it here would create a second copy
that drifts.

| Asset | Path | Bytes |
|---|---|---|
| The README hero | `/Users/brunojaamaa/Desktop/mcpaudit/docs/media/demo.svg` | 14,356 |

## Why that SVG is unusual

⚙️ **It is generated, not drawn.** `scripts/make-demo-svg.mjs` runs the built CLI against a
real MCP server, parses the ANSI it emits, and writes the SVG. Regenerate it with:

```bash
npm run build && node scripts/make-demo-svg.mjs
```

The elapsed time in the summary line is a real measurement, so it moves between runs. That is
the same discipline as `RULES.md`: the artefact is derived from the tool, so it cannot claim
something the tool does not do.

The image shows mcpaudit auditing a reference MCP server: **one warning, one info, four checks
skipped as not applicable**, which is exactly what the audits under `audits/` record.

## If media is added later

Put screenshots and diagrams here, not in `Mesh/`. Reference them from notes by relative path.
Never copy anything large; link by absolute path in `source_path:` instead.

## Related

[[(Note) Exports]] · [[(Index) Sources]] · [[(Report) Folder Audit]] · [[(Map) Master Map]]
