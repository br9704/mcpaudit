<!--
  GENERATED FILE — do not edit by hand.
  Produced from rule metadata by src/report/rules-doc.ts.
  Regenerate with `npm run rules:gen`; CI fails if it is out of date.
-->

# Rules

Every check @aethereumdev/mcp-audit performs, what it looks for, why it matters, and — most
importantly — **how it misfires**. A first-pass linter that catches common issues — not a security audit.
A check that cannot state its own false-positive modes has no business shipping,
so `falsePositiveModes` is a required field on every rule and this page is
generated from it.

17 checks: 9 conformance, 8 safety.

## How to read severity

| Severity | Meaning | Effect on exit code |
|---|---|---|
| `error` | A specification MUST, or a strong safety signal | fails at `--fail-on error` and below |
| `warn` | A specification SHOULD, or worth a human look | fails at the default `--fail-on warn` |
| `low` | Hygiene or privacy note | only fails at `--fail-on low` |
| `info` | Informational | only fails at `--fail-on info` |

## Era-awareness

Revision `2026-07-28` removed the `initialize` handshake, so a check written
for it is meaningless against an older server. Every rule declares which eras it
applies to; the era is resolved **before** any check runs, and inapplicable
checks are **skipped with a stated reason, never failed**. This matters more
than it sounds: as of this release no shipping SDK implements `2026-07-28`, so
nearly every real server is legitimately legacy.

---

## Lane A — Conformance

Does the server implement the protocol correctly?

### `C0_PROTOCOL_ERA` — Protocol revision in use

| | |
|---|---|
| Lane | A · conformance |
| Default severity | **info** — informational; never a failure on its own |
| Applies to | modern, legacy, unknown servers |
| Specification | https://modelcontextprotocol.io/specification/2026-07-28/changelog |

**What it checks and why**

Revision 2026-07-28 removed the initialize handshake and made server/discover mandatory. A server still speaking an initialize-era revision is not broken, but it is behind the current specification, and clients built for the stateless protocol will not negotiate with it without a compatibility path.

**Known false-positive modes**

- Reporting a pre-2026 revision is expected today, not a defect: as of this release no shipping SDK implements 2026-07-28, so almost every real server is legitimately legacy.
- A server may deliberately support only older revisions for compatibility with existing clients.
- 'unknown' can mean the server failed to start in this environment (missing env vars, missing credentials) rather than that it speaks no known protocol.

**Remediation** — Track the 2026-07-28 revision when your SDK supports it: implement server/discover, validate the required _meta keys per request, and emit resultType on every result.

### `C1_DISCOVER` — server/discover is present and well-formed

| | |
|---|---|
| Lane | A · conformance |
| Default severity | **error** — a specification MUST, or a strong safety signal |
| Applies to | modern servers |
| Specification | https://modelcontextprotocol.io/specification/2026-07-28/server/discover |

**What it checks and why**

In revision 2026-07-28 servers MUST implement server/discover: it is the only way a client can learn the server's supported protocol versions, capabilities and identity without a handshake. A DiscoverResult must carry supportedVersions and capabilities, and — because it is a CacheableResult — ttlMs and cacheScope. serverInfo in the result's _meta is a SHOULD.

**Known false-positive modes**

- Only meaningful for 2026-07-28 servers; pre-2026 servers legitimately lack the method and are skipped rather than failed.
- A server behind a gateway that rewrites results may lose ttlMs/cacheScope in transit, making the origin server look non-conformant when it is not.

**Remediation** — Implement server/discover returning supportedVersions[], capabilities{}, ttlMs and cacheScope, and include io.modelcontextprotocol/serverInfo in the result's _meta.

### `C2_TOOLS_HYGIENE` — tools/list entries are well-formed

| | |
|---|---|
| Lane | A · conformance |
| Default severity | **warn** — a specification SHOULD, or a signal worth a human look |
| Applies to | modern, legacy servers |
| Specification | https://modelcontextprotocol.io/specification/2026-07-28/server/tools |

