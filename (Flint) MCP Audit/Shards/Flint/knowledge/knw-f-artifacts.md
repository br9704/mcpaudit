---
description: "Frontmatter, tags, naming, notes, and session tracking conventions"
---

# Knowledge: Artifact Conventions

Complete reference for artifact frontmatter, tags, naming, notes, and session tracking in Flint workspaces.

## What Are Artifacts

Artifacts are the documents that agents create and manage inside a Flint. Every artifact has:
- A **filename** following a naming convention
- **YAML frontmatter** with metadata
- **Markdown body** with structured content
- A **template** that defines its structure

## Naming Conventions

### Typed Artifacts

Most artifacts use the typed naming pattern:

```
(Type) NNN Name.md
```

| Component | Format | Example |
|-----------|--------|---------|
| Type | Title Case in parens | `(Task)`, `(Plan)`, `(Notepad)` |
| Number | 3-digit zero-padded | `001`, `042`, `103` |
| Name | Descriptive title | `Implement auth`, `Q1 Roadmap` |

**Getting the next number:**
```bash
flint helper type newnumber Task     # → 076
flint helper type newnumber Plan     # → 004
flint helper type newnumber Notepad  # → 028
```

**Special case — Increments:**
```
(Increment) X.N.I - Name.md
(Increment) 3.16.0 - Shard Registry.md
(Increment) 3.A.0 - Adhoc.md
```

Special cases will describe how they increment in numbers in their unique init files. 

Typed files will describe where they should go in the mesh in their templates. 
### Notes (Untyped)

Notes are the bare and most default type inside of a flint. Notes do not use a `(Type)` prefix. 

```
Title of the note.md
```

Notes are the base unit of free-form content. Their title should be descriptive and stand alone. Notes are differentiated by tags, not by folders or naming conventions. See the **Notes** section below.

### Dashboards and System Files

```
(Dashboard) Backlog.md              # DataviewJS live view
(System) Flint Init.md              # System-managed file
```

These use the `(Type)` pattern but without numbers.

## Frontmatter Schema

Every artifact has YAML frontmatter between `---` delimiters. For example: 

```yaml
---
id: a1b2c3d4-e5f6-7890-abcd-ef1234567890
tags:
  - "#proj/task"
status: in-progress
increment: "[[(Increment) 3.16.0 - Shard Registry]]"
due: 2026-03-01
completed:
priority: high
orbh-sessions:
  - "[[154d8abd-6089-4b1d-9969-6cb51dfe926b]]"
  - "[[60be4985-9cd6-42f1-8245-e56c1ad68324]]"
template: "[[tmp-proj-task-v0.1]]"
authors:
  - "[[@Nathan Luo]]"
---
```

### Required Fields

| Field | Type | Purpose |
|-------|------|---------|
| `id` | UUID v4 | Permanent identifier, never changes |
| `tags` | string[] | Classification and discovery |

### Common Optional Fields

| Field               | Type                | Purpose                                     |
| ------------------- | ------------------- | ------------------------------------------- |
| `template`          | string              | Filename stem of the governing template     |
| `status`            | enum string         | Lifecycle state (defined per template)      |
| `due`               | ISO 8601 date       | Deadline                                    |
| `completed`         | ISO 8601 date       | Completion date                             |
| `priority`          | `low\|medium\|high` | Priority level                              |
| `authors`           | string[]            | Person wikilinks from the global operator Name (`flint whoami`) |
| `orbh-sessions`     | string[]            | Session IDs of agents that edited this file |

## Tags

Tags use the `#prefix/type` convention and are always quoted in YAML (because `#` starts a comment):

```yaml
tags:
  - "#task"
  - "#proj/task"
```

### Tag Patterns

| Pattern           | Meaning              | Examples                                     |
| ----------------- | -------------------- | -------------------------------------------- |
| `#shard/artifact` | Shard-specific type  | `#proj/task`, `#ntpd/notepad`, `#inc/stream` |
| `#note/subtype`   | Note subtype         | `#note/concept`, `#note/record`              |
| `#shard/state`    | Shard-specific state | `#inc/active`, `#inc/complete`               |

### Shard Tags

Each shard defines its own tag namespace using its shorthand:
- Flint (`f`): `#note` (see the Invironments shard for the `#ie/` structure namespace)
- Projects (`proj`): `#proj/task`
- Increments (`inc`): `#inc/stream`, `#inc/checkpoint`, `#inc/active`, `#inc/complete`
- Notepad (`ntpd`): `#ntpd/notepad`
- Plans (`plan`): `#plan/plan`

