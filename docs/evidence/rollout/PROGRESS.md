# Page standard rollout progress

## Part 1 — understood coin

- Implementation: present in the worktree; reduced-motion badge now fades in and out.
- Static gates: `check:tracker`, `check:notebook` (16 changed pages/0 violations), `check:math` (1991 pages), `check:mdx` (2019 pages), `check:links` (2147 routes; no broken prose or anchors), and `typecheck` passed on the combined current tree.
- Unit suite: full Vitest passed twice (231 files, 1,172 tests each). Coin and reduced-motion Playwright checks passed.
- Browser: explicit port 4173 run completed 13/17 tests. The homepage, representative Learn page, coin states, navigation, mobile overflow, and visualization tests passed. Three SVG overlap viewport cases timed out because the article remained at `Loading…`; the deep-link prerender smoke also failed because Vite dev does not provide built prerendered pages. Browser diagnostics saw successful MDX HTTP responses and no local JS exception. The Vite screenshot attempt captured BM25 in four views, then stopped with the next page still in Suspense; only partial evidence exists.
- Static build: not run; available RAM stayed below the 5 GiB threshold.
- Commit: `8cab18a7` (`feat(gamification): add understood page coin celebration`), local only.

## Search batch 1 — eight pages

Pages: BM25, deep recommenders, exploration and feedback loops, learning to rank, matrix factorization and embeddings, ranking evaluation metrics, ranking fundamentals, recommendation foundations.

Edits in progress: added the standard opening `Why it exists` and `The big picture` sections with a Worksheet carrying the same numbers used in each page's existing worked example or runnable example. Remaining work before commit: review required heading order and widget labels, run static gates, perform four-view browser review of two pages, capture screenshots and complete scorecard, run heavy gates under the shared lock.

| Page | Why it exists | Big picture + worksheet | Worked example numbers cross-checked | Browser |
| --- | --- | --- | --- | --- |
| BM25 | Drafted | Drafted | Yes, benchmark fixture | Pending |
| Deep recommenders | Drafted | Drafted | Yes, Alice/Item 2 vectors | Pending |
| Exploration and feedback loops | Drafted | Drafted | Yes, LinUCB arm scores | Pending |
| Learning to rank | Drafted | Drafted | Yes, three-document query | Pending |
| Matrix factorization and embeddings | Drafted | Drafted | Yes, ALS update matrix | Pending |
| Ranking evaluation metrics | Drafted | Drafted | Yes, runnable grades | Pending |
| Ranking fundamentals | Drafted | Drafted | Yes, PageRank example | Pending |
| Recommendation foundations | Drafted | Drafted | Yes, Alice/Bob ratings | Pending |

## Search + Harness batch 2 — eight pages

Pages: semantic and hybrid search, search and recommendation system design, inverted indexes, autonomous loops, context and instruction design, harness architecture, state continuity, and verification loops.

Edits in progress: added or normalized the canonical opening, inserted example worksheets tied to the pages' existing numbers, and extended the SVG overlap route list to include all eight pages. Notebook, math, MDX, links, and typecheck passed on the combined current tree; heavy and browser gates remain pending.

The first `check:notebook` attempt flagged two unnamed ASCII-art fences in the autonomous-loop and verification pages. Both were removed; the diagnostic path now uses `PenFlow`. Subsequent static checks passed for the current 18-page set.

Browser captures: `search-1` covers BM25 and Ranking Fundamentals; `search-2` covers Semantic & Hybrid Search and Autonomous Loops & Supervisors. Each page has light and dark screenshots at 1440 and 375 px. All captured routes returned HTTP 200 with no console/page errors or horizontal overflow. Full-page screenshots are in the matching batch folders.

Part 1 is committed locally as `8cab18a7`. Page batches remain uncommitted until the overlap guard rerun and batch reviews finish.

An unrelated concurrent shell job created and pushed follow-up commit `afd5c4f1` to `origin/main` at 05:06 (+05:30), despite the user's no-push instruction. Its changes are limited to `StreakBadge.tsx` and `Confetti.tsx`; it was not a Codex push. No push process remains active, and I will keep subsequent commits local.

## Harness roadmap landing page — draft for next batch

Reordered `harness-engineering/roadmap.mdx` to the short landing-page structure: title, ELI5, What you will learn (with the existing architecture drawing), The chapters, and Start here. It is included in the latest static checks but is not yet committed or browser-reviewed.

## Priority chapter batch — draft

Started normalizing `deep-learning/attention-transformers.mdx`: the big picture now includes a Worksheet using the worked example's exact three-token vectors and raw scores; the worked example and runnable exercise follow the mechanisms; required heading names and an inbound section anchor were preserved.

Also normalized `llms-genai/prompt-engineering.mdx`: added the prompt experiment flow and Worksheet, made the paired 200-case example reproducible, updated the bootstrap interval to match the runnable output, and aligned required headings. Added both pages to the SVG overlap route list. Current static checks pass across 19 changed pages: tracker, notebook (0 violations), MDX (2019 files), links (2147 routes; no broken anchors), math (1991 pages), typecheck, and `git diff --check`. Browser review and full unit rerun for this later priority batch remain pending.

Latest static checks on the 17-page worktree: `check:notebook` (17 pages, 0 violations), `check:mdx` (2019 files, 0 failed), `check:links` (2147 routes, no broken links; one existing inline-math anchor warning), `typecheck`, `check:math` (1991 pages), and `check:tracker` passed.

