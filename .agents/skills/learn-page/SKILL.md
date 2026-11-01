---
name: learn-page
description: Rules for writing or rewriting any Learn page (MDX under src/content/docs/). Use whenever you create a new chapter, deepen a shallow page, or split a survey page. The bar is src/content/docs/deep-learning/attention-transformers.mdx.
---

# Writing a Learn page

A Learn page teaches **one idea deeply** to a working engineer. The reader should finish able to explain the mechanism, compute a small example by hand, run it, and know when not to use it. Read `deep-learning/attention-transformers.mdx` before you start; it is the bar every page is compared against.

Also load: `writing-voice` (prose), `visualization` (every diagram), `ship-gate` (done).

## 1. Decide before writing

Answer these four in your tracker note. If you can't, you're not ready to write.

1. **The one question this page answers.** ("Why does attention divide by √d_k?" not "Attention overview".)
2. **The misconception** most readers bring. You will name it and break it.
3. **The worked example**: concrete, small, real numbers (3 tokens, a 4×4 matrix, a 2-feature dataset). It appears in a diagram, in prose, and in runnable code, with *the same numbers* in all three.
4. **The page type** (Diátaxis): a Learn page is *explanation + tutorial*. Reference tables go in "Remember"; step-by-step ops recipes go in a how-to page and are linked, not pasted.

One page = one concept. If the outline has more than ~8 H2s or covers two ideas, split it.

## 2. Page skeleton (in this order)

```mdx
---
title: "Plain Topic Name"              # no "Ultimate", "Complete Guide"
sidebar_position: N
description: "One sentence, 120-160 chars, says what the reader will be able to do."
---
import ... (only components actually used)

# Plain Topic Name

<ELI5>3-6 sentences, everyday analogy, zero notation.</ELI5>

## Why This Exists            <- the problem the previous approach could not solve
## The Shape of It            <- one overview diagram before any detail
## <Mechanism 1> ...          <- each H2 names the real topic ("Masking", not "Details")
### A Full Worked Example     <- the diagram with real numbers
### Run It Yourself           <- <RunnableCode> with the SAME numbers + a "Try it:" edit
<PredictFirst .../>           <- before the counter-intuitive result, never after
<GoDeeper title="Go deeper: ...">derivation / proof</GoDeeper>
## Common Problems & Fixes    <- real failure modes -> named fixes, linked
## When *Not* to Use It       <- table: situation | better choice
## Remember                   <- table: idea | one line. Max 10 rows.
Next: [link] -- one sentence on why that is the next step.
## Sources                    <- primary papers/docs with year, real URLs
```

## 3. Component rules (real APIs)

| Component | Import | Rule |
| --- | --- | --- |
| `<ELI5>` | `{ ELI5, GoDeeper } from '.../components/content/ExpandableDepth'` | Exactly one, directly under H1. |
| `<PredictFirst question options correctIndex explanation />` | `.../viz/primitives/PredictFirst` | 1-3 per page. Every wrong option must be a *plausible* mistake; `explanation` says why the right one is right **and** why the tempting one is wrong. |
| `<RunnableCode code={`...`} />` | `.../components/content/RunnableCode` | stdlib + numpy only. Prints a labelled result. Ends with a `# Try it:` comment telling the reader one edit and what will change. `textwrap.dedent` before `ast.parse/compile/exec` (see AGENTS.md section 8). You must press Run in the browser and see output before calling it done. |
| `<GoDeeper title="Go deeper: <question>">` | ExpandableDepth | Optional math/internals. The page must make sense with every GoDeeper closed. |
| `<NotebookCallout color=... title=...>` | `.../components/notebook/NotebookCallout` | Colours: `amber` = warning/pitfall, `cobalt` = key takeaway, `green` = design heuristic, `coral` = common mistake. (There is **no** `blue`.) Max 4 per page. |
| Diagram components | `src/viz/diagrams/*` | At least one per major H2. Built per the `visualization` skill. Static ASCII art is not a diagram. |

## 4. Density targets (minimums for a major chapter)

- 1 overview diagram + 1 diagram per mechanism section (attention page: 13).
- 1 worked example carried across diagram → prose → code.
- 2+ `<RunnableCode>` (one reproduces the example, one asks the reader to implement it).
- 1-3 `<PredictFirst>`.
- "When not to use it" table and "Remember" table.
- 5+ primary sources. Every number in the prose is either computed on the page or cited.
- Hands-on topics (MLOps, infra, agents, inference) also need **real commands/config** that run: a real `docker run`, a real `vllm serve` flag, a real YAML file. Diagrams alone are not depth.

## 5. Mechanics

- Internal links: absolute `/docs/<section>/<slug>`; anchors must exist (check:links will fail otherwise).
- After adding/renaming a file: `node scripts/generate-page-meta.mjs`; new track → `src/data/sectionMeta.ts`.
- Math: KaTeX `$...$`; avoid math in headings (anchor IDs become unreliable).
- Lengths: 2,000-5,000 words of prose for a major chapter. Paragraphs 2-5 sentences.

## 6. Review checklist (the reviewer runs this; run it yourself first)

- [ ] Could a reader state the misconception and why it's wrong after reading?
- [ ] Is the worked example's numbers identical in diagram, prose and code?
- [ ] Does every diagram have a full-sentence caption saying what to notice?
- [ ] Did you press Run on every RunnableCode, in light and dark, at 375px?
- [ ] Any sentence that would fit unchanged on any other page? Delete it.
- [ ] `ship-gate` passed.
