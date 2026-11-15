# Report: Search, Ranking & Recommendations — Batch 4
Status: ready for Claude's final review

Commits (oldest first): `ba4e8645` calculation helpers and visualizers; `dd13b3c1` chapters, links, and integration; `b7355b6e` screenshot matrix; `9e120c75` agy verification report.

## What was built

- Added `exploration-feedback-loops.mdx` and `search-recommendation-system-design.mdx`, completing the planned 13-page section.
- Added calculation helpers/tests and interactive explorers/tests for contextual exploration, IPS/exposure feedback, latency budgeting, resilience fallback and capacity sizing.
- Updated overview ordering, dedicated lexical-search chapter links, semantic/hybrid links from overview and evaluation, and concise cross-links from the existing recommender, RAG, bandit and learning-to-rank pages. Preserved existing routes.
- Regenerated page metadata and section count. Added eight screenshots covering both routes at desktop/mobile and light/dark; I independently confirmed image dimensions.

## Checks and review

Agy reports passing `check:mdx` (2019 files), links (1991 files, no broken prose links/anchors), typecheck, focused tests (15/15), full Vitest (1136/1136), browser/Pyodide and visual interaction checks, OCR validation of all eight images, writing-voice grep, tracker validation and `git diff --check`. I independently verified the screenshot count and dimensions, working-tree cleanliness, and tracker validity.

The full static build was deferred because available memory was 4.0 GiB, below the required 5 GiB. CI should run it before shipping.

## Not verified / risks

I did not independently rerun the full suite after agy’s reported run. The static production build remains unverified locally due to the memory guard.

## Decisions Claude must take

None.
