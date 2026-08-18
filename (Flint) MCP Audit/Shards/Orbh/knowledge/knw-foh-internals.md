---
description: "Session internals — Orb store layout and spools, five-state lifecycle, turns/results, collector correlation, pager and delivery slices, spaces, bundles, and repair"
orbh-sessions:
  - "[[d1f03280-e10d-413f-a040-70c3a84feb66]]"
  - "[[25f11f9b-67f7-46e6-ad6d-3089b3131066]]"
  - "[[0a96d4be-c368-430e-84a6-3ba0366bc6f8]]"
---

# Knowledge: Orbh Session Internals

Load this when diagnosing lifecycle, result collection, delivery health, spool movement, or store repair. Everyday verbs live in [[knw-foh-cli]].

## Data Model

A session is an event-sourced Orb spool, not a standalone session JSON file:

```text
.orb/
  manifest.json                  # {"schemaVersion":"1.0","kind":"orb-spool-tree-store"}
  spaces/<spaceId>/spools/
    <spoolId>.jsonl              # append-only control/event log: source of truth
    <spoolId>.json               # co-written live projection (ext.orbh)
    <spoolId>/<threadId>.jsonl   # transcript/content events
    <spoolId>/<threadId>.json    # thread projection
    <spoolId>/scratch/           # created with the spool; compaction handoffs land here
    <spoolId>/attachments/       # created on demand
  indexes/                       # orb-event-frontier.json, orb-spool-snapshot-locks, orbh-session-locks
  workflows/instances/           # workflow instance records; definitions/ holds static definitions
  procedures/                    # procedure step registers
  orbh.local/sweep-index/        # orchestrator sweep index, one file per session id
  jobs/                          # retained job output in the launching scope
  tmp/                           # launcher shims and scratch
```

Every mutation appends an event and updates the spool projection. Re-folding/rebuilding is repair, not the normal read path. Everything under `indexes/` is disposable cache and lock state.

Which store a command resolves to is worth confirming before any mutating verb in unfamiliar cwd: `flint orbh scope [--expect <dir>] [--json]` prints the resolution and its reason, creates nothing, and exits non-zero on an `--expect` mismatch. `--orb-root <dir>` (plus `--create-store`) overrides it explicitly.

## Lifecycle: Work State and Retention

`workState` has five values:

| State | Meaning |
|-------|---------|
| `working` | A live or recoverable turn is active; un-returned exits remain here while the reaper decides. |
| `needs-input` | A blocking `session ask` request is pending. Deferred requests are fire-and-continue and preserve lifecycle. |
| `awaiting` | Non-terminal dormancy after await/park or `failed-unreturned`; the orchestrator sweep owns the wake. |
| `finished` | Explicit finish return or terminal close/end. |
| `abandoned` | Explicit abandonment such as discard/operator verdict. |

Retention is a separate shelf projection: `active | parked | closed | finished | error`. Await/legacy park derives awaiting + parked; unattended finish derives finished retention; resume returns retention to active. Park is therefore compatibility vocabulary, not a lifecycle distinct from await.

Interactive views additionally derive observed activity: busy is working; idle is needs-input unless live dispatch stamps keep the manager working. This is read-side only.

## Turns, Runs, and Results

Each headless/subagent harness invocation is one turn and one run. Runs carry `continuesRunId`, process/native identifiers, status, end reason, disposition, and result.

| Turn outcome | Run facts | Derived state |
|--------------|-----------|---------------|
| `return --finish` | result + `returned` + `finish` | `finished` |
| `return --await` | result + `returned` + `await` | `awaiting` |
| exit without return | no result/disposition; exit reason retained | `working` pending reaper |
| two failed re-prompts | `failed-unreturned` | `awaiting` |
| pending blocking request (`ask`) | request fact; run may be suspended | `needs-input` |
| discard/operator abandonment | terminal control fact | `abandoned` |

Kill and interrupt suppress the un-returned re-prompt path because the caller owns what happens next.

A session's results form a stream. `result <id>` reads the latest returned run; `result <id> --run <n>` reads a 1-based historical run.

## Collector Correlation

Collectors record an anchor `{initiatedRunId, startedAt}` and find the first result on that run or its `continuesRunId` rescue chain. They do not subscribe to work state, retention, or process exit. The outcome enum is a correlated `result`, `api-error`, `failed-unreturned`, `abandoned`, `hangup`, `adopted`, or `pending`; `pending` and `adopted` do not discharge the durable dispatch obligation. Timeout belongs to the waiting command, not the outcome enum: it stops waiting while the durable outcome remains pending.

This prevents await/park and crash/re-prompt transitions from impersonating a result. Kill is different: it records abandonment, so the collector resolves as `abandoned`. Live collector stamps live in `core:dispatches`, alongside `core:dispatch-obligations` and `core:dispatch-claims`; they drive fan-out caps and keep interactive managers visibly working.

