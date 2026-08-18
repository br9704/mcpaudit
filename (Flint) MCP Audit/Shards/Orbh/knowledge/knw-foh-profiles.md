---
description: "Profiles — pre-configured runtime targets: discovery, exact-name resolution, the live profile set per runtime, and guidance on which profile to pick for which kind of task"
orbh-sessions:
  - "[[d1f03280-e10d-413f-a040-70c3a84feb66]]"
  - "[[1e7717cf-c6b0-4706-a149-ed479bd341cd]]"
  - "[[25f11f9b-67f7-46e6-ad6d-3089b3131066]]"
---

# Knowledge: Orbh Profiles

Profiles are pre-configured runtime targets — a bundle of model + reasoning effort + harness args under a short code. A target is `runtime/profile`, e.g. `claude/o5mx` or `codex/solxh`. `request` and `job run --agent` create collected subagents; bare `launch` creates an uncollected peer; `i` creates an interactive session. All accept these targets.

## Resolution Rules

- Profile resolution is **exact** — there is no fuzzy matching; an unknown profile name **errors**.
- Profile names are **short codes**, not `runtime/tier` slugs. WRONG names like `claude/opus-max`, `codex/high`, `claude/sonnet`, `codex/medium` **do not resolve** and will error.
- A **bare runtime** (`flint orbh launch claude "<prompt>"`) uses that runtime's `default` profile if one exists, else no profile args.
- The set evolves as model families ship — **always confirm live** with `flint orbh profiles`.

```bash
flint orbh profiles                              # List all profiles, grouped by runtime
flint orbh profiles claude                       # Filter to one runtime
flint orbh launch claude/o5mx "<prompt>"         # Launch a peer with an explicit profile
flint orbh request -q codex/solxh "<prompt>"      # Dispatch a collected subagent
```

## The Live Profile Set (verify with `flint orbh profiles`)

As observed at HEAD, regenerated from live `flint orbh profiles`. The code pattern is `<model-family><effort>`: e.g. `o5` = Opus 5, `o48` = Opus 4.8, `f5` = Fable 5, `s5` = Sonnet 5, `sol`/`ter`/`lun` = GPT-5.6 Sol/Terra/Luna; effort suffixes are `m` (medium), `h` (high), `xh` (xhigh), `mx` (max), `l` (low), `u` (ultra — Sol/Terra), `uc` (ultracode — Claude Code multi-agent mode at xhigh).

### `agy` (Antigravity CLI)

| Code | Model | Effort | Notes |
|------|-------|--------|-------|
| `f36h` / `f36m` / `f36l` | Gemini 3.6 Flash | high / medium / low | Fast, cheap; newest Flash |
| `f35h` / `f35m` / `f35l` | Gemini 3.5 Flash | high / medium / low | Previous Flash generation |
| `p31h` / `p31l` | Gemini 3.1 Pro | high / low | Complex reasoning and coding (no medium/max) |
| `o46t` | Claude Opus 4.6 Thinking | thinking | Claude via Antigravity, not via the `claude` runtime |
| `s46` | Claude Sonnet 4.6 | — | Claude via Antigravity |
| `oss120` | GPT-OSS 120B | medium | Open-weights option |

### `claude`

| Code | Model | Effort | Notes |
|------|-------|--------|-------|
| `f5uc` / `f5mx` / `f5xh` / `f5h` / `f5m` / `f5l` | Fable 5 (`claude-fable-5`) | ultracode / max / xhigh / high / medium / low | Flagship Claude — highest capability |
| `o5uc` / `o5mx` / `o5xh` / `o5h` / `o5m` / `o5l` | Opus 5 (`claude-opus-5`) | ultracode / max / xhigh / high / medium / low | Current-generation Opus. `claude/o5h` is the CLI's own default child target (`workflow after` / `after-procedure` `--target`) |
| `o48uc` / `o48mx` / `o48xh` / `o48h` / `o48m` / `o48l` | Opus 4.8 (`claude-opus-4-8`) | ultracode / max / xhigh / high / medium / low | Previous-generation Opus; strong agentic coding & enterprise work |
| `s5uc` / `s5mx` / `s5xh` / `s5h` / `s5m` / `s5l` | Sonnet 5 (`claude-sonnet-5`) | ultracode / max / xhigh / high / medium / low | Best speed/intelligence balance; everyday default |

