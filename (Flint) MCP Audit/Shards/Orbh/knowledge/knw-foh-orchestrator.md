---
description: "Orbh orchestration — delegation shapes, collector-backed dispatch, recursive awaiting managers, peers, and the orchestrator's supervisor/reaper/wake-engine role"
orbh-sessions:
  - "[[e5b16ab0-bba4-4da2-a15a-6f84107d181f]]"
  - "[[1e7717cf-c6b0-4706-a149-ed479bd341cd]]"
  - "[[25f11f9b-67f7-46e6-ad6d-3089b3131066]]"
  - "[[f5bc64b0-3b0a-4b22-a079-866934fc9c24]]"
  - "[[0a96d4be-c368-430e-84a6-3ba0366bc6f8]]"
---

# Knowledge: Orbh Orchestration

Two different actors are called orchestrators:

1. A **manager agent** decomposes work, dispatches subagents, reviews results, and may await between waves.
2. The **per-machine orchestrator process** supervises managers, reaps ungraceful deaths, and drives the sweeps that wake dormant sessions. It does not plan agent work.

## Delegation Shapes

Pick the shape before picking the verb. They differ in who owns the result and whether you block.

| Shape | Verb | Blocking? | Use when |
|---|---|---|---|
| **Subagent** | `request -q <target> "<prompt>"` | Yes — you block on the correlated result | You own the work and need its answer in this turn. The default. |
| **Agent job** | `job run --agent <target> "<prompt>" --group <g>` | No — collect on a barrier | Wide fan-out, or you want to release your harness between waves. |
| **Worker** | `worker spawn "<brief>"` | No — the single return arrives as a child-result wake | The unit is durable and named, and a human may want to converse with it in its own thread. |
| **Peer** | `launch <target> "<duty>"` | No, and no collector at all | The duty outlives you or belongs to nobody. Coordinate by message/room. |
| **Station** | `station send <name> "<text>"` / `station request …` | `send` no, `request` yes | The endpoint should be durable and the serving session interchangeable. |
| **Cron** | `cron create <name> --expr … --prompt …` | n/a | The work is scheduled, not requested. |
| **Workflow clause** | `workflow after <id> --then "<prompt>"` | n/a — declarative | "When that session next returns, launch this." Children default to `claude/o5h`. |

Stations, cron, workers and workflow chaining are covered in [[knw-foh-machinery]].

## Manager Agents: Default Delegation

Dispatch collected work with a quiet blocking request, run through the harness's native background execution:

```bash
flint orbh request -q codex/solxh "<complete, self-contained prompt>"
```

`request` creates a subagent, anchors collection to the initiated turn, and prints only that turn's correlated result in quiet mode. Run it in the background because the shell call intentionally blocks; do not poll it or add a routine timeout.

Prompts must carry the goal, exact targets, relevant decisions, boundaries, verification commands, and required result shape. A child shares none of the manager's conversational context.

```bash
# Follow up: awaiting targets are woken and the new turn is collected.
flint orbh request -q -c <session-id> "<follow-up>"

# Read the latest or a specific historical turn result.
flint orbh result <session-id>
flint orbh result <session-id> --run <n>
```

Subagents default to `return --finish`. Grant `--await` only when you genuinely expect follow-ups or standing duty. Remember that `return --await` still emits a result: the collector for that turn unblocks, and any later work is another turn/result.

## Parallel Fan-Out

For a small fan-out, start several background `request -q` calls. Each completion is independently correlated and delivered. For wide fan-out or a manager that should release its harness between waves, use agent jobs:

```bash
flint orbh job run --agent codex/solxh "<prompt A>" --group wave-1
flint orbh job run --agent codex/solxh "<prompt B>" --group wave-1
flint orbh session return --await --until-group wave-1 "Wave 1 dispatched; awaiting leaf results."
```

`session return --await --until-group` is the right verb because it does two things at once: your collector receives this turn's checkpoint result, **and** the barrier is armed for your next wake. The barrier is additional, not exclusive — messages, requests, room activity, station items and earlier terminal-job events can still wake you first. On wake, use `job list` and `job result <id>`; failure also resolves the barrier.

`flint orbh park [id] --until-group <g> [--barrier-timeout <s>]` remains as the legacy/operator spelling. It carries no turn result, and `--barrier-timeout` lives only there.

When you are waiting on something the sweeps cannot observe — an external CI run, a slow deploy, a human's inbox — pace yourself instead:

```bash
flint orbh session return --await --wake-at +15m "Polling <thing>; nothing to collect yet."
```

## Recursive and Interior-Awaiting Managers

Subagents may themselves manage subagents. An interior manager can dispatch depth-2+ work, end the current turn with a checkpoint result, await the wave, then collect outputs when the sweep wakes it:

