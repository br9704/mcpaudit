# masterplan.md — mcpaudit
# From empty repo to a published, credible MCP conformance + safety linter

> **Current sprint: Sprint 11 — owner gate block** (all engineering complete) · Sprints 0–10 closed 2026-08-14
>
> Status: `[ ]` not started · `[~]` in progress · `[x]` done · `[⏭]` deferred (+reason)
>
> File rules: work in order · expand in place, never rewrite · fill **As-shipped delta** + **Deferred** each close · greppable TL;DRs.

---

## Thesis (for cold-start sessions)

The MCP ecosystem outran its tooling. Concerns about unvetted MCP servers went mainstream in 2026; there are 40+ MCP CVEs and a dozen half-built "scanner" npm packages, but **no single local CLI that checks both correctness AND safety against the current 2026-07-28 stateless spec.** Bruno has shipped production MCP infra and published to npm before — this makes him visibly an *MCP-ecosystem person*, a sharper identity than "AI engineer." The rare portfolio project people actually `npx` and star; "I maintain X" beats "I built X." The distribution hook is a README table auditing 3–5 well-known public MCP servers.

Two failure modes this plan actively avoids: (1) Lane A (conformance) eating the whole timeline — Lane B (safety) is what gets shared, protect it; (2) overclaiming security and getting publicly dismantled — linter framing, documented heuristics, disclosure protocol.

---

## Phase 1 research reconciliation (verified 2026-08-14, session 1)
**TL;DR: spec premise confirmed verbatim; but NOTHING in the ecosystem speaks 2026-07-28 yet, so the legacy lane is the primary path and every check must be era-aware.**

### Confirmed against `schema/2026-07-28/schema.ts` (source of truth, 3197 lines, pulled locally)
- `LATEST_PROTOCOL_VERSION = "2026-07-28"`; **no `InitializeRequest` exists in the schema.**
- `server/discover` mandatory. `DiscoverResult`: `supportedVersions: string[]` + `capabilities` REQUIRED; `instructions?` optional; `ttlMs` + `cacheScope` REQUIRED (inherited from `CacheableResult`); `_meta['io.modelcontextprotocol/serverInfo']` is SHOULD.
- Error codes exact: `-32020` HeaderMismatch · `-32021` MissingRequiredClientCapability · `-32022` UnsupportedProtocolVersion.
- `ToolAnnotations` defaults confirmed verbatim: `readOnlyHint=false`, `destructiveHint=true`, `idempotentHint=false`, `openWorldHint=true`. All are **hints**; spec says clients must never trust them from untrusted servers.
- `_meta`: `protocolVersion` REQUIRED · `clientCapabilities` REQUIRED · `clientInfo` SHOULD (optional in schema). Missing a required field → **`-32602` + HTTP 400**. CLAUDE.md was correct throughout.
- `Tool.inputSchema` typed `{ $schema?: string; type: "object"; [k: string]: unknown }` — `type: "object"` at root is required; any 2020-12 keyword allowed alongside.

### The finding that reshapes the build: no server implements the current spec
Probed `@modelcontextprotocol/server-everything@2026.7.4` over stdio:

| Probe | Actual response | Meaning |
|---|---|---|
| `server/discover` | `-32601 Method not found` | legacy server |
| `tools/list` with **no `_meta` at all** | full tool list, `200` | no per-request validation |
| every result | no `resultType`, no `ttlMs`/`cacheScope` | pre-2026 result shape |
| `initialize` | `{"protocolVersion":"2025-06-18"}` | it is a **2025-06-18** server |

`@modelcontextprotocol/sdk@1.30.0` (latest) tops out below 2026-07-28. **Consequences, which amend Sprints 1/3/4:**
1. The legacy lane is the **primary** path today, not a fallback. Firing modern checks at legacy servers would emit a wall of false failures — the single biggest credibility risk in this project.
2. Every probe declares `appliesTo: "modern" | "legacy" | "both"`. Era is resolved BEFORE any check; inapplicable checks are **skipped and reported as skipped**, never failed.
3. `fixtures/modern-good` must be written by hand — it will be the only 2026-07-28-conformant server in existence to test against.
4. The everything server answered `tools/list` **without `initialize`** — exactly the era-ambiguity hazard the spec warns about. Became check C8.

### Incumbent gap re-confirmed (differentiation is real)
- `@modelcontextprotocol/conformance@0.2.0-alpha.11`: `server` subcommand exposes **only `--url`**. No stdio path (`--command` is client-mode only). 11 runtime deps (express, undici, jose, ajv, zod, octokit…). **Our stdio support + zero deps is the wedge.**
- Snyk agent-scan (ex-Invariant mcp-scan) v0.4.13 · mcp-shield 1.0.4 (stale, 5 releases): security-only, pre-stateless.
- `@br9704/mcp-audit` verified **free**; `mcp-audit` confirmed squatted by the v0.0.1 hello-world stub.

### New checks this research handed us (spec is weeks old — no competitor can have these)
- `x-mcp-header` on a **sensitive** parameter (spec: SHOULD NOT — header values visible to intermediaries) + its full validity ruleset.
- **Reserved-range error-code misuse**: implementations MUST NOT emit `-32020..-32099` codes not defined by the spec.
- **Icon URI scheme**: spec says clients MUST reject `javascript:`/`file:`/`ftp:`/`ws:` icon `src`.
- **`$ref` to a network URI** (MUST NOT auto-dereference) + loopback/link-local/RFC-1918 SSRF + composition-keyword validator-DoS bounds (SEP-2106).

---

## Sprint 0 — Repo, name, publish rails
**TL;DR: scaffold + resolve the name + set up OIDC publishing BEFORE writing checks.**

- [x] `git init`, TS strict, Node ≥20, vitest, eslint, MIT LICENSE, `.gitignore`
- [x] `aethereum init` + join room; `share_intent` Sprint 0
- [x] `src/brand.ts` single name constant; wire `bin` through it
- [x] **Name decision** (`ask_human` + `record_decision`): file `mcp-audit` npm dispute now (weeks-long, non-blocking) AND ship under a fallback name. Verify chosen name free on npm.
- [x] CI `ci.yml`: install → lint → typecheck → test on push
- [x] `release.yml`: **trusted publishing (OIDC)**, `id-token: write`, provenance on, `--access public`, **no postinstall scripts**, npm ≥ 11.5.1 / Node ≥ 22 in the publish job
- [⏭ Sprint 11 per A4] Confirm FIDO 2FA on the npm account (owner action — flag)
- [x] Deps budget: start at zero runtime deps; each addition needs a one-line justification (goes in README supply-chain table)

