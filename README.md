# mcpaudit

**A conformance + safety linter for MCP servers.** Point it at any Model Context Protocol
server — stdio or Streamable HTTP — and get a report.

```bash
npx @br9704/mcp-audit "npx -y @modelcontextprotocol/server-filesystem /tmp"
```

Zero runtime dependencies. No API key. No telemetry. The only network traffic is to the
server you asked it to audit.

---

## What it found

Real audits of four official reference servers, run with this tool at v0.1.0. Raw
`--json` output for every row is committed under [`audits/`](./audits) — nothing here is
summarised by hand.

| Server | Version | Protocol | Findings |
|---|---|---|---|
| `@modelcontextprotocol/server-everything` | 2026.7.4 | 2025-11-25 | 1 warn, 1 info |
| `@modelcontextprotocol/server-filesystem` | 2026.7.10 | 2025-11-25 | 1 warn, 1 info |
| `@modelcontextprotocol/server-memory` | 2026.7.4 | 2025-11-25 | 1 warn, 1 info |
| `@modelcontextprotocol/server-sequential-thinking` | 2026.7.4 | 2025-11-25 | 1 warn, 1 low, 1 info |

The headline is the **Protocol** column. The current specification revision is
`2026-07-28`, which removed the `initialize` handshake and made `server/discover`
mandatory. Every server above — and every SDK we could find — still speaks an
`initialize`-era revision. That is not a defect in these servers; it is where the
ecosystem is. It is also why every check in this tool is *era-aware*: checks written for
the stateless protocol are **skipped with a stated reason** against older servers rather
than failed. Without that, this table would be a wall of false failures.

The recurring `warn` is `C8_ANSWERS_BEFORE_INITIALIZE`: all four answer `tools/list` on a
fresh connection with no handshake sent. The specification calls this out directly as a
version-negotiation hazard, and it is why it recommends probing with `server/discover`
first even for clients that only speak modern revisions.

**No exploitable vulnerability was found in any audited server, and nothing here was
disclosed privately first because there was nothing to disclose.** These are hygiene and
spec-currency observations about servers that are, by design, demonstration and reference
implementations.

---

## What this is, honestly

> **A first-pass linter that catches common issues — not a security audit.**

That framing is load-bearing. This tool reads what a server *says about itself* — tool
names, descriptions, schemas, annotations, protocol behaviour — and applies documented
heuristics. It does not execute tools in a sandbox, analyse server source, or prove
anything. A clean report means "nothing common was found", not "this server is safe".

Every check documents **how it misfires**, in [RULES.md](./RULES.md), which is *generated
from the rule metadata in code* so the docs cannot drift. `falsePositiveModes` is a
required field on every rule.

This discipline is not decorative. Auditing the official filesystem server surfaced four
findings that turned out to be false positives — the word "clearly" in a description was
matching the destructive verb `clear`. That bug was found by hand-reviewing every finding
before publishing this table, and there are now regression tests for those exact strings.
If a check fires on your legitimate server, that is a bug in the check; please report it.

---

## Two lanes

**Lane A — conformance.** Does it implement the specification correctly? Built against
`2026-07-28` (stateless) first, with a back-compat lane for `initialize`-era servers.

**Lane B — safety.** Is it dangerous? Tool poisoning, annotation contradictions,
credential exposure, `$ref` SSRF, cross-server shadowing, terminal-escape injection,
unsafe icon URIs — and rug-pull drift against a pinned baseline.

17 checks in total. All of them are in [RULES.md](./RULES.md).

## Usage

```bash
# stdio (a command)
npx @br9704/mcp-audit "npx -y @modelcontextprotocol/server-memory"

# Streamable HTTP (a URL)
npx @br9704/mcp-audit https://example.com/mcp

# CI: SARIF for GitHub code scanning
npx @br9704/mcp-audit https://example.com/mcp --sarif > mcp.sarif

# Cross-server shadowing needs more than one target
npx @br9704/mcp-audit "npx -y server-a" "npx -y server-b"
```

### Rug-pull detection

A server can pass review and then quietly rewrite a tool description — which changes the
instructions your model follows, with no version bump and no code change on your side.
Pin the surface, then diff it:

```bash
npx @br9704/mcp-audit "npx -y my-server" --pin          # writes .mcpaudit-baseline.json
npx @br9704/mcp-audit "npx -y my-server" --baseline .mcpaudit-baseline.json
```

Drift reports which field changed, with the old and new values inline. Annotation changes
that *weaken* a safety claim (`destructiveHint` flipping to `false`) are called out
separately, because that is the shape of a deliberate downgrade rather than an ordinary
release edit.

### Options

| Flag | Meaning |
|---|---|
| `--json` | machine-readable report |
| `--sarif` | SARIF 2.1.0, for GitHub code scanning |
| `--fail-on <level>` | `info` \| `low` \| `warn` \| `error` (default `warn`) |
| `--pin[=<path>]` | write a baseline snapshot |
| `--baseline <path>` | diff against a baseline |
| `--timeout <ms>` | per-request timeout (default 10000) |
| `--no-color` / `--icons` | output styling; `NO_COLOR` is respected |

**Exit codes:** `0` clean · `1` findings at or above `--fail-on` · `2` tool or connection
error. Designed for CI.

## Supply chain

A security tool's own dependency tree is part of its argument.

| Runtime dependencies | **0** |
|---|---|
| Install lifecycle scripts | **none** — nothing runs on `npm install` |
| Network calls | only to the server you name |
| Node | ≥ 20 |

Both the zero-dependency claim and the absence of install scripts are
[enforced by a test](./test/supply-chain.test.ts), not just asserted here. Development
uses TypeScript, vitest and eslint; none of it ships.

The trade-off this buys and costs: `inputSchema` validation is **structural** (parseable,
an object, `type: "object"` at the root, bounded depth and `$ref` count) rather than full
JSON Schema 2020-12 meta-validation, which would need a validator dependency. A schema can
pass this check and still be rejected by a strict validator. That limit is stated in
RULES.md too.

## Contributing

New rules and false-positive reports are equally welcome. A rule needs a stable id, a
`why` that can be checked against the specification, at least two honest
false-positive modes, a remediation, and both a fixture that triggers it and one that must
not. See [RULES.md](./RULES.md) and the servers under [`fixtures/`](./fixtures).

Security issues in **this tool** go to jaamaabruno@gmail.com. For issues found *by* this
tool in someone else's server, see [SECURITY.md](./SECURITY.md).

## License

MIT © Bruno Jaamaa
