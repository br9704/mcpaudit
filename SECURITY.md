# Security policy

Two different things live here: reporting a problem **in mcpaudit**, and what we do when
mcpaudit finds a problem **in someone else's server**.

## Reporting a vulnerability in mcpaudit

Email **jaamaabruno@gmail.com**. Please do not open a public issue for a security problem
in this tool.

Include what you did, what happened, and what you expected. You will get an
acknowledgement within 5 working days. If the report is valid, we will agree a fix window
with you and credit you in the release notes unless you would rather we did not.

The realistic threat model for a linter is worth stating plainly, because it shapes what
counts as a vulnerability here: **mcpaudit connects to servers that may be hostile.** It
spawns a process you name, or POSTs to a URL you name, and then parses whatever comes
back. Things we consider vulnerabilities:

- a malicious server causing mcpaudit to execute code, write files, or make network
  requests other than to the target;
- a malicious server escaping the report — for example, getting raw ANSI escapes into
  terminal output, so a server flagged for terminal injection could inject through the
  report flagging it (findings are escaped by `sanitizeSnippet`, and this is tested);
- a crafted target string smuggling shell metacharacters into process spawning (we spawn
  with `shell: false` and a hand-written tokenizer, and this is tested);
- unbounded memory or time consumption from a hostile response (there are caps on line
  length, body size and schema depth, exercised by `fixtures/hostile`).

## Disclosure policy for findings in third-party servers

If mcpaudit finds something genuinely serious in a server that is not ours, we do not
publish it first.

1. **Report privately to the maintainer**, with the finding, the raw `--json` output, and
   the exact version and command used to reproduce it.
2. **Give a reasonable fix window** — 90 days by default, shorter only if the issue is
   already public or actively exploited, longer if the maintainer is engaging and needs
   it.
3. **Name it generically until it is patched.** Anything published in the meantime says
   "one audited server exposed credentials in error output", not which one.
4. **De-generalise only after a public fix**, and credit the maintainer's response.

This policy binds the project's own launch material too. The findings table in the README
is subject to it: nothing gets named for the sake of a better demo.

### As of the current release

**No serious finding has been made in any third-party server, and no disclosure is in
flight.** The servers in the README table were audited with their maintainers' work
already public; every finding is a spec-currency or hygiene observation that any reader
can reproduce in one command. Nothing was withheld, because there was nothing to withhold.

### If you are a maintainer who disagrees with a finding

Open an issue. A check that fires on a legitimate server is a bug in the check, and
false-positive reports are treated with the same priority as new rules. Every rule
documents its own false-positive modes in [RULES.md](./RULES.md) precisely so this
conversation starts from a shared understanding of what the check can and cannot see.

## Scope limits

mcpaudit is **a first-pass linter that catches common issues — not a security audit.** A
clean report means no common issue was detected by a documented set of heuristics. It is
not evidence that a server is safe, and it should not be cited as such.