### `codex`

| Code | Model | Effort | Notes |
|------|-------|--------|-------|
| `solu` / `solmx` / `solxh` / `solh` / `solm` / `soll` | GPT-5.6 Sol | ultra / max / xhigh / high / medium / low | Flagship — strongest coding/agent work |
| `teru` / `termx` / `terxh` / `terh` / `term` / `terl` | GPT-5.6 Terra | ultra / max / xhigh / high / medium / low | Balanced everyday workhorse (≈ old 5.5 class, lower cost) |
| `lunmx` / `lunxh` / `lunh` / `lunm` / `lunl` | GPT-5.6 Luna | max / xhigh / high / medium / low | Fast/affordable; no `ultra` (model does not support it) |

### `gemini`

> [!warning] Profiles exist, the runtime does not
> `gemini` profiles are still in the registry, but `gemini` is **not** a registered runtime — `flint orbh runtimes` lists `agy, claude, codex, droid, grok, kimi, opencode` only, and `launch --help`'s target list omits it. Verify launchability before recommending `gemini/*`; the `agy` Gemini profiles are the working path to these models today.

| Code | Model | Notes |
|------|-------|-------|
| `pro` | Gemini 3.1 Pro | Complex reasoning and coding |
| `flash` | Gemini 3 Flash | Fast, lightweight tasks |

### `grok`

| Code | Model | Effort | Notes |
|------|-------|--------|-------|
| `g45h` | Grok 4.5 (`grok-4.5`) | high | Highest-effort Grok 4.5 profile |
| `g45m` | Grok 4.5 (`grok-4.5`) | medium | Balanced Grok 4.5 profile |
| `g45l` | Grok 4.5 (`grok-4.5`) | low | Lower-cost Grok 4.5 profile |
| `c25` | Grok Composer 2.5 Fast (`grok-composer-2.5-fast`) | — | Fast composition |

(The registry mislabels all three `g45*` titles as "Grok 4.5 High"; their `--effort` args are correct and the rows above follow the args.)

### `kimi` (Kimi Code CLI)

| Code | Model | Effort | Notes |
|------|-------|--------|-------|
| `k3mx` | Kimi K3 (`kimi-code/k3`) | max | Heaviest thinking |
| `k3` | Kimi K3 (`kimi-code/k3`) | high | Install default effort |
| `k3l` | Kimi K3 (`kimi-code/k3`) | low | Faster, cheaper thinking |

### `opencode`

| Code | Model | Notes |
|------|-------|-------|
| `solxh` | GPT-5.6 Sol, xhigh variant | Via the OpenCode `openai` provider |
| `solh` | GPT-5.6 Sol, high variant | Via the OpenCode `openai` provider |
| `k3` | Kimi K3 | Via the Kimi For Coding subscription provider |
| `dsfmx` | DeepSeek V4 Flash, max variant | Via the OpenCode Go provider |

### `droid`

Registered as a runtime name (it appears in every target list) but **not installed on this machine** — `flint orbh runtimes` shows it unavailable, and it has no profiles. Do not target it.

## Choosing a Profile

Pick by task, not by habit. Workspace guidance:

| Task Type | Suggested target | Why |
|-----------|------------------|-----|
| Implement code, refactor, write tests | `codex/solxh` (workspace default subagent; `codex/terxh` for cheaper balanced) | GPT-5.6 Sol / Terra at xhigh |
| Research, design, review, Mesh artifacts | `claude/o5mx` or `claude/f5mx` (or the `xh` variants) | Strongest Claude reasoning |
| Long standing multi-stage coding session | `claude/f5uc` / `claude/o5uc` / `claude/s5uc` | Ultracode: xhigh effort + standing dynamic-workflow orchestration |
| Everyday balanced Claude work | `claude/s5h` or `claude/s5xh` | Sonnet 5 — speed + intelligence |
| Fast / lightweight / cheap | `claude/s5l`, `claude/s5m`, `agy/f36m`, `codex/lunl` / `codex/soll` | Lower cost, quick turnaround |
| Very large context (whole-repo reads, long transcripts) | Fable / Opus / Sonnet 5 all ship 1M context | No special `[1m]` suffix needed on current models |
| Parallel batch throughput (wide fan-outs) | `codex/solm` / `codex/term` / `codex/lunm` / `claude/s5m` | Good throughput per dollar |
| Hardest single-task reasoning | `claude/f5mx` / `claude/o5mx`, `codex/solmx` or `codex/solu` | max depth, or ultra (Codex auto task delegation) |
| Second opinion / cross-model review | `grok/g45h`, `agy/p31h`, `kimi/k3` | Different model family, different failure modes (prefer these over `gemini/*` — see the runtime caveat above) |

