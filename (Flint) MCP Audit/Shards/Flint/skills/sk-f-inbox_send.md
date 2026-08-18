---
description: "Gather files for a topic and send to another Flint"
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

Run `flint shard start-dev f` if you haven't already.

# Skill: Send to Inbox

Gather files related to a topic, confirm with the user, and send them to another Flint's inbox via `flint send`.

# Input

- Target Flint name (must be in the registry)
- Topic or description of what to send
- (Optional) Specific files to include
- (Optional) Processing instructions for the receiving Flint

# Actions

1. **Verify target.** Run `flint list` or check the registry to confirm the target Flint exists. If not found, report the error and stop.

2. **Gather files.** Search `Mesh/` for all files related to the topic:
   - Search by filename, tags, frontmatter fields, and content
   - Include typed artifacts (tasks, notepads, plans, reports, increments) and notes
   - Check `Media/` for referenced media files
   - If the user specified files, use those instead of searching

3. **Classify files as move or copy.** For each file, determine whether it should be:
   - **Move** (permanent transfer) — the file leaves this Flint. Use for tasks, notepads, plans, and work artifacts that are transferring ownership.
   - **Copy** (duplicate) — the file stays in this Flint too. Use for specs, reference material, reports, and anything that's still relevant to the source Flint.
   - Present the classification to the user for confirmation.

4. **Present the file list.** Show the user:
   - All files found, grouped by type, with move/copy labels
   - Total count (N moved, N copied)
   - Proposed bundle title
   - Proposed processing instructions (based on the file types found — e.g., "Tasks go to Mesh/Types/Tasks/, notepads to Mesh/Types/Notepads/")
   - The exact `flint send` command that will be run, including `--copy` flags
   - Ask for confirmation before proceeding

5. **Execute the send.** Run the `flint send` command:
   ```bash
   flint send "<Target Flint>" "<Bundle Title>" "<Processing Instructions>" file1.md file2.md ... --copy copy1.md copy2.md ...
   ```
   Move files are copied to the target's `Inbox/` then deleted from source. Copy files are copied but kept in source.

6. **Report.** Summarize what was sent — how many moved, how many copied.

# Output

- Files sent to the target Flint's `Inbox/` as a bundle
- Move files deleted from source, copy files kept
- Summary of what was sent (moved vs copied)