## Pager and Wake-Delivery Internals

There is no per-session waiter process and no session-lifetime lease.

**`core:page-arm/lease`** is written *only* by a running `flint orbh page arm` process, as exactly `{ pid, runId, machineId, armedAt }`. No boot-id or process-start fields are written on any platform — the lease record type still declares them as optional, but nothing populates them. `runId` is load-bearing rather than legacy: it powers the one-arm self-guard (a second arm for the same live run no-ops), supersession detection (an arm whose durable lease stops matching its own exits `superseded`), and context-advisory autofire eligibility. Because the lease is run-scoped by construction, it appears only on `working` spools and is cleared on the arm's exit, on session end, on run finalization for interactive/terminal sessions, and on mode switch, close, discard, abandon, and park-for-interactive.

Two sibling keys share the slice: `held` — the compaction pager hold, taken by `compact start` and released by `compact finish`, `compact abort`, or any turn-ending `session return` — and `context-advisory-run`, which marks the run whose 80% context advisory has already fired.

**`core:waiter-state/delivery`** is the durable delivery cursor, and it is what makes arm → fire → re-arm lossless. Its shape is `{ terminalJobIds, deliveredChildResultRunIds, deliveredNoticeIds, deliveredStationItemIds, pendingRequestIds, answeredRequestIds, barrier, roomCursors }`. Note `deliveredStationItemIds`: **station items are a first-class wake source**, so a station-bound session is woken by queued work like any other event ([[knw-foh-machinery]]).

**`core:waiter-attach`** is dead code. The slice constants and lease helpers still exist in source with zero callers; nothing has ever written the slice, and it appears on no live spool. There is no attach indirection to reason about — during a live turn `page arm` *is* the pager, for the duration of one arm.

Delivery to an awaiting session is owned by the machine orchestrator's awaiting-wake sweep, which refuses sessions that are no longer awaiting, are interactive, or are compacting, and defers to any live `page-arm` lease (including one held by another machine). See [[knw-foh-orchestrator]] for the sweep inventory and cadences.

## Ancestry and Safety Caps

Collected dispatches store immediate `parentSessionId` plus metadata `orbhAncestry: {rootSessionId, depth}`. Bare peer launches explicitly suppress parent inference. Defaults are depth 5 and live fan-out 16, configured by `ORBH_DISPATCH_DEPTH_CAP` and `ORBH_DISPATCH_FANOUT_CAP`; cap failures report the chain and the requested depth/fan-out.

## Spaces and Spools

```bash
flint orbh space list
flint orbh space show [id]
flint orbh space init <basis> [id] [--sync|--no-sync]   # basis: machine | user | flint
flint orbh promote [id] [--to <spaceId>]
flint orbh move-spool <spoolId> --to <spaceId> [--from <spaceId>]
```

Sessions are born in a machine-local space and may be promoted to a synced target. `end` promotes by default. `space init` defaults its id to `local`, then `$ORBH_USER_SPACE_ID`, then `flint`.

## Portable Bundles

```bash
flint orbh save [id] [-o <dir>]
flint orbh save <nativeId> --runtime <rt>
flint orbh restore <bundleDir> [--force]
```

`restore` restores native harness files only; it does not re-register an Orbh control session. Resume the restored native session to mint/associate control state.

## Maintenance and Audit

```bash
flint orbh reconcile [--all] [--dry-run] [--grace <seconds>] [--json]
flint orbh heal [--dry-run] [--include-synced] [--allow-adapter-strip] [--json]
flint orbh verify [sessionId] [--json]
flint orbh verify-sessions [--json]             # deprecated alias for verify
flint orbh rebuild-session-snapshots [sessionId] [--dry-run] [--json]
flint orbh rebuild [--dry-run|--yes] [--json] [--cwd <dir>] [--runtime <name>]
flint orbh reset [same options]                  # alias of rebuild
```

`reconcile` marks this machine's dead `working` sessions abandoned via the event path (`run.ended` with `endReason: lost`), skipping runs younger than the grace (default 60 s) and, with `--all`, sweeping every discovered scope rather than the current one. It is the usual provenance of `abandoned`/`error` spools you encounter that nobody deliberately discarded.

`heal` repairs Data Layer conformance violations; `--include-synced` allows rewrites in synced/flint-tier spaces and `--allow-adapter-strip` deletes adapter data it cannot re-fold instead of refusing those spools. `rebuild`/`reset` reconstruct derived transcript events and require `--yes`/`--force` to mutate; Orbh control events are preserved. `rebuild-session-snapshots` re-folds the session projection from canonical control events, for one session or every spool in scope.
