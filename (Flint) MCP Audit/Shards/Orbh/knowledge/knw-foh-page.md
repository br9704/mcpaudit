---
description: "The Page family — introspection, the one-shot pager and wake delivery, awaiting hygiene, procedures, background jobs, group barriers, and scheduled wakes"
orbh-sessions:
  - "[[d1f03280-e10d-413f-a040-70c3a84feb66]]"
  - "[[521efa86-61d9-4156-92ba-c40ef56d9e3d]]"
  - "[[1e7717cf-c6b0-4706-a149-ed479bd341cd]]"
  - "[[25f11f9b-67f7-46e6-ad6d-3089b3131066]]"
  - "[[0a96d4be-c368-430e-84a6-3ba0366bc6f8]]"
---

# Knowledge: The Page, Pager, Jobs & Procedures

The Page is your session's on-demand introspection surface. It combines core and shard Page functions over the durable session store. Read it at meaningful seams: first action on resume, before ending a long turn, after a subagent batch, at procedure boundaries. Act on `⚠` lines.

```bash
flint orbh page                               # Render your own Page; self reads may drain/update Page state
flint orbh page <id>                          # Read-only observer view of another session
flint orbh page --raw                         # Label each function's output by id
flint orbh page --no-mutate                   # Force a read-only self render
flint orbh page run <source>/<name> [args…]   # Invoke one Page function
flint orbh page arm [id] [--max-wait <s>]     # One-shot pager; use background execution
```

## The Pager and Wake Delivery

There is no standing waiter process. Delivery has exactly two paths, and which one is live depends on whether your turn is running.

**During a live turn — the pager.** Run `flint orbh page arm` through your harness's background execution. It is a one-shot long-poll owned by your *current run*: it claims a run-scoped lease in `core:page-arm`, watches your spool, and exits with a full Page render the moment a message, terminal job, child result, request answer, room event, station item, group-barrier completion, due scheduled wake, or 80% context advisory lands. Your harness surfaces that as a background-task notification. It fires once — arm again after it fires while latency matters. It expires after 2 h by default (`ORBH_PAGE_ARM_TTL_SECONDS`; unbounded for interactive sessions), and exits early with `page arm superseded by a newer arm` or `session ended — pager exiting`. If it says the latter, or you are about to return, do not arm again. A second arm for the same run is refused as `page arm already active for this session (pid N); not starting a second` — that is correct, not an error.

`--max-wait <seconds>` bounds *your* latency rather than the pager's usefulness: at the deadline it emits a heartbeat Page render and exits instead of erroring. Omit it to wait until the TTL.

**With no arm on a working turn, nothing is watching you.** Events are not held by any process; they accumulate as durable spool state and surface at your next Page read or at your turn boundary. A missed re-arm costs latency, never events: the delivery cursor lives in `core:waiter-state` and only advances when a Page is actually rendered.

**Between turns and while awaiting — the machine orchestrator.** Once your turn ends and the session is `awaiting`, the machine-wide Orbh orchestrator sweep owns delivery. Its business sweeps run about every 15 s (the 1 s loop underneath is only supervision heartbeat), it waits ~6 s for a wake fact to settle, then coalesces everything pending into one digest and resumes you with it as a new turn's prompt. Overdue scheduled wakes get a second retry net every 15 s. The sweep steps aside for any session holding a live `page arm` lease, so the two paths never double-deliver. Awaiting is therefore the only headless self-pacing primitive: `return --await` and let the sweep wake you.

## Hygiene and Awaiting Surfaces

- On an unattached working headless turn the Page shows `⚠ paging not armed — mid-turn delivery is delayed; run 'flint orbh page arm' in the background when latency matters (the orchestrator sweep owns between-turn wake delivery)`. Arm if you are coordinating live; ignore it on a heads-down turn. There is no such warning while awaiting — that state needs no pager.
- `⚠ long gap since last self-check (Nm) — re-read the Page at the next seam` means exactly that: read the Page.
- `PAGER  held for compaction since …` means `compact start` suspended paging on purpose. `compact finish`, `compact abort`, or any alternate turn-ending `session return` releases it, and nothing is lost while held — a later arm resumes from the same durable cursor. See [[knw-foh-compaction]].
- An awaiting Page renders `AWAITING since … · last woken by …`, derived from durable events.
- `flint orbh list` has a dedicated **Awaiting** section with awaiting duration and last-woken source; dispatch children are trees by default.
- Awaiting beyond `ORBH_AWAITING_DORMANCY_DAYS` (default 7) is flagged as a broken await-promise worth retiring. A station-bound session is exempt.

