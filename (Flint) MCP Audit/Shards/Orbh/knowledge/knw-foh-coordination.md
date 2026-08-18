---
description: "Operating on other sessions — peers, collector-backed subagents, turn-correlated results, trees/caps, inspection (peek/timeline), messages, rooms, interrupt, respond, kill, and the ping/switch/fork one-shots"
orbh-sessions:
  - "[[d1f03280-e10d-413f-a040-70c3a84feb66]]"
  - "[[5d693555-8632-4235-b536-d366018f3a65]]"
  - "[[1e7717cf-c6b0-4706-a149-ed479bd341cd]]"
  - "[[25f11f9b-67f7-46e6-ad6d-3089b3131066]]"
  - "[[0a96d4be-c368-430e-84a6-3ba0366bc6f8]]"
---

# Knowledge: Orbh Session Coordination

Use this reference to operate on other sessions. For delegation patterns and recursive managers, read [[knw-foh-orchestrator]]; for targets, read [[knw-foh-profiles]].

## Peers, Resume, and Interactive Sessions

Bare `launch` creates a **peer**: a headless standing actor with no collector, no parent edge, and the manager-flavored prompt. It defaults to awaiting while its duty remains live. Coordinate with it through messages or rooms.

```bash
flint orbh launch <runtime/profile> "<prompt>"
flint orbh launch <runtime/profile> "<prompt>" --title "<t>" --description "<d>"
flint orbh launch <runtime/profile> "<prompt>" --continues <id>
flint orbh resume <id> [prompt]
```

`launch` also accepts `--max-turns`, `--budget`, `--model`, `--account`, and `--force`. `--continues` links a new session; it does not continue the same session.

Interactive surfaces:

```bash
flint orbh i <target> [prompt]                 # alias: interactive; detachable is the TTY default
flint orbh i <target> -c <id>                  # continue a session interactively
flint orbh attach <id> [--print] [--json] [--plain]
flint orbh detach [id]
flint orbh continue                            # alias: c; interactive picker
```

`resume` also takes `--steal` (terminate the live non-detachable run before resuming — prefer it over `--force`, which merely bypasses the live-run guard and may create concurrent runtimes) and `--account <name>` for a session with no stored account.

`i` / `interactive` adds `--dev-channels` (load development MCP channels, e.g. orbh), `--plain` (raw passthrough client instead of the OpenTUI chrome shell; `ORBH_NO_CHROME=1` is the env equivalent), `--no-detach` (legacy foreground handoff), and `--close-after <seconds>` for bounded acceptance runs. `--detachable` is deprecated — detachable *is* the TTY default.

On `attach`, `--steal` is a **deprecated no-op**: attach always takes over automatically and the displaced client is notified. With no id, `--print`/`--json` render the detached-session listing instead of opening the picker.

## Listing and Inspection

```bash
flint orbh list [--all] [--stats] [--print] [--wide]
flint orbh list --status awaiting
flint orbh list --runtime codex --search "auth"
flint orbh list --subagents                    # flatten instead of default dispatch trees
flint orbh active                              # JSON inside an Orbh session; tree for humans
flint orbh peek <id> [--json]                  # cheapest check on a child: projection only
flint orbh inspect <id> [--results]
flint orbh stats <id> [--files]
flint orbh watch <id> [--verbose] [--stream]
flint orbh requests <id> [--pending]
flint orbh timeline <root-session-id> [--room <room>] [--since 3d] [--classes runs,jobs,messages]
```

`list` renders collected subagents as dispatch trees and gives `awaiting` its own section with awaiting duration, last-woken source, and dormancy warnings. Bare peers remain roots because they have no parent collector edge. Partial IDs are accepted on ID-taking commands.

In a TTY, `list` and `active` open a **cockpit**; `--print` gives the static table/tree and `--json` the machine-readable form. Inside an Orbh session `--json` is the default, so pass `--print` when you want a table.

`peek` reads the projection only — title, runtime/profile, mode, workState, retention, subagent counts, interface keys, pending messages and requests, rooms. Use it to check on a dispatched child; reach for `inspect`/`stats` only when you need results or transcript accounting.

