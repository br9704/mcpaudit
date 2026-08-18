---
required-reading:
  - knowledge/knw-f-models.md
  - knowledge/knw-f-artifacts.md
  - knowledge/knw-f-templates.md
  - knowledge/knw-f-types.md
  - knowledge/knw-f-cli.md
---

# Flint Agent Environment

You are a terminal-based AI agent operating inside a Flint. 

# Flint

A Flint is a workspace — a directory managed by the Flint CLI that organizes human knowledge and agent capabilities together. It contains a `Mesh/` & `Media/` content layer and a `Shards/` capabilities layer. A Flint can reference external codebases and resources via `flint.toml`. Everything you read, write, and create lives inside the Flint.

# Mesh

The Mesh is a data structure which is a list of markdown files that reference each other and media. It is the content layer of a Flint — everything under `Mesh/` and `Media/`. It holds typed artifacts (`(Task)`, `(Plan)`, `(Notepad)`, etc.), notes, dashboards, system files, and archives. `Mesh/Types/` organizes artifacts by type into subfolders. `Mesh/Notes/` holds free-form notes. `Mesh/Archive/` stores completed work. Dashboards (`(Dashboard) *.md`) are live DataviewJS views that aggregate artifacts. `Media/` holds non-markdown files (images, PDFs, etc.). All workspace content goes into the Mesh — never write outside of it.

The Mesh is **flat** — folders are display only; structure lives in frontmatter tags. The structure layer comes from the **Invironments shard** (`ie`), a dependency of Flint: `#ie/sections/<name>` says where a node lives (exactly one mesh section), `#ie/groups/<name>` says what collections it's part of, and a bare `#ie` marks a `(Section)` header. Flint owns the workspace conventions built on it: `Mesh/Main/` holds the staging sections (**New → Working → Consolidated**; dumped notes land in New), `Mesh/Sections/` holds other sections at arbitrary display depth, `Mesh/Groups/` holds group definitions. Load the `ie` shard for the full grammar and tooling.

# Shards

Shards are cognitive programs — self-contained packages that extend what an agent can do inside a Flint. Each shard ships its own init file, skills, workflows, templates, knowledge files, and install files. Shards define artifact types (tasks, notepads, increments), their lifecycles, and the operations that create and manage them. Without shards, a Flint is just an empty workspace. With shards, it becomes a structured environment for planning, building, and tracking work.

## Shard Rules

Shards extend your capabilities. Each shard is a self-contained unit with its own context, skills, templates, workflows, and knowledge. **You must follow these rules strictly.**

1. **Load before use.** Always read a shard's init file before using any of its skills, workflows, or templates. No exceptions.
2. **On-demand only.** Never load all shards. Only init shards relevant to the current task.
3. **Init gives you the rules.** A shard's init file defines what the shard does, its lifecycle, its file types, and how to use them. Read it fully.
4. **Skills are atomic.** Skills are single-purpose tasks with no human checkpoints. Follow the skill's actions exactly.
5. **Workflows have stages.** Workflows are multi-step tasks with human review points between stages. Do not skip stages.
6. **Knowledge is reference.** Knowledge files contain deep reference material. Read them when you need detailed understanding.

### Loading a Shard

Run `flint shard start <name>` to get the shard's manifest — it lists the init file, required reading, skills, workflows, templates, and knowledge files with descriptions. Read the init file and required reading files before using any capabilities.

```
@Shards/[Name]/init-[sh].md                        # Load context (ALWAYS first)
@Shards/[Name]/skills/sk-[sh]-[name].md            # Use a skill
@Shards/[Name]/workflows/wkfl-[sh]-[name].md       # Use a workflow
@Shards/[Name]/templates/tmp-[sh]-[name]-v<X.X>.md # Read a template (versioned)
@Shards/[Name]/knowledge/knw-[sh]-[name].md        # Read knowledge
```

**Dev shards** live at `Shards/(Dev Remote) <Name>/` or `Shards/(Dev Local) <Name>/` and prefix every source file with `dev-` (e.g. `dev-init-<sh>.md`, `dev-sk-<sh>-<name>.md`). Load the dev-prefixed files in those folders. See Lifecycle Modes below.

**Discovering shards**: List `Shards/` or run `flint shard list`.

### Lifecycle Modes

Every shard is in one of three modes. The folder-name prefix signals the mode:

| Mode | Folder | Editable? |
|------|--------|-----------|
| `installed` | `Shards/<Name>/` | No — overwritten on update |
| `dev-remote` | `Shards/(Dev Remote) <Name>/` | Yes — changes pushed to origin |
| `dev-local` | `Shards/(Dev Local) <Name>/` | Yes — no remote |

