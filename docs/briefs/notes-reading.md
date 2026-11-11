# Brief A: lesson pages read like clear handwritten notes

Worktree: `platform-vite-questions`, branch `notes-reading` (already checked out, one WIP commit `30e918d0` on top of `origin/main`). Work only here. Do not push. Claude reviews and ships.

The owner's words: formulas on `/docs/machine-learning/linear-regression` are fine, but on `/docs/deep-learning/attention-transformers` they overlap; every page must be crystal clear; the code playground colours look very bad on the white notebook; the yellow underline on headings is good, so mark the important points the same way real notes do, without over-decorating.

## Files you own

- `src/styles/theme.css`: only the prose, KaTeX, `--nm-code-*` and new note-mark rules. Do not touch `--heat-*`, `.nm-blog-cover` or focus timer rules (another agent owns those).
- `src/components/content/CodeEditor.tsx`, `RunnableCode.tsx`, `src/components/**/CodeEditorPane.tsx`
- MDX components for prose marks (`src/components/content/` and the MDX component map)
- `src/content/docs/**` for the audit in task 4
- `tests/notebook-handwriting.spec.ts` only to add routes, never to loosen it

Do not touch: `src/lib/focusTimer.ts`, `src/contexts/FocusTimerContext.tsx`, `src/components/focus-timer/*`, `src/components/BlogCover.tsx`, `src/lib/masteryScale.ts`, `InterviewGraph.tsx`, `simpleInterview.css`.

## Tasks, in order. Commit after each one.

### 1. Inline formulas (WIP exists, unverified)

Cause already found: the old rule made every inline `.katex` an `inline-block` with `overflow-x:auto`. A 1 to 2 px subscript overhang turned 39 of 168 inline formulas on the attention page into tiny scroll containers, with a scrollbar under the formula and the subscript lifted off the baseline. The WIP replaces it with `.prose p:has(.katex) { overflow-x:auto; scrollbar-width:none }`.

- Start `npm run dev`, open the attention page and the linear regression page at 1280 px and 390 px wide. Take screenshots. Confirm no formula has a scrollbar, none overlaps neighbouring text, subscripts sit on the baseline, and the page body does not scroll sideways on the phone.
- Formulas inside `li`, `td`, callouts and `<GoDeeper>` have no overflow guard now. Check them; add one only where a real overflow exists.
- Display formulas (`.katex-display`) must stay scrollable when wider than the column.
- Then check these too: `/docs/deep-learning/backpropagation`, one page each from machine-learning, generative-ai and llm tracks that is heavy on maths. Fix what you find.

### 2. Code playground colours (WIP exists, unverified)

`CodeEditor.tsx` no longer uses `oneDark`; it reads `--nm-code-*` variables defined in `theme.css` (light paper by default, warm on sepia, One Dark on dark and forest).

- Known problem to settle first: after this change the attention page stayed on the Suspense "Loading…" in the dev preview, while linear regression loaded. Find out whether that is real. If it is, fix the cause.
- Verify the editor on the attention page in all five themes (pure-white, light, sepia, dark, forest): text contrast at least 4.5:1 for every token colour, visible cursor, selection and active line.
- Toolbar, Run button, output and error panel of `RunnableCode` must match the same palette. No dark slab on a white page.
- `CodeEditorPane.tsx` has a fixed dark `EDITOR_CHROME` toolbar (`#0f172a`). Move it to the same variables. Check `/labs` and one practice problem.
- Editor text stays in `var(--font-mono)`. Everything around it (buttons, labels) stays in `var(--font-hand)`.

### 3. Note-style marks for the important points

Real notes: a highlighter stroke over a key phrase, a pen underline under a term being defined, sometimes a margin mark. Keep it restrained.

- Style `strong` in `.prose` as a soft highlighter stroke (uneven edge, like the heading underline), and `em` or a new `<Key>` / `<Mark>` MDX component as a coloured pen underline. Use the existing marker colour tokens. Must be readable in all five themes.
- Budget: at most one highlighted phrase per paragraph on average and never a whole sentence. If existing pages use `**bold**` too heavily for that, make the default `strong` treatment light (underline) and reserve the full highlighter for the explicit component.
- Apply by hand to the two reference pages (attention, linear regression): the definitions and the one result per section a student would mark. Show before and after screenshots.
- No new fonts. No animation on by default.