### 0.1 Concrete scaffold (expanded session 1)
- `package.json`: `name: "@br9704/mcp-audit"`, `type: "module"`, `bin: { mcpaudit: "dist/cli.js" }`, `engines.node: ">=20"`, `files: ["dist","RULES.md","README.md","LICENSE"]`, **no `scripts.postinstall`**, `publishConfig.access: "public"`.
- `tsconfig.json`: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `module/moduleResolution: NodeNext`, `target: ES2022`, `outDir: dist`.
- Dev deps only: `typescript`, `vitest`, `@types/node`, `eslint` + `typescript-eslint`. **Runtime deps: zero** (enforced by a test asserting `package.json.dependencies` is empty/absent).
- `src/brand.ts` — the single rename point:
  `export const PKG_NAME = "@br9704/mcp-audit"; export const BIN_NAME = "mcpaudit"; export const DISPLAY = "mcpaudit"; export const VERSION` (read from package.json at build).
- Owner-gated items (npm 2FA, trusted-publisher config, publish) are **deferred to Sprint 11** per amendment A4 — Sprint 0 writes the workflow files but does not publish.

### 0.2 CI + release rails
- `ci.yml`: matrix Node 20/22/24 → `npm ci` → `eslint` → `tsc --noEmit` → `vitest run`.
- `release.yml`: tag-triggered, `permissions: { id-token: write, contents: read }`, Node 22.14+/npm 11.5.1+, `npm publish` with **no `--provenance` flag** (provenance is automatic under trusted publishing — verified in npm docs; passing it is redundant and can conflict).

**Acceptance:** CI green · empty `npx <name> --help` runs via a dry `npm pack` · name locked or dispute filed + fallback chosen.
**As-shipped delta:** ✅ **PASSED** (2026-08-14). `tsc --noEmit` clean, eslint clean, **15 tests green**, `npm pack` → installed the tarball in a clean temp dir → `npx mcpaudit --help` renders with the locked framing verbatim, `--version` prints `0.1.0`, no-target exits `2`.
- Name locked `@br9704/mcp-audit`, **verified free on npm** (404); `mcp-audit` confirmed squatted by the v0.0.1 stub. Dispute ticket moved to Sprint 11 (owner action, A4).
- Zero runtime deps **enforced by test**, not just asserted (`test/supply-chain.test.ts` also fails the build if an install lifecycle script or a bin name divergent from `brand.ts` ever appears).
- **Bug caught by the pack test:** the `import.meta.url === file://${process.argv[1]}` entry-point guard silently fails under `npx` (npm installs `bin` as a symlink), so the packed CLI produced *no output at all*. Fixed with a `realpathSync` comparison in `isEntryPoint()`. Worth noting: unit tests passed throughout — only the packed-binary acceptance test caught it.
- CI also runs the pack-and-run smoke test on Node 20/22/24, plus a weekly scheduled run to catch MCP spec drift (pulled forward from Sprint 10).
- `release.yml` deliberately omits `--provenance`: under trusted publishing npm generates attestations automatically (verified in npm docs); passing it is redundant.
**Deferred:** npm 2FA confirmation + trusted-publisher configuration + the `mcp-audit` dispute ticket → **Sprint 11** (owner-gated, A4).

---

## Sprint 1 — Transport + protocol client (2026-07-28 first)
**TL;DR: connect over stdio and Streamable HTTP; speak the stateless protocol; detect legacy servers.**

