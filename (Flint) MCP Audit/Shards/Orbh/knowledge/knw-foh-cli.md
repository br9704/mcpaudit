---
description: "Core `flint orbh` reference — turn dispositions and wake scheduling, awaiting, session verbs, collection, operator lifecycle, accounts, store scoping, hygiene surfaces, and deeper references"
orbh-sessions:
  - "[[e07fc648-1ec0-4bf7-bc78-3de4e566702a]]"
  - "[[d1f03280-e10d-413f-a040-70c3a84feb66]]"
  - "[[25f11f9b-67f7-46e6-ad6d-3089b3131066]]"
  - "[[0a96d4be-c368-430e-84a6-3ba0366bc6f8]]"
---

# Knowledge: Flint OrbH CLI Reference

Run `flint orbh --help`, `flint orbh <cmd> --help`, and group help for the authoritative surface of the **installed binary**. A source checkout may be newer than that binary until it is rebuilt, so when implementing or documenting unreleased source, verify the command registrations in `apps/orbh-cli/src` as well. This file covers the verbs used inside a session and maps to deeper references.

## Where the Depth Lives

| File | Load when you need |
|------|--------------------|
| [[knw-foh-profiles]] | Exact `runtime/profile` selection |
| [[knw-foh-coordination]] | Peers, collected subagents, turn-correlated results, messages, rooms, and intervention |
| [[knw-foh-page]] | Page, the one-shot pager and wake delivery, procedures, jobs, group barriers, scheduled wakes |
| [[knw-foh-machinery]] | Stations, cron sessions, workers, procedures, workflow chaining, updates, approvals, `improve` |
| [[knw-foh-internals]] | Orb spool and store layout, lifecycle derivation, result streams, delivery slices, spaces, bundles, and repair |
| [[knw-foh-orchestrator]] | Delegation shapes, recursive managers, and the orchestrator's supervisor/reaper/wake-engine role |

## Lifecycle Orientation

- A session is a durable event-sourced Orb spool; a headless/subagent run is one **turn**.
- `workState` has five values: `working | needs-input | awaiting | finished | abandoned`.
- Every headless/subagent turn ends with `session return --finish` or `--await`; finish is the default.
- `awaiting` is dormant and wakeable, not terminal. Parked retention is how the compatibility layer shelves awaiting sessions; park and await are not different lifecycle meanings.
- A session may return many turn-level results. Collectors correlate to initiated runs, not session terminality.
- An exit without return is re-prompted at most twice; exhaustion becomes `failed-unreturned` and `awaiting`.
- Abandonment covers explicit operator verdicts (discard/kill) and liveness reconciliation of confirmed-dead working runs (`flint orbh reconcile`, `endReason: lost`).

## Session Commands

When `ORBH_SESSION_ID` is set, omit your own ID:

```bash
flint orbh session register "<title>" "<description>"
flint orbh session set <key> <value>
flint orbh session get <key>
flint orbh session return --finish "<result markdown>"
flint orbh session return --await "<result markdown>"
flint orbh session return --await --wake-at <when> "<result markdown>"
flint orbh session return --await --until-group <group> "<result markdown>"
flint orbh session ask "<question>" [--timeout <seconds>]
flint orbh session note "<text>"
flint orbh artifact <id> "<path>"
```

Explicit form is `flint orbh session <id> <action> [value...]`. `--finish` and `--await` are mutually exclusive. Omitting both on `return` means finish.

### Scheduling the Next Wake

Both scheduling flags **require `--await`** — a finished session has no next wake, and using either with finish exits 1.

- `--wake-at <when>` takes an ISO 8601 **datetime** (`2026-08-04T09:00`, `2026-08-04T09:00+10:00`) or a `+duration` matching days/hours/minutes/seconds (`+45m`, `+2h`, `+1h30m`, `+1d`). A bare calendar date is rejected deliberately, since it would silently mean UTC midnight; the ceiling is 365 days, and a time already past means wake immediately. The resolved time is written to the interface key `core:wake-at` *before* the turn ends, so the session is never observably awaiting without the schedule it asked for. **A later `--await` with no `--wake-at` retires the prior schedule**, as do finish/kill/end.
- `--until-group <group>` resumes you when every job in that group is terminal (failure resolves the barrier too).

Both are *additional* predicates, not exclusive ones: messages, requests, room activity, station items and child results can still wake you first. `--barrier-timeout <seconds>` exists **only on `park`**, not on `session return`.

### Return Is the Turn Seam

`return` stores the payload on the current run and records the disposition. The harness may still be alive for a moment, but the durable run already carries its result and `returned` end reason. On process exit:

