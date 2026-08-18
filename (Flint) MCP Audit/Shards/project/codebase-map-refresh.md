---
id: 503f791b-1d79-449f-9f9c-d8745de8421e
title: "codebase-map-refresh"
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
source_path: "/Users/brunojaamaa/Desktop/mcpaudit"
---

# codebase-map-refresh

**Re-derive [[(Note) Source Tree]], [[(Report) Folder Audit]] and
[[(Index) Complete File Inventory]] from the repo as it is today.** Run this after any sprint,
or whenever a note and the code disagree. **REPO WINS OVER NOTE.**

## Read-only, always

Never `git commit`, `git push`, `git checkout`, `git reset` or `git clean` in the repo. Never
open `.env*`, `*.pem`, `*.key`, `.mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json` or
`opencode.json`.

## Steps

1. **Check for dataless iCloud files first.** A read on one hangs indefinitely and macOS here
   has no `timeout`.

   ```bash
   find /Users/brunojaamaa/Desktop/mcpaudit -type f -flags +dataless 2>/dev/null | head -20
   ```

   Measured **0** on 2026-08-17. If it returns anything, do not read those paths.

2. **Recount.**

   ```bash
   cd /Users/brunojaamaa/Desktop/mcpaudit
   git ls-files | wc -l
   find . -type f -not -path "./node_modules/*" -not -path "./.git/*" -not -path "./dist/*" | wc -l
   du -sh . .git node_modules dist src test fixtures audits
   git ls-files | sed 's/.*\.//' | sort | uniq -c | sort -rn
   ```

3. **Re-list `src/` with sizes**, which is what the tables in [[(Note) Source Tree]] are built
   from.

   ```bash
   find src -type f -exec stat -f '%z %N' {} \; | sort -k2
   ```

4. **Re-grep for rot.**

   ```bash
   grep -rn "TODO\|FIXME\|HACK\|XXX" src test scripts
   ```

   Baseline is **0**. Any hit is a new finding for [[(Report) Gaps & Questions]].

5. **Re-check the rule count.** `src/rules/` holds the Lane B files, `src/probe/` holds Lane
   A, and `D1` lives in `src/pin/` outside the registry. If the counts move, update
   [[(Note) Rule Catalogue]] and confirm `RULES.md` regenerates cleanly with
   `npm run rules:gen`.

6. **Update the notes, do not rewrite them.** Edit the fact, bump `updated:` in frontmatter.

7. **Log it.**

   ```bash
   node "/Users/brunojaamaa/Desktop/Main Vault/Main/Shards/tools/obsidianlog.mjs" \
     --actor "claude:codebase-map-refresh" --op audit \
     --target "(Flint) MCP Audit/Mesh/20 Codebase Map" --result "<what changed>" \
     --trigger "codebase-map-refresh" --project "/Users/brunojaamaa/Desktop/mcpaudit"
   ```

8. `flint sync`.

## Related

[[changelog-from-git]] · [[vault-audit]] · [[onboarding-guide]] · [[(Map) Master Map]]