Dev and installed copies coexist. Source files inside dev folders are prefixed `dev-`; the installer strips the prefix when producing the installed copy. The one exception is the `install/` folder — its contents are literal payloads (dashboards, type definitions, Obsidian templates) and carry no `dev-` prefix.

### Shard File Types

| Pattern | Purpose |
|---------|---------|
| `shard.yaml` | Manifest — name, version, dependencies, setup, types, folders, install |
| `init-[sh].md` | Interactive context — load first, defines shard rules |
| `hinit-[sh].md` | Headless init — loaded in Orbh sessions instead of `init-[sh].md` |
| `setup-[sh].md` | Setup lifecycle — one-time setup instructions for the shard |
| `sk-[sh]-[name].md` | Skill — atomic task, follow actions exactly |
| `wkfl-[sh]-[name].md` | Workflow — multi-stage, human review between stages |
| `hwkfl-[sh]-[name].md` | Headless workflow — used in headless Orbh sessions |
| `tmp-[sh]-[name]-v<X.X>.md` | Template — versioned structural guide for creating artifacts |
| `knw-[sh]-[name].md` | Knowledge — deep reference material |
| `ast-[sh]-[name].[ext]` | Asset — non-markdown files |
| `mig-[sh]-<from>-to-<to>.md` | Migration — upgrade script when installed version bumps |
| `inst-[sh]-[name].md` | Install payload (under `install/`) — dashboards, system files, folder anchors; `dest` field in `shard.yaml` carries the literal target filename |
| `otmp-[sh]-[name].md` | Obsidian template (under `install/`) — human-facing template for the Obsidian picker |
| `type-[sh]-[type].md` | Type definition (under `install/`) — driven by `types:` field, installs to `Mesh/Metadata/Types/` |
| `scripts/<name>.js` | Script — Node.js command, invoked via `flint shard <sh> <name>` |

Dev-mode files add a `dev-` prefix (e.g. `dev-sk-<sh>-<name>.md`). Everything under `install/` is the exception — `inst-`, `otmp-`, `type-` files carry no `dev-` prefix.

### Shard Manifest

Each shard has a `shard.yaml` at its root declaring identity, dependencies, and installation behavior:

- `shard-spec`, `version`, `name`, `shorthand`, `description`
- `dependencies:` — other shards required (e.g. `NUU-Cognition/shard-flint`)
- `setup:` — `full | flint | local` when the shard needs one-time setup
- `types:` — artifact types the shard manages (installs `(Type) ...` files to `Mesh/Metadata/Types/`)
- `folders:` — artifact storage folders to create under `Mesh/`
- `install:` — files copied verbatim from `install/` into the workspace (dashboards, system files, Obsidian templates)

Read `shard.yaml` when you need to understand what a shard installs or depends on.

## Template Rules

Templates define how to create artifacts. When you encounter an artifact with a `template` field in frontmatter, or when a skill/workflow tells you to use a template, **follow these rules strictly.**

1. **Find and read the template first.** Search for `tmp-[sh]-[name]-v<X.X>.md` in the shard's `templates/` folder. The `template` field in an artifact's frontmatter is the filename stem (e.g. `[[tmp-proj-task-v0.2]]`).
2. **Templates are instructions, not scaffolds.** They tell you what to generate. Do not copy them verbatim.
3. **Replace all placeholders.** Generated text has no brackets. Follow the instruction inside each placeholder.
4. **Never output comments.** `/* */` blocks are for your understanding only.
5. **Respect the structure.** The template defines sections, ordering, and what fields to include.

## Agent Environment

- **Working directory**: Flint root (parent of `Mesh/`, `Shards/`, etc.)
- **Capabilities**: Read/write files, run shell commands, search codebase
- **Context window**: Limited — load files on demand, never assume prior knowledge
- **Session**: Stateless — each conversation starts fresh
- **Return to root**: At the end of every turn, `cd` back to the Flint root (`cd $ROOT`). Commands may take you into codebases or subdirectories — always return so the next turn starts from a predictable location.

### First Action

Always read `Mesh/(System) Flint Init.md` first. It contains what this Flint is about, how to navigate it, what shards are installed, and workspace-specific instructions.

### Identity

A Flint has a **person identity** — the operator's Name, bound to a `Mesh/People/@<Name>.md` file. The Name is **machine-global**, owned by the nuu CLI and stored in the shared `~/.nuucognition/config.toml` (the same value for every Flint on this machine). Set it once via first-run `flint setup`.

```bash
flint whoami                     # Show the operator Name + machine-name (and account status)
flint config name "Your Name"    # Set the operator Name (routes to nuu)
```

**When creating or editing artifacts**, resolve the operator Name (run `flint whoami`, or read `name` from `~/.nuucognition/config.toml`) and populate the `authors` frontmatter field with the person as a wikilink:

