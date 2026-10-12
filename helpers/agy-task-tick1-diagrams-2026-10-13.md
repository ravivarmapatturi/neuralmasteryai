# Task: convert 3 more diagrams to hand-drawn rough.js rendering

Isolated worktree, branch `agy-tick1-diagrams`, based on `origin/main` at `b1b3c16`.
Part of the standing notebook-transition-mandate (convert interactive diagrams to real
rough.js hand-drawn borders, visual-layer-only, never touch state/computation logic).

## Pattern reference

Read `src/content/docs/mlops/kubernetes.mdx`'s `HpaAutoscalingDiagram` and
`src/viz/diagrams/TerraformVsPulumiDiagram.tsx` / `src/viz/diagrams/ToolErrorTypesDiagram.tsx`'s
sibling `src/viz/diagrams/GovernanceApprovalFlowDiagram.tsx` and
`src/viz/diagrams/TransportComparisonDiagram.tsx`'s sibling pattern in
`src/viz/diagrams/HybridSearchFusionDiagram.tsx` first -- these establish the exact
conventions to follow:
- Wrap each plain HTML card/box in `SketchBox` (`src/components/notebook/SketchBox.tsx`,
  props: `color`, `strokeWidth`, `style`, children) -- border only, never pass `fillColor`/
  a rough.js hachure fill behind text (known legibility bug, already fixed once, don't
  reintroduce it). Keep any existing colored background wash as plain CSS `background` on
  the inner `<div>`, same as every prior conversion this session.
- Prose/label text gets `fontFamily: "'Kalam', 'Comic Sans MS', cursive"`. Real code/JSON/
  log content stays `fontFamily: 'monospace'` -- do NOT switch code to the hand font.
- Don't touch any `useState`/interaction logic, only the rendering markup.

## Exact files to edit

### 1. `src/viz/diagrams/PromotionWorkflowDiagram.tsx`

Current file wraps "Staging" and "Production" in two plain `<div>` cards. Wrap each in
`SketchBox`: the Staging one with `color={t.border}`, the Production one with
`color={color} strokeWidth={2}` (it's the "last/emphasized" step, same convention as
`GovernanceApprovalFlowDiagram`'s last-step styling). Add the Kalam font to both labels'
`<span>` elements. Keep the emoji/arrow row between them completely untouched.

### 2. `src/viz/diagrams/ToolErrorTypesDiagram.tsx`

Wrap the single JSON-output `<div>` (the one with `fontFamily: 'monospace'`) in
`SketchBox color={color} strokeWidth={1.3}`. Keep that div's own `fontFamily: 'monospace'`
unchanged -- it's real JSON content, not a diagram label (same exception already applied to
`StructuredLogsDiagram` and `TerraformVsPulumiDiagram`). Don't touch the two toggle buttons.

### 3. `src/viz/diagrams/TransportComparisonDiagram.tsx`

Wrap each rule `<div>` in the `.map()` in `SketchBox color={color} strokeWidth={1.2}`, and
add the Kalam font to each rule's text (these are real prose labels, not code). Don't touch
the two toggle buttons.

## Do NOT touch `BaggingVarianceDiagram.tsx`

Checked and deliberately skipped: it's a real data-driven SVG line chart (two `<polyline>`s
from a live Monte Carlo simulation, redrawn continuously as the user drags a correlation
slider). Converting a continuously-redrawn data curve to a rough.js `SketchPath` would
regenerate a jittery/inconsistent shape on every slider frame -- the same documented
exclusion reason already in `notebook_transition_mandate.md` for animated-width bar charts.
Leave this file completely alone.

## Verification (required, full chain, same as every prior commit)

1. `npx tsc -b`
2. `npm run test:unit`
3. `npm run build`
4. `npm run check:links`
5. `npm run pagefind` (poll its log directly with plain `kill -0`/`tail`, not a background
   wait-wrapper)
6. `npm run test:smoke` (Playwright, 14 tests) -- re-run any single flaking spec with
   `--workers=1` before concluding it's not a real regression.

## Commit, push, report

- `git add` only the 3 diagram files actually touched plus this spec file under `helpers/`.
  Never `git add -A`.
- Commit message describing the 3 conversions. End with:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  ```
- Check `git log --oneline -5` on `origin/main` first -- if it has moved past `b1b3c16`,
  rebase this branch onto latest `origin/main` before pushing. Push directly to `main`
  (standing push authorization already granted for this repo), not a PR.
- Single `gh run list --limit 5` check after pushing, not a polling loop.
- End with a short summary: files changed, verification results, final CI/Deploy status.
