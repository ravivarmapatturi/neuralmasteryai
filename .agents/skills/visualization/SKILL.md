---
name: visualization
description: How to build any diagram or interactive visualizer in src/viz/ for Neural Mastery (Learn pages, labs, blog bodies). Use before creating or editing a diagram component.
---

# Building a visualization

A diagram must **answer one question the prose raises**. If you can't write that question in one sentence, don't build the diagram. Interactivity is earned: add a control only when changing it reveals something text cannot (a variable's effect, a step in a process, a failure).

## Before you build

1. Write the question ("What does the causal mask do to the score matrix?").
2. Pick the field-standard form. Use the convention practitioners already know: Colah-style LSTM cells, Vaswani transformer block, matrix grids for attention, sequence diagrams for protocols, timelines for training runs. Don't invent a new layout for a known idea.
3. Use real numbers from the page's worked example. If values are illustrative, say "illustrative values" in the caption and a code comment.
4. Linear processes stay linear. Don't add forks, branches or loops that the real system doesn't have.

## Build rules

- File: `src/viz/diagrams/<PascalName>.tsx` (static/stepper) or `src/viz/<Name>.tsx` (larger explorer). Default export, no props needed to render.
- Colours only from `const t = useVizTokens()` and `diagramSystem.ts` (`getConceptColor`, `valueColor`, `DIAGRAM_TYPE`). No hex literals, no Tailwind colour classes.
- Wrap in `<VisualizationContainer>`; title with `<VisualizationHeader>`; controls via `VizButton`, `PillSelect`, `VisualizationStepController`; math via `VisualizationMath`. Hand-drawn style uses `SketchRect`/`RoughShape` from `components/notebook` and the Kalam font for labels, as in `CausalMaskAnimated.tsx`.
- Max ~9 labelled nodes per view. More → step-through or split into two diagrams.
- Every node, arrow and axis is labelled. Arrows show direction. Units on axes.
- Default state is the most informative state (show the result, let the reader step back), not a blank canvas.
- Steppers: Prev/Next + step counter + one sentence per step describing what changed.
- Motion: purposeful only, ≤400ms, and `usePrefersReducedMotion()` disables it.
- Responsive: SVG `viewBox` + `width="100%"`; labels ≥12px at 375px wide; no horizontal scroll.
- Accessible: `role="img"` + `aria-label` summarising the conclusion; buttons are real `<button>`s with labels; keyboard works.
- Caption (container `footer`): 1-2 full sentences: what it shows and what to notice.

## Reject list

Decorative "neural network" node clouds; gradient blobs; glowing borders; emoji as icons; 3-column icon card grids standing in for a mechanism; text-only boxes connected by arrows that add nothing to the prose; animation that loops forever; diagrams that disagree with the code's numbers.

## Verify

Open the page in the dev server. Check light + dark, 375px + 1440px, every control, keyboard Tab/Enter, console clean. Add a small vitest render test for interactive components (pattern: `src/components/*.test.tsx`).
