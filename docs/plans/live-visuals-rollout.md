# Live visuals rollout (18 Nov 2026)

Owner: Claude (plan + final validation). Implementers: **Codex** (`docs/plans/live-visuals-codex.md`) and **agy** (`docs/plans/live-visuals-agy.md`), each in its own worktree, each touching only the diagram files in its own list.

## Goal

Every diagram on every Learn page should be alive, like the Attention & Transformers page (`src/content/docs/deep-learning/attention-transformers.mdx`, commit `6268bfdb`). The owner's words: "visualizations live are very important since our platform wants to teach AI from first principles in an easy and simple way."

Live means the diagram shows the idea **happening**, by itself, as soon as the reader sees it, and hands control to the reader the moment they touch it.

## The one rule that matters most

**The motion must teach that diagram's idea.** Generic dots on every arrow were rejected by the owner ("use appropriate live animation according to the topic"). Before you write code, write one sentence: *"In this diagram, ___ moves because in the real system ___ happens."* If you can't finish that sentence, pick a different motion or leave the diagram static and say why in the report.

## Building blocks (already in the repo, use them)

From `src/viz/primitives` (`import { FlowDots, Pulse, PulseRect, line, useAutoCycle, usePrefersReducedMotion } from '../primitives'`):

| Primitive | What it does | Use it for |
| --- | --- | --- |
| `FlowDots d=... color count dur delay r` | dots travel along an SVG path, looping | data/requests moving along a real connection |
| `line(x1,y1,x2,y2)` | path string for a straight segment | quick paths for FlowDots |
| `Pulse cx cy r color` | ring breathes out from a node | "work happens here" on a round node |
| `PulseRect x y w h color blink dur delay` | box glows; `blink` = short flash once per cycle | a stage lighting up when data passes through it |
| `useAutoCycle(n, ms, start)` | returns `{ value, pick, stop, auto }`; steps 0..n-1 on a timer, stops forever once the reader picks | walking through tokens, examples, options, families, positions |

All of these render nothing (or stay still) when the reader prefers reduced motion. Any custom animation you write must check `usePrefersReducedMotion()` itself.

Worked examples to copy from (read them before your first batch):
- `src/viz/diagrams/MultiHeadAttentionDiagram.tsx`: all heads move **at the same time** (parallel idea).
- `src/viz/diagrams/FeedForwardDiagram.tsx`: a block **grows then shrinks** (expand 512→2048→512).
- `src/viz/diagrams/TransformerModelFamiliesDiagram.tsx`: auto-cycles families; BERT dots go **both ways**, GPT only forward.
- `src/viz/diagrams/AddNormDiagram.tsx`: two paths **arrive together**, then one bigger dot leaves.
- `src/viz/diagrams/TransformerArchitectureDiagram.tsx`: one token walks down a stack, each block **flashes as it passes**.
- `src/viz/diagrams/PositionalEncodingSinusoids.tsx`: a **cursor sweeps** a plot; each wave in its **own row with gaps**; smooth curves.
- `src/viz/diagrams/RnnVsAttentionComparison.tsx`: plays on its own in a loop (RNN one step at a time vs attention all at once); stops when clicked.
- `src/viz/diagrams/TokenEmbeddingLookup.tsx`, `src/viz/AttentionStepThrough.tsx`: `useAutoCycle` walks the selection.
- `src/viz/diagrams/AttentionWorkedExample.tsx`: an existing step-through starts playing when scrolled into view and loops.

## Pick the pattern by what the diagram shows

| Diagram shows | Motion | Notes |
| --- | --- | --- |
| A pipeline / request path / data flow (boxes + arrows) | `FlowDots` along the real arrows, in order; `PulseRect blink` on each stage as data reaches it | same `dur` per hop; delay = hop index × dur so it reads left→right |
| Things that run **in parallel** (heads, workers, replicas, shards) | all paths move **at once** | never cycle one at a time; that teaches the wrong idea |
| A sequence over time (RNN steps, training epochs, retries) | one thing at a time, in order, then loop | |
| A transformation of size/shape (expand, compress, pool, embed) | one block animates its width/height along the path | `animate`/`animateTransform`, ~4 s loop |
| A loop / feedback (training loop, agent loop, RL) | dots around the cycle | closed path |
| Request + response | request dots out in one colour, response back in another | |
| Two options compared (A vs B) | each side moves in the way that shows the difference | e.g. sync waits vs async keeps going |
| A plot / curve | a cursor sweeps the x-axis with dots on each curve | smooth curves (sample ≥ 8 points per unit, plain `<path>`, not `SketchPath`) |
| A choice of items (tabs, tokens, examples, families) | `useAutoCycle` through them | reader click = `pick`, stops auto |
| Already has a Play/step controller | start playing when scrolled into view, loop with a 2–2.5 s pause at the end | see AttentionWorkedExample |
| A table, a pure list, a static reference card | leave it static | say so in the report |

## Don'ts (each of these was a real rejection)

- No dots on every line "because it's live". Only connections where something really travels.
- No cycling one-by-one when the concept is parallel.
- Nothing faster than a 1.2 s loop; nothing that flashes.
- At most ~3 different moving things competing for attention in one diagram.
- No moving element may cover a label. If labels are crowded, make space (bigger viewBox, rows with gaps); do not shrink text below 14 px.
- Do not change the diagram's numbers, labels or wording, except to fix an overlap.
- Jagged/zigzag curves for maths: use smooth paths.
- Do not touch any file outside your lane's list, the MDX pages, or the primitives. If a primitive needs a change, write the request in your report instead.

## Per-batch gates (all must pass before you commit a batch)

Wrap heavy commands in `flock /tmp/nm-heavy.lock` (8 GB machine: one heavy job at a time).

1. `npx tsc -b`
2. `npx vitest run src/viz` (and any test file next to a component you changed)
3. `npm run check:notebook`
4. Real browser: start your own dev server (`npx vite --port <your port> --strictPort`, Codex 5185, agy 5186), open each page in the batch, confirm it loads (no "Could not load this page"), every changed diagram moves, nothing overlaps, no console errors. Save one screenshot per changed diagram, 1440 px wide, light theme, to `docs/evidence/live-visuals/<lane>/batch-<n>/`.
5. Commit the batch (one commit per batch) on your branch: `feat(viz): live visuals <lane> batch <n> (<pages>)`, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. **Do not push.**
6. Append to `docs/plans/live-visuals-<lane>-report.md`: for each diagram, the one sentence ("X moves because Y"), or "left static: reason". Tick the boxes in your lane file.

Then go straight on to the next batch. Stop only if something needs a decision; write the question at the end of your report.

## Validation (Claude)

Claude reviews each batch commit (diff + the sentences + a real browser check of every changed diagram), fixes or sends back what's wrong, and pushes reviewed batches to `main`.