`timeline` reconstructs a read-only chronological narrative across a whole **dispatch tree** (or every participant of a room). It is the forensic verb for a resumed manager asking "what actually happened across my fan-out while I was dormant". `--json` is the default inside a session; `--markdown` forces the narrative.

## Collector-Backed Dispatch

`request` creates or continues a **subagent** and attaches a collector. In an agent shell use quiet mode and background execution:

```bash
flint orbh request -q <runtime/profile> "<complete prompt>"
flint orbh request -q -c <session-id> "<follow-up prompt>"
flint orbh wait <id1> [id2...] [--next] [--timeout <seconds>]
flint orbh result <id>
flint orbh result <id> --run <n>               # 1-based historical run
```

`request` also takes `--runtime <runtime>` (target as a flag), `--title`/`--description` (so the child is legible in `list`), `--continues <id>`, `--max-turns`, `--budget`, `--model`, `--account`, `--stream` and `--timeout`. `wait --next` waits for a result newer than the latest present at invocation — the right flag when the session has already returned once.

### What a Collector Waits For

A collector anchors to the run it initiated (or the current run when `wait` begins) and follows that turn's `continuesRunId` rescue chain. It waits for the first correlated result—not for `workState`, retention, a harness exit, or session terminality.

Consequences:

- A child can await/park, crash and be return-reprompted, or pass through intermediate runs without falsely resolving the collector.
- The collector outcome is one of `result`, `api-error`, `failed-unreturned`, `abandoned`, `hangup`, `adopted`, or `pending`. A command timeout stops waiting but leaves the outcome pending; `pending` and `adopted` do not discharge the durable dispatch obligation.
- `result <id>` reads the latest returned turn; `--run <n>` addresses a specific 1-based run.
- `wait` prints labeled outcomes in argument order, regardless of completion order.
- `request -q -c` against an awaiting session starts a follow-up turn and waits for that turn's result; the dispatch itself wakes the session.

`-q` changes output formatting only; it does not change correlation. Without `-q`, `request` uses a human spinner/result box. `--stream` streams the transcript while collecting. Avoid collector timeouts for normal delegation; use harness-native background execution.

### Follow-ups and Result Streams

A session may return many results across its life. `return --await` emits the current turn's result and leaves the session available; the current collector receives that result. A later `request -q -c` creates a new correlated collection. This is the clean continuation loop: dispatch → receive one turn result → review → follow up.

## Recursive Dispatch, Caps, and Trees

Subagents may dispatch subagents. Orbh records ancestry as `{rootSessionId, depth}` and preserves immediate `parentSessionId` edges for tree rendering.

- `ORBH_DISPATCH_DEPTH_CAP=5` by default.
- `ORBH_DISPATCH_FANOUT_CAP=16` by default, measured from live collector stamps.
- Cap failures report the chain and requested depth/fan-out.

Use `request -q` for owned, collected work. Use bare `launch` only for a **peer** whose duty should outlive the caller or belongs to no one. A peer is not in the caller's dispatch tree; coordinate with it, do not treat it as a subagent.

## The Orchestrator Singleton

The per-machine orchestrator is infrastructure, distinct from a manager agent:

```bash
flint orbh orchestrator status [--json]
flint orbh orchestrator managers [--all] [--json]      # alias: ls
flint orbh orchestrator managers --interactive
flint orbh orchestrator processes [--json]             # alias: ps — machine-wide auxiliary-process registry + ghosts
flint orbh orchestrator launcher show|adopt|clear      # the machine-canonical launcher (bare form errors)
flint orbh orchestrator reap [--json]
flint orbh orchestrator ensure
flint orbh orchestrator stop
```

It supervises manager processes, reaps dead managers and orphaned processes, and drives the sweeps that wake awaiting sessions, fire cron schedules, keep stations served, and run the un-returned-turn reaper. It does not respawn per-session waiter processes — there are none. See [[knw-foh-orchestrator]].

## Inter-Session Messages

