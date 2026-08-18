---
description: "Process incoming bundles from Inbox into Mesh"
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

Run `flint shard start-dev f` if you haven't already.

# Skill: Process Inbox

Process incoming bundles in the `Inbox/` folder — read instructions, renumber artifacts, and move them into the Mesh.

# Input

- (Optional) Specific bundle name to process (default: process all pending bundles)

# Actions

1. **List bundles.** Scan `Inbox/` for subdirectories matching the `(Bundle) Name` pattern. Each subdirectory is a bundle sent from another Flint via `flint send`.

2. **For each bundle:**
   - **Read the bundle note.** Find the file matching `(Inbox) (Bundle) Name.md` inside the bundle directory. Read its frontmatter (`source-flint`, `sent`, `status`, `files`, `copies`) and body (processing instructions).
   - **Skip if already processed.** If the bundle note's `status` is `processed`, skip it.
   - **Read the processing instructions.** The body of the bundle note contains human-written instructions describing where files should go.
   - **Note the file lists.** `files` are permanent transfers (deleted from source). `copies` are duplicates (source kept). Both are processed the same way in the target — the distinction only affected the sending side.

3. **For each file in the bundle** (excluding the bundle note itself):
   - **Strip the prefix.** Remove the `(Inbox) (Bundle) Name . ` prefix from the filename to recover the original name (e.g., `(Inbox) (Bundle) Auth Migration . (Task) 042 Build auth.md` → `(Task) 042 Build auth.md`).
   - **Determine destination.** Use the processing instructions and the file's type prefix to decide where it goes in `Mesh/`. Common mappings:
     - `(Task)` → `Mesh/Types/Tasks/`
     - `(Plan)` → `Mesh/Types/Plans/`
     - `(Notepad)` → `Mesh/Types/Notepads/`
     - `(Report)` → `Mesh/Types/Reports/`
     - `(Increment)` → `Mesh/Increments/`
     - `(Spec)` → `Mesh/Specs/`
     - Notes (no type prefix) → `Mesh/Notes/`
     - If the instructions specify a different location, follow the instructions
   - **Renumber the artifact.** Typed artifacts with numbers (e.g., `(Task) 042`, `(Notepad) 015`) must be renumbered to match the target vault's sequence. Run `flint helper type newnumber <Type>` to get the next available number, then rename the file accordingly. Update the heading inside the file to match the new number. Do NOT renumber specs, increments, or unnumbered artifacts.
   - **Check for duplicates.** Search `Mesh/` for a file with the same name as the (renumbered) target. If found, flag it to the user and ask how to proceed before moving.
   - **Move the file.** Rename and move from the bundle directory to the destination, using the renumbered filename.

4. **Clean up.** Once all files in a bundle have been moved:
   - Update the bundle note's `status` to `processed`
   - Delete the entire bundle directory from `Inbox/`

5. **Report.** Summarize what was processed: how many bundles, how many files, where each file was placed, and any renumbering that occurred.

# Output

- All pending inbox bundles processed
- Files moved into correct `Mesh/` locations with renumbered filenames
- Bundle directories deleted from `Inbox/`
- Summary of all actions taken including renumber mapping (e.g., `(Task) 042 → (Task) 199`)
