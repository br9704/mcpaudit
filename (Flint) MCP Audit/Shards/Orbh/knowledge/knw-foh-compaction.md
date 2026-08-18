---
description: "Self-compaction doctrine — the agent authors its own handoff into scratch, CONTEXT occupancy via the Page, the 80% threshold, compact start/handoff/finish, in-place relaunch under a stable session id"
orbh-sessions:
  - "[[411171be-587b-44fd-8c74-43f5700bb512]]"
  - "[[20c303b9-4b45-4e66-a13a-5e1a427f015a]]"
  - "[[b906e3ea-30d1-48f6-827a-89c5553e49c8]]"
---

# Knowledge: Self-Compaction at 80%

Compaction replaces the **context, not the identity**. The session is the durable endpoint, runs are its context windows, and the native harness is an interchangeable worker beneath a stable id. Compacting ends the current run (end reason `compacted`) and relaunches a **new run on the same session** with a fresh native context. The Orbh session id never changes: inbox, jobs, rooms, stations, waiter obligations, parent/child links, collector anchors, and every external reference stay valid by construction. Messages and job results that land during the relaunch window are durable in the same spool and surface to the fresh context through its page-first bootstrap.

**You write your own handoff.** There is no distiller. Nothing resurrects your dead context to reconstruct what you meant — you are alive and holding the whole thing at the moment you compact, so you write the successor note yourself, and the system validates it while you can still fix it.

## Occupancy: the Page CONTEXT line is the source of truth

Read occupancy from the **`CONTEXT` line of your Page** — `flint orbh page`, or any `page arm` delivery. It reports `used / max (pct%)` from the live transcript. Do not invent alternate token accounting. An armed pager autofires an advisory at ≥ 80%.

`flint orbh context [id] [--json]` reads the same number directly. It self-targets via `ORBH_SESSION_ID` and neither renders nor mutates the Page, which makes it the cheap poll for the 80% threshold when you only want occupancy and not a full Page render.

## The doctrine: three verbs

Compaction spans two contexts, so it takes three verbs — two on the way out, one on the way in.

> [!note] 80% is guidance, not a precondition
> **Nothing gates these verbs on occupancy.** `compact start` records no intent and is re-runnable at any percentage; no sweep fires them for you. 80% is the point by which you should have *started* — chosen so there is room left to write a good handoff — not a trigger that acts on your behalf. Compact earlier when an operator asks or when a natural seam makes a clean handoff cheap; do not wait past it expecting something else to intervene.

At **≥ 80% occupancy** (or clearly approaching it on a long turn):

