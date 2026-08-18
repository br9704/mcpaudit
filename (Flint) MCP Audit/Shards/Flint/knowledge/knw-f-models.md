---
description: "Models framework — two axioms, Information Environments, orthogonal traits, records, composition"
---

# Knowledge: Models

The conceptual foundation for everything a Flint captures, composes, or produces. Read this before working on types, shards, templates, or extraction. Source: `(Notepad) 143 Semantic Memory in NUU Cognition`. Nothing here is closed — this is a working stance.

## Two Axioms

> **Axiom 1.** One shared external reality exists. Take it as given.
>
> **Axiom 2.** Minds construct models. Sensors bring information in; models are built from that information. There is no unmediated access to reality — only models about it.

Everything inside a Flint is a model — including this document, including the shards, including the types. A Flint is the thinking technology minds (human or LLM) use to build, share, refine, and operate on models.

**No third layer.** There are no categories in the world. Any category we use is itself a model we built for a purpose. "Record," "task," "concept," "mandate" are engineering choices that grant affordances, not discoveries about reality.

## Information Environments

A model means something only inside an **Information Environment (IE)** — a mind or mind-like context that knows how to interpret it. The same model in a different IE means differently, or means nothing.

Examples of Information Environments:
- A human mental state at a moment
- An LLM context window at a moment
- A shard's loaded init + knowledge + templates
- A `CLAUDE.md` informing an agent
- A notepad's accumulated prior turns
- A hypothetical IE declared inside the Flint (e.g. `(IE) Future Maintainer, 6 months from now`)

**Models don't travel alone.** When you write an artifact, you are writing into an expected IE. When you read one, you are loading into your current IE. Portability requires either carrying the IE with the model or documenting the IE it assumes. An IE is itself a model — a model of "what a mind holds at a moment." The recursion is legitimate and bottoms out in shared reality.

## The Record Spectrum

**Records are models at the capture end of a spectrum.** They are not a separate category. There is a continuum from pure transcription to pure synthesis, and every artifact sits somewhere on it.

### The Capture-vs-Synthesis Spectrum

| End | Meaning | Examples |
|-----|---------|----------|
| **Transcription** | Minimal semantic derivation by the producer; meaning originates elsewhere | Microphone audio, VTT transcript, OCR, sensor log, commit log, photograph |
| **Synthesis** | Heavy semantic derivation by an open-ended mind | Concept note, spec, policy, essay, design doc |

The useful cut: **did the semantic meaning come from an open-ended mind deriving it, or was it captured without derivation?** A stenographer transcribing a speech is capturing — the meaning originates in the speaker. A journalist composing an article is synthesizing. The spectrum's position reflects **intent + achieved purity**.

### Containment ≠ Identity

A note containing records is still a model. Records nested inside a model are **atoms** that can be refactored out into their own pure-record files via markdown hyperlinks whenever that pays off. The hyperlink system is the magic: you never need a "composite" category — just model-with-embedded-records, with **refactor-on-demand** as a first-class operation.

### The Two Layers Inside Any Record

Every capture has two layers, and only one is actually recorded:

- **Event layer** — the fact that the capture happened. "A microphone was here at time T and captured these waveforms." Evidentiary.
- **Content layer** — the semantic meaning inside the captured bytes. "The sky is red." A claim the speaker made, not a claim the record itself makes.

A meeting transcript attests that certain words were said, not that those words are true. This matters for grounding: records are **event-grounded** by default, and only **reality-grounded** when the claim being made is *about the utterance itself* (or when the captured content *is* the reality — a commit log, a sensor reading).

## Representational Traits (Optional, Orthogonal)

Every model sits somewhere in a multi-dimensional space. The axes below are **optional orthogonal traits** — declare them when they buy an affordance, omit them otherwise. None is privileged. None is required. New traits can be added when repeated use reveals a missing axis; existing traits can be dropped when they stop paying off.

### Primitives That Recur Across Many Models

