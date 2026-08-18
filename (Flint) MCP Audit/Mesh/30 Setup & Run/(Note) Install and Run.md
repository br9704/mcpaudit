---
id: cb1b3469-ea54-463e-ba91-039df3e419b9
title: "Install and Run"
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
source_path: "/Users/brunojaamaa/Desktop/mcpaudit/package.json"
---

# Install and Run

**Requires Node ≥ 20.** No API key, no config file, no telemetry. The only network traffic is
to the server you asked it to audit.

## Use it without cloning

```bash
npx @aethereumdev/mcp-audit "npx -y @modelcontextprotocol/server-filesystem /tmp"
```

That is the whole install story. The package has **0 runtime dependencies** and **no install
lifecycle scripts**, so nothing runs on `npm install`.

## Develop it

```bash
cd /Users/brunojaamaa/Desktop/mcpaudit
npm ci                # dev dependencies only: typescript, vitest, eslint, @types/node
npm run build         # tsc -p tsconfig.build.json, then scripts/chmod-bin.mjs
npm test              # build, then vitest run - 114 tests
```

## Every script in `package.json`

| Script | What it runs | When you want it |
|---|---|---|
| `build` | `tsc -p tsconfig.build.json && node scripts/chmod-bin.mjs` | Before running `dist/cli.js` directly |
| `test` | `npm run build && vitest run` | The real gate. **114 tests** |
| `test:unit` | `vitest run` | Same tests without rebuilding first |
| `test:watch` | `vitest` | While writing a rule |
| `typecheck` | `tsc --noEmit` | Fast feedback, also a CI step |
| `lint` | `eslint .` | Also a CI step |
| `rules:gen` | `UPDATE_RULES=1 vitest run test/rules-doc.test.ts` | **After changing any rule's metadata or prose.** Regenerates `RULES.md`. CI fails if you forget |
| `demo:gen` | `npm run build && node scripts/make-demo-svg.mjs` | Regenerates the README hero SVG from real CLI output |
| `prepack` | `npm run build` | Runs automatically on `npm pack` and `npm publish` |

## Run it against the fixtures, offline

```bash
npm run build
node dist/cli.js "node fixtures/malicious/server.mjs"   # 12 error, 10 warn - exit 1
node dist/cli.js "node fixtures/benign/server.mjs"      # clean - exit 0
```

## The gotcha that cost a sprint

**The packed CLI once produced no output at all under `npx` while every unit test passed.**
The entry-point guard compared `import.meta.url` against `file://${process.argv[1]}`, which
fails when npm installs `bin` as a symlink. Packing and running is now a CI step rather than a
pre-release ritual, so this cannot recur silently. If you change `cli.ts`, do not trust unit
tests alone.

## Related

[[(Note) Command Surface]] · [[(Note) Release and CI]] · [[(Note) Test Suite]] ·
[[(Note) Environment Variables]] · [[(Index) 30 Setup & Run]]
