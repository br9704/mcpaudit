---
description: "Complete template syntax reference for reading and generating artifacts"
---

# Knowledge: Template Syntax

Complete reference for reading and generating content from Flint templates. Templates are instructions for agents — they define the structure and format of artifacts.

## What Templates Are

A template is a markdown file that describes how to create an artifact. It is NOT a copy-paste scaffold. 

Templates contain:

```markdown, @tmp-<shorthand>-<name>-<version>.md
# File: Location/To/File Name.md

\`\`\`markdown

*Template instructions*

\`\`\`
```

- A **filename pattern** showing where and how to name the output file
- **Agent comments** (`/* */`) explaining intent and rules
- **Placeholders** (`[instruction]`) that agents replace with generated content
- **Structure** that the generated artifact should follow

Templates live in `Shards/[Name]/templates/` and are referenced by their filename stem (e.g., `tmp-proj-task-v0.1`).

## Reading a Template

When you encounter an artifact with a `template` field in its frontmatter:

```yaml
template: "[[tmp-proj-task-v0.1]]"
```

1. Search for a file named `tmp-proj-task-v0.1.md` in any shard's `templates/` folder
2. Read the template to understand the artifact's structure
3. Use the template's patterns to guide any edits or additions

## Template Syntax Reference

### Placeholders: `[instruction]`

Square brackets contain instructions for the agent. The agent generates text and removes the brackets.

```markdown
Template:    [Brief description of the task context]
Output:      This task implements the new authentication flow for the API.
```

The instruction inside brackets describes what to generate. It can be a simple prompt or a detailed directive:

```markdown
[Core assertion or concept definition in 1-3 sentences]
[Paragraph(s) description of the context of this task]
[Agent or human reports implementation progress]
```

**Rules:**
- Generated text has NO brackets
- Follow the instruction's guidance for tone, length, and content
- If the instruction says "1-3 sentences", write 1-3 sentences

### Enum Options: `[option1|option2|...]`

Pipe-separated options inside brackets mean "pick one":

```markdown
Template:    status: [draft|todo|in-progress|review|done|deprecated]
Output:      status: draft
```

### Options with Descriptions: `[option1 (desc)|option2 (desc)]`

Parenthetical descriptions explain the options but are NOT included in output:

```markdown
Template:    priority: [low (nice-to-have)|medium (should do)|high (must do)]
Output:      priority: medium
```

The `(desc)` is for the agent's understanding only.

### Hyperlinks: `[[instruction]]`

Double brackets generate Obsidian-style wikilinks:

```markdown
Template:    increment: [[parent increment hyperlink to file]]
Output:      increment: [[Increment 3.16.0 - Shard Registry]]
```

```markdown
Template:    - [[Related document(s)]]
Output:      - [[Task 104 Implement shard pull]]
```

The generated link should be the exact title of the target markdown file (without the `.md` extension).

#### Important! 

When in YAML, the hyperlinked must by wrapped in quotation marks. 

```markdown
---
hyperlink: "[[hyperlink]]"
---
```

### Continue: `(continue)`

Parenthetical "continue" means "repeat the preceding pattern if there are more items":

```markdown
Template:
- [ ] [Specific requirement]
- (continue)

Output:
- [ ] Support GitHub URLs
- [ ] Support GitLab URLs
- [ ] Handle private repos with SSH keys
```

If there are no more items to add, stop. `(continue)` is permission, not obligation.

### Comments: `/* */`

Agent-only instructions that should NOT appear in the generated output:

```markdown
/* This section is added when archiving */
/* Get numbered IDs with: flint helper type newnumber Task */
/* If Increments shard is installed: */
```

Comments can span multiple lines:

```markdown
/*
   TITLE RULES:
   - The title IS the concept
   - Concept-oriented, not source-oriented
   - Good: "Context windows limit agent memory"
   - Bad: "Notes from meeting"
*/
```

### Code Fences in Templates

Templates use code fences to wrap the template body. The outer fence shows the raw template content. When generating an artifact, produce only the content inside the fence — not the fence itself.

```markdown
# Filename: Mesh/Types/Tasks/(Task) XXX [Name].md

\`\`\`markdown
---
yaml
---

body
\`\`\`
```

The agent creates a file at the specified path with the content between the fences, replacing all placeholders.
## Template Conventions

### The `template` Field

Every artifact created from a template includes a `template` field in its frontmatter:

```yaml
template: "[[tmp-proj-task-v0.1]]"
```

This is the filename stem of the template (without `.md`). It creates a permanent link between the artifact and its template definition.

### Session Tracking

Templates include `orbh-sessions` as a placeholder:

```yaml
orbh-sessions:
  - "[[agent-session-uuid]]"
```

Add your session ID when creating or substantively editing an artifact:

```yaml
orbh-sessions:
  - "[[154d8abd-6089-4b1d-9969-6cb51dfe926b]]"
```

### UUID Generation

`[generate-uuid4]` means generate a valid UUID v4 for the `id` field. Every artifact gets a unique ID.

### Frontmatter Status

Templates define available statuses as enum options. The initial status is typically the first option or is specified by the skill/workflow that invokes the template.

## Common Patterns

### Numbered Artifacts

Most typed artifacts use zero-padded numbers:

```bash
flint helper type newnumber Task    # Returns: 076
```

The template filename pattern shows how to use it:

```
# Filename: Mesh/Types/Tasks/(Task) XXX [Task Name].md
```

`XXX` = the 3-digit number from the helper command.

### Conditional Sections

Templates sometimes include conditional markers:

```markdown
/* If Increments shard is installed: */
increment: [[parent increment hyperlink]]
```

Only include these fields if the condition is met. Check what shards are installed.

### State Transitions

Templates define the initial state. State transitions are documented in the shard's init file (e.g., `draft → todo → in-progress → done`). Skills and workflows handle transitions.
