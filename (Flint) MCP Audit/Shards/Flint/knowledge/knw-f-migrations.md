---
description: "Flint-level migration system — types, authoring, CLI"
---

# Knowledge: Flint-Level Migrations

Complete reference for workspace-wide migrations managed by the `flint-migrations` package. These are distinct from shard-level migrations — flint migrations transform the workspace structure itself as the Flint CLI evolves.

## Overview

Flint-level migrations run against the workspace (flint.toml, Shards/, Mesh/, flint.json) to bring it into conformance with newer CLI versions. They are compiled into the CLI binary and executed via `flint migrate`.

**Key properties:**
- Workspace-wide scope (not per-shard)
- Tracked in `flint.json.migrations` with timestamps
- Grouped into version transitions (0.2.0 → 0.3.0)
- Support three execution types: script, agent, manual
- Multi-step within a single version transition

## ID Scheme

Migrations use positional IDs:

```
flint-{from}-to-{to}-s{n}
```

| Component | Meaning | Example |
|-----------|---------|---------|
| `from` | Minimum version required | `0.4.0` |
| `to` | Target version this step contributes to | `0.5.0` |
| `s{n}` | Step number within the version transition | `s1`, `s2`, `s3` |

Examples:
- `flint-0.0.0-to-0.2.0-s1` — first step in the initial migration batch
- `flint-0.4.0-to-0.5.0-s3` — third step in the 0.4.0 → 0.5.0 transition

The `name` and `description` are display metadata on the migration object, not part of the ID. Use `flint migrate list --all` to see names alongside IDs.

## Three Migration Types

| Type | Definition | `run` behavior |
|------|-----------|----------------|
| **script** | TypeScript with `check()` / `run()` / `verify()` | Auto-execute, auto-complete on success, auto-advance to next step |
| **agent** | `type: "agent"`, carries `instructions` | Print instructions, stop. An agent reads and executes. Complete via `flint migrate finish`. |
| **manual** | `type: "manual"`, carries `description` | Print description, stop. User does the work. Complete via `flint migrate finish`. |

Script is the default type. If `type` is omitted, the migration is treated as a script.

### Script Migrations

The standard migration type. Must implement:

- **`check(ctx)`** — Return `true` if migration should run, `false` if already applied. Must be idempotent and side-effect free.
- **`run(ctx)`** — Execute the transformation. Returns `{ success, changes, warnings? }`.
- **`verify(ctx)`** — Confirm the migration succeeded. Return `true` if verified.

```typescript
export const myMigration: FlintMigration = {
  id: 'flint-0.4.0-to-0.5.0-s1',
  name: 'My Migration',
  description: 'What this migration does',
  from: '0.4.0',
  to: '0.5.0',

  async check(ctx) {
    return await ctx.exists('old-thing');
  },

  async run(ctx) {
    const changes: string[] = [];
    // ... transform workspace ...
    changes.push('Renamed X to Y');
    return { success: true, changes };
  },

  async verify(ctx) {
    return !(await ctx.exists('old-thing'));
  },
};
```

### Agent Migrations

For transformations that require AI judgment. The migration carries instructions that an agent reads and executes.

```typescript
export const agentMigration: FlintMigration = {
  id: 'flint-0.4.0-to-0.5.0-s2',
  name: 'Update Artifact Tags',
  description: 'Agent reviews and updates artifact tags to new conventions',
  instructions: 'Read all files in Mesh/Types/ and update tags from #old to #new...',
  from: '0.4.0',
  to: '0.5.0',
  type: 'agent',
};
```

When `flint migrate run` reaches this step, it prints the instructions and stops. An agent session executes the work, then the user runs `flint migrate finish`.

### Manual Migrations

For changes that require human action — configuration, external system changes, or judgment calls.

```typescript
export const manualMigration: FlintMigration = {
  id: 'flint-0.4.0-to-0.5.0-s3',
  name: 'Update API Keys',
  description: 'Update API keys in .env to the new format. See docs at ...',
  from: '0.4.0',
  to: '0.5.0',
  type: 'manual',
};
```

When `flint migrate run` reaches this step, it prints the description and stops. The user completes the work and runs `flint migrate finish`.

## Multi-Step Migrations

Steps within a version transition execute in order. The `run` command auto-chains through consecutive script steps and stops at the first agent or manual step.

```
flint-0.4.0-to-0.5.0-s1  (script)  → auto-runs
flint-0.4.0-to-0.5.0-s2  (agent)   → stops, prints instructions
flint-0.4.0-to-0.5.0-s3  (script)  → runs after s2 is finished
```

After completing an agent/manual step with `flint migrate finish`, run `flint migrate run` again to continue with the remaining steps.

## Version Tracking

### flint.json

Migration state is tracked in `flint.json` at the workspace root:

