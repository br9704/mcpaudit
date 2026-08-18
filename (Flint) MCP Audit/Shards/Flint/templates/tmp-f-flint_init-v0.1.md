---
description: "Flint Init system file structure"
---

# Filename: Mesh/(System) Flint Init.md

/* This is the workspace overview file. It's the first thing every agent reads when starting a session.
   It should provide a complete, concise overview of what this Flint is about and how to navigate it.

   This file is installed with `once: true` — it gets created once, then maintained by agents using
   [[sk-f-init_update]] and [[sk-f-init_full_update]].
*/

```markdown
---
id: [generate-uuid4]
tags:
  - "#f/init"
---

/* Flint-specific instructions go here — anything unique to this workspace that agents need to know and . */

# [Flint Name]

[detailed paragraph description of what this Flint is about and its primary purpose. Try to make this timeless. We don't want to update this very often]

## [Monorepo|Repo] Overview

/* If the Flint relates to a codebase, describe the codebase structure here. */

[Description of the codebase structure, key packages, and how they relate. Include a reference to the rf-\* which references the path to repo]

(continue if there are more than 1 repo etc)

# Entry

[Here you can add hyperlink references to important files inside of the flint, the describe what they are]

- [[hyperlink]]
	- [describe what this is, a summary etc]
(continue)

```