```bash
# Interior manager, turn N
flint orbh job run --agent codex/solxh "<leaf A>" --group wave-1
flint orbh job run --agent codex/solxh "<leaf B>" --group wave-1
flint orbh session return --await --until-group wave-1 "Wave 1 dispatched; awaiting leaf results."

# The orchestrator sweep resumes the manager with a coalesced digest; turn N+1
flint orbh job list
flint orbh job result <job-id-A>
flint orbh job result <job-id-B>
# Synthesize, dispatch another wave and return --await again, or finish:
flint orbh session return --finish "<final synthesis>"
```

This is a **result stream**, not one collector spanning the whole standing duty. The caller's turn-N collector receives the checkpoint return. It can inspect later results with `result --run`, use `wait --next` for the turn after the one it has already read, or issue `request -q -c` when it wants to initiate and collect a specific follow-up turn. The interior manager's child awaits, crashes, resumes, and rescue runs do not accidentally resolve collectors; only correlated results or explicit failure outcomes do.

Ancestry `{rootSessionId, depth}` and immediate parent edges make recursive trees visible in `orbh list`. Default safety caps are depth 5 (`ORBH_DISPATCH_DEPTH_CAP`) and live fan-out 16 (`ORBH_DISPATCH_FANOUT_CAP`).

## Peers

Use bare `launch` for work that should outlive the caller or belongs to no collector:

```bash
flint orbh launch <runtime/profile> "<standing duty>"
```

That creates a root **peer** with a manager-flavored prompt and await-default duty. It is not delegation and never belongs to the launcher's tree. Coordinate through messages/rooms; do not use a peer when you need an owned result now.

## Resume Hygiene: Re-Collect Before Re-Dispatch

Children survive your death and results are durable — so a resume (an orchestrator wake, rescue after a crash or `failed-unreturned` turn, operator revival) often lands you in a session whose previous turn already dispatched work. **Inventory before dispatching anything:**

```bash
flint orbh page                    # dispatch stamps, jobs, unread coordination
flint orbh job list                # per-job terminal states from prior waves
flint orbh job result <job-id>     # adopt a completed job's output
flint orbh result <session-id>     # adopt a subagent's durable turn result
flint orbh result <session-id> --run <n>   # a specific historical turn
```

Adopt every result that already exists; re-dispatch only work with **no correlated result and no live run**. Re-dispatching a wave that already completed doubles cost and can double side effects. The same rule covers late adoption of orphans: results outlive their collector, so an ancestor (or the operator) can always collect by id after the dispatcher died — nothing needs re-running just because nobody was watching when it finished.

## Infrastructure: Supervisor, Reaper, Wake Engine

The per-machine orchestrator provides supervision, recovery and wake delivery — not task planning. It is not a waiter janitor; there are no per-session waiter processes to keep alive. Its sweeps, with their cadences:

| Sweep | Cadence | What it does |
|---|---|---|
| loop heartbeat | ~1 s | Lease heartbeat and manager supervision only; business sweeps run on their own interval. |
| **awaiting-wake** | ~15 s (the business-sweep interval), after a ~6 s settling grace | The wake engine. Resumes an `awaiting` session with one coalesced digest for messages, child results, group-barrier completion, station items, due scheduled wakes, terminal jobs, liveness notices, and request/room activity. Skips any session holding a live `page arm` lease, or one whose lease belongs to another machine. |
| scheduled-wake retry | 15 s, 60 s overdue grace | Retry net for `--wake-at` timers the primary path missed. |
| station ensure | 60 s | Re-triggers a station with queued work and no live bound session, under a locked claim. |
| cron | 60 s | Fires due cron schedules as fresh headless sessions. |
| barrier | — | **Enforcement only**: fails timed-out jobs. It never resumes a session; the awaiting-wake sweep does the waking. |
| job / liveness | 60 s | Reaps dead job wrappers, expired jobs, and stale dispatch stamps. |
| un-returned-turn reaper | — | At most two return-discipline resumes, then `failed-unreturned` + awaiting. Defers a dead parent whose delegated work is still in flight, but no longer without bound. |
| waiter reap | — | Retirement cleanup: kills any leftover legacy persistent-waiter process still running on this machine. It spawns nothing. |
| manager supervision | — | Supervises manager processes and reaps dead managers and orphaned runtime groups. |

Recovery is retried from durable spool facts, so failures delay delivery rather than lose it, and idle exit is deferred while awaiting sessions, barriers, retry work or reaper work remain. The orchestrator never performs agent-level `interrupt` decisions.

```bash
flint orbh orchestrator status [--json]
flint orbh orchestrator processes [--json]   # alias: ps — auxiliary-process registry + unregistered ghosts
flint orbh orchestrator launcher show|adopt|clear   # the machine-canonical launcher aux processes spawn through
flint orbh orchestrator ensure
flint orbh orchestrator reap [--json]
```

See [[knw-foh-coordination]] for the full command surface, [[knw-foh-page]] for the pager, jobs and barriers, [[knw-foh-machinery]] for stations/cron/workers/workflows, and [[knw-foh-profiles]] for live targets.
