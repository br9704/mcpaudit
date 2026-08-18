---
description: "Flint CLI commands for agent workflows"
---

# Knowledge: CLI Reference

Quick reference for Flint CLI commands relevant to agent workflows.

## Artifact Helpers

```bash
flint helper type newnumber <Type>    # Next number for a typed artifact (zero-padded, 3 digits)
flint helper type newnumber Task      # → 119
flint helper type newnumber Notepad   # → 034
```

## Rename

**Always use this** when renaming a Mesh artifact — it renames the file **and** rewrites every `[[Old Name]]` wikilink (including `[[Old|alias]]`, `[[Old#heading]]`, and `![[Old]]` embeds) under `Mesh/` in one pass. Don't do manual `mv` + grep/sed for artifact renames.

```bash
flint helper rename "<old>" "<new>"   # Rename by title; Unix-mv arg order (old first, new second)
flint helper rename "(Task) 050 Smoke Old" "Smoke New"
flint helper rename "(Task) 050 Smoke Old" "(Task) 050 Smoke New"   # Full new name also accepted
```

Behavior:
- Looks up `<old>` by Mesh title (Mesh names are globally unique — no ambiguity).
- Strips any `(Type) ` / `(Type) NNN ` / `(Type) X.N - ` prefix from `<new>`, keeping the prefix from the old filename.
- Scope is `Mesh/` only. Files under `Shards/`, `Inbox/`, `Exports/`, `Archive/`, etc. are not touched.
- Errors if the destination already exists or `<old>` is not found.

Also available over HTTP as `POST /api/artifacts/by-title/<old>/rename` with body `{"title": "<new>"}`.

## Delete

**Always use this** when deleting a Mesh artifact — it removes the file **and** strips every wikilink to it from YAML frontmatter across `Mesh/` (scalar fields like `parent:` get their key removed; array fields like `artifact-refs:` get filtered, and the key is removed if the array becomes empty). **Body text is left untouched by design** — a dangling `[[Name]]` in prose is a harmless informational trace, not a structural invariant.

```bash
flint helper delete "<name>"                # Hard delete (rm) + frontmatter sweep
flint helper delete "<name>" --archive      # Move to Mesh/Archive/ instead of hard-deleting
flint helper delete "(Task) 042 Old Plan"
```

Behavior:
- Looks up `<name>` by Mesh title (Mesh names are globally unique).
- Scope is `Mesh/` only. `Shards/`, `Inbox/`, `Exports/`, `Archive/`, etc. are not touched.
- Errors if `<name>` is not found.

Also available over HTTP as `POST /api/artifacts/by-title/<name>/delete?archive=true|false`.

## Identity

```bash
flint whoami                             # Show current person identity
```

## Shard Discovery

```bash
flint shard list                      # List installed + dev shards
flint shard info <sh>                 # Detailed shard info
flint shard status <sh>               # Status + pending migrations
```

## Shard Manifests (loading shards)

`start` / `hstart` assemble a dynamic manifest from each shard's files (init, skills, workflows, templates, knowledge — read from each file's `description` frontmatter). Run the variant that matches your mode.

```bash
flint shard start <name>              # Installed, interactive (loads init-<sh>.md)
flint shard start-dev <name>          # Dev, interactive (loads dev-init-<sh>.md)
flint shard hstart <name>             # Installed, headless (loads hinit-<sh>.md, prefers hwkfl-*)
flint shard hstart-dev <name>         # Dev, headless
```

If a shard declares `setup:` and isn't set up yet, the manifest output appends a `SETUP REQUIRED` banner pointing at `setup-<sh>.md`.

## Shard Install / Update

```bash
flint shard install <source>          # Install from owner/repo or path
flint shard install --all-dev         # (Re)install all dev shards into their Shards/<Name>/ copies
flint shard reinstall <name>          # Re-run install entries (after new install files are added)
flint shard update                    # Update installed shards to latest published versions
flint shard uninstall <sh>            # Remove shard and clean files
```

## Shard Versioning

```bash
flint shard versions <sh>             # List remote versions
flint shard pin <sh> <version>        # Lock shard to a specific version
flint shard unpin <sh>                # Remove version lock
```

## Shard Migrations

```bash
flint shard migrate list <sh>         # List pending migrations for an installed shard
flint shard migrate run <sh>          # Run the next pending migration
```

## Shard Scripts

Shards can ship Node.js scripts under `scripts/`, auto-discovered and invoked via the shard's shorthand:

```bash
flint shard scripts <sh>              # List executable scripts for a shard
flint shard <sh> <script> [args...]   # Run a declared script
```

> Authoring commands (`create`, `clone`, `dev`, `rename`, `push`, `pull`, `release`, `publish`, `unpublish`, `published`) are documented by the Knap shard — load `Shards/Knap/init-knap.md` when authoring shards.

## Sync

```bash
flint sync                            # Sync all shards and mods from flint.toml
```

## Workspace

```bash
flint workspace                       # Manage workspace references (codebases, URLs)
```

## Tinderbox

A **Tinderbox** is a directory that orchestrates multiple Flints (and shared codebases) as one declared, git-versioned unit. Its `tinderbox.toml` lists member Flints, shared repos, and connections; `flint tinderbox` materializes that declaration on the current machine. **This workspace IS a Tinderbox** — these commands operate on the box that contains it.