Self Page reads may mutate Page counters and drain inbox state; observer reads do not. Page functions fail independently with a warning. Treat `core:*` interface slices as reserved.

Other env knobs on this surface: `ORBH_PAGE_SELF_CHECK_GAP_MS`, `ORBH_PAGE_STALE_DESC_READS`, `ORBH_PAGE_RETURN_DISCIPLINE_READS`.

## Procedures: Durable Step State

A **procedure** is the per-session step register — ordered steps, a cursor, forced evidence check-ins — and it renders on the Page, so it survives context loss.

```bash
flint orbh procedure start --title "<t>" (--steps "read spec;implement;verify?" | --from <file>) [--enforced]
flint orbh procedure step <n> --update "<what you actually did>"
flint orbh procedure skip <n> --reason "<why>"
flint orbh procedure show | list [--all] | finish | abandon --reason "<why>"
```

- One active procedure per session; `start` is refused while one is live. A trailing `?` on a step marks it skippable; `--from <file>` extracts steps from markdown.
- `step <n>` must name the current step and **is refused when `--update` is empty**.
- `finish` is refused while required steps are outstanding; `abandon` is the honest escape hatch.
- **`--enforced`** blocks `session return --finish` and a self `flint orbh end` while required steps are outstanding. `--await` is unaffected, and an operator can still end the session from outside.
- `step`, `skip`, `finish`, and `abandon` fire the workflow chokepoint (`start` does not), which is how cross-session clauses hang off individual steps — see [[knw-foh-machinery]].

Closing a procedure does not replace the turn's required `session return`.

## Background Jobs

```bash
flint orbh job run "<command>" [--group <g>] [--timeout <s>] [--session <id>]
flint orbh job run --agent <runtime/profile> "<prompt>" [--group <g>] [--timeout <s>] [--account <name>]
flint orbh job list
flint orbh job result <id>
flint orbh job wait <id> [--poll <ms>]
flint orbh job clear [--all]
```

An agent job wraps `request -q`; the subagent's correlated result becomes job output. `job result` can read retained output while running, and `job wait` blocks until terminal. The reaper marks dead wrappers and expired jobs failed. Groups are all-terminal barriers: failure resolves the barrier too, and retries remain explicit.

`job run` and the other job verbs accept `--session <id>` for explicit cross-session mutation; use it only when you own orchestration of the target. `job complete <id>` is registered but **internal** — it is how the background wrapper records a terminal status. Do not call it.

### Await a Job Group

The modern in-turn form is `session return --await --until-group`, because it delivers the turn's result to your collector **and** arms the barrier in one verb:

```bash
flint orbh job run --agent codex/solxh "review module A" --group fan
flint orbh job run --agent codex/solxh "review module B" --group fan
flint orbh job run "pnpm test" --group fan --timeout 1800
flint orbh session return --await --until-group fan "Fan-out dispatched; awaiting the wave."
```

`flint orbh park [id] --until-group <g> [--barrier-timeout <s>]` is the legacy/operator spelling. It carries no turn result, and `--barrier-timeout` — which force-resolves the barrier, marking still-running group jobs failed so a session can never be stranded — exists **only on `park`**.

The barrier is additional, not exclusive: messages, requests, subscribed room activity, station items, and individual terminal-job events can still wake you before the whole group is terminal. On wake, inspect `job list` and use `job result <id>` for full output. Plain `park`/`--await` clears a stale barrier directive.

Note which sweep does what: the orchestrator's **barrier sweep is enforcement-only** — it fails timed-out jobs and never resumes a session. The awaiting-wake sweep is what actually wakes you when the barrier is satisfied.

### Scheduled Self-Wake

```bash
flint orbh session return --await --wake-at +45m "<durable state>"
flint orbh session return --await --wake-at 2026-08-04T09:00+10:00 "<durable state>"
```

`--wake-at` is the one primitive that lets an awaiting session experience **time** rather than only events — poll a slow external system, stage a wave, revisit a decision. It requires `--await`. Formats are an ISO 8601 **datetime** or a `+duration` (`+45m`, `+2h`, `+1h30m`, `+1d`); a bare calendar date is rejected on purpose, and the ceiling is 365 days. The resolved time lands in the interface key `core:wake-at` *before* the turn ends, so the session is never observably awaiting without its schedule. **An `--await` with no `--wake-at` retires any schedule from a prior turn**, and terminal verbs retire it too. The orchestrator's scheduled-wake sweep is the retry net: it re-checks every 15 s and concludes a timer was missed after 60 s of overdue slack.
