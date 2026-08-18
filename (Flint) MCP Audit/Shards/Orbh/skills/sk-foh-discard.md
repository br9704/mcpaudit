---
description: "Discard the current Orbh session — tombstone its history entry and terminate the harness (no Mesh summary)"
orbh-sessions:
  - "[[25f11f9b-67f7-46e6-ad6d-3089b3131066]]"
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

# Skill: Orbh Discard

Discard the current orbh session **without** writing a Mesh summary. Use this when the session should disappear from Orbh history rather than be archived as a searchable agent record (the opposite choice from [[sk-foh-close]], which leaves a record).

By default `flint orbh discard` records the tombstone and terminates the harness (returning the terminal to the shell) — it does **not** touch Obsidian. The discard call kills the harness, so this skill's last action is `flint orbh discard` — nothing runs after it. (Pass `--obsidian` only if you specifically want it to close a bound Obsidian terminal tab instead.)

# Input

- Human instruction to discard the current session.

# Actions

1. If useful, briefly tell the human you are discarding the session and that no summary record will be written.

2. **Discard the session.** This is an explicit terminal abandonment verdict: it appends an `orbh.session.discarded` tombstone, drops the entry out of `orbh list`, terminates the harness, and clears any pager state. It self-targets through `ORBH_SESSION_ID`; do nothing after.

   ```bash
   flint orbh discard
   ```

   > Works for both interactive and headless sessions — the default path records the tombstone and terminates the harness without any Obsidian binding. Pass `--obsidian` only when you want it to close a bound Obsidian terminal tab instead of terminating the process directly. There is no confirmation prompt.

# Output

- An `orbh.session.discarded` tombstone appended to the Orb control log (session hidden from `orbh list`).
- Harness terminated and any pager state cleared.
- Terminal returned to the shell.