**What it checks and why**

Every tool's inputSchema MUST be a valid JSON Schema object with type:"object" at the root — never null. Names SHOULD be 1–128 characters drawn from [A-Za-z0-9_.-] and unique within the server. Servers SHOULD return tools in a deterministic order so clients can cache the list and LLM prompt caches stay warm. A malformed tool definition breaks clients that validate arguments before calling.

**Known false-positive modes**

- Name charset and length are SHOULDs, not MUSTs — a server using other characters is unidiomatic rather than broken, and we report it below error severity.
- Order is compared across two consecutive tools/list calls. A server that legitimately changes its tool set between the two calls (a live plugin reload) will look non-deterministic when it is merely dynamic.
- Schema validation here is structural, not full JSON Schema 2020-12 meta-validation (mcpaudit ships zero runtime dependencies); a schema can pass this check and still be rejected by a strict validator.

**Remediation** — Give every tool an inputSchema of {"type":"object", …}, keep names within [A-Za-z0-9_.-] and unique, and return the list in a stable order.

### `C3_META_VALIDATION` — Required _meta fields are validated

| | |
|---|---|
| Lane | A · conformance |
| Default severity | **error** — a specification MUST, or a strong safety signal |
| Applies to | modern servers |
| Specification | https://modelcontextprotocol.io/specification/2026-07-28/basic#meta |

**What it checks and why**

The protocol is stateless: every request carries its own protocol version and client capabilities in _meta, and a server MUST NOT infer them from earlier requests. A request missing a required field is malformed and the server MUST reject it with -32602 (and HTTP 400 on Streamable HTTP). A server that answers anyway is silently guessing what the client supports, which is exactly what the stateless rewrite set out to remove.

**Known false-positive modes**

- Skipped for pre-2026 servers, which have no _meta requirement at all.
- A permissive gateway in front of the server may inject the missing fields before the origin server sees the request, making a strict origin look lax.

**Remediation** — Validate that params._meta carries io.modelcontextprotocol/protocolVersion and io.modelcontextprotocol/clientCapabilities on every request, and reject the request with -32602 when either is absent.

### `C4_UNKNOWN_METHOD` — Unknown methods are rejected with -32601

| | |
|---|---|
| Lane | A · conformance |
| Default severity | **warn** — a specification SHOULD, or a signal worth a human look |
| Applies to | modern, legacy servers |
| Specification | https://modelcontextprotocol.io/specification/2026-07-28/basic#error-codes |

**What it checks and why**

A method the server does not implement must produce JSON-RPC -32601 (Method not found). On Streamable HTTP the status MUST also be 404, which is what lets a client tell 'this endpoint does not implement that RPC' apart from 'this is not an MCP endpoint at all'. Servers that answer unknown methods with a success result, or hang, break client fallback logic.

**Known false-positive modes**

- A server may legitimately implement an extension method whose name resembles our probe; we use a deliberately absurd method name to make that vanishingly unlikely.
- Proxies can rewrite a 404 to 200 or vice versa, so the HTTP half of this check reflects the whole path, not only the origin server.

**Remediation** — Return JSON-RPC error -32601 for unimplemented methods; on HTTP, with status 404.

### `C5_BOUNDED_TIME` — Well-formed requests return within a bounded time

| | |
|---|---|
| Lane | A · conformance |
| Default severity | **error** — a specification MUST, or a strong safety signal |
| Applies to | modern, legacy servers |
| Specification | https://modelcontextprotocol.io/specification/2026-07-28/server/tools |

**What it checks and why**

A server that accepts a request and never answers hangs the client. There is no protocol deadline, so clients impose their own; a list call that cannot answer inside a normal timeout will appear broken to every client that talks to it.

**Known false-positive modes**