## Notes

Notes are the base unit of free-form content in a Flint — one editable model per file, tagged `#note`. **Note structure and placement are owned by the Invironments shard (`ie`)**, a dependency of Flint: every note carries exactly one `#ie/sections/<name>` tag saying which mesh section it lives in, and a note created with no destination goes to the **New** section (`Mesh/Main/`). Use `flint shard ie note` to create notes and [[tmp-ie-note-v0.1]] for their structure. There are no note subtypes — one flat `#note`, with structure added only when it pays off.

## Status Management

Each artifact type defines its own status lifecycle. Common patterns:

### Linear Lifecycle
```
draft → todo → in-progress → review → done
```

### With Branching
```
draft → todo → in-progress → review → done
                    ↓            ↑
                 blocked ────────┘

Any status → deprecated (terminal)
```

### Binary Lifecycle
```
active → archived
```

### Status Rules

1. **Templates define available statuses** — check the template for valid options
2. **Init files document transitions** — the shard's init explains when to transition
3. **Skills/workflows handle transitions** — don't change status ad-hoc; use the appropriate skill
## Session Tracking

Agents track their involvement by appending session IDs to the `orbh-sessions` frontmatter field. All agent types use a single unified field.

### How It Works

1. When editing a file with frontmatter, check for an `orbh-sessions` field
2. If it exists, append your session ID to the list
3. If it doesn't exist, create it with your session ID

```yaml
# Before
orbh-sessions:
  - "[[previous-session-id]]"

# After
orbh-sessions:
  - "[[previous-session-id]]"
  - "[[your-current-session-id]]"
```

### Unified Field

All agent runtimes (Claude Code, Codex, etc.) write to the same `orbh-sessions` field. There are no per-runtime session fields. Orbh sessions map to native runtime sessions via the runs model in the session JSON.

### When to Track

- When you **create** a new artifact
- When you **substantively edit** an artifact (status changes, content additions)
- Do NOT track when you only read a file
- Do NOT track on session init — reading files at startup is not a substantive edit

## Authorship

Artifacts track who created or substantively edited them via the `authors` frontmatter field.

### How It Works

1. Resolve the operator Name — run `flint whoami` (routes to `nuu whoami`), or read the `name` key from the shared `~/.nuucognition/config.toml` — and form the person as `@<Name>` (e.g. `@Nathan Luo`)
2. When creating an artifact, add the person as a wikilink to `authors`
3. When substantively editing an artifact, add the person if not already listed
4. If no Name is set, omit the `authors` field entirely (the operator sets it with `flint setup` / `flint config name`)

```yaml
authors:
  - "[[@Nathan Luo]]"
  - "[[@Even Zhang]]"
```

### Person Files

People are represented by marker files in `Mesh/People/`:

```
Mesh/People/@Nathan Luo.md
Mesh/People/@Even Zhang.md
```

The `@` prefix is the naming convention. These files can be empty — the filename IS the identity, and the marker is auto-created on first use. The operator Name lives machine-globally in `~/.nuucognition/config.toml` (owned by the nuu CLI); the `@Person` is `@<Name>`.

### Rules

- `authors` is always a list (even with one person)
- The person is the author, not the agent — agents act *on behalf of* the person
- Do NOT add authors when only reading a file
- Do NOT confuse authors with `[agent]-sessions` — sessions track agent involvement, authors track human attribution

## Wikilinks

Flint uses Obsidian-style wikilinks for cross-references:

```markdown
[[Document Title]]                   # Link by title
[[(Task) 076 Implement auth]]        # Link to typed artifact
[[(Increment) 3.16.0 - Shard Registry]] # Link to increment
```

In frontmatter, wikilinks are quoted:

```yaml
increment: "[[(Increment) 3.16.0 - Shard Registry]]"
artifacts-created:
  - "[[(Task) 104 Implement shard pull]]"
```

## Archiving

When artifacts reach terminal states, they typically move to `Mesh/Archive/`:

- `Mesh/Archive/Tasks/` — Completed tasks
- `Mesh/Archive/Plans/` — Spent plans
- etc.

The archive mirrors the Types structure. The artifact's status is updated before moving.
