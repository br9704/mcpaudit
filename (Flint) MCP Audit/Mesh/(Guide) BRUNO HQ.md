---
id: dcd3653b-4124-40a4-9e94-33422c51e7f2
title: "BRUNO HQ"
type: "guide"
project: "MCP Audit"
tags:
  - "#guide"
  - "#project"
  - "#ld/living"
  - "#stack/node"
  - "#status/shipped"
  - "#cluster/personal"
status: shipped
created: "2026-08-17"
updated: "2026-08-17"
source_path: "/Users/brunojaamaa/Desktop/Main Vault/Main"
---

# BRUNO HQ

**This vault is a spoke. The hub is `BRUNO`.**

| | |
|---|---|
| Hub vault | `/Users/brunojaamaa/Desktop/Main Vault/Main` |
| Registered Flint name | `BRUNO` |
| Hub map | `/Users/brunojaamaa/Desktop/Main Vault/Main/Mesh/(Map) BRUNO HQ.md` |
| Hub bootstrap | `/Users/brunojaamaa/Desktop/Main Vault/Main/CLAUDE.md` |
| Hub contract | `/Users/brunojaamaa/Desktop/Main Vault/Main/Mesh/(System) Flint Init.md` |
| Hub entry point | `/Users/brunojaamaa/Desktop/Main Vault/Main/Mesh/(System) START HERE.md` |

Go up with `[[(Map) BRUNO HQ]]`. That link points at a note in the hub vault, not this one,
so it resolves only when both vaults are open.

## mcpaudit is new to the hub

⚠️ **The hub does not have a project note for this repo.** Its project index was written on
**2026-08-06** and mcpaudit's first commit is **2026-08-14**, so the repo did not exist when
the hub was built. This vault is the first record of it anywhere in the knowledge system.

What the hub should gain from this vault:

| Hub artefact | What to add |
|---|---|
| `Mesh/Notes/Projects/` | A project note for mcpaudit, sourced from [[(Report) Project Summary]] |
| `(Dashboard) Portfolio` | A row: shipped, published to npm 2026-08-15, solo build |
| `(Dashboard) Repo Documentation` | Six root documents plus a **536-line** masterplan and a generated `RULES.md` |
| `(Dashboard) Shipped` | `@aethereumdev/mcp-audit@0.1.0`, npm, 2026-08-15 |
| `(Dashboard) Stack` | TypeScript on Node with **zero runtime dependencies**, vitest, eslint, SARIF |

The repo is also the second thing Bruno has published under the `@aethereumdev` npm scope,
after `aethereum` itself, which makes it part of the Aethereum cluster commercially even
though it is technically independent. Its `cluster` is recorded as `personal` because it is
a solo tool with its own repo and its own npm entry, not part of the HIVE monorepo.

## Logging back to the hub

Every material action in this vault is logged with the shared writer, which appends to the
project log and rolls up to the hub log automatically:

```bash
node "/Users/brunojaamaa/Desktop/Main Vault/Main/Shards/tools/obsidianlog.mjs" \
  --actor "claude:<who>" --op <op> --target "<what>" --result "<outcome>" \
  --trigger "<why>" --project "/Users/brunojaamaa/Desktop/mcpaudit"
```

Ops used by this vault: `vault-init` · `audit` · `note-create` · `sync` · `verify`.
The project log is `/Users/brunojaamaa/Desktop/mcpaudit/OBSIDIANLOG.md`.

## Back

[[(Map) Master Map]] · [[(System) Flint Init]] · [[(Report) Project Summary]]
