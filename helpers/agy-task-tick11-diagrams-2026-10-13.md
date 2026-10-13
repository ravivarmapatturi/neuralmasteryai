# Task: convert 2 more diagrams to hand-drawn rough.js rendering

Isolated worktree, branch `agy-tick11-diagrams`, based on `origin/main` at `766464c`.
Part of the standing notebook-transition-mandate (convert interactive diagrams to real
rough.js hand-drawn borders, visual-layer-only, never touch state/computation logic).

Only 2 files this time (not 3) -- a third, harder diagram (a `<table>`-based one) is being
handled separately by the coordinator directly, not part of this spec.

## Pattern reference

Read `src/viz/diagrams/DiscoverySequenceDiagram.tsx` and
`src/viz/diagrams/ReflexionLoopDiagram.tsx` first -- both already use the exact
`SketchRect`/`SketchArrow` tree/chain pattern these 2 files need.

Conventions, non-negotiable:
- `<rect>` -> `SketchRect` (keep a plain non-rough backing `<rect stroke="none">` for any
  colored fill wash, `SketchRect` itself drawn border-only on top, no `fillColor`).
- `<line>` -> `SketchArrow` with `points={[[x1,y1],[x2,y2]]}`. Pass `arrowhead={false}` if the
  original line had no `markerEnd`/arrowhead at all.
- Drop `<defs>/<marker>` blocks entirely -- `SketchArrow` draws its own hand-drawn arrowhead
  when `arrowhead` is true (the default).
- Add `const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";` and apply it to diagram prose/
  label text. Real code/JSON/monospace content (feature names like `income`, SQL-style
  identifiers, etc.) stays `fontFamily: 'monospace'`, unchanged -- do NOT switch those.
- Don't touch any `useState`/interaction logic/click handlers, only the rendering markup.
- Dashed strokes (`strokeDasharray`) are simply dropped when converting -- a hand-drawn
  stroke already reads as organic/non-solid on its own.

## Exact files to edit

### 1. `src/viz/diagrams/TreeImportanceDiagram.tsx`

A decision-tree diagram: 3 clickable internal split-node `<rect>`s (connected by 6 plain
`<line>` edges, no arrowheads) plus 4 leaf `<rect>`s drawn with `fill="none"
strokeDasharray="3 2"` (dashed outline, no fill at all).

- The 3 internal node rects -> `SketchRect` (same backing-rect-plus-border-SketchRect
  pattern as usual).
- The 6 edge `<line>`s -> `SketchArrow`, `arrowhead={false}` (the originals have no
  markerEnd).
- The 4 leaf rects (currently `fill="none" stroke={t.border} strokeWidth={1} strokeDasharray="3 2"`)
  -> `SketchRect` with `color={t.border}` `strokeWidth={1}` and no `fillColor` (there's no
  backing-fill rect needed here since the original had no fill at all -- just drop the dash,
  per the standing convention).
- Add `HAND_FONT` to the node feature-name labels -- WAIT, those are `fontFamily="monospace"`
  in the original (real feature names like `income`, `age`, `credit_score`) -- leave those
  monospace, unchanged. Only the small "Gini ... →" annotation text (not already monospace)
  should get `HAND_FONT` if it doesn't already have an explicit fontFamily.
- **Do NOT touch** the horizontal bar-chart section below the SVG tree (the
  `importances.map(...)` block with `width: ${imp.importance * 100}%` bars) -- that's real
  computed data whose bar width changes continuously as different splits are clicked, same
  exclusion category as every other live-data bar chart already skipped this session
  (`BaggingVarianceDiagram`, `CltDemoDiagram`, etc. -- see `notebook_transition_mandate.md`
  if you want the full reasoning). Leave it exactly as-is.

### 2. `src/viz/diagrams/CommunicationPatternSequenceDiagram.tsx`

A classic UML-style sequence diagram: two vertical "lifelines" (Client/Server, plain
`<line>`s, no arrowheads) and a series of horizontal message `<line>`s between them (some
with `markerEnd` arrowheads via `<defs><marker>`, some dashed with no arrowhead for
"note"-style annotations), each with a small `<rect fill={t.surface}>` behind its label text
purely to mask the lifeline passing behind it (NOT a visible card -- leave these tiny masking
rects as plain `<rect>`, do not convert them to `SketchRect`).

- The 2 vertical lifeline `<line>`s -> `SketchArrow`, `arrowhead={false}`.
- The message `<line>`s: the real-arrow ones (`!isNote`, with `markerEnd`) -> `SketchArrow`
  with the default `arrowhead={true}`; the dashed "note" ones (`isNote`, currently
  `strokeDasharray="2 3"`) -> `SketchArrow` with `arrowhead={false}`, dash simply dropped.
- Drop the `<defs><marker>...</marker></defs>` block entirely.
- Add `HAND_FONT` to the "Client"/"Server" header labels and the message label text (the
  `isNote ? ... italic` text too) -- these are all prose/diagram labels, not code.
- Leave the small `<rect fill={t.surface}>` label-masking rects exactly as plain `<rect>`s --
  do not wrap them in `SketchRect`, they are not visible cards, just a background mask so
  text is readable over the lifeline.

## Verification (required, in this order, do not skip or shortcut any step)

1. `npx tsc -b` -- must pass with zero errors.
2. `npm run test:unit` -- full unit suite must pass (473+ tests).
3. `npm run build` -- must succeed, no broken imports.
4. `npm run check:links` -- must pass.
5. `npm run pagefind` -- prerenders all routes; poll its log directly with plain
   `tail`/`kill -0`, not a background wait-wrapper.
6. `npm run test:smoke` (Playwright) -- full suite must pass (14 tests). Re-run any single
   flaking spec with `--workers=1` before concluding it's not a real regression.

## Commit, push, and report

- `git add` only the 2 diagram files actually touched plus this spec file under `helpers/`.
  Never `git add -A`.
- Commit message describing both conversions. End with:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  ```
- Check `git log --oneline -5` on `origin/main` first -- if it has moved past `766464c`,
  rebase this branch onto latest `origin/main` before pushing. Push directly to `main`
  (standing push authorization already granted for this repo), not a PR.
- Single `gh run list --limit 5` check after pushing, not a polling loop.
- End with a short summary: files changed, verification results, final CI/Deploy status.

## Constraints

- Visual-layer and content-only change. Do not touch any unrelated file, and do NOT touch
  `JoinTypesDiagram.tsx` -- that one is being handled separately.
- Do not install new npm dependencies -- everything needed already exists in this repo.
- If anything above is ambiguous, read the referenced pattern files first before guessing.