| Trait | Values | What it captures | Enables |
|-------|--------|------------------|---------|
| **Time** | past / present / future | Where the content points in time | Temporal queries; future-described collapses to prediction |
| **Epistemic state** | described ↔ predicted (spectrum) | How much is directly known vs inferred under gap | Separating claims-with-evidence from claims-under-uncertainty |
| **Scale** | universe … atom (continuum) | How big a slice of reality the model covers | "Zoom level" — the forest vs a single tree |
| **Resolution** | coarse ↔ fine (continuum) | Information density at a fixed scale | 100 words on the forest vs 2000 words on the forest |
| **Abstraction** | near reality ↔ far from reality (continuum) | Reference-chain distance to a record | Verification depth; walking back to grounding |
| **Aliveness** | active / stabilized / retired / superseded | Whether the artifact is still being updated | Staleness detection; retirement workflows |
| **Capture ratio** | high ↔ low (spectrum) | Position on the capture-vs-synthesis axis | Treating record-leaning notes as more grounding-terminal |
| **Grounding** | reality-grounded / event-grounded / axiomatic / floating | How the claims anchor to shared reality | Verification; flagging floating models |
| **Commitment** | draft / working / endorsed / canonical | How strongly the producer binds to the claim | Trust calibration by readers |

**Scale and resolution are different.** Scale is how big your slice of reality is. Resolution is how densely you describe that slice. 100 words on the ecosystem and 100 words on a single tree are at different scales but similar resolution. 100 words on the forest and 2000 words on the forest are at the same scale but different resolution.

**Prediction is not about time.** Predictions can be about past, present, or future — it is reasoning under an information gap. Only the `future × described` cell is structurally impossible; the future column collapses to prediction-only. That is a consequence of the axes, not a rule.

### How Traits Are Applied

- **Opt-in.** A bare note has no traits. A richly-instrumented spec may have many. Most models have a few.
- **Declarable as frontmatter, inferable from links, or left implicit.** Whichever is cheapest for the affordance needed. Don't declare what can be inferred.
- **Extensible.** A shard can introduce a new trait when it has a genuine use. The trait registry is a living catalog, not a fixed taxonomy.
- **Composable.** Traits can stack. A model can be `past × described × fine-resolution × retired`. Stacking is not a conflict; it's the point.

## Composition Over Categorization

**The central move.** Do not categorize models into types. Compose models from traits. Let types **emerge** as named clusters of useful recurring compositions.

- `(Task)` is not "a category of thing" — it is a named composition (future-predicted + prescribed outcome + lifecycle states) that delivers a specific output: work done.
- `(Mandate)` is a named composition (timeless-predicted + enforced + durable commitment) that delivers a specific output: constraint on behavior.
- `(Record)` is a named composition (past-described + immutable + grounding-terminal) that delivers a specific output: grounding.

If you find yourself asking "what category does this belong to?" — stop. Ask instead: "what traits describe this, and does a named composition already exist for that pattern?"

## Types as Tools, Not Truths

Types are **engineering choices** that grant affordances. They are not discoveries about the world. Consequences:

- Types can be added, deprecated, merged, or split freely when affordances change.
- A new type exists because it **produces a specific output** the system needs. If no operation improves by adding the type, don't add it.
- The type library is itself a thinking technology under continuous maintenance.
- There is no canonical set of types. Different Flints have different type libraries. That is correct.

This is the **Entity-Component-System / trait / protocol** pattern from software: a base type (`model`), composable traits (`#record`, `#task`, `#concept`), optional fields, duck-typed operations. Agents operate on what a model *implements*, not on what it is named.

## Structure Is Opt-in and Lossy

Typing is applied **progressively**, when it pays off. Models can be:

- **Untyped** — a bare note, a notepad section, loose prose
- **Partially typed** — a note with some frontmatter or a single tag
- **Fully typed** — a typed artifact following a template

Lossiness is not a flaw. Structure deliberately drops information to make the remaining information operable. The question is never "is this capture complete?" — it is "does this structure enable the operations we need?"

**Premature typing is a cost, not a virtue.** Add a trait at the moment it pays for itself.

## Usefulness Is The Only Test

A model, a type, or a structural choice is justified by **what it lets a mind do** — not by correctness, completeness, or elegance.