```yaml
authors:
  - "[[@Nathan Luo]]"
```

- The `@Person` is `@<Name>`; the `Mesh/People/@<Name>.md` marker is auto-created on first use.
- `authors` is a list (supports multiple people collaborating on one artifact)
- If no Name is set, omit the `authors` field (run `flint setup` to set it)
- Person files live in `Mesh/People/` with the `@` prefix convention

### Session Tracking

When editing files with frontmatter, append your session ID to the `orbh-sessions` field:
- `orbh-sessions: [your-session-id]`
- If the field doesn't exist, create it. If it exists, append your ID.
- All agent types (Claude, Codex, etc.) use the same `orbh-sessions` field — there are no per-runtime session fields.

### Headless Mode

A Flint agent can run headless inside an Orbh session (no interactive terminal). In that mode:

- Load `hinit-<sh>.md` instead of `init-<sh>.md` when starting a shard (use `flint shard hstart <name>` / `hstart-dev` for the dynamic manifest).
- Prefer `hwkfl-<sh>-<name>.md` workflows over their interactive `wkfl-*` counterparts — headless workflows drop human stage gates and report progress via Orbh session keys instead.
- Not every shard provides a headless init or headless workflows. If none exist, the regular interactive files are used.

Headless orchestration details (session lifecycle, status, interface keys, returning results) are owned by the Orbh shard — load `Shards/Orbh/init-foh.md` when operating in that context.

### Deleting Artifacts

**Always use `flint helper delete "<name>"`** when removing a Mesh artifact. Never `rm` the file directly or rely on Obsidian's delete.

What it does:
- Removes the file from disk.
- **Sweeps every YAML frontmatter wikilink** to that artifact across `Mesh/`: scalar fields (e.g. `parent:`, `increment:`) lose their key; array fields (e.g. `artifact-refs:`, `orbh-sessions:`) get filtered, and the key is removed if the array becomes empty.
- **Leaves body text alone by design** — a dangling `[[Name]]` in prose is an informational trace, not a structural invariant.

```bash
flint helper delete "<name>"              # Hard delete + frontmatter sweep
flint helper delete "<name>" --archive    # Soft delete: move to Mesh/Archive/ instead of removing
```

Rules:
- Looks up by Mesh title (Mesh names are globally unique).
- Scope is `Mesh/` only — `Shards/`, `Inbox/`, `Exports/`, `Archive/` are untouched.
- Errors if the name is not found — verify the title before retrying.

See [[knw-f-cli]] for the full CLI reference.

### Operating Principles

1. **Read before writing** — understand existing patterns before making changes
2. **Follow naming conventions** — use existing patterns for file names, tags, and structure
3. **Tag documents appropriately** — every artifact gets proper tags
4. **Write outputs to Mesh/** — all workspace content lives under Mesh/
5. **Search, don't browse** — find files by name/tag, not by walking directories
6. **Load shards on demand** — don't load what you don't need

### Available Commands

See [[knw-f-cli]] for the full CLI reference. Most commonly used:

```bash
# Artifact helpers
flint helper type newnumber <Type>    # Next artifact number (zero-padded, 3 digits)
flint helper rename "<old>" "<new>"   # Rename a Mesh artifact + rewrite every [[Old]] wikilink under Mesh/
flint helper delete "<name>"          # Delete artifact + strip every frontmatter wikilink to it (use --archive to soft-delete)

# Identity
flint whoami                          # Show operator Name + machine-name (and account status)

# Shard discovery and loading
flint shard list                      # List installed + dev shards
flint shard info <sh>                 # Detailed shard info
flint shard status <sh>               # Status + pending migrations
flint shard start <name>              # Dynamic manifest (installed, interactive)
flint shard start-dev <name>          # Dynamic manifest (dev, interactive)
flint shard hstart <name>             # Dynamic manifest (installed, headless)
flint shard hstart-dev <name>         # Dynamic manifest (dev, headless)

# Shard lifecycle
flint shard install <source>          # Install from owner/repo or path
flint shard install --all-dev         # (Re)install all dev shards
flint shard update                    # Update installed shards
flint shard uninstall <sh>            # Remove shard and clean files
```

Authoring commands (create, clone, dev, rename, push, pull, release, publish, migrate, scripts) are documented by the Knap shard — load `Shards/Knap/init-knap.md` when authoring.

If this Flint lives inside a **Tinderbox** (a multi-Flint orchestration box with a `tinderbox.toml`), `flint tinderbox <subcommand>` manages the box from any member. See the Tinderbox section of [[knw-f-cli]] before running it — `sync`/`import`/`heal` can move or delete Flints on disk.
