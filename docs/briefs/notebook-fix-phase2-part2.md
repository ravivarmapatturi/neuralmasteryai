# agy brief: notebook fix phase 2, Part 2 (owner feedback on the look)

Execute Part 2 of `docs/plans/notebook-fix-brief-phase2.md` only. Follow the source plan in order and stop before Part 3. Do not edit Learn/blog content pages in this part, and do not push.

## Required sequence

1. **Remove horizontal ruled lines everywhere on Learn, blog, and lab pages.** The page surface is plain white in the light notebook theme and the existing dark surface in dark theme. Keep the vertical red side ruler/margin line. Remove the repeating horizontal `background-image` treatment from `.nm-notebook-sheet` and `.nb-ruled`; remove obsolete comments that describe the page as ruled. Keep unrelated decorative backgrounds (for example, the title highlighter) if they are not ruled lines.
2. **Update `.agents/skills/notebook-page/SKILL.md`** so the description, look, and hard rules state: plain white notebook page in light theme, dark counterpart in dark theme, vertical red side ruler retained, no horizontal ruled lines. Remove contradictory “ruled page”/ruled-paper instructions. Do not loosen the other notebook rules.
3. **Define one shared type scale in `src/styles/theme.css`** as CSS custom properties and use it for Learn prose, file-backed blog posts, and labs. Preserve a clear H1→H4 hierarchy, but each role must have one shared size, weight, color, line-height, letter-spacing, and margin rule across those page types. Use the existing `.prose` values as canonical sizes where already defined: H1 2.25rem/800, H2 1.5rem/700, H3 1.15rem/700, body 17px/400, and table text 14px/400 with table headers 700. Add explicit shared values for H4 and small text; use 14px/400 for small text unless the existing content token system requires a documented equivalent. Make line-height, colors, and spacing explicit tokens too. Use the current semantic theme colors (`--nm-heading-*`, `--nm-text-*`) so the same page roles match within light and within dark themes.
4. Apply the shared role tokens to all article headings (`h1`–`h4`), body paragraphs, small/caption text, table cells/headers, NotebookCallout body, blog post title/standfirst, and lab headings/body/table. Remove per-page/component typography overrides for those roles from shared CSS and content components. Keep sizes for code, controls, diagram labels, and navigation separate; they are not prose typography roles. Preserve responsive layout, semantic heading levels, and the existing notebook appearance apart from the removed horizontal lines and normalized type.
5. **Add the cross-page Playwright guard.** Add a spec under `tests/` that is included by the existing CI `npm run test:smoke`. It must visit at least these 16 routes, covering Search & Recommendation, A7, MLOps, Machine Learning, Deep Learning, Agents, Visual Lab, a blog post, and Labs:
   - `/docs/search-ranking-recommendations/overview`
   - `/docs/search-ranking-recommendations/tf-idf`
   - `/docs/search-ranking-recommendations/bm25`
   - `/docs/search-ranking-recommendations/ranking-evaluation-metrics`
   - `/docs/harness-engineering/context-and-instruction-design`
   - `/docs/mlops/overview`
   - `/docs/mlops/model-serving`
   - `/docs/machine-learning/linear-regression`
   - `/docs/machine-learning/logistic-regression`
   - `/docs/deep-learning/attention-transformers`
   - `/docs/deep-learning/neural-network-fundamentals`
   - `/docs/agents/overview`
   - `/docs/agents/agent-architectures`
   - `/docs/visual-lab/logistic-regression-studio`
   - `/blog/e-means-outperforming-kmeans`
   - `/labs`

   Run each route at 1440px and 375px. Check the light notebook theme and dark theme. For every typography role present, compare computed `font-size`, `line-height`, `font-weight`, `color`, and the relevant margin/letter-spacing values against the same role on the other routes at the same viewport and theme. Ensure coverage for H1–H4, paragraph, `small`/caption, table `th`/`td`, and `.nb-callout-body`; fail if the suite cannot find representative instances of a role. Also assert that the rendered notebook page surfaces have no `background-image` containing a repeating horizontal rule pattern. Use the article headings/tables/callouts actually rendered by the route; do not create a fake fixture that bypasses page/component CSS.
6. **Add the static override guard.** It must reject new `font-size`/`font-weight` declarations on heading/table typography roles in content components, while allowing styles for code, controls, diagram labels, and navigation. Cover inline JSX styles and component CSS rules. Put it in `npm run check:notebook` (alongside the existing notebook checker), and add `npm run check:notebook` to `.github/workflows/ci.yml` so CI always runs it. Add tests for the static guard’s accepted and rejected examples. The Playwright spec is automatically included in the existing `npm run test:smoke` CI step.
7. Run the static checks, the new static-guard tests, typecheck, and the Playwright typography spec under `flock /tmp/nm-heavy.lock`, one at a time. For browser work, use the existing dev-server Playwright pattern or the production static server if `dist/` is present. Check both themes and both viewport widths. Do not run a production build unless `free -g` reports at least 5 GiB available. Clean up every server/browser you start.
8. Inspect every changed line and report exact commands/results, page/theme/viewport coverage, and any outstanding issue below. Commit Part 2 locally. Stop before Part 3.

## Implementation scope

Allowed files are limited to:
- `.agents/skills/notebook-page/SKILL.md`
- `src/styles/theme.css`, `src/styles/notebook.css`, `src/components/labs.css`, and other shared CSS only where a typography-role override is confirmed
- `src/components/content/` or `src/components/notebook/` only to remove typography-role overrides or expose existing real roles to the shared tokens
- `scripts/` and tests for the static typography guard
- `tests/` and Playwright configuration only as needed for the cross-page browser guard
- `package.json`, `.github/workflows/ci.yml`, this brief, and `AGENT_TRACKER.md`

Do not edit page content or Part 3 evidence in this part. Preserve unrelated user-owned untracked files. If a required route is missing or a role cannot be compared on real pages, stop and record the precise issue below rather than silently substituting a fake fixture or another category of page. Never push.

## Report from agy
