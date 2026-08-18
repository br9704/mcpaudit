---
description: "Default note — base untyped model, differentiated by tags"
---

# Filename: Mesh/[Note Title].md

/* Notes are the base unit of free-form content in a Flint — an untyped model.
   They are differentiated by tags, not folders or naming conventions.
   Use this template when no typed artifact or subtype (concept, record) fits yet.
   Promote to `#note/concept` or `#note/record` — or extract into a typed artifact —
   when structure pays off. See [[knw-f-models]].
*/

```markdown
---
id: [generate-uuid]
tags:
  - "#note"
[agent]-sessions:
template: "[[tmp-f-note-v0.1]]"
authors: /* from the global operator Name (flint whoami); omit if no name set */
  - "[[@Person Name]]"
---

[The note content — free-form prose, lists, or mixed. No required structure.]

## Links

- [[related concept or artifact]]
- (continue)
```