- finish self-shelves an unattended session as finished;
- await self-shelves it as awaiting/parked, where the orchestrator sweep owns its wake;
- a pending **blocking** `ask` request derives `needs-input` (a deferred request is fire-and-continue and preserves lifecycle);
- no return enters the bounded re-prompt path.

Terminal stdout is not a deliverable. Consumers read with:

```bash
flint orbh result <id>                 # latest returned turn
flint orbh result <id> --run <n>       # specific 1-based run
flint orbh inspect <id> --results
```

### Ask, Notes, and Interface Keys

`session ask` records a blocking request, suspends the live run, and returns the human response on stdout. Use it only when a headless root genuinely cannot proceed; prefer the non-blocking `flint orbh approval request` gate, and subagents return blockers to their dispatcher instead of opening either. `note` appends an annotation without changing lifecycle. For durable progress narration an operator can read, use `flint orbh update` — see [[knw-foh-machinery]].

Common free-form keys are `phase`, `progress`, `blockers`, `artifacts`, and `confidence`. Leave `core:*` slices to Orbh/Page internals.

### Event Subscription (`session await`)

This is unrelated to the `--await` turn disposition. It subscribes to server events:

```bash
flint orbh session await --list
flint orbh session await <eventType> [--filter <key=value>] [--timeout <seconds>]
```

It requires the standalone Orbh server (`flint orbh server start|stop|status`, operator-facing). Use Page/pager delivery for ordinary session coordination.

## Results and Collection

```bash
flint orbh request -q <runtime/profile> "<prompt>"
flint orbh request -q -c <id> "<follow-up>"
flint orbh wait <id1> [id2...] [--next] [--timeout <seconds>]
flint orbh result <id> [--run <n>]
```

`request` and `wait` block on turn-correlated outcomes. Await/park and rescue runs remain pending; kill derives abandonment, which resolves collection as `abandoned`. A command timeout stops waiting while the collector outcome remains `pending`. Use background execution. See [[knw-foh-coordination]].

`wait --next` waits for a result *newer than the latest one present at invocation* — the correct flag when you re-collect a session that has already returned and you want its next turn, not the one you have read.