```json
{
  "id": "uuid",
  "type": "flint",
  "version": "0.4.0",
  "migrations": {
    "flint-0.0.0-to-0.2.0-s1": "2026-03-01T...",
    "flint-0.0.0-to-0.2.0-s2": "2026-03-01T...",
    "flint-0.4.0-to-0.5.0-s1": "2026-04-14T..."
  }
}
```

- `version` — the workspace's current migrated version
- `migrations` — per-step completion timestamps

### Version Bumps

When ALL steps in a version transition are complete, the system checks whether the version step is **sealed**:

- **Sealed** — all planned migrations for this version are implemented. The version bumps automatically.
- **Unsealed** — migrations run but the version does not advance. This prevents premature version bumps during development when more steps are planned.

Seal status is declared in the migration registry (`versionStepSealed` in `index.ts`).

### Legacy ID Support

Migrations can declare `legacyIds` — old IDs from before the positional scheme. When checking if a migration has already been applied, both the current ID and legacy IDs are checked against `flint.json.migrations`. This ensures backwards compatibility when migrating workspaces that ran under the old ID scheme.

## CLI Commands

```bash
flint migrate                     # Overview: current version, pending migrations
flint migrate list                # Pending steps only
flint migrate list --all          # All steps including completed (for rerun discovery)
flint migrate run                 # Execute: auto-chain scripts, stop at agent/manual
flint migrate finish              # Mark current agent/manual step as done
flint migrate rerun <step-id>     # Re-execute a specific script step
```

### `flint migrate run` Behavior

1. Start at the first incomplete step across all pending version transitions
2. If **script**: execute `check()` → `run()` → `verify()`, record, advance to next
3. If **agent**: print instructions, print "run `flint migrate finish` when done", stop
4. If **manual**: print description, print "run `flint migrate finish` when done", stop
5. When all steps in a version transition complete and it's sealed: bump version, continue to next transition
6. Stop on first failure to prevent cascading errors

### `flint migrate finish`

Finds the first pending agent/manual step and records it as complete. If completing this step completes a sealed version transition, the version bumps automatically.

### `flint migrate rerun <step-id>`

Re-executes a specific script step. Does not trigger version bumps. Use `flint migrate list --all` to find step IDs. Only works for script type migrations.

## MigrationContext

Script migrations receive a `MigrationContext` with file operations scoped to the workspace root:

| Method | Signature | Purpose |
|--------|-----------|---------|
| `exists` | `(path: string) => Promise<boolean>` | Check if a path exists (relative to flint root) |
| `read` | `(path: string) => Promise<string>` | Read file contents |
| `write` | `(path: string, content: string) => Promise<void>` | Write file (creates parent dirs) |
| `delete` | `(path: string) => Promise<void>` | Delete a file |
| `log` | `(msg: string) => void` | Informational message |
| `warn` | `(msg: string) => void` | Warning message |
| `error` | `(msg: string) => void` | Error message |

All paths are relative to `ctx.flintPath`. For filesystem operations not covered by the context (directory renames, recursive copies), import from `node:fs/promises` and use `join(ctx.flintPath, ...)`.

## Authoring a Migration

### 1. Create the migration file

```
packages/flint-migrations/src/migrations/my-migration.ts
```

### 2. Define the migration object

```typescript
import type { FlintMigration, MigrationContext, MigrationResult } from '../types.js';

export const myMigration: FlintMigration = {
  id: 'flint-{from}-to-{to}-s{n}',  // Positional ID
  legacyIds: [],                      // Old IDs if renaming
  name: 'Human-Readable Name',
  description: 'What this migration does',
  from: '{from}',
  to: '{to}',
  // type: 'manual',                  // Omit for script (default)

  async check(ctx) { /* ... */ },
  async run(ctx) { /* ... */ },
  async verify(ctx) { /* ... */ },
};
```

### 3. Register in index.ts

```typescript
import { myMigration } from './my-migration.js';

export const migrations: FlintMigration[] = [
  // ...existing...
  myMigration,  // s{n}
];
```

### 4. Build and test

```bash
pnpm --filter flint-migrations build
pnpm --filter flint build
pnpm --filter flint-cli build
flint migrate list          # Verify it appears
flint migrate run           # Test execution
```

## Flint vs Shard Migrations

| Aspect | Flint-level | Shard-level |
|--------|------------|-------------|
| Scope | Workspace-wide | Per-shard |
| Trigger | CLI version changes | Shard version changes |
| Location | `flint-migrations` package (compiled into CLI) | `migrations/` folder in shard repo |
| Tracking | `flint.json.migrations` | `flint.json` per-shard version |
| CLI | `flint migrate *` | `flint shard <name> migrate *` |
| Types | script, agent, manual | script, agent, manual |

Both systems share the same conceptual model (three types, multi-step, auto-chaining) but operate independently.
