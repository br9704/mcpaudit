---
id: 9c592a2e-6be3-4b65-988a-02b521d21d98
title: "vault-audit"
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
source_path: "/Users/brunojaamaa/Desktop/mcpaudit/(Flint) MCP Audit"
---

# vault-audit

**Check this vault against itself: no broken links, no orphans, frontmatter that parses, and
every repo folder either documented or explicitly excluded.** Run it after any batch of note
edits.

## The four gates

| Gate | Passing means |
|---|---|
| **Broken wikilinks** | Every wikilink resolves to a note in this vault, except the deliberate cross-vault links to the hub, which are allowlisted |
| **Orphans** | Every note is linked from at least one other note |
| **Frontmatter** | Every note's frontmatter parses as YAML and carries `id`, `title`, `type`, `project`, `tags`, `status`, `created`, `updated` |
| **Coverage** | Every top-level folder in the repo appears in [[(Report) Folder Audit]], either documented or listed as excluded with a reason |

## Run it

The verification script written for the initial build lives in the scratchpad rather than the
vault, because it is a tool and not a note. Rewrite it if it has been cleaned up. It must:

1. Walk every `.md` under the vault.
2. Parse the frontmatter block between the first two `---` lines and assert the eight required
   keys are present.
3. **Assert every tag list item is quoted.** An unquoted `#` starts a YAML comment and silently
   empties the whole tag list, so a note can lose every tag without erroring.
4. Collect every wikilink target, strip any alias suffix, and check a note file named
   `<target>.md` exists.
5. Allowlist the hub targets, currently `(Map) BRUNO HQ`.
6. Build the reverse index and report any note with no inbound link.

## The known allowlist

`(Map) BRUNO HQ` lives in the hub vault at
`/Users/brunojaamaa/Desktop/Main Vault/Main/Mesh/(Map) BRUNO HQ.md`. It is linked from
[[(Map) Master Map]], [[(Guide) BRUNO HQ]] and [[(Report) Project Summary]] on purpose, and it
resolves only when both vaults are open.

## Then

Write the results into [[(Report) Build Log]] with the current note count and tree, and log a
`verify` op:

```bash
node "/Users/brunojaamaa/Desktop/Main Vault/Main/Shards/tools/obsidianlog.mjs" \
  --actor "claude:vault-audit" --op verify --target "(Flint) MCP Audit/" \
  --result "<counts>" --trigger "vault-audit" \
  --project "/Users/brunojaamaa/Desktop/mcpaudit"
```

Finish with `flint sync`.

## Related

[[(Report) Build Log]] · [[(Report) Folder Audit]] · [[codebase-map-refresh]] ·
[[(System) Flint Init]] · [[(Map) Master Map]]
