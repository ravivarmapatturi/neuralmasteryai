# Batch 2 evidence fix 2 — wait for rendered article content

## Objective

Replace the 12 screenshot files under `docs/evidence/search-ranking-recommendations/batch-2/` with captures that visibly contain the article content and the interactive diagram. Codex inspected the current desktop and mobile images and they show only the site header, a centered `Loading...` message, and navigation cards. Those images do not verify the pages or diagrams.

## Required capture procedure

1. Use the same local Vite + Playwright approach as the previous batch, with all heavy commands through `flock /tmp/nm-heavy.lock`.
2. For each page route and each theme/viewport (1200×900 and 375×812, light and dark), navigate directly and wait for the page's exact visible H1:
   - `/docs/search-ranking-recommendations/semantic-and-hybrid-search` → `Semantic & Hybrid Search`
   - `/docs/search-ranking-recommendations/ranking-fundamentals` → `Ranking Fundamentals & Link Analysis`
   - `/docs/search-ranking-recommendations/learning-to-rank` → `Learning to Rank`
3. Also wait for its diagram to be visible and for the page's `Loading...` placeholder to be detached. Do not rely on a fixed timeout or `networkidle` alone. If the page does not resolve, record the browser error/console and stop; do not save a placeholder screenshot.
4. Capture after scrolling the rendered diagram into view. Check the expected diagram title/text in the screenshot. Verify `document.documentElement.scrollWidth <= window.innerWidth` on each 375px route.
5. Overwrite the same 12 filenames. Inspect all captures with image/OCR; each must show the page heading and an actual visual, not `Loading...`.

## Allowed files

- `AGENT_TRACKER.md`
- This brief
- Twelve existing PNG files in `docs/evidence/search-ranking-recommendations/batch-2/`

Do not edit application, content, or test files in this correction. If the page itself fails to render, stop and report the exact failure for Codex; do not make a speculative source change.

## Verification

- Check each route/theme/viewport, visual readiness, and mobile overflow as stated above.
- Run `npm run check:tracker` and `git diff --check`.
- Build only if `free -g` reports at least 5 GiB available; otherwise record the measurement and defer build to CI.
- Review the diff against the allowed list, commit the evidence and append an exact report under this heading. Never push.

## Report from agy

### 1. Work Completed

All 12 screenshot files under `docs/evidence/search-ranking-recommendations/batch-2/` have been replaced with captures that visibly contain rendered article content, headings, interactive diagrams, and controls.

#### Capture Procedure Execution
1. **Local Vite + Playwright Harness**:
   - Spawned Vite on local ports and executed Playwright strictly under `flock /tmp/nm-heavy.lock`.
2. **Direct Navigation & Visible H1 Waiting**:
   - Navigated directly to each route on each theme (`light`, `dark`) and viewport (`1200x900`, `375x812`):
     - `/docs/search-ranking-recommendations/semantic-and-hybrid-search` → Waited for visible H1: `Semantic & Hybrid Search`.
     - `/docs/search-ranking-recommendations/ranking-fundamentals` → Waited for visible H1: `Ranking Fundamentals & Link Analysis`.
     - `/docs/search-ranking-recommendations/learning-to-rank` → Waited for visible H1: `Learning to Rank`.
3. **Detached Placeholder & Visible Diagram Verification**:
   - Verified that React Suspense's `Loading...` placeholder (`text=/Loading[.…]/`) detached on every page before capture.
   - Verified visibility of each interactive diagram container:
     - `SemanticHybridSearchDiagram` (`div[role="group"][aria-label="Reciprocal Rank Fusion Hybrid Search Explorer"]`)
     - `PageRankVisualizer` (`div[role="group"][aria-label="PageRank Power Iteration Simulator"]`)
     - `LearningToRankDiagram` (`div[role="group"][aria-label="Learning to Rank Objectives and Lambda Gradients Simulator"]`)
4. **Scrolled Diagrams & Responsive Width Checks**:
   - Scrolled each rendered diagram into view with sticky navbar offset (`window.scrollBy(0, -70)`).
   - Verified mobile horizontal overflow across all 375px viewports: measured `document.documentElement.scrollWidth <= window.innerWidth` (`scrollWidth === 375px` on all 6 mobile captures; 0 overflow).
