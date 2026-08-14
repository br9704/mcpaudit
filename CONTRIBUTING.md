# Contributing

Two kinds of contribution matter most here, and they are equally welcome:

1. **New rules** — a check for something this tool misses.
2. **False-positive reports** — a check that fires on your legitimate server. This is a
   bug of the same severity as a missed detection, and arguably worse: a linter that cries
   wolf gets muted, and then it catches nothing at all.

## Getting set up

```bash
npm ci
npm test          # builds, then runs the suite
npm run lint
npm run typecheck
```

Node ≥ 20. There are **no runtime dependencies** and a test enforces that — if your change
needs one, say why in the PR and expect it to be discussed on those terms.

Try it against the fixtures:

```bash
npm run build
node dist/cli.js "node fixtures/malicious/server.mjs"   # should light up
node dist/cli.js "node fixtures/benign/server.mjs"      # must stay silent
```

## Reporting a false positive

Open an issue with:

- the tool name and the exact text that triggered it (`--json` output is ideal),
- which rule fired,
- why the server is legitimate.

The fix is usually one of: tighten the heuristic, add the case to the rule's documented
`falsePositiveModes`, or add the pattern to `fixtures/benign`. All three are good outcomes.

There is precedent. Auditing the official filesystem server produced four false positives
because the word "clearly" matched the destructive verb `clear` — the matcher had no
trailing word boundary. `fixtures/benign` and the regression tests in
`test/safety.test.ts` exist because of that class of mistake.

## Adding a rule

A rule is a self-describing module. `RULES.md` is generated from the metadata, so writing
the metadata *is* writing the documentation.

```ts
export const meta: RuleMeta = {
  id: "S9_SOMETHING",            // stable; it appears in user output and SARIF
  lane: "safety",                // or "conformance"
  title: "Short, specific",
  why: "What this looks for and why it matters. A maintainer should be able to check " +
       "this against the specification.",
  appliesTo: ["modern", "legacy"],  // eras where the check is meaningful
  defaultSeverity: "warn",
  falsePositiveModes: [
    "At least two. Be honest and specific.",
    "'Might have false positives' is not a false-positive mode.",
  ],
  remediation: "What a server author should actually change.",
  specRef: "https://modelcontextprotocol.io/specification/2026-07-28/...",
  cwe: "CWE-000",                // safety rules: required
  owaspMcp: "Category",          // safety rules: required
};

export const rule: Rule = {
  meta,
  run(ctx) { /* return pass(meta) | fail(meta, findings) | skip(meta, reason) */ },
};
```

Then register it in `src/registry.ts` and run `npm run rules:gen`.

### Requirements for a rule to be merged

- **`appliesTo` is honest.** A check written for `2026-07-28` must not run against
  `initialize`-era servers. Inapplicable checks are skipped with a stated reason, never
  failed — that is what keeps reports believable, since almost every real server today is
  still legacy.
- **Two fixtures**: one that triggers the rule (`fixtures/malicious` or a new fixture),
  and evidence it stays silent on `fixtures/benign`. Both go in the test suite.
- **At least two real false-positive modes.** A test enforces the field is non-empty; a
  reviewer will check that it is also true.
- **Severity is proportionate.** `error` is for a specification MUST or a strong safety
  signal. Reach for `warn` or `low` when the evidence is lexical.
- **Safety rules carry `cwe` and `owaspMcp`.** Enforced by test.

### Anything a rule must never do

- Execute a tool that could change state. Probes call read-only tools with no required
  arguments, or nonexistent ones.
- Emit unescaped server text. Run everything through `sanitizeSnippet` — a server flagged
  for terminal injection must not be able to inject through the report.
- Throw. Return a finding instead; the engine records a throwing rule as an errored check,
  but that is a bug, not a design.
- Make a network call to anything but the target.

## Commit and PR conventions

Explain *why* in the commit body, not just what. If a change was prompted by a real
finding — a false positive, a spec detail, a bug the tests missed — say so; that context
is the most useful thing in the history.

CI runs lint, typecheck and tests on Node 20/22/24, verifies the packed CLI actually runs,
and fails if `RULES.md` is out of date with the code.

## Releasing

Versioning is manual and deliberate; publishing is not.

```bash
npm version patch|minor|major     # bumps package.json and tags
git push --follow-tags            # the tag triggers .github/workflows/release.yml
```

`release.yml` publishes through **npm trusted publishing (OIDC)** from a GitHub-hosted
runner with `id-token: write`. There is no npm token anywhere in the repository or in CI
secrets, and provenance attestations are generated automatically — which is why the
publish step deliberately does *not* pass `--provenance`.

Before tagging: CI green on Node 20/22/24, `RULES.md` regenerated, and the README findings
table re-run if any rule changed.

## Good first issues

Real gaps, in rough order of usefulness:

- **Env-dump detection.** Flag tools that return the entire process environment. The
  official `server-everything` ships `get-env` ("Returns all environment variables"), which
  is a genuine credential-exposure surface. The hard part is not firing on legitimate debug
  tooling — bring a proposed heuristic and a benign counter-example.
- **`--theme <file>`.** The reporter already inherits the ccline design language (ANSI-16
  by index, plain/nerd icon duality). Loading a ccline `.toml` theme directly needs a small
  TOML subset parser, and no runtime dependency is permitted.
- **S8 token passthrough / OAuth metadata SSRF.** Deferred because no live 2026-07-28 HTTP
  server with auth exists to test against. Needs a fixture first.
- **`resources/` and `prompts/` coverage.** Every check today looks at tools. Resource
  descriptions and prompt templates reach the model the same way and deserve the same
  Lane B scrutiny.
- **More `fixtures/benign` cases.** The most valuable contribution in the repo: every
  realistic legitimate pattern added there is a false positive that can never ship.
