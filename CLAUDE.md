# CLAUDE.md — mcpaudit
# A conformance + safety linter for MCP servers. `npx <name> <server>` → report.

Read this file at the start of every session. `masterplan.md` is the single source of truth for sequencing.

---

## What this is

An npm CLI that points at any MCP server (stdio or Streamable HTTP) and reports:
- **Lane A — Conformance:** does it implement the spec correctly? (2026-07-28 stateless protocol first; back-compat lane for `initialize`-era servers)
- **Lane B — Safety:** is it dangerous? (tool poisoning, rug-pull drift, credential leakage, injection surface, token passthrough…)

**Framing is locked and appears verbatim in the README:** *"a first-pass linter that catches common issues — not a security audit."* Overclaiming security is the fastest way to get torn apart publicly by people who do this professionally. We underclaim, state every heuristic openly (RULES.md documents each check's false-positive modes), and invite contributions.

Why it can win (verified market gap, Aug 2026):
1. **Nobody combines conformance + safety in one local CLI.** Snyk agent-scan (ex-Invariant mcp-scan) and mcp-shield are security-only; the official `@modelcontextprotocol/conformance` suite is protocol-only.
2. **Almost every existing tool predates the 2026-07-28 stateless rewrite** (no `initialize` handshake anymore; per-request `_meta`; mandatory `server/discover`; MRTR; new error codes). Speaking the current protocol is near-greenfield.
3. **Zero-key, fully local.** Snyk needs a token; mcp-shield's best mode needs a Claude API key; Cisco's scanner phones home. Ours runs offline.
4. The official conformance suite **cannot drive stdio servers** (HTTP `--url` only). We do stdio.

---

## Owner

| | |
|---|---|
| Name | Bruno Jaamaa · jaamaabruno@gmail.com · GitHub `br9704` |
| Identity goal | "MCP-ecosystem person" — he has shipped production MCP infra (Aethereum, ~2k installs) |
| npm account | Has published before (aethereum CLI). FIDO 2FA + trusted publishing required (see Sprint 0) |

## Naming (unresolved — Sprint 0 decision, `ask_human`)

`mcp-audit` on npm is **squatted** by a hello-world stub (v0.0.1, Apr 2025). Options, in preference order:
1. File an npm package-name dispute for `mcp-audit` (stub is non-functional; disputes take weeks — start early, don't block on it)
2. Ship as `mcpaudit` / `mcp-auditor` / scoped `@br9704/mcp-audit` with `mcp-audit` claimed later

> **Resolved (2026-08-15, amendment A8): the package is `@aethereumdev/mcp-audit`.** The `@br9704` scope is an npm org whose only member is the user `br9704`; the workstation publishes as `aethereum-dev`, which owns the `aethereumdev` org. Owner chose to use that account, so the scope moved. The GitHub repo stays `br9704/mcpaudit`. Note for future renames: `src/brand.ts` is one line, but the real blast radius is package.json, package-lock.json, README badge + install commands, PROJECT.json, the hero SVG, two hard-coded literals in `test/report.test.ts`, generated RULES.md, and `tool.name` in every committed audit — re-run those rather than string-replacing them.
Route every user-facing name through ONE constant (`src/brand.ts`) so a rename is a one-line change.

---

## Source of truth + masterplan discipline

1. `masterplan.md` — sequencing, sprints, acceptance. Work only the active sprint.
2. This file — rules, architecture, verified facts.
3. `ENGINEERPROMPT.md` — kickoff protocol.

- Mark tasks `[ ]` / `[~]` / `[x]` / `[⏭ reason]` live, in the file, as you work.
- Never delete or rewrite masterplan content — expand in place.
- Sprint close = Acceptance passed + **As-shipped delta** + **Deferred** filled + Current-sprint pointer moved + this file's Current-state line updated.

## Aethereum sync — required workflow

- First session: `aethereum init`, join/create the project room.
- `share_intent` at every sprint start · `declare_contract` for the rule-plugin interface, finding schema, JSON/SARIF output schemas · `record_decision` for architecture forks · `ask_human` for owner-gates (name, npm publish, any disclosure) · `record_verification` at sprint gates.

---

## Verified protocol facts (Aug 2026 — re-verify at Sprint 1, spec moves fast)

- Current spec revision **2026-07-28**; history: 2024-11-05 → 2025-03-26 → 2025-06-18 → 2025-11-25 → 2026-07-28. `LATEST_PROTOCOL_VERSION` lives in the schema repo (`schema/2026-07-28/schema.ts`).
- **Stateless rewrite (SEP-2575/2567/2322):** `initialize`/`notifications/initialized` REMOVED. Every request carries `_meta` keys `io.modelcontextprotocol/protocolVersion` (required) + `.../clientCapabilities` (required) + `.../clientInfo` (SHOULD). Servers SHOULD echo `serverInfo` in result `_meta`. Missing required field → `-32602` (HTTP 400).
- **`server/discover` is MANDATORY** → `supportedVersions`, `capabilities`, `serverInfo`, `instructions`.
- Sessions removed (`Mcp-Session-Id` gone); state = explicit handles in tool args. `ping`, `logging/setLevel` removed. Roots/Sampling/Logging deprecated (12-month window). Server→client requests replaced by **MRTR** (`resultType: "input_required"` + retry with `inputResponses`). All results carry required `resultType` (absent = treat as `"complete"`).
- Subscriptions: single `subscriptions/listen` stream; HTTP GET stream + `resources/subscribe` gone; SSE resumability gone.
- HTTP headers required per POST: `MCP-Protocol-Version` (must match body `_meta`), `Mcp-Method`, `Mcp-Name` (tools/call, resources/read, prompts/get). Mismatch → 400 + `-32020`.
- Error codes: JSON-RPC standard + `-32020` HEADER_MISMATCH · `-32021` MISSING_REQUIRED_CLIENT_CAPABILITY · `-32022` UNSUPPORTED_PROTOCOL_VERSION. Resource-not-found is now `-32602` (was `-32002`; accept both from old servers).
- Tool annotations (untrusted by spec!): `readOnlyHint=false`, `destructiveHint=true`, `idempotentHint=false`, `openWorldHint=true` defaults. `tools/list` SHOULD be deterministic order; list results carry `ttlMs`/`cacheScope`.
- Auth: OAuth 2.1; RFC 9728 protected-resource metadata MUST; RFC 8707 resource indicators MANDATORY; token passthrough explicitly forbidden ("MUST NOT accept tokens not issued for this server"); DCR deprecated for CIMD.
- Official tooling: `@modelcontextprotocol/conformance` (use `0.2.0-alpha.x` for 2026-07-28 scenarios; HTTP-only for servers) · `@modelcontextprotocol/inspector` (debugger, NOT a validator).

## Attack classes → checks (primary sources in masterplan Sprint 4)

tool poisoning (Invariant 2025) · rug pull/drift (pin + diff) · cross-server shadowing · line-jumping (ToB — injection via `tools/list` before any call) · confused deputy · token passthrough · state-handle hijacking · SSRF via OAuth metadata · `$ref`/schema DoS · ANSI escapes in output · credentials in schemas/errors · destructive-without-annotation.

---

## Locked decisions (do not relitigate)

- **Linter framing, never "security audit."** RULES.md documents every check with false-positive modes.
- **Static + light protocol probing only.** No sandboxed dynamic execution analysis in v1.
- **Zero network calls except to the target server.** No telemetry, no cloud API, no LLM key.
- **Both transports:** stdio AND Streamable HTTP. Back-compat probe: attempt `server/discover`; on method-not-found, fall back to legacy `initialize` lane and mark the server "pre-2026 protocol" (a finding in itself, severity info).
- **Exit codes:** 0 clean · 1 findings ≥ threshold (`--fail-on warn|error`) · 2 tool/connection error. `--json` and `--sarif` outputs. CI-first design.
- **Responsible disclosure protocol** (Sprint 8) before ANY public naming of a vulnerable server. Owner-gated.
- No web UI, no registry/directory, no spec-completeness claims. Cover common cases and say so.
- TypeScript strict, Node ≥ 20, vitest, zero runtime deps beyond what's justified in a table in the README (a security tool's own supply chain is part of its pitch — target: minimal deps, every one justified).
- npm: **trusted publishing (OIDC) + provenance from GitHub Actions; no postinstall scripts** (npm v12 defaults make lifecycle scripts opt-in — a CLI that needs postinstall breaks under `npx`).

---

## Architecture index

```
mcpaudit/
├── masterplan.md · CLAUDE.md · ENGINEERPROMPT.md
├── README.md            # demo findings table above the fold; linter framing verbatim
├── RULES.md             # every check: what/why/false-positives — generated from rule metadata
├── src/
│   ├── brand.ts         # THE name constant
│   ├── cli.ts           # commander: audit <target> [--json|--sarif|--fail-on|--pin|--baseline]
│   ├── transport/       # stdio.ts · http.ts · detect.ts (2026-07-28 first, legacy fallback)
│   ├── probe/           # conformance lane: discover, tools, resources, prompts, errors, headers
│   ├── rules/           # safety lane: one file per rule, self-describing metadata
│   ├── pin/             # baseline snapshot + drift diff (rug-pull detection)
│   ├── report/          # terminal (pretty, monospace, B&W) · json.ts · sarif.ts
│   └── schema/          # zod: Finding, Baseline, AuditReport (CONTRACTS)
├── fixtures/            # deliberately-broken + deliberately-malicious test servers
└── .github/workflows/   # ci.yml + release.yml (OIDC publish)
```

## Current state

> Update at every sprint close.

**Current state:** **Sprints 0–10 + Sprint D CLOSED (2026-08-15). All engineering and documentation complete; only the Sprint 11 owner-gate block remains.**

Sprint D (documentation pass) ran as an audit, not just a rewrite, and found nine defects — four of which would have shipped publicly. The worst: all four committed `audits/*.json` leaked an absolute scratchpad path with the macOS username and a session UUID, in the exact files the README cites as proof. Also corrected: a README column citing versions its own evidence did not contain, a wrong severity order in `--help`, and **three false `[x]` marks in Sprint 9 claiming the repo was public — the GitHub repo did not exist at all.** Shipped: rewritten README (hero SVG, Mermaid architecture, how-it-was-built, limitations, status), `PROJECT.json`, `CHANGELOG.md`, and repo hygiene. Never assume a `[x]` in the plan means the outward-facing state is real — verify against the world.

Shipped: 17 checks (9 conformance C0–C8, 7 safety S1–S7, plus D1 drift), both transports, era detection, terminal/JSON/SARIF reports, pin+drift, **113 tests green**, lint + typecheck clean, zero runtime deps (enforced by test), RULES.md generated from rule metadata with a staleness test, README with a real findings table over 4 audited reference servers, SECURITY.md, CONTRIBUTING.md, issue templates, CI on Node 20/22/24 + weekly spec-drift job. Clean-machine `npm pack` → `npx` verified.

Two credibility saves worth remembering: (1) era-awareness — modern checks are *skipped* against legacy servers, so the real reference servers yield 2 findings rather than a false-positive wall; (2) the Sprint 6 hand-review caught 4 false positives ("clearly" matched the verb `clear`) before they reached the launch table. Regression tests pin both.

**Remaining (owner only, Sprint 11):** npm 2FA + trusted-publisher config, publish approval, repo-public flip, brunojaamaa.dev cross-link, optional `mcp-audit` dispute ticket. Nothing to disclose — no exploitable finding was made.

<details><summary>Sprint 0 close (historical)</summary>

**Sprint 0 closed (2026-08-14).** Scaffold live: TS strict, vitest (15 green), eslint, MIT, `src/brand.ts`, `src/args.ts` (hand-rolled), `src/cli.ts` (`--help`/`--version`), CI on Node 20/22/24 + weekly spec-drift run, `release.yml` on OIDC trusted publishing. **Zero runtime deps, enforced by test.** Name locked `@br9704/mcp-audit`, verified free on npm. Aethereum room `mcpaudit` live (join `HHUUV7`).

Protocol facts above were **re-verified against the live spec + schema on 2026-08-14 and are accurate as written**. Two additions worth knowing: unknown *method* → `-32601` **and HTTP 404**, while unknown *tool* → `-32602`; and implementations MUST NOT emit `-32020..-32099` codes the spec doesn't define. **Critical drift finding:** nothing in the ecosystem implements 2026-07-28 yet — `@modelcontextprotocol/server-everything@2026.7.4` is a **2025-06-18** server and SDK 1.30.0 tops out below it, so the legacy lane is the *primary* path and every check is era-aware (masterplan amendment A3, §3.1).

Next: Sprint 1 — transport + protocol client + era detection.
</details>