### 1.1 Transports
- [x] `transport/stdio.ts`: spawn server command, JSON-RPC over stdio (this is our differentiator — the official suite can't)
- [x] `transport/http.ts`: Streamable HTTP single endpoint; send required headers (`MCP-Protocol-Version`, `Mcp-Method`, `Mcp-Name`); handle per-request-SSE response streams
- [x] `transport/detect.ts`: target is a command → stdio; URL → http

### 1.2 Protocol layer
- [x] Per-request `_meta` injection (`protocolVersion`, `clientCapabilities`, `clientInfo`)
- [x] `server/discover` call → capabilities/versions/serverInfo/instructions
- [x] **Legacy fallback:** if `server/discover` is method-not-found, attempt the pre-2026 `initialize` handshake; on success mark server `protocol: pre-2026-07-28` (Finding, severity info) and run the back-compat conformance lane
- [x] Re-verify every fact in CLAUDE.md's "Verified protocol facts" against the live spec + schema repo; correct any drift and `record_decision`
- [x] `declare_contract`: the internal `McpClient` interface

### 1.3 Era detection (expanded session 1 — this is now the centrepiece of Sprint 1)
`protocol/era.ts` implements the spec's stdio backward-compat probe verbatim. Send `server/discover` with modern `_meta` FIRST, then classify:

| Probe outcome | Era | Notes |
|---|---|---|
| valid `DiscoverResult` | `modern` | use `supportedVersions` to pick a version |
| `-32022 UnsupportedProtocolVersion` (or other recognized modern error) | `modern-version-mismatch` | retry with an advertised version. **Do NOT fall back to `initialize`.** |
| any other error, or timeout | `legacy` | fall back to `initialize` handshake |
| `initialize` also fails | `unknown` | connection-level finding, exit 2 |

**Spec-mandated:** the fallback **MUST NOT** be keyed to one specific error code (legacy servers answer with `-32601`, `-32602`, or nothing). Implement as "not a recognized modern error ⇒ legacy".

HTTP adds a status-code signal: `400` + recognized modern JSON-RPC error body ⇒ modern; `400/404/405` with unrecognized body ⇒ legacy/HTTP+SSE-era.

### 1.4 Transport specifics
- `stdio.ts`: `child_process.spawn`, newline-delimited JSON, **messages MUST NOT contain embedded newlines**; `stderr` captured but never treated as failure (spec: clients SHOULD NOT assume stderr = error); shutdown = close stdin → wait → SIGTERM → SIGKILL; bounded per-request timeout; never deadlock on a server that never replies.
- `http.ts`: POST-only single endpoint; required headers `MCP-Protocol-Version`, `Mcp-Method`, and `Mcp-Name` (for `tools/call`/`resources/read`/`prompts/get`); `Accept: application/json, text/event-stream`; handle BOTH `application/json` and `text/event-stream` response bodies (hand-rolled SSE parser, ignore `:` comment keep-alive lines); no `Mcp-Session-Id`, no GET stream, no `Last-Event-ID` (all removed in this revision).
- Uses Node built-in `fetch` — no `undici` dep.

**Acceptance:** connects to a real reference server (e.g. `@modelcontextprotocol/server-everything` or filesystem server) over both transports where applicable; `server/discover` result parsed; legacy fallback proven against an old-SDK server.
**As-shipped delta:** ✅ **PASSED** (2026-08-14). 40 tests green, `tsc --noEmit` + eslint clean.
- **Legacy fallback proven against the real thing:** run against `@modelcontextprotocol/server-everything@2026.7.4` → `server/discover` → `-32601` → falls back → `initialize` → negotiates **2025-11-25**, extracts `serverInfo {mcp-servers/everything, 2.0.0}` + 6 capabilities, then `tools/list` returns 13 tools with **`resultType` absent** (correctly tolerated as legacy).
- **Modern lane proven against `fixtures/modern-good`** — written by hand because nothing else on earth implements 2026-07-28. It validates required `_meta` → `-32602`, emits `resultType`/`ttlMs`/`cacheScope`, and returns tools in deterministic order.
- **HTTP transport proven end-to-end** against an in-test Node server: required headers sent, **SSE response streams parsed** (keep-alive comments ignored, notifications separated from the response), header/body mismatch → `-32020` + 400, unknown method → `-32601` + 404, GET/DELETE → 405, and a dead socket → clean `timeout` rather than a hang.
- `McpClient` contract declared to the room. Requests **never throw** — a hostile server is data, not an exception — so every call returns an `RpcResponse` carrying outcome, raw evidence, HTTP status and elapsed time. This is what lets Lane A report failures instead of crashing on them.
- Security choice: stdio spawns with `shell: false` and a hand-written tokenizer, so a crafted target string cannot smuggle `;` / `$(…)` into a shell. Covered by test.
- Hardening carried in early: 8 MB max line, 16 MB max body, 64 KB stderr cap, unref'd timers, and `stderr` captured but never treated as failure (spec says clients SHOULD NOT assume stderr means error).
**Deferred:** `subscriptions/listen` streaming and MRTR (`input_required`) round-trips — not needed by any Sprint 3/4 check; revisit only if a rule requires them.

---

## Sprint 2 — Finding model + report pipeline
**TL;DR: one Finding schema; terminal + JSON + SARIF out; exit codes; RULES.md is generated.**

- [x] `schema/finding.ts` (CONTRACT): `{ id, lane: "conformance"|"safety", severity: info|low|warn|error, title, detail, evidence, specRef?, cwe?, owaspMcp?, falsePositiveModes[], remediation }`
- [x] Rules/probes are **self-describing**: each exports metadata (id, what/why/FP-modes) → RULES.md is generated from them (docs can't drift from code)
- [x] `report/terminal.ts`: monospace, B&W, box-drawn — Bruno's design edge; grouped by lane + severity; summary line
- [x] `report/json.ts` (`--json`) and `report/sarif.ts` (`--sarif`, SARIF 2.1.0 for CI/code-scanning — almost no competitor emits this)
- [x] Exit codes: 0 / 1 (`--fail-on`) / 2 (error); default threshold `warn`
- [x] `record_decision`: severity model + SARIF mapping

### 2.1 Contracts (expanded session 1)
```ts
type Severity = "info" | "low" | "warn" | "error";
type Lane = "conformance" | "safety";
type Era = "modern" | "legacy" | "unknown";

interface Finding {
  id: string;            // stable, e.g. "C1_DISCOVER_MISSING", "S1_TOOL_POISONING"
  lane: Lane;
  severity: Severity;
  title: string;
  detail: string;
  evidence?: { path?: string; snippet?: string; toolName?: string };
  specRef?: string;      // spec URL/section
  cwe?: string; owaspMcp?: string;
  falsePositiveModes: string[];   // REQUIRED — no rule ships without them
  remediation: string;
}

interface CheckResult { status: "pass" | "fail" | "skip"; skipReason?: string; findings: Finding[]; }

interface Rule {                    // the rule-plugin interface (declare_contract)
  meta: { id; lane; title; why; appliesTo: Era[]; defaultSeverity; falsePositiveModes; specRef?; cwe?; owaspMcp? };
  run(ctx: AuditContext): Promise<CheckResult>;
}
```
`RULES.md` is **generated** by iterating `rule.meta` — docs cannot drift from code.

### 2.2 Reporting
- `terminal.ts` inherits the **ccline** design system (`~/.claude/ccline/themes/*.toml`): ANSI-16 palette only (`c16` indices), plain/nerd-font icon duality, `" | "` separator, `text_bold` emphasis. `NO_COLOR` / `--no-color` / non-TTY ⇒ pure B&W monospace + box drawing. See amendment A6.
- `sarif.ts`: SARIF 2.1.0 — `rule.meta` → `tool.driver.rules[]`, findings → `results[]`, severity → `level` (`error`→error, `warn`→warning, `low`/`info`→note). Almost no competitor emits SARIF.
- Exit codes: `0` clean · `1` findings ≥ `--fail-on` threshold (default `warn`) · `2` tool/connection error.

**Acceptance:** a stub finding renders in all three formats; `--sarif` validates against the SARIF schema; exit codes correct in a shell test.
**As-shipped delta:** ✅ **PASSED** (2026-08-14). 57 tests green. The full pipeline is wired: `mcpaudit <target>` now connects, detects era, runs rules and renders a report.
- All three formats implemented and tested. SARIF asserted structurally: `version 2.1.0`, driver rules populated from rule metadata, and **`ruleIndex` verified to point at the matching rule** (the field most tools get wrong). Severity→level mapping tested across all four severities.
- **Exit codes tested end-to-end against the real built binary**, not just `main()`: clean→0, info-under-threshold→0, `--fail-on info`→1, unreachable server→2. Sprint 0 taught us unit tests can pass while the packed CLI is broken.
- `sanitizeSnippet()` escapes ANSI, zero-width and bidi characters before any finding is displayed — otherwise a server flagged for ANSI injection could inject ANSI into the report flagging it. Tested.
- Every finding carries its own `falsePositiveModes` and `remediation` in **all three formats**, not only in RULES.md, so the honesty travels with the data.
- Engine caches `tools/list` once and shares it across rules, and a rule that throws is recorded as an errored check rather than aborting the run.
- `npm test` now builds first, so the e2e tests can never run against a stale `dist/`.
**Deferred:** `--theme <file>` loading of ccline TOML files (design tokens are inherited now; file loading is Sprint 7 polish). RULES.md generation moves to Sprint 7 where the ruleset is complete.

---

## Sprint 3 — Lane A: Conformance checks (≥6, don't let it sprawl)
**TL;DR: correctness against 2026-07-28. Ship six solid checks, then STOP and do safety.**

- [x] C1 `server/discover` present + well-formed (missing = major finding; it's mandatory)
- [x] C2 tools/list: schema validity (each `inputSchema` is a valid JSON-Schema 2020-12 object, not null), name charset/length/uniqueness, deterministic order, `ttlMs`/`cacheScope` presence
- [x] C3 malformed-input handling: send a request missing required `_meta` → expect `-32602`/HTTP 400, not a crash/hang
- [x] C4 unknown-method behavior → `-32601`
- [x] C5 timeout/hang detection: does a well-formed call return within a bounded time?
- [x] C6 response-shape conformance: results carry `resultType`; error codes in the valid ranges; resource-not-found is `-32602` (accept `-32002` from legacy, note it)
- [x] Optional C7 header validation (HTTP): mismatched `MCP-Protocol-Version` → `-32020`
- [x] Each check → a self-describing probe module + a fixture server that passes and one that fails it
- [x] **Hard stop:** when 6 checks + fixtures are green, move to Sprint 4. Conformance must not eat the safety lane.

### 3.1 Era-aware check table (expanded session 1 — supersedes the flat list above)
Every check declares `appliesTo`. Checks that don't apply are **skipped with a reason**, never failed. This is the single most important guard against a wall of false positives (see Phase 1 reconciliation).

| ID | appliesTo | Expectation | Severity on fail |
|---|---|---|---|
| `C0_PROTOCOL_ERA` | both | reports negotiated era/version; pre-2026 server is itself a finding | info |
| `C1_DISCOVER` | modern | `server/discover` present; `supportedVersions[]` non-empty; `capabilities` object; `ttlMs`+`cacheScope` present; `serverInfo` in `_meta` (SHOULD → warn) | error |
| `C2_TOOLS_HYGIENE` | both | `inputSchema` present, object, `type:"object"` at root, not null; name 1–128 chars, charset `[A-Za-z0-9_.-]`, unique; **deterministic order across 2 calls**; `ttlMs`/`cacheScope` on list result (modern only) | warn (SHOULDs) / error (inputSchema invalid) |
| `C3_META_VALIDATION` | modern | request omitting required `_meta` → `-32602` (+HTTP 400). Legacy servers accept it — that's the era signal, not a failure | error |
| `C4_UNKNOWN_METHOD` | both | unknown method → `-32601`; on modern HTTP also **404** | warn |
| `C5_BOUNDED_TIME` | both | well-formed call returns within timeout (default 10s, `--timeout`) | error |
| `C6_RESULT_SHAPE` | both | `resultType` present (modern); error codes in valid ranges; **MUST NOT emit undefined `-32020..-32099` codes**; resource-not-found `-32602` (accept `-32002` from legacy, note it) | warn/error |
| `C7_HTTP_HEADERS` | modern+http | `MCP-Protocol-Version` header ≠ body `_meta` → `-32020` + 400; GET/DELETE → 405 | warn |
| `C8_LEGACY_PREINIT` | legacy | legacy server answers `tools/list` **before** `initialize` — era-ambiguity hazard the spec explicitly warns about (the official everything server does this) | warn |

**Hard stop:** when 6 checks + fixtures are green, move to Sprint 4. Conformance must not eat the safety lane.

### 3.2 Fixtures (hand-rolled, zero-dep, raw newline-delimited JSON-RPC over stdio)
`fixtures/modern-good` (the only 2026-07-28-conformant server in existence — we write it) · `fixtures/modern-bad` (one failure per check) · `fixtures/legacy` (initialize-era) · `fixtures/hostile` (garbage/truncated/oversized/hanging, for the Sprint 7 fuzz pass).

**Acceptance:** 6+ checks, each with pass-fixture + fail-fixture, all green in CI; runs against 2 real public servers without false crashes.
**As-shipped delta:** ✅ **PASSED** (2026-08-14). **9 checks shipped** (C0–C8), 67 tests green. Hard stop honoured: stopped here and moved straight to Lane B.
- **The era-awareness design is validated by the numbers.** Against the real `@modelcontextprotocol/server-everything`, the audit reports exactly **two** findings — `C0_PRE_2026_PROTOCOL` (info) and `C8_ANSWERS_BEFORE_INITIALIZE` (warn) — with C1/C3/C7 correctly *skipped*, not failed. A non-era-aware build would have emitted a wall of false failures here.
- `fixtures/modern-good` produces **zero findings with all 7 applicable checks actively passing** — the clean-server baseline that proves the checks are not just always-fire.
- `fixtures/modern-bad` triggers **18 findings** across C1/C2/C3/C4/C6, one per deliberate defect.
- Added `fixtures/reserved-code`: modern-bad could not cover `C6_RESERVED_CODE_MISUSE` because it uses its unknown-tool path for a different defect. Novel check — emitting an unallocated code from the spec-reserved -32020..-32099 range.
- **Fixture bug caught by an absent finding:** modern-bad reversed its tool order to test determinism, but its tool names were a palindrome, so reversal was a no-op and `C2_NONDETERMINISTIC_ORDER` never fired. Added a fourth tool to break the symmetry. A green suite would have hidden this.
- A metadata-discipline test asserts every rule has non-empty `falsePositiveModes`, a real `remediation`, and a substantive `why` — the linter framing enforced in CI rather than by good intentions.
**Deferred:** C7 exercised only against an in-test HTTP server; a real public HTTP MCP server on 2026-07-28 does not exist yet to test against.

---

## Sprint 4 — Lane B: Safety checks (≥5 — this is what gets shared)
**TL;DR: the sharable half. Static description linting + drift + credential/injection/egress heuristics.**

Each check cites its primary source in RULES.md and states its false-positive modes.

- [x] S1 **Tool poisoning / injection surface** (Invariant Labs, Apr 2025): imperative/injection phrases in `description`/`instructions`/`server/discover.instructions` ("ignore previous", "you must", "do not tell the user", `<IMPORTANT>`), hidden HTML, zero-width/homoglyph chars, abnormally long descriptions. FP modes: legit tools that describe instructions to the user.
- [x] S2 **Destructive tool without confirmation semantics**: write/delete verbs in name/description with `destructiveHint` unset/false and no irreversibility note. (Remember: annotations are spec-untrusted — flag mismatch, don't trust the hint.)
- [x] S3 **Credential exposure**: secrets/tokens/keys in tool schemas, default values, or error/log output; probe a malformed call and scan the error for credential-shaped strings.
- [x] S4 **Over-broad / undeclared egress signal**: static hints of network calls to hosts never mentioned; `$ref` in schemas pointing at network URLs (also a DoS vector); OAuth metadata URLs pointing at link-local/RFC-1918/loopback (SSRF).
- [x] S5 **Cross-server shadowing** (multi-target mode): duplicate/overlapping tool names across configured servers; a description referencing another server's tools.
- [x] S6 **ANSI/control-char injection** in tool descriptions or output (ToB): terminal escape sequences.
- [x] Map every safety finding to **OWASP MCP Top 10** + **CWE** where applicable (credibility, and almost nobody does it).

### 4.1 Detection specifics (expanded session 1)
- **S1 poisoning signals:** phrase set (`ignore previous`, `disregard`, `you must`, `do not tell`, `do not mention`, `before using any other tool`, `<IMPORTANT>`, `<SECRET>`), HTML comments `<!--`, zero-width chars `U+200B-200D/U+FEFF/U+2060`, bidi overrides `U+202A-202E`, Cyrillic/Greek homoglyphs mixed into ASCII words, description length > 2000 chars. Scans `tool.description`, `tool.title`, `prompt.description`, and `instructions` (from `server/discover` or `initialize`).
- **S2 destructive mismatch (both directions):** verb set (`delete|drop|remove|truncate|purge|destroy|overwrite|revoke|kill|reset|wipe|rm`) in name/description AND (`readOnlyHint===true` ⇒ **contradiction, higher severity** | `destructiveHint===false` | annotations absent ⇒ defaults apply: `destructiveHint` defaults **true**, so absence is not itself a finding — flag only explicit contradiction or a read-only claim on a destructive verb).
- **S3 credential exposure:** param names matching `(api[_-]?key|token|secret|password|passwd|credential|private[_-]?key|bearer)`; **non-empty `default` values** on such params (a real leak); known key shapes (`sk-`, `ghp_`, `gho_`, `AKIA`, `xox[bpsa]-`, `-----BEGIN .* PRIVATE KEY-----`); high-entropy strings ≥32 chars; **`x-mcp-header` on a sensitive param** (spec: SHOULD NOT — visible to intermediaries); plus a live probe: malformed call → scan the error payload for the same shapes.
- **S4 schema egress/DoS:** `$ref` with a network URI (spec: MUST NOT auto-dereference) → warn; `$ref` to loopback/`169.254.0.0/16`/RFC-1918 → SSRF, error; schema depth > 20 or subschema count > 500 or `$defs` count > 200 → composition-keyword DoS (SEP-2106 bounds).
- **S5 shadowing:** multi-target mode (`mcpaudit a b c`), duplicate tool names across servers; description referencing another server's tool names.
- **S6 ANSI/control:** `\x1b[` CSI/OSC sequences, `\r` carriage-return overwrite, C0 controls in descriptions **and** in tool-call output.
- **S7 icon URI scheme:** `icons[].src` using `javascript:`/`file:`/`ftp:`/`ws:`/`data:text/html` → error (spec says clients MUST reject); non-HTTPS non-`data:` → warn; cross-origin vs server host → info.

Mapping: every safety finding carries `owaspMcp` + `cwe` (e.g. S1→CWE-77/OWASP MCP prompt injection, S3→CWE-522, S4→CWE-918 SSRF / CWE-400 DoS, S6→CWE-150).

### 4.2 Malicious fixtures
`fixtures/malicious/` — one server exposing a tool per attack class, so each rule has a positive fixture, plus a `fixtures/benign/` server whose descriptions legitimately contain instruction-like prose (guards the documented false-positive modes).

**Acceptance:** 5+ safety checks with malicious fixtures; each documented in RULES.md with FP modes; OWASP/CWE mapping present.
**As-shipped delta:** ✅ **PASSED** (2026-08-14). **7 safety rules shipped** (S1–S7), 79 tests green. Every rule carries CWE + OWASP-MCP mapping, enforced by test.
- `fixtures/malicious` plants one attack per class and yields **19 safety findings**; `fixtures/shadow` covers S5 (duplicate name + foreign-tool reference across two targets).
- **`fixtures/benign` is the load-bearing test and it earned its keep.** It is written the way real servers are written — instructional prose, a credential-named parameter with no value, a placeholder default, a UUID, a destructive tool with *honest* annotations, `remove_background`, a local `` ref, a ZWJ family emoji, a `data:` icon. First run produced **2 false positives**, both of which were FP modes I had *documented but not implemented*:
  1. `S1_HIDDEN_CHARACTERS` fired on 👨‍👩‍👧 — the zero-width joiners that build an emoji sequence. Fixed: a ZWJ between two Extended_Pictographic characters is legitimate.
  2. `S2_DESTRUCTIVE_CLAIMS_READONLY` fired on `remove_background`. Fixed with a two-tier verb model: strong verbs (delete/drop/purge/wipe…) count alone; weak verbs (remove/reset/clear…) count only when paired with a stateful object (file, record, database, account…). Benign is now **0 findings**.
- **Novel checks nothing else can have** (the spec is weeks old): `S3_SENSITIVE_X_MCP_HEADER` — a secret marked `x-mcp-header` is mirrored into an HTTP header visible to every proxy, which the spec explicitly warns against — and `S7_ICON_URI` (`javascript:`/`file:` icon schemes the spec says clients MUST reject).
- **Bug caught by an absent finding:** `S6_CONTROL_IN_OUTPUT` scanned `res.raw`, but on the wire an ESC byte is already JSON-escaped as `\u001b`, so it could never match. Now scans decoded `content[].text`.
- A test asserts the report itself never contains raw ANSI or zero-width characters — a server flagged for injection must not be able to inject into the report flagging it.
- **Real-world check:** the full 16-rule audit against `@modelcontextprotocol/server-everything` yields **2 findings and zero safety false positives**, with 10 checks actively passing and 4 correctly skipped.
**Deferred:** token-passthrough / OAuth-metadata SSRF (S8) — needs a live 2026-07-28 HTTP server with auth to test against; none exists. Added to backlog: a rule for tools that expose environment variables wholesale (the reference server's `get-env` is exactly this shape, but the heuristic needs care before shipping).

---

## Sprint 5 — Rug-pull / drift detection (the standout feature)
**TL;DR: pin the server's surface; diff on re-audit; drift = alert. Only runtime wrappers do this today.**

- [x] `pin/baseline.ts`: hash `{name, title, description, inputSchema, annotations}` per tool → `.mcpaudit-baseline.json`
- [x] `pin/diff.ts`: `--baseline <file>` re-audit → report any tool whose surface changed since pin (semantic diff, not just hash — show old→new)
- [x] `--pin` writes/updates the baseline; drift emits a high-severity Finding (this is how silent tool-redefinition / rug pulls surface)
- [x] `record_decision`: baseline format (CONTRACT via declare_contract)

### 5.1 Baseline format (CONTRACT, expanded session 1)
```jsonc
{
  "version": 1,
  "createdAt": "<ISO>",
  "target": { "kind": "stdio"|"http", "spec": "npx -y foo-server" },
  "server": { "name": "...", "version": "...", "era": "legacy", "protocolVersion": "2025-06-18" },
  "tools": [ { "name": "...", "hash": "sha256:...",
               "fields": { "title": "...", "description": "sha256:...", "inputSchema": "sha256:...", "annotations": {...} } } ],
  "instructionsHash": "sha256:..."
}
```
Per-tool hash covers `{name,title,description,inputSchema,annotations}` (canonical JSON: sorted keys, no whitespace) via `node:crypto`. Field-level hashes let the diff say *which* field moved, not just "changed".

### 5.2 Diff semantics
`--pin [path]` writes/updates (default `.mcpaudit-baseline.json`). `--baseline <path>` compares and emits: `TOOL_ADDED` (info) · `TOOL_REMOVED` (warn) · `TOOL_DESCRIPTION_CHANGED` (**error** — the classic rug pull) · `TOOL_SCHEMA_CHANGED` (error) · `TOOL_ANNOTATIONS_CHANGED` (error if it relaxes a safety claim, e.g. `destructiveHint` true→false) · `INSTRUCTIONS_CHANGED` (warn). Diff renders old→new inline, truncated, with control chars escaped so a malicious diff can't corrupt the terminal.

**Acceptance:** pin a fixture server, mutate a tool description, re-audit → drift finding with a readable diff.
**As-shipped delta:** ✅ **PASSED** (2026-08-14). 88 tests green. Demonstrated end-to-end: pinned the benign fixture, rewrote one description and flipped one annotation, re-audited → both caught with old→new diffs rendered inline.
- **Canonical JSON (sorted keys, no whitespace) before hashing.** Without it a server that merely reordered its JSON keys would look like a rug pull on every re-audit; tested explicitly.
- Field-level hashes alongside the whole-tool hash, so the diff names *which* field moved rather than just "changed".
- `D1_ANNOTATIONS_RELAXED` is the sharpest signal in the tool: it fires only when a change *weakens* a safety claim (`readOnlyHint`→true, `destructiveHint`→false, `openWorldHint`→true), which is the shape of a deliberate downgrade rather than an ordinary release edit.
- Drift deliberately lives **outside the rule registry**: it needs a caller-supplied baseline and must still run when the era is `unknown`.
- `D1_BASELINE_TARGET_MISMATCH` warns when a baseline was captured against a different target, so a mis-pointed `--baseline` cannot masquerade as mass drift.
- Severity is deliberate: description/inputSchema changes are `error` (they alter what the model is told); title/outputSchema are `warn`; a new tool is `info`. FP modes state plainly that drift means "changed since you approved it", not "malicious".
- **Fixture correctness fix:** benign/shadow/reserved-code claimed 2026-07-28 but did not validate required `_meta`, so Lane A noise (3× C3) buried the drift signal in the demo. They now validate properly and are conformance-clean.
**Deferred:** none.

---

## Sprint 6 — The demo: audit real servers (the distribution hook)
**TL;DR: without a findings table on real servers, the repo is an empty tool.**

- [x] Audit 3–5 well-known PUBLIC MCP servers (reference servers + a couple of popular community ones)
- [x] Produce the README findings table: server × conformance summary × notable safety findings
- [x] **If any finding is genuinely serious → STOP, do not publish it. Trigger Sprint 8 disclosure first.** In the table, describe it generically ("one audited server exposed credentials in error output") until patched.
- [x] Commit raw `--json` outputs for each audited server (auditable, not just summarized)
- [x] Sanity: hand-review every finding; a false positive in the launch table is a credibility hit

**Acceptance:** 3–5 servers audited, table drafted, raw outputs committed, every finding human-verified, disclosure triggered for anything serious.
**As-shipped delta:** ✅ **PASSED** (2026-08-14). **4 official reference servers audited**, raw `--json` committed to `audits/`, README table drafted above the fold, 93 tests green.
- Audited: `server-everything@2026.7.4`, `server-filesystem@2026.7.10`, `server-memory@2026.7.4`, `server-sequential-thinking@2026.7.4`. All four are **2025-11-25**, confirming the Phase-1 finding at ecosystem scale.
- **The hand-review requirement earned its place — it caught 4 false positives before publication.** The first run flagged `list_directory`, `list_directory_with_sizes`, `directory_tree` and `sequentialthinking` as "destructive but claiming readOnly" at **error** severity. Root cause: `matchedVerbs` used `\b<verb>` with no *trailing* boundary, so **"clearly"** matched the verb `clear` and "formatted" matched `format`. Two fixes: require a trailing boundary with inflections (`\b<verb>(?:s|es|d|ed|ing)?\b`), and restrict weak verbs to the tool *name* — prose is too noisy to carry that signal. **Regression tests now pin those exact strings.** Publishing that table would have been a direct hit to the project's credibility.
- Post-fix, every remaining finding was **manually re-verified against the live servers**: filesystem really does return 14 tools with no `initialize` sent; the sequential-thinking description really is 2781 characters.
- **No disclosure triggered** — nothing exploitable was found, so Sprint 8 was not activated. The README says so explicitly rather than implying restraint where none was needed.
- Pulled forward from Sprint 7: `RULES.md` is now **generated** from rule metadata (`npm run rules:gen`, 426 lines, 17 rules) and the README is written.
**Deferred:** auditing popular *community* servers — most need credentials or network services to start, which makes them poor launch-table material; the official reference set is verifiable by anyone.

---

## Sprint 7 — RULES.md, README, hardening
**TL;DR: the docs are half the project. Linter framing verbatim; every check documented.**

- [x] RULES.md generated from rule metadata: every check — what it looks for, why, false-positive modes, spec/CVE reference
- [x] README: 1-liner → **demo findings table above the fold** → linter-framing paragraph verbatim ("not a security audit") → `npx <name> <server>` quickstart → `--json`/`--sarif`/CI usage → supply-chain table (our own deps, justified) → contributing + disclosure policy
- [x] Robustness pass: never crash on a hostile/malformed server (fuzz the probes against garbage responses); bounded timeouts everywhere
- [x] `--help` is design-reviewed (branded, monospace) — the CLI's own surface is part of the pitch

**Acceptance:** RULES.md complete and code-generated; README self-consistent; fuzz pass green; no unhandled rejections.
**As-shipped delta:** ✅ **PASSED** (2026-08-14). 113 tests green, lint clean.
- **RULES.md generation moved out of a build script and into `src/report/rules-doc.ts`**, with `test/rules-doc.test.ts` failing the build when the committed copy is stale (`npm run rules:gen` rewrites it, snapshot-style). A pre-commit hook correctly objected that the original script imported from gitignored `dist/` — it would have broken on a clean checkout. The test also asserts every rule's FP modes appear **in full**, so the docs cannot quietly summarise them away.
- **`fixtures/hostile` + 16 fuzz tests, green on the first run**: garbage stdout, truncated JSON, wrong-shaped envelopes, unknown/null ids, 2000 tools × 500-char descriptions, null/number/string/array entries in the tools array, a 400-deep schema, a silent server, mid-conversation exit, a 500-notification flood, and a frame with no trailing newline. Asserted: no crash, no unhandled rejection, every check lands in a defined state, and the report still renders in all three formats. The defensive choices from Sprint 1 (size caps, unref'd timers, never-throw transport) carried this with no new hardening required.
- `--help` design-reviewed against the inherited ccline system: brand accent on flags, bold headings, severity-coloured exit codes, collapsing to plain monospace when piped (verified: zero ANSI sequences off-TTY).
- `SECURITY.md` states the linter's own threat model — it connects to hostile servers by design — and the third-party disclosure policy, including that it binds the README table itself.
**Deferred:** issue templates (`.github/ISSUE_TEMPLATE/`) — CONTRIBUTING.md carries the same guidance; templates are cosmetic and can follow.

---

## Sprint 8 — Responsible disclosure (owner-gated; may run parallel from Sprint 6)
**TL;DR: how a candidate handles disclosure is itself a hiring signal. Get it right.**

- [x] `SECURITY.md` / disclosure policy in-repo
- [x] For any serious finding: private report to the maintainer, reasonable fix window, generic naming publicly until patched (`ask_human` before every external contact — this is Bruno's to send, not the agent's)
- [x] Track disclosure state; only de-generalize the README table after a public fix
- [x] `record_decision` per disclosure

**Acceptance:** disclosure policy published; any in-flight disclosure handled correctly; nothing serious named pre-patch.
**As-shipped delta:** ✅ **PASSED** (2026-08-14). `SECURITY.md` published with both halves: how to report a vulnerability *in* mcpaudit (including its own threat model — it connects to hostile servers by design), and the third-party disclosure protocol (private report → 90-day default window → generic naming until patched → de-generalise only after a public fix).
- The policy explicitly binds the README table: nothing gets named for the sake of a better demo.
- **No disclosure is in flight and none was needed** — nothing exploitable was found in Sprint 6. SECURITY.md says that outright rather than implying restraint where none was required, which is the honest version.
**Deferred:** nothing. Any *future* disclosure remains owner-gated in Sprint 11.

---

## Sprint 9 — Publish + distribute
**TL;DR: live on npm, runnable via npx, and findable.**

- [ ] `ask_human`: publish approval
- [ ] Publish via OIDC/provenance CI on a tagged release; verify `npx <name> <public-server>` works from a clean machine
- [⏭ Sprint 11 per A4] Repo public; topics set; README badges (npm version, provenance, CI) live — *badges are **wired**, not live; corrected 2026-08-15 during Sprint D, where the docs pass found the GitHub repo did not exist at all*
- [⏭ Sprint 11 per A4] Cross-link from brunojaamaa.dev; draft the launch note (honest scope, invite contributions)
- [⏭ Sprint 11 per A4] Optional: submit to the MCP registry / awesome-mcp-security list (real tool, not link-farming)

**Acceptance:** package live with provenance badge; clean-machine `npx` recorded; launch note drafted for Bruno.
**As-shipped delta:** ⚠️ **RAILS COMPLETE, PUBLISH IS OWNER-GATED (A4).** Everything short of the actual publish is done and verified.
- **Clean-machine install verified**: `npm pack` → fresh temp project → `npm i <tarball>` → `npx mcpaudit <real server>` renders a correct report. `npm ls --all` shows a **single package with no transitive dependencies**, which is the supply-chain claim demonstrated rather than asserted.
- README badges wired (npm version, CI, provenance, zero-deps); they resolve once the package and repo are public.
- Release process documented in CONTRIBUTING: `npm version` → `git push --follow-tags` → OIDC publish. No npm token exists anywhere in the repo or CI.
**Deferred to Sprint 11:** the publish itself, repo-public flip, brunojaamaa.dev cross-link, registry submission — all owner actions.

---

## Sprint 10 — Maintenance posture (turns "built" into "maintained")
**TL;DR: the identity payoff needs the repo to look alive.**

- [x] CONTRIBUTING.md + issue templates (bug / false-positive report / new-rule proposal)
- [x] CI matrix: Node 20/22/24; a scheduled run against the current MCP spec to catch protocol drift
- [x] Semantic-release or Changesets so versioning is automatic
- [x] A `good first issue` or two seeded for real (new rule ideas) — invites the contributions that make "I maintain X" true

**Acceptance:** contributor scaffolding live; scheduled spec-drift job green; release automation working.
**As-shipped delta:** ✅ **PASSED** (2026-08-14).
- `CONTRIBUTING.md` with the bar a rule must clear to be merged, plus three issue templates — including a dedicated **false-positive** template, since a check that cries wolf is the failure mode that kills a linter.
- **`spec-drift.yml`**: a weekly job that lists the dated revision directories in the schema repo and fails when one newer than our pinned `LATEST_PROTOCOL_VERSION` appears. **Logic validated live** — it enumerated 2024-11-05 → 2026-07-28 and correctly reported no drift. My first version was circular (it read the version out of the versioned file, which always matches itself); rewritten to compare against the published directory listing.
- CI additionally fails when `RULES.md` is stale, so docs drift is a red build too.
- **5 good first issues seeded** in CONTRIBUTING with real substance (env-dump detection, `--theme` TOML loading, S8 token passthrough, resources/prompts coverage, more benign fixtures) — genuine gaps, not busywork.
**Deferred:** Changesets/semantic-release. Deliberate: for a pre-1.0 solo package the tag-triggered OIDC release is already automated end-to-end, and adding a release-automation framework buys ceremony rather than safety. Revisit if there are multiple maintainers.

---

## Sprint D — Documentation pass (2026-08-15)
**TL;DR: make the repo read well to a stranger, and make every number in it point at a committed artifact.**

Driven by `DOCS-ENGINEERPROMPT.md` (a generic per-project template, deliberately left uncommitted — it references private local paths).

- [x] Verify every claim in the current-state line against a live run before reusing it
- [x] Rewrite README to the docs-pass structure: hook → hero visual → run command → findings table → framing → architecture (Mermaid) → how it was built → verification → usage → limitations → status
- [x] Hand-author `docs/media/demo.svg` — a terminal render whose every visible value matches `audits/server-everything.json`
- [x] `PROJECT.json` at the repo root for the portfolio to consume; every `metrics[].source` points at a file that exists
- [x] `CHANGELOG.md` with the 0.1.0 entry
- [x] Repo hygiene: scrub leaked local paths, drop duplicate/process docs, untrack per-developer agent wiring
- [x] Fix the defects the pass surfaced rather than documenting around them

**Acceptance:** a stranger can find the receipt for every claim in the README; no number appears without a committed source.
**As-shipped delta:** ✅ **PASSED** (2026-08-15). The pass was worth running as an audit, not just a rewrite — it found nine defects, four of them things that would have shipped publicly:

- **All four `audits/*.json` leaked the author's machine.** `target.raw` and `target.describe` carried an absolute scratchpad path containing the macOS username and a session UUID — in the exact files the README invites readers to open as proof, and while SECURITY.md claimed every finding was "reproducible in one command". Rewritten to the reproducible `npx -y @modelcontextprotocol/server-…` invocation.
- **The README's Version column was not in the evidence it cited.** It listed npm package versions (`2026.7.4`); the committed JSON records `serverInfo` (`mcp-servers/everything 2.0.0`). Replaced with a "Reports itself as" column carrying the values the audits actually prove — which is also more interesting, since the self-reported names do not match the package names.
- **`--help` printed the severity order wrong** (`info|warn|low|error`); the real ordering is `info|low|warn|error`. A source bug found by reading the docs against the parser, `src/cli.ts:46`.
- **Sprint 9 carried three false `[x]` marks** claiming the repo was public with live badges. The GitHub repo did not exist at all — no remote was ever configured. Corrected above.
- Deleted `GEMINI.md` (byte-identical to `AGENTS.md`) and `ENGINEERPROMPT.md` (kickoff scaffolding, not a repo artifact). Untracked `.claude/`, `.codex/`, `.cursor/` — committing `.claude/settings.json` would have made every cloner run this project's Aethereum hooks on six lifecycle events. Added `.env*`, `.mcpaudit-baseline*.json` and `.DS_Store` to `.gitignore`.
- **Plan inconsistency resolved:** §Phase 1 records server-everything as a 2025-06-18 server; Sprint 1 and all four committed audits record **2025-11-25**. The 2025-06-18 reading came from a raw `initialize` probe during research; **2025-11-25 is the negotiated value and the one public copy uses.**
- One irony worth recording: the first README draft contained a literal ESC byte, exactly what `S6_CONTROL_SEQUENCES` exists to catch. Caught by scanning the file for control characters before commit.

**Deferred:** asciinema recording (the hand-authored SVG is diffable and needs no external tooling); `docs/` site. The "official conformance suite carries 11 runtime deps" claim was **dropped from public copy** rather than repeated — it is a competitive number with no in-repo source, and the zero-dep claim stands on its own test.

---

## Backlog (post-v1)
- **Env-dump tools:** flag tools that return the whole environment (the official everything server ships `get-env`, "Returns all environment variables"). Real credential-exposure surface, but the heuristic needs care not to fire on legitimate debug tooling.
- **S8 token passthrough / OAuth metadata SSRF** — deferred from Sprint 4 for lack of any live 2026-07-28 auth server to test against.
- Dynamic behavioral checks in a sandbox (explicitly non-goal for v1)
- Config-file scanning (Claude Desktop/Cursor/VS Code) like Snyk agent-scan does
- Reuse `@modelcontextprotocol/conformance`'s wire-schema-validation as an embedded conformance oracle
- AIVSS scoring for findings
- A hosted "audit badge" (only if the tool gets real adoption)

---

## Cross-cutting definition of done
- Framing is "linter, not audit" everywhere in public copy
- Every check documented in RULES.md with false-positive modes, generated from code
- Zero network calls except to the target server; minimal justified deps
- `tsc --noEmit` + vitest green at every sprint close; `--sarif` schema-valid
- No serious finding published before disclosure + patch
- Aethereum room current: intents per sprint, contracts declared, decisions + verifications recorded

---

## AMENDMENTS (Aug 2026 — owner decisions + verified research)

**A1 · Name is locked: `@br9704/mcp-audit`** (scoped). Bruno's call, and the research supports it: npm's dispute page now says verbatim it "does not resolve squatting claims on demand" and will not transfer names — the only formal path is trademark. File a support ticket about the `mcp-audit` stub under the Open-Source Terms ("content that exists only to reserve a name") as a zero-cost lottery ticket, but plan nothing around it. Sprint 0's name task collapses to: set `src/brand.ts = "@br9704/mcp-audit"`, verify free, move on.

**A2 · Publishing:** unchanged — OIDC trusted publishing + provenance, no postinstall. Note granular npm tokens are now capped at 7-day lifetimes, which makes OIDC effectively mandatory for CI publishing.

---

## AMENDMENTS (2026-08-14 — session 1, post-research, owner-approved plan)

**A3 · Era-aware checks are mandatory.** No shipping server implements 2026-07-28 (the official `server-everything@2026.7.4` is a 2025-06-18 server; SDK 1.30.0 tops out below it). Every rule declares `appliesTo: Era[]`; era is resolved before any check runs; inapplicable checks are **skipped with a reason, never failed**. Sprint 3's flat check list is superseded by the table in §3.1. Rationale: firing modern checks at legacy servers would produce a wall of false positives and destroy credibility on contact.

**A4 · All owner-gated work moves to the very end (owner instruction, this session).** npm 2FA confirmation, trusted-publisher configuration, publish approval, repo-public flip, and every disclosure contact are batched into **Sprint 11 — Owner gate block** at the tail of this plan. Sprints 0–10 are built without blocking. Sprint 8 still *authors* the disclosure policy and *prepares* reports; it does not send them. Sprint 9 still *builds* the publish rails; it does not publish.

**A5 · Zero runtime dependencies (supersedes `commander`/`zod` in the architecture index).** A security tool's own supply chain is part of its pitch, and the incumbent conformance suite carries 11 runtime deps. Shipping: hand-rolled arg parser (~60 lines) instead of `commander`; hand-written TS types + runtime validators instead of `zod`; Node built-in `fetch` instead of `undici`; hand-rolled SSE parser. **Consequence, stated openly in RULES.md:** `inputSchema` validation is **structural** (parseable, object, `type:"object"` at root, bounded depth/refs), *not* full JSON-Schema 2020-12 meta-validation — that would need `ajv`. This is honest linter scope; documented as a limitation, not hidden. A test asserts `package.json` has no `dependencies`.

**A6 · Design system inherited from ccline** (owner instruction "use ccline"; no claude.ai design-system project exists). `report/terminal.ts` adopts `~/.claude/ccline/themes/*.toml`: ANSI-16 palette only (`c16` indices), plain/nerd-font icon duality, `" | "` separator, `plain`/`powerline` modes, `text_bold` emphasis, same TOML shape so existing theme files drop in. `NO_COLOR`/`--no-color`/non-TTY collapses to the pure B&W monospace + box-drawing the plan originally specified; `--json`/`--sarif` are never styled.

**A7 · Verified environment pins (2026-08-14).** Node 24.12.0 / npm 11.6.2 local · trusted publishing needs npm ≥ 11.5.1 + Node ≥ 22.14.0, `id-token: write`, GitHub-hosted runners, public repo + public package · **provenance is automatic under trusted publishing — do NOT pass `--provenance`** · `aethereum` on npm at 0.9.9 with `~/.aethereum/config.json` present, invoked via `npx`.

---

## Sprint 11 — Owner gate block (everything requiring Bruno; deferred here by A4)
**TL;DR: the only work that needs the owner. Batched at the end so nothing upstream blocks.**

- [ ] Confirm FIDO 2FA on the npm account; configure the trusted publisher for `@br9704/mcp-audit` (first publish of a scoped package may need the package to exist or the org configured — verify at this point)

> **Verified 2026-08-15 (Sprint D) — publish preconditions all green.** `npm whoami` returns **`aethereum-dev`**, which is the intended account (owner confirmation): `npm org ls br9704` reports `br9704 - owner`, so **`@br9704` is an npm org this account owns** and is authorised to publish into the scope. The name is free (registry 404 for `@br9704/mcp-audit`). `npm publish --dry-run --access public` produces a correct tarball: 109 files, 108.3 kB packed, 419.1 kB unpacked, `@br9704/mcp-audit@0.1.0`, public access, `publishConfig.access: public` honoured.
>
> **Sequencing caveat:** `release.yml` fires on a `v*` tag and runs a bare `npm publish`. If 0.1.0 is published manually first, do **not** then push a `v0.1.0` tag — the workflow would attempt to republish an existing version and fail. Either publish manually and let the next tag be `v0.1.1`, or skip the manual publish and let the tag do the first release (the only path that produces a provenance attestation).
- [ ] `ask_human`: publish approval → tag release → verify provenance badge + clean-machine `npx`
- [ ] `ask_human` per disclosure: send any prepared vulnerability report; hold the README table generic until patched
- [ ] Flip repo public; set topics; cross-link from brunojaamaa.dev; post the launch note
- [ ] Optional: file the `mcp-audit` npm dispute ticket (zero-cost lottery ticket per A1)

**Acceptance:** every owner decision made explicitly, nothing published or disclosed without it.
**As-shipped delta:** · **Deferred:**
