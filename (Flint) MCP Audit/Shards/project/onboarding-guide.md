---
id: 3c3b2317-6d2d-45bf-a5c2-33d991284b10
title: "onboarding-guide"
type: "note"
project: "MCP Audit"
tags:
  - "#note"
  - "#project"
  - "#ld/living"
  - "#stack/node"
  - "#status/shipped"
  - "#cluster/personal"
status: shipped
created: "2026-08-17"
updated: "2026-08-17"
source_path: "/Users/brunojaamaa/Desktop/mcpaudit"
---

# onboarding-guide

**Produce a briefing for someone who has never seen mcpaudit, in under an hour.** Run this
when a new agent or a new contributor arrives, or when the project has been dormant long
enough that its own author needs a re-read.

## The 20-minute path

Read these in order. Nothing else.

1. [[(Report) Project Summary]] - the whole project on one page.
2. [[(Note) What mcpaudit Is]] - what it audits and why that is a real problem.
3. [[(Note) System Architecture]] - the pipeline, with the diagram.
4. [[(Note) Honest State]] - what is finished, what is not, what is only tested against
   fixtures.
5. [[(Note) Command Surface]] - every flag, and the `--pin=path` gotcha.

## Then, depending on what they are here to do

| They want to | Send them to |
|---|---|
| Write a rule | [[(Note) The Rule Model]], then [[(Note) Fixture Servers]], then `CONTRIBUTING.md` in the repo |
| Fix a false positive | [[(Note) Rule Catalogue]], then the generated `RULES.md`, then `test/safety.test.ts` |
| Understand a finding | [[(Note) Audited Reference Servers]], then the raw JSON under `audits/` |
| Ship a release | [[(Note) Release and CI]]. Note the trusted publisher is still unconfigured |
| Argue with a decision | [[(Note) Locked Decisions]] first. Most of them have already been argued |

## Run it before reading more

```bash
cd /Users/brunojaamaa/Desktop/mcpaudit
npm ci && npm run build
node dist/cli.js "node fixtures/benign/server.mjs"      # clean - exit 0
node dist/cli.js "node fixtures/malicious/server.mjs"   # 12 error, 10 warn - exit 1
```

No network needed. Seeing both ends of the range takes a minute and saves an hour of reading.

## The five things that surprise people

1. **The tool has zero runtime dependencies**, and a test enforces it. That constrains every
   other decision, including why schema validation is structural.
2. **The era is resolved before any check runs.** A check that does not apply is skipped with a
   reason, never failed. Without this the tool would look broken against every real server.
3. **`RULES.md` is generated.** Editing it by hand fails CI.
4. **The client never throws.** A hostile server is data, not an exception.
5. **It calls itself a linter on every page**, deliberately, and that framing is load-bearing.

## Hard rules to state up front

Read-only outside the vault. Never open `.env*`, `*.pem`, `*.key`, `.mcp.json`,
`.cursor/mcp.json`, `.vscode/mcp.json` or `opencode.json`. **REPO WINS OVER NOTE.** Order of
trust: `masterplan.md` then `CLAUDE.md` then this vault, and the code above all of them.

## Related

[[(System) Flint Init]] · [[vault-audit]] · [[codebase-map-refresh]] · [[(Map) Master Map]]
