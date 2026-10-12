# Task: convert 3 more diagrams to hand-drawn rough.js rendering

Isolated worktree, branch `agy-tick2-diagrams`, based on `origin/main` at `2cbfd91`.
Part of the standing notebook-transition-mandate (convert interactive diagrams to real
rough.js hand-drawn borders, visual-layer-only, never touch state/computation logic).

## Pattern reference

Read `src/viz/diagrams/TerraformVsPulumiDiagram.tsx`, `src/viz/diagrams/GovernanceApprovalFlowDiagram.tsx`,
and `src/viz/diagrams/PromotionWorkflowDiagram.tsx` (just converted last tick) first -- these
establish the exact conventions to follow:
- Wrap each plain HTML card/box in `SketchBox` (`src/components/notebook/SketchBox.tsx`,
  props: `color`, `strokeWidth`, `style`, children) -- border only, never pass `fillColor`/
  a rough.js hachure fill behind text (known legibility bug, already fixed once, don't
  reintroduce it). Keep any existing colored background wash as plain CSS `background` on
  the inner `<div>`, same as every prior conversion this session.
- Prose/label text gets `fontFamily: "'Kalam', 'Comic Sans MS', cursive"`. Real code/JSON/
  log content stays `fontFamily: 'monospace'` (not applicable to these 3 files -- no code
  content in any of them).
- Don't touch any `useState`/interaction logic/click handlers/keyboard handlers, only the
  rendering markup.

## Exact files to edit

### 1. `src/viz/diagrams/RegistryToolComparisonDiagram.tsx`

Two clickable `<div role="button">` cards (MLflow / SageMaker). Wrap EACH card's existing
`<div role="button" ...>` content in `SketchBox` -- important: the `role="button"`,
`tabIndex`, `onClick`, `onKeyDown`, `onMouseEnter` handlers must stay on the original
clickable `<div>`, NOT move to the `SketchBox` wrapper (SketchBox has no interaction props).
So the structure becomes: `SketchBox` wraps the existing interactive `<div>` (keep all its
handlers and most of its styling, just drop the `border` CSS property since SketchBox now
draws it), each with `color={tool === 'mlflow' ? color : t.border}` /
`color={tool === 'sagemaker' ? color : t.border}` respectively, `strokeWidth={1.5}`. Add the
Kalam font to both `<span>` labels.

### 2. `src/viz/diagrams/TerraformAnsibleSplitDiagram.tsx`

Two plain `<div>` cards (Terraform / Ansible). Wrap each in `SketchBox` with
`color={color}` (Terraform) / `color={t.accentPrimary}` (Ansible) respectively,
`strokeWidth={1.5}` -- drop each card's own `border` CSS property since SketchBox draws it
now, keep the `background` CSS as-is. Add the Kalam font to all four text elements (both
titles and both description lines).

### 3. `src/viz/diagrams/FeatureFreshnessDiagram.tsx`

The single status card (`isStale ? ... : ...` colored div) -- wrap it in `SketchBox` with
`color={isStale ? badColor : okColor}` strokeWidth={1.5}, dropping its own `border` CSS
property. Keep the `background` wash as plain CSS. Add the Kalam font to the status text and
the caption line below it (the one starting "Freshness requirements are...").

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
- Check `git log --oneline -5` on `origin/main` first -- if it has moved past `2cbfd91`,
  rebase this branch onto latest `origin/main` before pushing. Push directly to `main`
  (standing push authorization already granted for this repo), not a PR.
- Single `gh run list --limit 5` check after pushing, not a polling loop.
- End with a short summary: files changed, verification results, final CI/Deploy status.