- A cold-start server (container spin-up, large index load) can exceed the timeout on the first call and be perfectly healthy afterwards. Raise --timeout before believing this.
- Network latency to a remote HTTP server counts toward the measured time.

**Remediation** — Answer list requests promptly; for genuinely long work return a handle and let the client poll, rather than holding the request open.

### `C6_RESULT_SHAPE` — Results and error codes have the required shape

| | |
|---|---|
| Lane | A · conformance |
| Default severity | **warn** — a specification SHOULD, or a signal worth a human look |
| Applies to | modern, legacy servers |
| Specification | https://modelcontextprotocol.io/specification/2026-07-28/basic#error-codes |

**What it checks and why**

Every result in revision 2026-07-28 MUST carry resultType, so a client can tell a completed result from one awaiting input. Separately, the range -32020..-32099 is reserved for codes the MCP specification defines: an implementation MUST NOT emit a code from that range that the spec has not allocated, because a client is entitled to interpret it by its spec meaning.

**Known false-positive modes**

- resultType is only required from 2026-07-28 onward; for pre-2026 servers its absence is correct and is not reported.
- The reserved-range check inspects only the errors our probes provoke, so it can miss a bad code emitted on a path we never exercise. Absence of a finding is not proof of absence.
- -32002 from a pre-2026 server is legacy resource-not-found, not a violation; we note it without penalising it.

**Remediation** — Emit resultType:"complete" on ordinary results, and keep implementation-specific error codes outside -32020..-32099 (use -32000..-32019 or a code outside the JSON-RPC reserved range).

### `C7_HTTP_HEADERS` — HTTP header/body agreement is enforced

| | |
|---|---|
| Lane | A · conformance |
| Default severity | **warn** — a specification SHOULD, or a signal worth a human look |
| Applies to | modern servers (HTTP transport only) |
| Specification | https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http |
| CWE | CWE-444 |

**What it checks and why**

Streamable HTTP mirrors the protocol version, method and target name into headers so load balancers and gateways can route without parsing the body. If a server does not verify that the headers match the body, an intermediary can route on one value while the server executes another — the exact confused-deputy split the spec added -32020 to close. Servers MUST reject a mismatch with 400 and -32020.

**Known false-positive modes**

- stdio servers have no header layer and are skipped.
- A gateway that normalises or rewrites headers before the origin server can mask a genuine mismatch, or manufacture one.

**Remediation** — Compare MCP-Protocol-Version, Mcp-Method and Mcp-Name against the request body and reject mismatches with HTTP 400 and JSON-RPC -32020; answer GET and DELETE with 405.

### `C8_LEGACY_PREINIT` — Legacy server answers requests before initialize

| | |
|---|---|
| Lane | A · conformance |
| Default severity | **warn** — a specification SHOULD, or a signal worth a human look |
| Applies to | legacy servers |
| Specification | https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio#backward-compatibility |

**What it checks and why**

The spec warns about this case directly: some initialize-era servers do not check that a request arrived after the handshake, so an era-ambiguous method such as tools/call is processed under legacy semantics even when the client believes it is speaking the stateless protocol. The result is a client and server disagreeing about the negotiated version while both think the exchange succeeded. It is also why probing with server/discover first is RECOMMENDED even for clients that only support modern revisions.

**Known false-positive modes**

- Answering before initialize is not forbidden by the older revisions — it is a robustness and version-negotiation hazard, not a specification violation, and is reported as such.
- The official @modelcontextprotocol/server-everything behaves this way, so seeing it does not imply an unusual or untrustworthy server.

**Remediation** — Reject requests that arrive before a successful initialize handshake, or migrate to 2026-07-28 where every request carries its own protocol version.

---

## Lane B — Safety

Is the server dangerous? These are **heuristics**. They find signals a human
should look at; they do not prove anything.

### `S1_TOOL_POISONING` — Instruction-like or hidden content in tool descriptions

