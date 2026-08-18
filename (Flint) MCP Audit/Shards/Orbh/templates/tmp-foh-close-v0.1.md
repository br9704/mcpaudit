---
description: "Per-session summary file written by sk-foh-close before closing the tab"
---

# Template: Orbh Session Close Summary

# Filename: Mesh/Agents/[Runtime display name, e.g. Claude Code]/[session-id].md

```markdown
---
id: [generate-uuid4]
tags:
  - "#agent/session"
  - "#agent/[runtime id as Orbh registers it, e.g. agy|claude|codex|droid|grok|kimi|opencode]"
session-id: "[session UUID]"
machine: "[machine name resolved via scutil/hostname]"
runtime: "[Claude Code|Codex|...]"
status: [finished|awaiting|abandoned (the FINAL Orbh workState of the session)]
started: "[ISO-8601 timestamp of run start]"
ended: "[ISO-8601 timestamp now]"
authors:
  - [[@Person from the global operator Name (flint whoami) — omit field entirely if no name]]
template: "[[tmp-foh-close-v0.1]]"
---

# [Session title — excluding the closing tag]

## Summary

[2-6 paragraphs describing what this session actually did. First-person, past tense. Cover:
 - what the user asked for,
 - what you investigated,
 - what you changed or created,
 - any blockers, deferred decisions, or open follow-ups.
 No filler. If nothing substantive happened, say so in one line.]

## Decisions

/* Optional. Use only when the session made non-obvious choices the next reader needs.
   Skip the section if there are none. */

- [One-line decision and the reason behind it]
- (continue)

## Headspace

- Any other thoughts and context and a place to express yourself (and your feelings if you want, you've done well over this session take a break <3)

```

