# Brief for agy: five backgrounds, graph heat map, full-width interview room

Worktree: platform-vite-themes, branch agy-themes (from main 78a505c0). Commit after each part. Do not push. Follow AGENTS.md and the ui-design and writing-voice skills. One heavy job at a time (8 GB laptop): no full `npm run build`; use `npm run typecheck`, targeted vitest and the dev server.

## Part 1: five background themes (owner request)

Today the site has light and dark only, which the owner finds plain black and white. Add a theme picker with five backgrounds, chosen by the learner and remembered (localStorage), switched from the existing theme toggle in the navbar:

1. Light (current light).
2. Dark (current dark).
3. **Pure white notebook**: plain #ffffff background, NO grid, ruled or dotted lines, notebook-style type (the site's existing hand-drawn/notebook fonts), and colourful text: headings, links, labels and accents each in a distinct strong colour (for example indigo headings, teal links, magenta labels, orange highlights). Body text stays near-black for reading.
4. and 5. Two more of your choice that look professional (for example a warm paper/sepia and a deep navy or forest dark).

Every theme defines the full token set the site already uses (`--bg`, `--fg`, `--soft`, `--line`, `--surface`, `--accent`, `--accent-fill`, `--good`, `--warn`, `--on-accent` and the `useVizTokens()` values), so every page and diagram works in all five.

Test: add a Playwright or vitest check that, for each theme, computes the contrast ratio of every text token against its background token and fails below 4.5:1 for body text and 3:1 for large text and UI borders. Screenshot /interview, a question room, /docs/deep-learning/attention-transformers and the home page in all five themes at 375 and 1280 px, and look at each screenshot yourself.

## Part 2: heat map on the interview topic graph

In src/components/interview/InterviewGraph.tsx, colour each topic node by the share of its questions the learner has completed (the data already exists: done/count/pct per group and per topic). Use a sequential scale from a pale tint at 0% to the full accent at 100%, readable in all five themes, with a small legend (0%, 50%, 100%) and the percentage still shown in each node's label/aria-label. No new fine print.

## Part 3: use the whole screen in the interview room

Owner screenshot at 1920x1200: the question room is a ~850 px column in the centre with large empty space on both sides, and a huge empty transcript box. Make the room use the width on large screens: for example question and live transcript on the left, model answer, key points and follow-ups on the right (two columns from about 1200 px), and size the transcript box to its content instead of filling the viewport. Keep 375 px phones single column with no horizontal scroll. Check 375, 768, 1280 and 1920.

## Done means

typecheck clean, targeted vitest green, screenshots reviewed at all listed sizes and themes, three commits (one per part), a short note at the end of this file listing what changed and anything you could not do.

## Step-by-step guide (read this before writing code)

Work in this order. After each numbered step run `npm run typecheck`. Do not invent new mechanisms; extend the ones listed here.

### Part 1, themes

1. The site already switches palettes with two attributes on `<html>`: `data-theme` ("light" or "dark", set in `src/theme/ThemeProvider.tsx`) and `data-page-theme` (variants such as `sepia` and `rose`, defined in `src/styles/theme.css` around line 123: `:root[data-theme='light'][data-page-theme='sepia'] { --nm-bg: ...; }`). Find where `data-page-theme` is set (`grep -rn "data-page-theme" src`) and reuse it.
2. Define the five themes as a list in `src/theme/ThemeProvider.tsx`: `{ id, label, base: 'light' | 'dark' }`. Ids: `light`, `dark`, `notebook-white` (base light), `paper` (base light, can reuse sepia), `navy` (base dark). Store the chosen id in localStorage under a new key `neural-mastery-palette`. Setting a theme sets `data-theme` to its `base` and `data-page-theme` to its id. Keep `colorMode` and `toggleColorMode` working exactly as before, because `src/theme/vizTokens.ts` and 41 CSS rules read `data-theme`.
3. In `src/styles/theme.css`, add one block per new theme overriding every `--nm-*` token listed in the `:root` block at the top of that file (lines 33-50) and the dark block (lines 101-119). Copy a whole block and change values; do not leave any token out.
4. Notebook-white: `--nm-bg: #ffffff`, `--nm-surface: #ffffff`, `--nm-surface-alt: #f7f7fb`, body text `--nm-text-primary: #1a1a2e`. Colourful accents: headings indigo `#3730a3`, links teal `#0f766e`, labels magenta `#a21caf`, highlights orange `#c2410c`, success green `#15803d`. Turn OFF the ruled/grid background for this theme only: `src/styles/notebook.css` line ~81 draws it with `background-image: repeating-linear-gradient(...)`; add `:root[data-page-theme='notebook-white'] <same selector> { background-image: none; }`.
5. The interview pages use their own short tokens (`--bg`, `--fg`, `--soft`, `--line`, `--surface`, `--accent`, `--accent-fill`, `--good`, `--warn`, `--on-accent`) defined in `src/components/interview/interviewRoom.css` (lines 7-95). Map them to the `--nm-*` tokens (for example `--bg: var(--nm-bg)`) so every theme reaches the interview pages. Check `simpleInterview.css` still looks right.
6. Theme picker: in the navbar, the sun/moon button (`grep -rn "Toggle color mode" src`) opens a small menu listing the five themes with a colour swatch each; the current one is marked. Keyboard accessible (arrow keys, Escape closes).
7. Contrast test: new file `src/theme/themeContrast.test.ts`. Parse `src/styles/theme.css` for each theme block, compute WCAG contrast (relative luminance formula) of `--nm-text-primary`, `--nm-text-secondary`, `--nm-text-muted` and every `--nm-accent-*` against `--nm-bg` and `--nm-surface`. Fail if text is below 4.5 or accents below 3. Run `npx vitest run src/theme`.
8. Screenshots: start `npm run dev`, open the pages listed in Part 1 with each theme at 375 and 1280 px, look at every screenshot. Stop the dev server when done.

### Part 2, heat map

1. Open `src/components/interview/InterviewGraph.tsx`. Each topic node already knows `done`, `count`, `pct` (see line ~434). Find where node circles are filled (`fill=`).
2. Fill = `color-mix(in srgb, var(--accent) <pct>%, var(--surface))`, with a minimum of 8% so 0% is still visible. Text on a node must stay readable: use `var(--on-accent)` when pct > 55, else `var(--fg)`.
3. Add a legend under the graph: three swatches labelled 0%, 50%, 100%.
4. Unit test: render the graph with fake progress and check the fill differs between a 0% and a 100% topic.

### Part 3, full width

1. The room's width is capped in `src/components/interview/simpleInterview.css` (`grep -n "max-width" src/components/interview/simpleInterview.css`). At `@media (min-width: 1200px)` raise the cap to about 1600 px and lay out the answer screen as a two-column grid: left = question, live transcript and buttons; right = model answer, key points, follow-ups and earlier attempts.
2. The transcript box: remove fixed or viewport heights; use `min-height: 8rem` and let it grow with content.
3. Below 1200 px keep today's single column. At 375 px: `document.documentElement.scrollWidth` must equal the viewport width.