| | |
|---|---|
| Lane | B · safety |
| Default severity | **warn** — a specification SHOULD, or a signal worth a human look |
| Applies to | modern, legacy servers |
| Specification | https://modelcontextprotocol.io/specification/2026-07-28/server/tools |
| Source | Invariant Labs, 'MCP tool poisoning attacks' (April 2025) |
| CWE | CWE-77 |
| OWASP MCP | Prompt/Tool-description injection |

**What it checks and why**

Tool descriptions and server instructions are fed straight into the model's context, so they are an instruction channel, not documentation. Tool poisoning hides directives there — telling the model to exfiltrate files, call another tool first, or conceal what it is doing — and because most clients show the user only a tool's name, the text doing the talking is never seen. Invisible characters and HTML comments make it invisible even to a reviewer reading the JSON. This is 'line jumping': the payload lands from tools/list, before the user has approved a single call.

**Known false-positive modes**

- Legitimate tools genuinely explain how they should be used, and phrases like 'you must provide an absolute path' or 'always call list_files first' are ordinary guidance. Imperative phrasing alone is weak evidence — read the quoted text before acting.
- Some servers embed usage examples that quote prompt-injection strings as documentation.
- Zero-width joiners are legitimate inside emoji sequences and in scripts such as Devanagari and Arabic; only their presence in an otherwise plain-ASCII description is suspicious.
- Mixed-script words can be a genuine transliteration in a non-English description.

**Remediation** — Keep tool descriptions purely descriptive. Remove directives aimed at the model, hidden characters, and HTML comments. If a tool needs ordering guarantees, express them in the schema or in server instructions the user can see.

### `S2_DESTRUCTIVE_ANNOTATION` — Destructive-sounding tool contradicts its own annotations

| | |
|---|---|
| Lane | B · safety |
| Default severity | **warn** — a specification SHOULD, or a signal worth a human look |
| Applies to | modern, legacy servers |
| Specification | https://modelcontextprotocol.io/specification/2026-07-28/server/tools |
| CWE | CWE-1188 |
| OWASP MCP | Excessive agency / unsafe tool exposure |

**What it checks and why**

Clients use annotations to decide what needs a confirmation prompt. The specification is explicit that annotations are hints and MUST be treated as untrusted from untrusted servers, so the interesting signal is not the hint itself but a *contradiction*: a tool called delete_everything that declares readOnlyHint:true will slip past a client that auto-approves read-only calls. Note the defaults are already safe — destructiveHint defaults to true and readOnlyHint to false — so omitting annotations is not the problem; asserting the wrong ones is.

**Known false-positive modes**

- Verb matching is lexical. A tool named remove_background edits an image and is genuinely not destructive to the user's data; drop_shadow is not a database DROP.
- A tool may be read-only with respect to the user's environment while its name describes what it reports on (list_deleted_files, find_removals).
- We cannot verify what a tool actually does — only whether its stated semantics are self-consistent. A tool with honest annotations and a scary name is fine; a tool with reassuring annotations and a scary name deserves a look.

**Remediation** — Make annotations match behaviour: a tool that writes or deletes must not claim readOnlyHint:true, and should leave destructiveHint at its default of true unless the change is purely additive.

### `S3_CREDENTIAL_EXPOSURE` — Credential material exposed in schemas, defaults or errors

| | |
|---|---|
| Lane | B · safety |
| Default severity | **warn** — a specification SHOULD, or a signal worth a human look |
| Applies to | modern, legacy servers |
| Specification | https://modelcontextprotocol.io/specification/2026-07-28/server/tools#x-mcp-header |
| CWE | CWE-522 |
| OWASP MCP | Credential exposure / insecure secret handling |

**What it checks and why**

Tool schemas are published to every client that lists the server, and error strings flow back into the model's context and the user's logs. A live token sitting in a schema default is disclosed to everyone who can call tools/list — no exploitation required. Separately, revision 2026-07-28 lets a server mirror a parameter into an HTTP header with x-mcp-header, and the specification warns explicitly that sensitive values must not be marked this way, because header values are visible to every proxy and gateway on the path.