Rules of thumb:

- **Default subagent for code work is `codex/solxh`** — the standard delegation target in this workspace (see [[knw-foh-orchestrator]]).
- **Claude tier pick:** Fable 5 and Opus 5 are the current-generation picks — Fable 5 for maximum capability, Opus 5 for serious agentic/enterprise work (Opus 4.8 remains available as the previous generation); Sonnet 5 for everyday speed/intelligence balance.
- **Codex tier pick:** Sol for hard open-ended work; Terra for everyday; Luna for clear high-volume tasks.
- **Effort is the main dial within a family.** Drop from `xh`/`mx` to `m` when the task is mechanical or you're fanning out wide; climb to `mx`/`u` only when the task genuinely needs maximum depth (or ultra's subagent delegation).
- When in doubt, run `flint orbh profiles` and read the descriptions — the live listing is the source of truth, not this table.

## Changing the Profile of an Existing Session

Which verb you want depends on **one question: same runtime, or different?**

```bash
# SAME runtime — keeps the conversation
flint orbh profiles switch <runtime/profile>

# DIFFERENT runtime — discards the native context, carries your handoff
flint orbh compact start
flint orbh compact handoff --into <runtime/profile> [--account <name>]
```

### `profiles switch` — same runtime, conversation preserved

A self-target verb, the sibling of `auth migrate`. It closes the run at a turn boundary, commits the new profile (and the model that profile pins), and **resumes the same native session id** under the new model/effort. Nothing on disk moves; the account home is unchanged.

- **Interactive**: the pane swaps its child in place and you keep talking.
- **Headless / subagent**: nothing is respawned — the stored profile is reapplied at every spawn, so the switch lands at the session's next wake. A live turn is **killed** at a deliberate boundary (`endReason: profile-switched`) rather than refused: a running child's argv is already fixed, so leaving it alive would record a profile it is not using.
- **Cross-runtime is refused**, with the compaction commands printed. A conversation cannot cross runtimes; that is not a limitation of the verb but of what a native transcript is.
- A bare runtime is refused — the target must be an explicit `runtime/profile` registry key.

The run it ends is stamped `endReason: 'profile-switched'` — a deliberate boundary like `compacted`, `switched`, and `migrated`, so it never mints a liveness notice or enters the un-returned reaper.

### `compact handoff --into` — different runtime

Still the right verb when the runtime itself must change, and the only one that can. Full doctrine in [[knw-foh-compaction]]. It also accepts `--account`, so a cross-runtime move can pick the destination account in the same step.

### Orb agents

```bash
flint orbh agent profile <name> <runtime/profile>   # declaration + live body
```

Writes `target:` in the agent's mind **and** switches the live body when the target is same-runtime. The declaration is what the agent's *next* body uses; the switch is what the *current* one does. The output always says which parts landed, because they can legitimately diverge — a cross-runtime target reaches only the next body. `--mind-only` writes the declaration alone.

### Accounts are the neighbouring case

`flint orbh auth migrate <account>` moves a session to another account of the same runtime, also preserving the conversation — see [[knw-foh-cli]].

## Maintaining the Shared Layer

`~/.nuucognition/orbh/default.json` is the synced canonical shared layer. `~/.nuucognition/orbh/profiles.json` is an optional local override layer; it is untouched by sync and wins for matching runtime/profile names.

**On this machine the effective set renders from the local `profiles.json`** — the header line `flint orbh profiles` prints names the file it is reading, so check it before assuming a table matches the shared layer. That live listing, not any table (including the one above), is the source of truth; a machine whose override diverges will show a different set.

```bash
flint orbh profiles update      # Replace local default.json from the canonical shared layer; preserve profiles.json
flint orbh profiles push        # Publish local default.json to the shared profiles repo (maintainers only)
```