- **Members** are declared in `[flints]` in one of two modes. **own** = the Tinderbox owns the Flint and clones it from a git URL into a folder under the box root. **reference** = the Flint lives in the global registry (`registry:Name`); sync points at the existing copy rather than cloning. Members may be `required` (a missing one is an error) or `optional` (a missing one is only a warning — for remotes a given machine cannot reach).
- **Repos** (`[repos]`) are non-Flint codebases shared across the box. Same own/reference modes (clone into `Repos/` vs point at a local path). Each repo is exposed to `all` member Flints or a named subset, and surfaces in each exposed Flint as a codebase reference.
- **Connections** (`[connections]`) declare which Flints reference each other — directional edges (`from -> to`) or interconnected groups. Sync wires these as references inside the child Flints.

All `flint tinderbox` subcommands walk up from the current directory to find `tinderbox.toml`, so they run from the box root or from inside any member Flint.

```bash
# Lifecycle
flint tinderbox init <name>                  # Bootstrap an empty Tinderbox here
flint tinderbox init --from <url>            # Clone an existing Tinderbox from git, then sync (name comes from its toml)
flint tinderbox start <name> [path]          # Promote the current Flint into a new Tinderbox (moves it under the box)
flint tinderbox import <name> [source]       # MOVE a registered Flint into this box (or declare by URL if unregistered)
flint tinderbox add <name> <source>          # Declare a Flint by git URL or registry:Name WITHOUT materializing (sync clones/references it)
flint tinderbox remove <name>                # Eject a member: undeclare + strip wiring, keep it registered (--move-out <dir> relocates the folder)
flint tinderbox rename <from> <to>           # Rename a member Flint (cascades connections/exposed-to/folder/registry)
flint tinderbox rename --tinderbox <name>    # Rename the Tinderbox itself
flint tinderbox dissolve                     # Tear down the box: eject every member (folders survive), strip wiring, remove tinderbox.toml

# Sync, status, drift
flint tinderbox sync                         # Materialize members, register them in Obsidian, wire connections + repos
flint tinderbox status                       # Per-member: mode, tier, present, registered, connection fulfillment (+ Repos)
flint tinderbox check                        # Detect drift between tinderbox.toml and disk (read-only; exits 1 on drift)
flint tinderbox heal                         # Auto-fix drift (rewrites tinderbox.toml) then run a full sync — previews + confirms first

# Repos and connections
flint tinderbox repo add <name> <source>     # Clone a git repo into Repos/ (or path:<dir> reference) and expose it (--exposed-to, --mode)
flint tinderbox repo remove <name>           # Drop a repo declaration + strip child references (--purge deletes the clone)
flint tinderbox repo list                    # List declared repos: mode, location, present, exposed-to
flint tinderbox connection add <from> <to>   # Declare a directional connection (or --group <names...> for an interconnected set)
flint tinderbox connection remove <from> <to> # Remove a connection and strip the wired child references
flint tinderbox connection list              # List declared connection edges and whether each is wired

# Git and identity across the box
flint tinderbox git sync                     # Sync the Tinderbox repo and run `flint git sync` in every member Flint
flint tinderbox git publish <url>            # Add a remote and push the box's initial commit (renames branch to main; --yes skips confirm)
flint tinderbox whoami <name>                # Propagate the person identity to every member Flint
```

**Sync flags:** `--dry-run` (preview clones/moves/deletes, change nothing), `--json` (machine-readable result/plan), `--full` (also run `flint sync` inside every member), `--only <names...>` / `--skip <names...>` (operate on a subset of declared members this run), `--yes` (accept prompts; deletes undeclared Flints that have saved work — needs `--force` for unsaved), `--delete-undeclared` (delete on-disk Flints not in the toml without prompting), `--no-open` (skip Obsidian registration). `status`/`check` also accept `--json`; `heal` accepts `--dry-run` and `--yes`.

**Safety behaviors to know before running these:**
- `sync` **materializes and can MOVE Flints on disk** — it clones missing own-mode members, and adopts/relocates a registry-matched member into the box (after verifying its git remote matches the declared source, with a prompt). `import` likewise **physically relocates** the Flint into the box (confirmed unless `--yes`).
- `sync` can offer to **delete undeclared Flints** (on disk but not in the toml). It guards Flints with uncommitted/unpushed/no-remote work and prompts per-Flint; `--yes`/`--delete-undeclared` automate it, and `--force` is required to delete unsaved work.
- `check` is read-only and reports drift (undeclared/missing/renamed members, broken materialization, stale registry/connections/repos). `heal` is the active repair — it **rewrites `tinderbox.toml` and runs a full sync**, so it previews the plan and confirms before applying (`--dry-run` to stop at the preview).

## Send / Inbox

```bash
flint send <target> <title> <instructions> <files...>  # Send files to another Flint's inbox as a bundle
flint send "My Other Flint" "Auth Migration" "Move tasks to Tasks/" file1.md file2.md
```

Files land in the target Flint's `Inbox/(Bundle) Title/` directory. Use [[sk-f-inbox_process]] to process incoming bundles.

## Other Useful Commands

```bash
flint open                            # Open flint in configured applications
flint export                          # Manage exports
```