1. **`flint orbh compact start`.** Prints the `COMPACTION_ARTIFACT_V1` contract, the exact absolute path to write your handoff to (inside your spool's `scratch/`), and your live Page so you write OPEN OBLIGATIONS from durable state rather than memory. It **records no intent, takes no claim, and kills nothing** — it is re-runnable and safe. Its one durable effect is to **hold the pager**, which is also what marks the session `[Compacting...]`.
2. **Write the handoff** to that exact path, with your own tools. No size limit, no shell quoting — it is a file.
3. **`flint orbh compact handoff`.** The handoff path is convention, so the verb needs no argument for it. It validates the handoff **while you are still alive**, then ends this context and relaunches the same session pointed at what you wrote. It is a **turn-ending verb**, a sibling of `return`. Do not plan work after it; there is no after. Its two optional flags are the only way to change what the fresh run comes up as — see [[#Compacting into a different profile]].
4. **`flint orbh compact finish`** — run by the **relaunched context**, not by you. Once it has read the handoff and every path in the FILES list, it runs `finish` to declare the compaction over: the `[Compacting...]` marker clears and the pager hold releases, together.

Changed your mind between `start` and `handoff`? **`flint orbh compact abort`** releases the hold. Ending the turn any other way (`return --finish` / `--await`) releases it automatically.

Every refusal — missing handoff, malformed handoff, a handoff belonging to another run, a dispatch claim whose child has not yet materialized — is an **ordinary error while your context survives**. Fix it and retry. This is the whole point of authoring your own handoff: the feedback loop closes. Materialized in-flight dispatches do **not** refuse: `compact start` detaches their collector stamps while the children keep running, and the successor inherits them as durable obligations to re-collect.

## Compacting into a different profile

The relaunch is the **only** boundary at which a session's **runtime** can change (same-runtime profile and account changes have their own conversation-preserving verbs — `profiles switch`, `auth migrate`), so `compact handoff` is where that choice is made:

```bash
flint orbh compact handoff --into <runtime/profile> [--account <name>]
```

- `--into` takes a **profile registry key** — the same `runtime/profile` target `launch`, `request`, and `i` accept (see [[knw-foh-profiles]]). Confirm it with `flint orbh profiles` first; resolution is exact and an unknown name errors.
- **Cross-runtime is allowed** (an interactive session additionally requires the target runtime to support interactive launch). A `claude` session may compact into `codex/solxh`. Your handoff is the entire channel to the successor, which is precisely why this works — the new runtime shares none of your native context, and was never going to.
- `--account <name>` selects the harness account for the fresh run. It **requires** `--into`.
- The session id, spool, inbox, jobs, rooms, stations, scratch, and collector anchors are unchanged. An interactive pane keeps its manager and swaps only the harness child.

Both flags are validated **before your context ends**. A bad profile or an `--account` without `--into` prints `Your context will NOT end.` and refuses — fix it and retry.

Use it when the work ahead has a different shape than the work behind: escalating to a stronger model for a hard stretch, dropping to a cheaper one for mechanical follow-through, or moving to a runtime better suited to what remains.

> [!important] For a SAME-runtime profile change, do not use compaction
> `flint orbh profiles switch <runtime/profile>` changes the profile while **keeping** the conversation — it resumes the same native session id under the new model/effort. Compacting for that would throw away a working context to change a model flag.
>
> Use `--into` when the **runtime** changes. That is the case a native conversation genuinely cannot survive, and the handoff is how meaning crosses the gap. To change the **account** while preserving the conversation, use `auth migrate` ([[knw-foh-cli]]).

## Compaction is visible: `[Compacting...]`

From `compact start` until the relaunched context runs `compact finish`, every title surface prefixes the session with `[Compacting...]` — the pane title, `orbh list`, the cockpit, and Orbit. It is **derived, never stored**: the marker is the compaction pager hold read through `isSessionCompacting`. Nothing writes it into `session.title`, so a compaction that dies mid-flight cannot leave a polluted title behind.

The window deliberately spans the relaunch. What a human wants to know is not "is a process being killed" — that takes about a second — but "is this session doing something other than my work", and that includes the successor's bootstrap, where a fresh context reads a handoff and every file it names before it can act. `finish` is the successor declaring that done, and it is the only thing that ends the window (besides `abort`, or ending the turn with `return`).

(`flint orbh compact test [--duration <ms>]` — 900–30000ms, default 4500 — shows that curtain on the pane for a few seconds and then hands the pane back unchanged. It compacts nothing and is not part of the doctrine; it exists to eyeball the visible surface.)

One deliberate consequence: a successor that never runs `finish` leaves the marker up. That is the honest reading — it says a context relaunched and never confirmed it read its handoff, which is a failure worth seeing rather than hiding.

## The pager is HELD, not lost

`compact start` **holds** the pager and terminates any live arm, so nothing interrupts the critical section — draft the handoff, die, and read yourself back into existence. Holding loses no events: the pager's wake baseline is the durable delivery cursor in `core:waiter-state`, which only advances when a page is actually rendered. Anything that lands while held is still pending. **Arming does not release the hold** — the relaunched context arms near the start of its bootstrap, and releasing there would end the critical section while it is still reading. `compact finish` releases it. The Page shows `PAGER held for compaction` while the hold is in place.

(`held` is deliberately not called "parked" — `retention: 'parked'` and the legacy `park` spelling of `return --await` already mean other things.)

## Scratch: your durable working memory

`<orbRoot>/spaces/<space>/spools/<sessionId>/scratch/` is a reserved directory created with the spool. It is keyed to the **session id**, so its contents survive compaction by exactly the construction that keeps the inbox and jobs valid — nothing moves. The handoff lives there, and so can anything else a context wants its successor to inherit: drafts, notes, intermediate analysis. Nothing is cleaned automatically; the accumulation is traceability.

## Who executes

- **Headless/subagent:** `handoff` records a moments-long durable intent (a crash-recovery token, not a queue) and spawns a detached executor — needed because the CLI dies with the harness. The executor kills the harness (run end reason `compacted` — a deliberate classification, never a crash, never reaped), takes up the handoff, and relaunches, as one synchronous pipeline. The orchestrator sweep is the crash backstop.
- **Interactive:** the manager (the PTY wrapper) is the durable endpoint and owns the whole pipeline on a single control verb: it kills the harness child, shows "compacting…" in the pane, takes up the handoff, and starts the fresh child **in the same pane** — the human watches the succession live. Sockets, pane title, attach client, and `ORBH_SESSION_ID` all persist. A pane whose manager predates the verb refuses loudly (context survives); exit and `flint orbh resume <id>`.

There is **no operator-driven compaction**. `flint orbh session compact <id>` is gone: an operator in another terminal has no context to write a handoff from. Ask the session to compact itself.

## The relaunched context's duty

The relaunched run wakes with its **normal launch prompt, freshly composed** for its mode — a compacted session starts like any other session of its kind — followed by a compaction section naming the handoff path. Hard requirements: run `flint orbh page` first (this surfaces messages, job results, and notices that arrived during the relaunch window), then **read the handoff**, then **read every path in its FILES list directly before acting** — the SUMMARY is orientation, not ground truth. Then run **`flint orbh compact finish`**: that is how the session stops reading `[Compacting...]` and gets its pager back. Preserve and execute every OPEN OBLIGATION, then resume the duty.

## Failure shape

A failed relaunch leaves the session recoverable with **the handoff already on disk** — it was written and validated before anything was killed, so there is no window in which a context has been destroyed and its replacement does not yet exist. Sessions compacted under the legacy succession model keep their `compacted-into` pointers readable; nothing creates them any more, and a session still carrying an in-flight succession checkpoint is refused rather than half-migrated. The durable `last` marker on the compaction slice records `completedAt`, the closed and relaunched run ids, and a running count.
