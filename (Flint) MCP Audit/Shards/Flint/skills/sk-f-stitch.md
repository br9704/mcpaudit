---
description: "Construct a stitch file — a curated index of [[wikilinks]] to feed into `flint helper stitch`"
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

Run `flint shard start-dev f` if you haven't already.

# Skill: Stitch

Construct a **stitch file** — a markdown file that bundles together everything the user wants stitched into a single exportable context. The file's body is a curated list of `[[wikilinks]]` to Mesh artifacts **and/or `[[path/to/file]]` references to code or other files on disk**. Once created, the file is fed into `flint helper stitch` to resolve every link and copy the combined content to the clipboard for export to another LLM, document, or chat.

This skill does NOT run `flint helper stitch` itself. It builds the input file and emits the exact command the user can paste into their terminal.

## What `flint helper stitch` resolves

The resolver branches on whether the wikilink target contains a `/`:

| Target shape | Treated as | Resolution |
|--------------|------------|------------|
| `[[Title]]` (no slash) | **Mesh artifact** | Looked up by filename across `Mesh/`; matched artifact's body is stitched in |
| `[[path/to/file]]` (contains a slash) | **File on disk** | Resolved as a path relative to the Flint root; file contents are read and stitched in |

For path-style references:
- **Markdown files** (`.md`) have their frontmatter stripped and body included verbatim.
- **Code and other text files** are wrapped in a fenced code block with the language inferred from the extension (e.g. `.py` → `python`, `.tex` → `latex`, `.ts` → `typescript`, `.bib` → `bibtex`).
- If the file does not exist on disk, the reference is reported as `unresolved` (same as a missing Mesh artifact).

Use this to bundle source code alongside Mesh artifacts in a single stitched context — e.g. include `[[Workspace/Repos/<Repo Name>/src/main.py]]` next to the `(Task)` and `(Report)` that discuss it.

# Input

- A topic, theme, or set of artifacts to bundle (e.g. "everything about the auth rewrite", "the last three reports", "specs + tasks for the shard registry")
- (Optional) Explicit list of artifacts to include — if provided, use these verbatim and skip the search step
- (Optional) Target location — defaults to `Mesh/Notes/`
- (Optional) Stitch file title — defaults to a sensible name derived from the topic

# Actions

1. **Gather artifacts.** Unless the user gave an explicit list:
   - Search `Mesh/` for artifacts related to the topic — by filename, tags, frontmatter fields, and body content
   - Cast wide: typed artifacts (`(Task)`, `(Report)`, `(Notepad)`, `(Spec)`, `(Plan)`, etc.), notes, dashboards, system files, and metadata references
   - **Also consider code/file references** when the topic involves a codebase — under `Workspace/Repos/<Repo>/...` or any other path under the Flint root. Include them as `[[path/from/flint/root/to/file.ext]]` wikilinks.
   - Deduplicate; preserve a useful order (e.g. by type, then by number, then by file path)

2. **Present and confirm.** Show the user:
   - The proposed stitch file title and target path
   - The full list of wikilinks that will be included, grouped by type
   - A short description (one or two sentences) that will sit at the top of the file
   - Ask the user to confirm, edit, add, or remove entries before writing

3. **Choose the path.**
   - Default: `Mesh/Notes/(Stitch) <Title>.md`
   - If the user specified a folder, write there; if they specified a different prefix or untyped name, honor it
   - Use a filename that will be unique inside the chosen folder

4. **Write the stitch file.** Create the file with this structure:

   ```markdown
   ---
   id: [generate-uuid]
   tags:
     - "#note"
     - "#note/stitch"
   orbh-sessions:
     - "[[your-session-id]]"
   authors:
     - "[[@Person Name]]"  /* from the global operator Name (flint whoami); omit if no name set */
   ---

   # [Stitch Title]

   [one or two sentence description of what this bundles and why]

   ## Sources

   - [[Artifact 1]]
   - [[Artifact 2]]
   - (continue)

   ## Code

   - [[Workspace/Repos/<Repo Name>/src/main.py]]
   - [[Workspace/Repos/<Repo Name>/report/report.tex]]
   - (continue)
   ```

   Notes on the body:
   - Anything that is NOT a `[[wikilink]]` is preserved verbatim in the stitched output as the leading section. Use this space to add context that the receiving LLM/reader should know about the bundle.
   - Wikilinks may appear anywhere — `flint helper stitch` extracts them from the entire body. Grouping under headings (e.g. `## Tasks`, `## Reports`, `## Code`) is purely cosmetic.
   - **Mesh wikilinks** are bare titles with no slash: `[[(Task) 003 ...]]`. **Code/file wikilinks** are paths from the Flint root: `[[Workspace/Repos/<Repo>/src/foo.py]]`. The presence of `/` is what flips the resolver into file-on-disk mode.
   - Avoid putting example `[[Foo]]` wikilinks inside backticks if you do NOT want them resolved — `flint helper stitch` strips code spans before parsing, so backticked examples are correctly ignored. Use this to your advantage when documenting.

5. **Emit the command.** Print the exact terminal command the user can copy-paste, quoting the title to handle spaces and parens:

   ```
   flint helper stitch "(Stitch) <Title>"
   ```

   The argument is the stitch file's **Mesh title** (no path, no `.md`) — `flint helper stitch` looks it up by title across `Mesh/` (the same way `rename`/`delete` do). A path-style argument containing a `/` (e.g. `"Mesh/Notes/(Stitch) <Title>.md"`) is still accepted and read directly from disk for backwards compatibility.

   Also offer the `--print` variant for piping (`flint helper stitch --print "<title>" | pbcopy`-style workflows) and `--also-print` for both-clipboard-and-stdout.

# Output

- A stitch file written to the chosen path (default `Mesh/Notes/(Stitch) <Title>.md`)
- The exact `flint helper stitch "<Mesh Title>"` command printed for the user to paste into their terminal

# Notes

- The skill does not invoke `flint helper stitch`. The user runs it themselves so the clipboard ends up on their machine, not the agent's.
- A stitch file is a regular note. It can be edited, re-stitched, renamed, or deleted via the standard helpers (`flint helper rename`, `flint helper delete`).
- `flint helper stitch` is one-level only — it does not recurse into wikilinks-of-wikilinks. If a bundle needs to flatten a deep graph, expand it manually in the stitch file before running the command.