```bash
flint orbh message send <targetId> "<text>"
flint orbh message send <targetId> "<text>" --wake
flint orbh message send <targetId> "<text>" --revive
flint orbh message list <id>
```

Messages are durable Page-worthy events.

- A headless/subagent target in `awaiting` wakes on **any** message. `--wake` is unnecessary and produces an informative no-op notice.
- Interactive parked sessions retain the legacy `--wake` behavior.
- A working target with an armed pager gets it immediately; with no arm, nothing holds it — the message stays durable and surfaces at the target's next Page read or turn boundary.
- `--revive` remains the explicit resurrection flag for ended sessions.
- A durable orb agent is addressable by name: `flint orbh message send agent:<name> "<text>"`.

`message request` is the blocking peer-to-peer ask surface; run it in background execution:

```bash
flint orbh message request <targetId> "<question>" [--timeout <s>]
flint orbh message request --cancel <requestId>
flint orbh message respond <requestId> "<answer>"
```

## Rooms

```bash
flint orbh room create <name> [--topic "<t>"]
flint orbh room list
flint orbh room join <room> [--notify all|mentions|mute]
flint orbh room leave <room>
flint orbh room post <room> "<text>"
flint orbh room read <room> [--since-cursor] [--no-advance]
flint orbh room context show <room>
flint orbh room context append <room> "<text>"
flint orbh room context edit <room> --search "<old>" --replace "<new>"
```

Rooms outlive participants and carry a message stream plus revisioned context. Subscription policy controls whether room activity is Page-worthy: `all`, mentions only, or mute. A subscribed awaiting session wakes on qualifying room activity through the same wake predicates as everything else. Own posts/edits do not wake the author.

`room read --since-cursor` renders messages after this session's subscription cursor — the normal incremental read. `--no-advance` reads without advancing the cursor.

## Interrupt, Respond, and Kill

```bash
flint orbh interrupt <targetId> "<text>"
flint orbh respond <id> "<text>"
flint orbh kill [id]
```

`interrupt` is explicit escalation for a working headless/subagent: record the message, terminate the live run, and resume with an interrupt digest. Against an awaiting target it behaves as a wake; against a terminal target it only queues unless explicitly revived by the appropriate surface. `respond` returns blocking `ask` input in place or resumes a deferred requester. `kill` terminates the run and records session abandonment, so a collector resolves as `abandoned`; kill/interrupt paths do not trigger un-returned re-prompts.

## Cheap One-Shots and Mode Changes

```bash
flint orbh ping [<runtime/profile>] "<prompt>" [-c <predecessorId>]
flint orbh switch interactive|headless [id] [--force] [--here|--no-launch] [--await|--resume "<prompt>"]
flint orbh fork [<runtime/profile>] ["<prompt>"] [--session <id>] [--compact] [--attach]
```

- **`ping`** runs one unattended inference turn and prints its returned string. When you want a single answer and not a managed child, this is far cheaper than a full `request` dispatch. `-c <predecessorId>` continues a returned ping in a new spool.
- **`switch`** is the mode-transition primitive: it ends the **run**, not the session, flips the durable mode, and relaunches in the other harness shape with a synthetic pickup prompt. It exists because awaiting means different things on each side — headless awaiting is *push* (the orchestrator sweep resumes you), interactive waiting is *pull* (a live pane, and the human is the waiter). Flags are direction-exclusive: `--force`/`--here`/`--no-launch` are interactive-only, `--await`/`--resume` are headless-only and mutually exclusive. `switch interactive --force` **adopts a subagent out from under a live collector** — the dispatcher is not left hanging: it receives a liveness notice and its wait settles with the `adopted` verdict.
- **`fork`** is different in kind: it creates a **new detached interactive session** seeded from the source's conversation transcript. The source is untouched and keeps running. `--compact` distills a long source through the compaction prompt before seeding. Contrast `compact handoff --into`, which relaunches the *same* session id ([[knw-foh-compaction]]).

Durable coordination objects — stations, workers, orb agents, cron schedules — are in [[knw-foh-machinery]].
