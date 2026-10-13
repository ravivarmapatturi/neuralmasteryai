# Task: convert 3 more diagrams to hand-drawn rough.js rendering

Isolated worktree, branch `agy-tick10-diagrams`, based on `origin/main` at `ca07993`.
Part of the standing notebook-transition-mandate (convert interactive diagrams to real
rough.js hand-drawn borders, visual-layer-only, never touch state/computation logic).

## Pattern reference

Read these existing converted files first to match conventions exactly:
- `src/viz/diagrams/DiscoverySequenceDiagram.tsx` -- SVG rect+arrow triangle/chain pattern
  (the closest match for `ReflexionLoopDiagram` below).
- `src/viz/diagrams/RouterVsSupervisorDiagram.tsx` -- plain-HTML-card step list pattern
  (the closest match for `ComputerUseLoopDiagram` below).
- `src/components/notebook/SketchBox.tsx` and `src/components/notebook/RoughShape.tsx`
  (`SketchRect`, `SketchArrow`) for exact prop signatures.

Conventions, non-negotiable:
- Wrap each plain HTML card/box in `SketchBox` (props: `color`, `strokeWidth`, `style`,
  children) -- border only, never pass `fillColor`. Keep any existing colored background
  wash as plain CSS `background` on the inner `<div>`.
- For SVG shapes: `<rect>` -> `SketchRect` (keep a plain non-rough backing `<rect
  stroke="none">` for any colored fill wash, `SketchRect` itself drawn border-only on top,
  no `fillColor`), `<line>` -> `SketchArrow` with `points={[[x1,y1],[x2,y2]]}` (pass
  `arrowhead={false}` if the original had no `markerEnd`). Drop `<defs>/<marker>` blocks
  entirely -- `SketchArrow` draws its own hand-drawn arrowhead when `arrowhead` is true
  (the default).
- Add `const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";` and apply it to diagram
  prose/label text. Real code/JSON/monospace content (e.g. a formula-style variable name)
  stays `fontFamily: 'monospace'`, unchanged.
- Don't touch any `useState`/interaction logic/click handlers, only the rendering markup.

## Exact files to edit

### 1. `src/viz/diagrams/ReflexionLoopDiagram.tsx`

Three `<rect>` nodes (Actor/Evaluator/Reflection) in a triangle layout, connected by 3
`<line>` edges with `markerEnd="url(#rfx-arrow)"` / `"url(#rfx-arrow-active)"` (two different
arrow colors depending on `active`). Convert:
- The 3 `<rect>` nodes -> `SketchRect` (keep the existing `fill={...}` as a plain backing
  `<rect stroke="none">`, `SketchRect` drawn on top border-only with `color={...}` matching
  the original `stroke` value and `strokeWidth` matching the original).
- The 3 `<line>` edges -> `SketchArrow` with `points={[[p1.x,p1.y],[p2.x,p2.y]]}`,
  `color={active ? color : t.border}`, `strokeWidth={active ? 2.5 : 1.5}` (the original
  `opacity` prop on the `<line>` can stay applied via wrapping each in a `<g opacity={...}>`
  if simplest, or pass it through some other way -- just make sure the dimmed/active visual
  distinction is preserved).
- Drop the `<defs><marker>...</marker></defs>` block entirely.
- The tiny dashed vertical tick mark near "episodic memory buffer" (`<line ... strokeDasharray="2 2" />`)
  -- convert to `SketchArrow` too, `arrowhead={false}`, dasharray simply dropped (a hand-drawn
  stroke already reads as non-solid, this is the standing sitewide convention).
- Add `HAND_FONT` to the `<text>` labels (`Actor`, `Evaluator`, `Self-Reflection`,
  `episodic memory buffer`) -- NOT to the `Trial {frame.trial} · step {i+1}/{FRAMES.length}`
  caption text if it's a plain `<span>` outside the SVG (leave plain UI chrome text alone,
  only the diagram's own SVG labels need the hand font).

### 2. `src/viz/diagrams/ComputerUseLoopDiagram.tsx`

A flex-wrap row of step-tile `<div>`s (icon + label + optional "consequential" marker),
each with `border: 1.5px solid ...`. Wrap each tile's existing `<div>` content in `SketchBox`
(`color` = the existing border color logic: `isCurrent ? color : s.consequential ? '#d9534f' : t.border`,
`strokeWidth={1.5}`, pass `style={{ flex: '1 1 90px', minWidth: 90, opacity: isPast || isCurrent ? 1 : 0.55 }}`
on the `SketchBox` itself, keep `padding`/`borderRadius`/`textAlign`/`background` on the inner
`<div>` -- drop the inner div's own `border` since `SketchBox` now draws it). Add `HAND_FONT`
to the label text (`s.label`) and the "consequential" marker text; the icon emoji span
doesn't need a font change.

### 3. `src/viz/diagrams/DeliverySemanticsDiagram.tsx`

Only the final "Result: {script.verdict}" `<div>` (currently
`border: 1px solid ${outcomeColor(...)}`) gets converted -- wrap it in `SketchBox`
(`color={outcomeColor(script.steps[script.steps.length-1].outcome)}`, `strokeWidth={1.5}`),
drop that div's own `border` property, keep `background`/`padding`/`borderRadius` as-is, add
`HAND_FONT` to its text. **Do NOT touch the step list above it** (the numbered items with
`borderLeft: 2px solid` -- that's a timeline rail, not a card/box, deliberately left as-is;
this is a partial conversion, not a full one, and that's intentional).

## Verification (required, in this order, do not skip or shortcut any step)

1. `npx tsc -b` -- must pass with zero errors.
2. `npm run test:unit` -- full unit suite must pass (473+ tests).
3. `npm run build` -- must succeed, no broken imports.
4. `npm run check:links` -- must pass.
5. `npm run pagefind` -- prerenders all routes; poll its log directly with plain
   `tail`/`kill -0`, not a background wait-wrapper.
6. `npm run test:smoke` (Playwright) -- full suite must pass (14 tests). If 1-2 flake under
   parallel load, re-run just that spec with `--workers=1` before concluding it's not a real
   regression.

## Commit, push, and report

- `git add` only the 3 diagram files actually touched plus this spec file under `helpers/`.
  Never `git add -A`.
- Commit message describing the 3 conversions (note the partial conversion on
  `DeliverySemanticsDiagram` and why). End with:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  ```
- Check `git log --oneline -5` on `origin/main` first -- if it has moved past `ca07993`,
  rebase this branch onto latest `origin/main` before pushing. Push directly to `main`
  (standing push authorization already granted for this repo), not a PR.
- Single `gh run list --limit 5` check after pushing, not a polling loop.
- End with a short summary: files changed, verification results, final CI/Deploy status.

## Constraints

- Visual-layer and content-only change. Do not touch any unrelated file.
- Do not install new npm dependencies -- everything needed already exists in this repo.
- If anything above is ambiguous, read the referenced pattern files first before guessing.