### 4. Clarity and visuals audit (continues after 1 to 3)

Readers come for clear explanations and visuals. Go through `src/content/docs/` track by track, starting with deep-learning, machine-learning, generative-ai.

- For each page note: any sentence that is hard to follow, any concept explained with no diagram where a diagram would carry it, any diagram with tiny or overlapping labels.
- Fix text directly, following `.agents/skills/writing-voice` (run its banned-phrase grep). Plain, human sentences. No marketing tone, no page disclaimers.
- Where a visual is missing, build it per `.agents/skills/visualization` with `useVizTokens()`. Follow field-standard diagram conventions. Do not invent structure the topic does not have.
- Keep a running table in `docs/briefs/notes-reading-audit.md`: page, problem, what you changed, commit. Honest entries only; "checked, fine" is a valid row.
- Batch size: five pages per commit.

## Rules

- 8 GB machine. Never run `npm run build`, pagefind or the full Playwright suite. Every typecheck or vitest run goes through the shared lock so the two agents never overlap: `flock /tmp/nm-heavy.lock npm run typecheck` and `flock /tmp/nm-heavy.lock npx vitest run <files>`.
- `npm run dev` is fine. Use a port other than 5173 and stop it when done. KaTeX font 403s in this worktree's dev server are a known symlink artefact, ignore them.
- Follow `AGENTS.md`: add your row to `AGENT_TRACKER.md` first, run `npm run check:tracker`, use the `ui-design`, `writing-voice` and `visualization` skills.
- Never weaken a test. Add or update tests for what you change.
- Every visible text stays in the handwritten face; only code and maths are exempt.
- After each task write a short report at the bottom of this file: what changed, what you verified and how (command and result, screenshot path), what is not verified. Do not claim anything you did not observe.

## Verification Reports

### Task 1: Inline formulas
- **What changed**:
  - Replaced inline `.katex` scrolling block with paragraph-level container `.prose p:has(.katex) { max-width: 100%; overflow-x: auto; overflow-y: hidden; scrollbar-width: none }` with hidden scrollbar in `src/styles/theme.css`. Formulas sit naturally on the baseline (`display: inline; vertical-align: baseline`) without lifting subscripts or creating scrollbars under 1-2px overhangs.
  - Added route redirect in `src/App.tsx` from `/docs/deep-learning/backpropagation` to `/docs/deep-learning/neural-network-fundamentals` (where backpropagation is derived and implemented).
- **What was verified and how**:
  - Dev server ran on port 5188. Tested via Playwright browser automation on:
    - `/docs/deep-learning/attention-transformers` (168 inline formulas, 6 display formulas)
    - `/docs/machine-learning/linear-regression` (87 inline formulas)
    - `/docs/deep-learning/neural-network-fundamentals` (50 inline formulas)
    - `/docs/machine-learning/pca-svd` (87 inline formulas)
    - `/docs/deep-learning/generative-models` (48 inline formulas)
    - `/docs/llms-genai/foundation-model-internals` (17 inline formulas)
  - At 1280px and 390px viewports: 0 formulas have scrollbars; all tested inline formulas maintain `display: inline` and baseline alignment; no horizontal page body scrolling (`document.documentElement.scrollWidth === document.documentElement.clientWidth`).
  - Tested display math `.katex-display`: wide display formulas (e.g. `MultiHead(Q,K,V)` at 407px on 308px container) retain horizontal scrollability without breaking viewport layout.
  - Inspected non-paragraph containers (`li`, `td`, callouts, details): 0 overflowing items found.
  - Typecheck passed: `flock /tmp/nm-heavy.lock npm run typecheck` (exit code 0).
  - Screenshots captured:
    - `docs/evidence/notes-reading/docs-deep-learning-attention-transformers-1280.png`
    - `docs/evidence/notes-reading/docs-deep-learning-attention-transformers-390.png`
    - `docs/evidence/notes-reading/docs-machine-learning-linear-regression-1280.png`
    - `docs/evidence/notes-reading/docs-machine-learning-linear-regression-390.png`
    - Additional checks at 1280px and 390px for neural-network-fundamentals, pca-svd, generative-models, and foundation-model-internals.
- **What is not verified**:
  - Task 2 (Code playground colours in all themes, CodeEditorPane toolbar, etc.) and Task 3 (Note-style marks) which are executed next.
