---
description: "Write a session summary, return the final turn, and close the session (terminates the harness)"
orbh-sessions:
  - "[[25f11f9b-67f7-46e6-ad6d-3089b3131066]]"
---

> [!important] THIS FILE IS AN INSTRUCTION. WHEN REFERENCED IT IS MEANT TO BE TAKEN AS AN ACTION.

# Skill: Orbh Close

Wrap up the current Orbh session: write a per-session summary markdown file to the Mesh, return the final turn with `--finish`, then close the session. `return` stores the deliverable and tears down terminal waiter duty; `close` adds closed retention and terminates the harness. The close call is last—nothing runs after it.

# Input

- Your own working memory of what this session did.

# Actions

1. **Register the closing title explicitly** while preserving the current description. Do not use `session set`; title and description are registration fields.

   ```bash
   flint orbh session register "[Closing] <title>" "<desc>"
   # Expected: Registered: [Closing] <title> — <desc>
   ```

2. **Resolve the machine name.** Default to the device's friendly name; fall back to hostname.

   ```bash
   MACHINE=$(scutil --get ComputerName 2>/dev/null || hostnamectl --static 2>/dev/null || hostname)
   ```

3. **Inspect the session for metadata.** Capture title, status, prompt, started, run history.

   ```bash
   flint orbh inspect <session-id>
   ```

4. **Determine the runtime folder.** Use the runtime's display name as the subfolder of `Mesh/Agents/` — e.g. `Mesh/Agents/Claude Code/`, `Mesh/Agents/Codex/`. Create the folder if it does not exist.

5. **Write the summary file** at `Mesh/Agents/<Runtime>/<session-id>.md`. Use [[tmp-foh-close-v0.1]] for the structure. The machine field is required and must be the value resolved in step 2.

6. **Return the final turn.** Return a concise markdown summary including the summary-file path and the session outcome.

   ```bash
   flint orbh session return --finish "<final result>"
   ```

7. **Close the session.** This records closed retention and terminates the harness—do nothing after.

   ```bash
   flint orbh close                # self-targets via ORBH_SESSION_ID inside a harness
   flint orbh close <session-id>   # explicit id is equally acceptable
   ```

   > The default path is Obsidian-independent. Pass `--obsidian` only when you specifically want to close a bound Obsidian terminal tab.

# Output

- `Mesh/Agents/<Runtime>/<session-id>.md` — searchable, machine-attributed session record.
- Session result stored on the current run.
- Session recorded as closed; harness terminated and terminal returned to the shell.