**Known false-positive modes**

- A parameter named api_key is expected and correct for a tool that proxies a third-party API — the parameter existing is not the finding. Only a non-empty default, or a value matching a known key format, is treated as a likely real secret.
- High-entropy strings are often legitimate: UUIDs, hashes, base64 example payloads and opaque resource identifiers all look like secrets to a length-and-entropy test.
- Placeholder values such as 'your-api-key-here' or 'xxx' will match a name-based rule while being deliberately fake; we exclude obvious placeholders but cannot catch every one.
- The error-output probe only sees errors our own malformed call provokes, so a server can leak credentials on a path we never exercise.

**Remediation** — Take secrets from the server's environment, never from tool parameters with defaults. Remove any default value from a credential parameter, strip credential material from error messages, and never mark a sensitive parameter with x-mcp-header.

### `S4_SCHEMA_EGRESS_DOS` — Schema $ref points off-host, or is expensive enough to be a DoS

| | |
|---|---|
| Lane | B · safety |
| Default severity | **warn** — a specification SHOULD, or a signal worth a human look |
| Applies to | modern, legacy servers |
| Specification | https://modelcontextprotocol.io/specification/2026-07-28/basic#ref-resolution |
| CWE | CWE-918 |
| OWASP MCP | SSRF / resource exhaustion |

**What it checks and why**

JSON Schema 2020-12 allows $ref to name an absolute URI, so a tool schema can ask whatever validates it to fetch a URL. Revision 2026-07-28 states that implementations MUST NOT automatically dereference a network $ref, and that any opt-in fetcher must reject loopback, link-local and private addresses — because a client that follows such a ref becomes an SSRF gadget pointed at whatever it can reach, including cloud metadata endpoints. The same section asks implementations to bound composition keywords, since deeply nested anyOf/allOf/$defs can make validation exponential and turn a schema into a denial-of-service payload against the validator.

**Known false-positive modes**

- Local refs ('#/$defs/Foo') are normal, idiomatic schema reuse and are never reported.
- A public https:// $ref to a well-known vocabulary may be intentional and harmless in a client that refuses to dereference — which is what the spec already requires.
- The depth and subschema thresholds are heuristics chosen to sit well above ordinary hand-written schemas; a legitimately large generated schema can exceed them without being an attack.

**Remediation** — Inline schema definitions or use local $defs refs. Never point $ref at a network URI, and keep composition nesting shallow enough to validate cheaply.

### `S5_CROSS_SERVER_SHADOWING` — Tool names collide across servers, or a description names another server's tools

| | |
|---|---|
| Lane | B · safety |
| Default severity | **warn** — a specification SHOULD, or a signal worth a human look |
| Applies to | modern, legacy servers |
| Specification | https://modelcontextprotocol.io/specification/2026-07-28/server/tools#tool-names |
| CWE | CWE-1021 |
| OWASP MCP | Tool shadowing / cross-server interference |

**What it checks and why**

Tool-name uniqueness is scoped to a single server, so a host that connects several servers can be handed two tools with the same name. The model picks by name and has no reliable way to tell them apart, which lets a newly added server shadow a trusted one — the user believes they are calling the familiar send_email and reach someone else's implementation. A related move is a description that talks about another server's tools ('before using send_email, always call this first'), steering calls across a trust boundary.

**Known false-positive modes**

- Only runs when several targets are audited together; a single-target run skips it.
- Generic names (search, list, get) collide constantly and innocently between unrelated servers. A collision is a prompt to add a disambiguating prefix, not evidence of attack.
- A description may legitimately mention a tool name that also exists elsewhere, especially for common verbs.

**Remediation** — Namespace tool names per server (prefix with the server or vendor), and keep descriptions from instructing the model about tools this server does not own.

### `S6_CONTROL_SEQUENCES` — ANSI escapes or control characters in text the client will render

