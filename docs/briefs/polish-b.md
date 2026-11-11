# Brief B: green heat map, per-topic blog covers, continuous focus timer

Worktree: `platform-vite-themes`, branch `polish-b` (fresh from `origin/main` at `c99c5052`). Work only here. Do not push. Claude reviews and ships.

## Files you own

- Heat map: the `--heat-*` variables in `src/styles/theme.css`, `getHeatmapColorMix`, `src/lib/masteryScale.ts` and its tests, `InterviewGraph.tsx`, `.si-heat` and `.si-legend-bar` in `simpleInterview.css`
- Blog: `src/components/BlogCover.tsx`, `.nm-blog-cover` rules in `theme.css`, blog list page
- Focus timer: `src/lib/focusTimer.ts`, `src/contexts/FocusTimerContext.tsx`, `src/components/focus-timer/*` and their tests

Do not touch: prose and KaTeX rules or `--nm-code-*` in `theme.css`, `CodeEditor.tsx`, `RunnableCode.tsx`, `CodeEditorPane.tsx`, anything in `src/content/docs/` (another agent owns those). In `theme.css` edit only the blocks named above so the two branches merge cleanly.

## Tasks, in order. Commit after each one.

### 1. Heat map: greener means more complete

Page: `/interview?topic=behavioral` and every other place the 0 to 100 mastery scale is drawn. Today the scale runs grey, yellow, orange, red, crimson, so the most complete topics look like warnings. The owner wants more green for more completeness, not red.

- New scale: untouched is neutral paper grey, then pale green through to a deep, saturated green at 100. One hue family, continuous. No red anywhere on the scale.
- Text and numbers drawn on top of each step must keep at least 4.5:1 contrast in all five themes (pure-white, light, sepia, dark, forest). Dark themes need their own values.
- Update the legend bar and any wording ("hot", "heat") that no longer fits.
- Update the `masteryScale` tests to the new colours. Do not delete assertions; change expected values and add a test that no step is in the red or orange hue range.

### 2. Blog covers: one per topic

Page: `/blog`. Most cards show the same widget or logo. Each post should get a cover that says what it is about.

- Read `BlogCover.tsx` and the post frontmatter (tags, category). Build a small set of hand-drawn style SVG motifs, one per topic family (for example transformers and attention, RAG and retrieval, agents, training and optimisation, evaluation, MLOps and deployment, system design, careers and interviews, news). Pick by tag, with a deterministic colour variation per post slug so two posts on the same topic still differ.
- List every post and the motif it resolves to in your report. No more than three posts may share the same motif and colour pair, and the generic fallback should be rare.
- Covers follow the notebook look: marker strokes, existing colour tokens, readable in all five themes. Any text in a cover is in `var(--font-hand)`.
- Add a unit test for the topic to motif mapping.

### 3. Focus timer: runs continuously until the user stops it

Owner's rule: when a focus session completes, the break starts at once. When the break completes, the next focus session starts at once. No pause between them and no click needed, for as long as the user stays on our tab. It stops only when the user explicitly stops or pauses it.

- Read `focusTimer.ts` and `FocusTimerContext.tsx` first and write down the current state machine in your report.
- Implement the auto-advance: focus, break, focus, and the long break wherever the existing cycle places it. An explicit pause or stop by the user is the only thing that halts it.
- Tab hidden or throttled timers: compute from timestamps, not from tick counts, so a session that ends while the tab is in the background rolls over correctly when the tab is visible again. Completed sessions must still be counted exactly once.
- Keep the existing completion sound or notification if there is one, once per phase change.
- State after a reload should be consistent with what is already persisted; do not invent new persistence beyond what is needed.
- Tests with fake timers: focus ends then break is running with no action; break ends then focus is running; user pause holds across a phase boundary; stop resets; a long background gap covering several phases lands in the right phase with the right session count. Note: `vi.useFakeTimers()` together with `userEvent` needs `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`.

## Rules

- 8 GB machine. Never run `npm run build`, pagefind or the full Playwright suite. Every typecheck or vitest run goes through the shared lock so the two agents never overlap: `flock /tmp/nm-heavy.lock npm run typecheck` and `flock /tmp/nm-heavy.lock npx vitest run <files>`.
- `npm run dev` is fine for looking at your work. Use a port other than 5173 and stop it when done. Take screenshots of the heat map and the blog list in pure-white and dark.
- Follow `AGENTS.md`: add your row to `AGENT_TRACKER.md` first, run `npm run check:tracker`, use the `ui-design` and `writing-voice` skills.
- Never weaken a test.
- Every visible text stays in the handwritten face; only code and maths are exempt. No fine print, credits or marketing copy on pages.
- After each task write a short report at the bottom of this file: what changed, what you verified and how (command and result, screenshot path), what is not verified. Do not claim anything you did not observe.

---

## Execution Reports

### Task 1 Report: Green Mastery Scale (Greener Means More Complete)

- **What changed**:
  - Replaced warning-colored mastery scale (grey/yellow/orange/red/crimson) with continuous green scale in `src/styles/theme.css`:
    - `:root` (light themes): neutral paper grey (`#9ca3af`) at 0%, pale green (`#86efac`) at 25%, medium green (`#4ade80`) at 50%, rich green (`#15803d`) at 75%, and deep saturated green (`#14532d`) at 100%. Contrast text tokens (`--heat-text-0` through `--heat-text-4`) defined.
    - `[data-theme='dark'], [data-theme='forest']`: neutral dark slate grey (`#475569`) at 0%, deep green (`#166534`) at 25%, rich green (`#15803d`) at 50%, vibrant green (`#22c55e`) at 75%, and bright saturated green (`#4ade80`) at 100%.
  - Exported constants `MASTERY_STOPS`, `MASTERY_COLORS_LIGHT`, `MASTERY_COLORS_DARK`, `MASTERY_TEXT_COLORS_LIGHT`, and `MASTERY_TEXT_COLORS_DARK` in `src/components/interview/masteryScale.ts`.
  - Updated `InterviewGraph.tsx` to handle `forest` theme in addition to `dark` for dark palette styling, and updated the legend region ARIA label from `"Topic completion heat map legend"` to `"Topic completion progress legend"`.
  - Styled `.si-legend-ticks` in `src/components/interview/simpleInterview.css` with `color: var(--fg)` ensuring $\ge 11:1$ contrast against theme background.
  - Updated `src/components/interview/masteryScale.test.ts` with unit tests verifying:
    1. All stops 1..4 reside strictly in green hue range ($120^\circ - 165^\circ$).
    2. Zero stops in red or orange hue range ($0^\circ - 55^\circ$ and $340^\circ - 360^\circ$).
    3. Text and numbers drawn on top of each step keep $\ge 4.5:1$ contrast (measured between $5.02:1$ and $11.45:1$) across all 5 themes (`pure-white`, `light`, `sepia`, `dark`, `forest`).

- **What was verified and how**:
  - Scoped unit tests: `flock /tmp/nm-heavy.lock npx vitest run src/components/interview/masteryScale.test.ts src/components/interview/InterviewGraph.test.tsx` -> 2 test files passed, 32/32 tests passed.
  - Typecheck: `flock /tmp/nm-heavy.lock npm run typecheck` -> exit code 0.
  - Banned words grep: zero matches.
  - Visual confirmation & screenshots:
    - `docs/evidence/polish-b/heatmap-pure-white.png` (181 KB)
    - `docs/evidence/polish-b/heatmap-dark.png` (180 KB)

- **What is not verified**:
  - Physical display calibration on specialized external monitors. Full build and pagefind omitted per brief 8 GB rule.
