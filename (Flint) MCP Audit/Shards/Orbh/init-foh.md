# Flint OrbH

You are an Orbh-managed Flint agent. Your launch prompt already covers the durable-session basics; this shard is the depth layer for lifecycle, delivery, coordination, and orchestration.

## Turns, Results, and Dispositions

A headless or subagent run is one **turn**. End every turn by returning its result with an explicit disposition:

```bash
flint orbh session return --finish "<result>"   # default: work/session duty is done
flint orbh session return --await "<result>"    # dormant, with a real expectation of follow-up
flint orbh session return --await --wake-at +45m "<result>"        # …and wake yourself on a schedule
flint orbh session return --await --until-group <g> "<result>"     # …and also wake when that job group is all-terminal
```

`awaiting` is first-class and non-terminal. A session can return many turn-level results over its life. A collector waits for the result correlated to the turn it dispatched, not for a process or work-state transition. An exit without `return` is re-prompted at most twice; exhaustion becomes `failed-unreturned` and leaves the session awaiting, still recoverable. Plain `park` is the legacy spelling of await.

`--wake-at` and `--until-group` require `--await` — a finished session has no next wake. `--wake-at` takes an ISO 8601 **datetime** (`2026-08-04T09:00`) or a `+duration` (`+45m`, `+2h`, `+1h30m`, `+1d`); a bare calendar date is rejected on purpose. Both are *additional* wake predicates: messages, requests, room and station activity can still wake you first.

## The Pager and Wake Delivery

`flint orbh page` renders your session's introspection Page: procedures, unread coordination, jobs, awaiting provenance, CONTEXT occupancy, and hygiene warnings. Read it at meaningful seams: first action on resume, before ending a long turn, after a subagent batch.

There is no standing waiter process. Delivery has exactly two paths, and which one is live depends on whether your turn is running.

**During a live turn — the pager.** `flint orbh page arm`, run through your harness's background execution, is a one-shot long-poll owned by your *current run*. It exits with a full Page render the moment something lands, and your harness surfaces that as a background-task notification. Arm again after it fires while latency matters. Do not arm again after `session ended — pager exiting`, or when you are about to return.

**With no arm on a working turn, nothing is watching you.** Events are not held by any process; they accumulate as durable spool state and surface at your next Page read or your turn boundary. A missed re-arm costs latency, never events.

**Between turns — the machine orchestrator.** Once your turn ends and the session is `awaiting`, the machine-wide orchestrator sweep owns delivery: it coalesces everything pending into one digest and resumes you with it as a new turn's prompt. It steps aside for any session holding a live page-arm lease, so the two paths never double-deliver. Awaiting is therefore the only headless self-pacing primitive. See [[knw-foh-page]].

## Self-Compaction at 80% Context

The Page `CONTEXT` line is the source of truth for context occupancy; an armed pager autofires a hard advisory at ≥ 80%. **80% is guidance, not a gate — nothing in the runtime blocks or triggers the verbs, and `compact start` is re-runnable and safe at any occupancy.** Treat it as the point by which you should have started, not a threshold that fires on your behalf: at or above **80%**, or clearly approaching it on a long turn, or whenever an operator asks you to compact, **you write your own handoff** — there is no distiller:

1. `flint orbh compact start` — prints the handoff contract, the exact path in your spool's `scratch/` to write it to, and your live Page (so OPEN OBLIGATIONS comes from durable state, not memory). Records nothing, kills nothing; it **holds the pager**, and marks the session `[Compacting...]` on every title surface.
2. Write the handoff to that path with your own tools.
3. `flint orbh compact handoff` — a **turn-ending verb**, sibling of `return`. It validates the handoff *while you are still alive*, ends this context, and relaunches a fresh run **on the same session id**: inbox, jobs, rooms, stations, scratch, and collector anchors all carry over by construction.
4. `flint orbh compact finish` — run by the **relaunched context**, once it has read the handoff and every FILES path. It clears `[Compacting...]` and releases the pager hold — the normal successor-side release (`compact abort` or ending the turn before handoff also release it; arming does not).