Beyond `-q`/`-c`, `request` takes `--runtime <runtime>` (target as a flag, prompt positional), `--timeout <seconds>`, `--stream` (live transcript while collecting), `--title` / `--description` (pre-set the child's identity so `list` is legible), `--continues <id>` (link a *new* session as a continuation), `--max-turns <n>` and `--budget <usd>`.

## Operator Lifecycle Verbs

These are operator/session-retention controls, not substitutes for a headless agent's normal return discipline:

```bash
flint orbh close [id] [--obsidian]
flint orbh park [id] [--until-group <g>] [--barrier-timeout <s>] [--obsidian]
flint orbh discard [id] [--obsidian]
flint orbh end [id] [--result <text>] [--to <spaceId>] [--no-promote] [--require-promote] [--no-close] [--no-kill]
```

| Verb | Meaning |
|------|---------|
| `close` | Terminal finished + closed retention; terminates the harness and clears any pager lease. |
| `park` | Legacy await spelling; awaiting/parked retention, woken by the orchestrator sweep. `--until-group` adds the all-terminal job-group condition to the standard wake set, and `--barrier-timeout` (park-only) force-resolves it. |
| `discard` | Tombstones the entry, records abandonment, terminates the harness. |
| `end` / `x` | Finishes, promotes by default, closes/terminates, and tears down terminal obligations. |

The default close/park/discard path is Obsidian-independent; `--obsidian` selects a bound terminal-tab path.

## Accounts: `auth`, and Migrating a Live Session

Accounts are isolated harness login homes, per runtime.

```bash
flint orbh auth list [runtime]
flint orbh auth add <runtime> <name> [--no-login]
flint orbh auth default <runtime> <name>        # Flint-local inside a Flint, else machine-global
flint orbh auth default <runtime> --clear       # clear the default (name required unless --clear)
flint orbh auth remove <runtime> <name> [--yes] # remove an isolated account home
flint orbh auth usage [runtime] [name]          # live quota / rate-limit windows, read-only
flint orbh auth ccusage [--dry-run] [args…]     # run ccusage across Orbh account homes + vanilla defaults
flint orbh auth refresh [runtime] [name]        # re-auth expired accounts via one throwaway session each
flint orbh auth migrate <account> [--force]     # move THIS session to another account
```

### `auth migrate` — change account, keep the conversation

```bash
flint orbh auth migrate <account> [--force]
```

A **self-target** verb: it must run inside the session it moves, because the thing being migrated is the conversation you are having. What happens:

1. The run ends at a deliberate turn boundary (end reason `migrated`). The **session never ends** — runs are cheap, the spool is durable.
2. The session's transcript and sidecar files are **moved** (renamed, not copied) into the destination account home.
3. The durable `account` is flipped.
4. The pane **native-resumes the same native session id** under the new home.

So this is the deliberate opposite of compaction: compaction relaunches into a *fresh* native context on purpose; migration *preserves* the conversation on purpose. Pick by what you are trying to change:

| Want to change | Verb | Native context |
|---|---|---|
| account | `auth migrate <account>` | preserved |
| profile, same runtime | `profiles switch <runtime/profile>` | preserved |
| runtime (± profile, ± account) | `compact handoff --into <runtime/profile>` | fresh, carried by your handoff |

**Headless sessions migrate too**, by a simpler path: there is no pane and nothing to respawn, because the account home is re-derived from the store at *every* spawn. So the move is just "settle, move files, flip", and the session comes up in the new home at its **next wake** — the command says `Not relaunched` when that is what happened. A headless session with a **live turn** is not refused — the turn is **killed** at a deliberate boundary (`endReason: migrated`, `status: completed`, no `error` retention) and then the files move. The kill is required for integrity, since the transcript is written live and renaming it under a running child would tear it. The turn in flight is lost; the conversation is not. The binary's own `auth migrate` help string still says the verb *is refused while a turn is running* — that string is stale; the kill-at-boundary behavior is what is implemented (`packages/orbh/src/account-migration.ts`).

Constraints, all enforced before anything is killed or moved:

- **Same runtime only** — accounts are per-runtime; a claude session cannot migrate into a codex account.
- The destination must have **usable credentials**, or the migration is refused so it does not drop you at a login screen mid-turn. `--force` overrides.
- A name collision in the destination is refused rather than merged.

Only the session's own files travel. **Auto-memory, harness config, and credentials stay with the old account** — an account *is* its credentials, so carrying them would defeat the operation. A failure after the move rolls the files back.

Orb agents get the same operation, plus the durable declaration, through `flint orbh agent migrate <name> <account>` (Orb Agents shard).

## Page, Pager, and List Hygiene

```bash
flint orbh page
flint orbh page arm [id] [--max-wait <seconds>]
flint orbh list [--print] [--wide] [--subagents] [--json] [-a|--all] [-s|--stats] [--detached]
flint orbh list --status awaiting
```

`page arm` is a **one-shot, run-scoped pager**, not an attach to anything standing. Run it through background execution during a live turn; it exits with a full Page render on the first Page-worthy event, and you re-arm if latency still matters. It expires after 2 h on an unattended session (`ORBH_PAGE_ARM_TTL_SECONDS`; unbounded for interactive), and `--max-wait <seconds>` bounds *your* latency instead — at the deadline it emits a heartbeat render and exits rather than erroring. Recognisable exits: `page arm already active for this session (pid N); not starting a second` (a second arm on the same run, correct rather than an error), `page arm superseded by a newer arm`, `page arm expired — re-arm with flint orbh page arm`, and `session ended — pager exiting` (do not arm again). Between turns, an awaiting session needs no pager at all: the machine orchestrator sweep owns that delivery. Full model in [[knw-foh-page]].

`list` and `active` **open a cockpit in a TTY**; `--print` is the static table and `--json` the machine-readable form — and `--json` is *the default when invoked from inside an Orbh session*, so a script that expects a table must pass `--print`. `list` renders dispatch trees by default (`--subagents` flattens them) and gives awaiting sessions their own section with duration and last-woken provenance. Awaiting past `ORBH_AWAITING_DORMANCY_DAYS` (default 7) is flagged as a broken await-promise worth retiring; a station-bound session is exempt.

## Notes

- `--path <dir>` overrides Flint discovery. `--orb-root <dir>` scopes a command to an explicit Orb store (overriding `ORBH_ORB_ROOT_DIR` and cwd), and `--create-store` permits an explicitly scoped store that does not exist yet to be created. Both are available on essentially every verb and are the mechanism for cross-Flint work.
- `flint orbh scope [--expect <dir>] [--json]` is the read-only pre-flight probe: it prints which store the next command will resolve to and why, creates nothing, and with `--expect` exits non-zero on a mismatch — so a brief can require it before any mutating verb.
- `flint orbh context [id] [--json]` prints token context-window occupancy directly (the Page `CONTEXT` number) without rendering the Page; see [[knw-foh-compaction]]. `flint orbh peek <id> [--json]` is cheap projection-only status for another session; see [[knw-foh-coordination]].
- Verify/repair commands and current caveats live in [[knw-foh-internals]].
- Bare `launch` creates a peer; `request` creates a collected subagent. Do not interchange them.
- Durable machinery beyond the session — stations, cron, workers, procedures, workflow chaining, `update`/`approval`/`improve` — is in [[knw-foh-machinery]].