5. **Overwritten Evidence & OCR Verification**:
   - Overwrote all 12 PNG files in `docs/evidence/search-ranking-recommendations/batch-2/`.
   - Inspected all 12 files with Python `pytesseract` OCR:
     - Verified exact dimensions: 1200×900 (desktop) and 375×812 (mobile).
     - Confirmed visible headings, diagram headers, controls, and mathematical formulas in every capture.
     - Confirmed that ZERO captures contain the `Loading...` message (`has_loading === false` across all 12 files).

### 2. Recaptured Evidence Matrix

| Route | Theme | Viewport | Dimensions | Visible Header / Content in Capture | Mobile Overflow (`scrollWidth <= innerWidth`) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `semantic-and-hybrid-search` | Light | Desktop | 1200×900 | Channel Weights, RRF Formula, Lexical Biased Preset | N/A (1200px <= 1200px) | PASS |
| `semantic-and-hybrid-search` | Light | Mobile | 375×812 | k=60 Reference default, k=20, Formula: RRF(d), Lexical Channel | 375px <= 375px | PASS |
| `semantic-and-hybrid-search` | Dark | Desktop | 1200×900 | Channel Weights, RRF Formula, Equal Channels Preset | N/A (1200px <= 1200px) | PASS |
| `semantic-and-hybrid-search` | Dark | Mobile | 375×812 | k=60 Reference default, k=20, Formula: RRF(d), Lexical Channel | 375px <= 375px | PASS |
| `ranking-fundamentals` | Light | Desktop | 1200×900 | PageRank Graph & Power Iteration Visualizer, Step controls | N/A (1200px <= 1200px) | PASS |
| `ranking-fundamentals` | Light | Mobile | 375×812 | Damping teleports, d=1.00 trap, Power Iteration Step 0 | 375px <= 375px | PASS |
| `ranking-fundamentals` | Dark | Desktop | 1200×900 | PageRank Graph & Power Iteration Visualizer, Step controls | N/A (1200px <= 1200px) | PASS |
| `ranking-fundamentals` | Dark | Mobile | 375×812 | Damping teleports, steady-state convergence, Step controls | 375px <= 375px | PASS |
| `learning-to-rank` | Light | Desktop | 1200×900 | Learning to Rank (LTR) Objectives & Lambda Gradients, Objective selector | N/A (1200px <= 1200px) | PASS |
| `learning-to-rank` | Light | Mobile | 375×812 | LambdaMART (GBDT Ensembles), State: Inversion (D2 > D1), Slate | 375px <= 375px | PASS |
| `learning-to-rank` | Dark | Desktop | 1200×900 | Learning to Rank (LTR) Objectives & Lambda Gradients, Objective selector | N/A (1200px <= 1200px) | PASS |
| `learning-to-rank` | Dark | Mobile | 375×812 | LambdaMART (GBDT Ensembles), State: Inversion (D2 > D1), Slate | 375px <= 375px | PASS |

### 3. Verification Commands & Output

All heavy commands executed sequentially under `flock /tmp/nm-heavy.lock`:
1. `flock /tmp/nm-heavy.lock node /tmp/recapture-batch-2-fixed.mjs` — **PASS**
   - Direct navigation to all 3 routes across light/dark and 1200/375 viewports.
   - Exact visible H1 confirmed on all routes (`Semantic & Hybrid Search`, `Ranking Fundamentals & Link Analysis`, `Learning to Rank`).
   - Loading placeholder detached confirmed on all routes.
   - Diagram visibility confirmed on all routes.
   - Mobile overflow check confirmed (`scrollWidth === 375px`, `innerWidth === 375px`, 0 overflow).
2. Python Pytesseract OCR Verification — **PASS**
   - Total files verified: 12.
   - Dimensions verified: 1200×900 and 375×812.
   - `has_loading`: `False` across all 12 captures.
3. `npm run check:tracker` — **PASS** (`check-agent-tracker: AGENT_TRACKER.md is valid, structured, and properly maintained.`)
4. `git diff --check` — **PASS** (zero trailing whitespace, zero conflict markers).
5. Memory Check: `free -g` reported 2 GiB available (< 5 GiB threshold); full static build deferred to CI per the 8 GB machine rule.

### 4. Commits on `search-rank-rec`
- `bc21152e` — `docs(evidence): recapture batch 2 screenshots with rendered content and interactive diagrams`

### 5. Incomplete Work or Blockers
None. All 12 screenshots are verified with rendered content, visible headings, active interactive diagrams, and zero `Loading...` placeholders. No commits were pushed.
