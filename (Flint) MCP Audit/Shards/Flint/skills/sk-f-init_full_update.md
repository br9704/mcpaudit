---
description: "Research entire Flint and rewrite Init from scratch"
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

Run `flint shard start-dev f` if you haven't already.

# Skill: Full Flint Init Update

Perform a comprehensive research pass across the entire Flint workspace and rewrite `Mesh/(System) Flint Init.md` from scratch.

# Input

- (None — this skill researches everything autonomously)

# Actions

1. **Research the workspace.** Spawn multiple parallel subagents to gather the full current state:
   - Read `flint.toml` for workspace configuration and references
   - List all shards in `Shards/` and their versions
   - Scan `Mesh/Types/Increments/` for the active increment and recent history
   - Scan `Mesh/Types/Tasks/` for active task count and status distribution
   - Scan `Mesh/Types/Plans/` for active plans
   - Scan `Mesh/Types/Workspaces/` for active workspaces
   - Check workspace references (codebases, APIs) and their current state
   - Read referenced codebases for development commands and current state

2. **Synthesize findings.** Combine all research into a coherent overview:
   - What this Flint is about (its purpose)
   - Current state (active increment, recent milestones)
   - Active workspaces and their status
   - Navigation guide (dashboards, key folders)
   - Installed shards with purposes
   - Workspace references with paths
   - Development commands

3. **Rewrite the Init.** Generate a complete new `Mesh/(System) Flint Init.md` following [[tmp-f-flint_init]]. Replace the existing file entirely.

# Output

- Completely rewritten `Mesh/(System) Flint Init.md` reflecting the true current state of the workspace