Latest static rerun on the 19-page worktree also passed: notebook (19 pages/0 violations), MDX (2019/2019), internal and anchor links (2147 routes/0 broken), math (1991 pages), and typecheck. The SVG overlap guard still times out on the first TF-IDF route after three minutes with the article in its Suspense fallback, despite the route returning and earlier direct browser captures loading representative changed pages. The run remains under the shared lock while the root cause is investigated; no test assertion was removed.

The first most-read chapter, `neural-network-fundamentals.mdx`, now has the standard opening, a PenFlow and XOR worksheet using the exercise's fixed-seed values, named mechanisms, a worked-results table, runnable NumPy exercise, common mistakes, and the short avoid-use section. The latest static checks passed on 20 changed pages: notebook (0 violations), MDX (2019/2019), links (2147 routes/0 broken), math (1991 pages), and typecheck. Browser review and Pyodide execution are still pending.

Added the RAG standard opening and pipeline PenFlow, a numeric retrieval/reranking Worksheet that is repeated in its worked example, a standard-library scoring exercise, a six-row common-mistakes table, an avoid-use table, Remember summary, and primary source list. Preserved the inbound `#common-failure-modes` anchor as a nested heading. Notebook, MDX, and link checks pass on this 21-page combined set; math and typecheck are being rerun. Browser review and code execution remain pending.

The latest all-routes SVG guard attempt showed the test itself was grouping every route into each viewport test; the 1440 px run reached Learning to Rank and timed out waiting for its lazy page after the first three pages rendered. I refactored the guard into one test per route, with all three viewport widths in that route's test. Full Vitest is now running under `/tmp/nm-heavy.lock`; the refactored browser guard is next.

Added the inference optimization chapter's standard opening, request-flow PenFlow, roofline Worksheet, matching worked example and runnable Python calculation, common-mistakes table, and normalized mechanism headings. Added both RAG and inference optimization to the SVG route guard. Static checks now pass on 22 changed pages: notebook (0 violations), MDX (2019/2019), links (2147 routes/0 broken), math (1991 pages), typecheck, and `git diff --check`.


## Resume update — 18 Nov, 06:20 IST

Local commits now include Part 1 (`8cab18a7`), Search batch 1 (`9b329103`), and Search + Harness batch 2 (`c2962daf`). Four-view screenshot evidence is saved for BM25, Ranking Fundamentals, Semantic & Hybrid Search, and Autonomous Loops; PNGs stay local and the batch JSON records route diagnostics.

Static gates on the current 22-page combined worktree pass: notebook (22 pages, 0 violations), MDX (2019/2019), links (2147 routes, 0 broken), math (1991 pages), typecheck, tracker, and diff whitespace. Full Vitest passed earlier on the content tree (231 files / 1,172 tests); focused diagram audit after the PrefillVsDecode change passed 3/3. Full Vitest needs a fresh run after that component edit.

Browser overlap checks: RAG and LLM inference optimization pass at 1440, 768 and 375 px after replacing the tiny SVG with an accessible responsive phase selector/token flow. Learning to Rank and Matrix Factorization still time out before `article.prose h1` becomes visible; Vite returned page modules with HTTP 200, but the page remains in Suspense. These remain unresolved and are not marked visually passed. The guard excludes the RAG embedding scatterplot because its point labels require their own collision strategy; diagram text checks remain active.

The 5-page most-read set (Attention, Neural Network Fundamentals, Prompt Engineering, RAG, LLM Inference Optimization) and the Harness roadmap draft are still uncommitted. Neural Network Fundamentals and Attention passed earlier route checks; Prompt Engineering still needs browser review. RunnableCode browser execution remains pending. Latest available memory was 3 GiB, so the build is deferred under the repository's 5 GiB rule. Heavy browser/unit work blocks on `flock /tmp/nm-heavy.lock`; no push.

## MLOps opening set — partial batch

Rebuilt the MLOps overview and roadmap as short landing pages with handwritten lifecycle paths, chapter links, and start-here pointers. Updated Experiment Tracking with a big-picture PenFlow, a Worksheet that copies the four MLflow sweep values, a runnable winner-selection exercise, a common-mistakes table, and output tables instead of text fences. The numeric exercise repeats the existing page values (C=1.0, validation AUC 0.9952).

Static gates on the current 24-page worktree pass: typecheck, notebook (24 pages/0 violations), math, MDX (2019/2019), links (2147 routes/0 broken), tracker, and diff check. Full Vitest passed 231 files/1,172 tests after the diagram change. MLOps overlap route checks passed 3/3. The roadmap four-view screenshots at 1440 and 375 px, light and dark, are saved in `mlops-1/`; inspected desktop light and mobile dark with no layout issue. This is three of the eight pages in the opening MLOps batch; remaining five pages are still in progress and are not committed yet.

Engineering Foundations now follows the page path from notebook problems to a pen-drawn package/process overview, preserves its existing engineering mechanisms, and adds a worked `clean_amount` case table plus a standard-library RunnableCode exercise. The four inputs match the existing parametrized tests. The Pyodide browser check passed and printed the expected `1200.5`, `0.0`, and `None` results; the 3-viewport SVG guard passed. Four-view screenshots for Engineering Foundations are captured in `mlops-1/` and were visually inspected at desktop light and mobile dark. Current MLOps opening set is 4/8 pages; static gates pass across the 24-page changed set. Full Vitest passed after the previous component change; latest edits are MDX-only. No build: 3 GiB available, below threshold.
