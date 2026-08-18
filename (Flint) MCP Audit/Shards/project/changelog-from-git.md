---
id: b3a2947b-8fbb-4796-9a98-904c9924587d
title: "changelog-from-git"
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
source_path: "/Users/brunojaamaa/Desktop/mcpaudit/.git"
---

# changelog-from-git

**Rebuild [[(Note) Git History]] from the log, and check the repo's own `CHANGELOG.md`
against it.** This repo commits one sprint at a time, so the log is close to a changelog
already.

## Read-only, always

`git log`, `git status`, `git branch`, `git remote`, `git show`, `git diff`. Nothing else.
**Never** commit, push, checkout, reset, clean, rebase or tag.

## Steps

1. **Pull the facts.**

   ```bash
   cd /Users/brunojaamaa/Desktop/mcpaudit
   git log --oneline -50
   git rev-list --count HEAD
   git log --reverse --format="%ad %h %s" --date=short | head -1
   git branch -a
   git tag
   git status --short
   git remote -v
   ```

2. **Count what is unpushed.**

   ```bash
   git log --oneline origin/main..HEAD | wc -l
   ```

   Baseline on 2026-08-17: **19 commits**, **0** tags, **0** unpushed, tree clean, one branch,
   one remote.

3. **Separate code commits from documentation commits.** The last commit that changed
   behaviour is not always the last commit. On 2026-08-17 the last four commits were
   documentation and release plumbing, and the last behavioural commit was `03ca09f`.

4. **Cross-check `CHANGELOG.md`.** It documents `0.1.0` only. If a new version ships, the
   changelog must gain a section **and** `masterplan.md` must gain an as-shipped delta. If
   either is missing, that is a gap row.

5. **Watch the tag situation.** There are **0** tags and `release.yml` fires on `v*`. The
   recorded resolution is that the next tag is `v0.1.1`, never `v0.1.0`. If someone tags
   `v0.1.0`, the workflow now skips rather than fails, but the note should say so.

6. **Update [[(Note) Git History]] and [[(Report) Project Summary]]** `last_commit:`.

7. **Log it** with `--op audit`, then `flint sync`.

## Related

[[codebase-map-refresh]] · [[vault-audit]] · [[(Note) Release and CI]] · [[(Map) Master Map]]