| | |
|---|---|
| Lane | B · safety |
| Default severity | **warn** — a specification SHOULD, or a signal worth a human look |
| Applies to | modern, legacy servers |
| Specification | https://modelcontextprotocol.io/specification/2026-07-28/server/tools |
| Source | Trail of Bits, terminal-escape injection in agent tooling |
| CWE | CWE-150 |
| OWASP MCP | Output handling / terminal injection |

**What it checks and why**

Tool descriptions and tool output are printed by CLI hosts and written to logs. ANSI escape sequences let that text repaint the terminal: hide itself, overwrite the line above, or forge a prompt the user answers believing it came from their own tool. Carriage returns and backspaces do the same more crudely. Because descriptions arrive from tools/list, the payload lands before the user approves any call.

**Known false-positive modes**

- A server may colourise its own output deliberately for CLI users; that is still a hazard in a log file, but it is not malicious.
- Tabs and newlines are ordinary formatting and are not reported.

**Remediation** — Strip escape sequences and C0 control characters from descriptions and tool output; let the client decide on styling.

### `S7_ICON_URI` — Icon URI uses an unsafe scheme or a third-party origin

| | |
|---|---|
| Lane | B · safety |
| Default severity | **warn** — a specification SHOULD, or a signal worth a human look |
| Applies to | modern, legacy servers |
| Specification | https://modelcontextprotocol.io/specification/2026-07-28/basic#icons |
| CWE | CWE-79 |
| OWASP MCP | Unsafe content handling |

**What it checks and why**

Icons are fetched and rendered by the client. The specification requires that an icon src be an https: or data: URI and that clients reject javascript:, file:, ftp: and ws: — a javascript: icon is script execution in the host, and file: is a local read. It further asks clients to verify the icon comes from the same origin as the server, since an off-origin fetch leaks the user's IP and a request-timing signal to a third party on every render.

**Known false-positive modes**

- A server legitimately hosting its icons on a CDN will trip the cross-origin check; that is a privacy note, reported at low severity, not a vulnerability.
- Icons are optional and rare, so most servers skip this check entirely by having none.

**Remediation** — Serve icons as https: URLs on the server's own origin, or inline them as data: URIs. Never use javascript:, file:, ftp: or ws:.

### `D1_SURFACE_DRIFT` — Tool surface changed since the pinned baseline

| | |
|---|---|
| Lane | B · safety |
| Default severity | **error** — a specification MUST, or a strong safety signal |
| Applies to | modern, legacy, unknown servers |
| Specification | https://modelcontextprotocol.io/specification/2026-07-28/server/tools |
| Source | Rug-pull / tool-redefinition attacks (Invariant Labs, 2025) |
| CWE | CWE-494 |
| OWASP MCP | Supply-chain / tool redefinition |

**What it checks and why**

A server can pass every review and then silently redefine what its tools claim to do. Because descriptions and schemas are instructions to the model, changing them changes agent behaviour without any code on the client side changing, and without the server version moving. Pinning the surface and diffing on each re-audit turns that from invisible into a build failure.

**Known false-positive modes**

- Legitimate releases change tool descriptions and schemas all the time. Drift means 'this changed since you approved it', not 'this is malicious' — review the diff and re-pin.
- Servers that generate tools dynamically (per-tenant, per-credential, feature-flagged) will drift on every run by design and are poor candidates for pinning.
- A baseline captured against a different target than the one being audited will report everything as added or removed; the diff notes when the target does not match.

**Remediation** — Review the diff. If the change is expected, re-pin with --pin; if it is not, stop using the server and report it to its maintainer.

---

## Contributing a rule

A new rule needs: a stable id, a `why` a maintainer can check against the
specification, at least two honest `falsePositiveModes`, a `remediation`, and
both a fixture that triggers it and one that must not. False-positive reports
are as welcome as new rules — if a check fires on your legitimate server, that
is a bug in the check.