- If a structure helps verify, compose, retrieve, extract, or act — keep it.
- If a structure is precise but unused — drop it.
- If a structure helps humans but not LLMs (or vice versa) — know which IE you are designing for.

## Continuum of Abstraction

There are no discrete abstraction levels. Reality sits at distance zero. A photograph sits at a short distance. A concept sits farther. A meta-concept sits farther still. But the intervals are **continuous and often multi-dimensional** — abstraction interacts with scale, with time, with capture-ratio.

**Engineering consequence.** Do not require artifacts to declare a numeric "abstraction level." Let distance-from-reality be **inferred from the reference chain** — how many hops to a record, what kind of hops, how much each composes or reduces. When you need the distance, walk the chain.

## Operations on the Reality-Model Boundary

A non-exhaustive list of operations a Flint already supports or implies. New operations become new types or skills when they prove useful.

| Operation | Meaning |
|-----------|---------|
| **Capture** | Reality → record. Sensors, transcripts, logs. Mind-as-tool cases (VTT, form fill) sit here. |
| **Description** | An observer's model of current reality. Measurement, field notes. |
| **Prediction** | Reasoning under information gap. Past, present, or future. |
| **Prescription** | Prediction plus commitment. Mandates, goals, plans. |
| **Composition** | Models built from other models. Ideally grounds in records eventually. |
| **Extraction** | Pulling a focused model out of a composite source (e.g., notepad → concept). |
| **Refactor-out-record** | Extracting a record-atom embedded in a model into its own pure-record file. Inverse of extract-concept: concepts crystallize upward (more abstract); records crystallize downward (more raw). |
| **Retirement** | Marking a model's relationship to reality as closed — spent, deprecated, superseded. |
| **Supersession** | Replacing a model at its coordinate with another at a slightly-moved coordinate. |
| **Re-interpretation** | Loading a model into a different Information Environment to produce a different reading. |

## How This Differs From Philosophy

This is **not** classical ontology. The cut is sharp:

| | Philosophy | Thinking technology (what we build) |
|---|---|---|
| Goal | Correctness about the world | Utility in doing work |
| Success | Theory matches reality | Tool helps a mind or LLM act |
| Failure mode | Useless precision | Useless imprecision |
| Method | Conceptual analysis, argument | Composition, iteration, usage |
| Categories | Discovered | Engineered |
| Lossiness | Flaw to eliminate | Feature to embrace |
| Closure | System aims to be complete | System is expected to evolve forever |
| Medium | Language and logic | Markdown + LLMs + CLI + humans |

Philosophy asks *what is X?* We ask *what can we do with X?* We take the distinctions philosophy gives us (time, knowledge, evidence, prediction) and repurpose them as engineering material. We are not trying to settle the problems philosophy is trying to settle.

## Thinking Technology

A Flint is a **thinking technology** — structure that helps minds do work. It is not a memory system, not a knowledge graph, not a database. It:

- Takes infinite, messy, unstructured information
- Applies opinionated, lossy structure to it
- Makes that structure interpretable in specific Information Environments
- Enables specific cognitive operations (verify, compose, retrieve, extract, refactor)
- Is updated and refactored continuously as understanding evolves

Books, libraries, spreadsheets, Unix pipes, and Flint + LLMs are all thinking technologies. They do not capture truth — they help minds do things with partial truths. Innovation lives in **which operations become easy** once structure is in place.

## Applying This Knowledge

When creating a shard, type, or trait, ask:

1. **What output does this produce?** If you cannot answer, do not add it.
2. **What traits characterize this composition?** Time, epistemic state, scale, resolution, aliveness, grounding — or a new trait you are proposing.
3. **What Information Environment does it assume?** Which shards, which knowledge, which prior context.
4. **What operations does it enable?** Capture, describe, predict, prescribe, compose, extract, refactor, retire — or something new.
5. **Is it useful?** If not, defer.

When reading an artifact, treat it as a model in an IE, not as a fact about the world. Walk references back to records when grounding matters. Check the capture-ratio before treating it as evidence. Check aliveness before treating it as current.