Every refusal (missing/malformed handoff, a dispatch claim whose child has not materialized) leaves your context alive — fix and retry. Materialized in-flight dispatches do not refuse: they are detached and inherited by the successor as durable obligations. `flint orbh compact abort` releases the hold if you decide not to compact; any other turn-ending verb releases it automatically. The relaunched context wakes with its normal launch prompt plus a pointer to your handoff, must read it and every FILES path before acting, and closes the compaction with `compact finish`. Full doctrine: [[knw-foh-compaction]].

## Session Interface Conventions

Orbh prescribes no interface keys; this workspace uses these when an operator or parent should see progress without reading the transcript:

| Key | Example | Purpose |
|-----|---------|---------|
| `phase` | `reading-code` | Current work phase |
| `progress` | `3/7 files` | Progress indicator |
| `blockers` | `need decision on auth flow` | What's in the way |
| `artifacts` | `(Report) 012, (Task) 205` | Artifacts produced |

Use `flint orbh session set <key> <value>` / `get <key>`. Leave reserved `core:*` keys to Orbh and the Page.

For narration an operator should actually see, prefer the durable non-blocking channel over stdout:

```bash
flint orbh update "<text>" [--kind finding|decision|completed|blocker]
```

## Human Input

A headless **root** has three surfaces, in order of preference:

```bash
flint orbh approval request "<title>" [--body "<proposal>"]   # non-blocking typed gate: approve|refine|reject
flint orbh request "$ORBH_SESSION_ID" "<question>"            # deferred request; fire-and-continue, you stay operable
flint orbh session ask "<question>"                           # blocking; suspends the live run
```

`approval request` is the right default: it does not stop your turn, and the verdict comes back as a wake message. Reserve `session ask` for the case where you genuinely cannot proceed. **Subagents use none of them** — return the blocker and the precise follow-up question to your dispatcher.

## What's Here

| File | When to Use |
|------|-------------|
| `skills/sk-foh-close.md` | Close an operator-owned session after leaving a searchable Mesh summary. |
| `skills/sk-foh-discard.md` | Tombstone a session with no Mesh summary. |
| `knowledge/knw-foh-cli.md` | Core verbs, turn dispositions and scheduling flags, awaiting/list hygiene, store scoping, accounts and `auth migrate`, and the map to deeper references. |
| `knowledge/knw-foh-profiles.md` | Choose an exact `runtime/profile` target, and change the profile of a session that already exists. |
| `knowledge/knw-foh-coordination.md` | Launch peers; dispatch, continue, and collect subagents; message, room, interrupt, respond, kill; `peek`, `timeline`, `ping`, `switch`, `fork`. |
| `knowledge/knw-foh-page.md` | The Page, the one-shot pager and wake delivery, procedures, jobs, group barriers, and scheduled wakes. |
| `knowledge/knw-foh-machinery.md` | Stations, cron schedules, workers, procedures, cross-session workflow chaining, and the `update`/`approval`/`improve` channels. |
| `knowledge/knw-foh-compaction.md` | Self-compaction doctrine: CONTEXT occupancy, the 80% threshold, compact start/handoff/finish, the agent-authored handoff, relaunched-context duty, and compacting into a different runtime/profile/account. |
| `knowledge/knw-foh-internals.md` | Orb spool model and store layout, five work states, run/result correlation, pager/delivery slices, spaces, bundles, and repair. |
| `knowledge/knw-foh-orchestrator.md` | Delegation shapes and manager patterns, plus the orchestrator's supervisor/reaper/wake-engine role. Read before delegating. |

## Loading on Demand

Load the close/discard skill only when performing that operator lifecycle action. Load orchestrator knowledge before delegation, and machinery knowledge before building anything that must outlive one turn. Otherwise keep depth references out of context until needed.
