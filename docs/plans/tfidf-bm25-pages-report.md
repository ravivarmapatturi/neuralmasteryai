# Report: Dedicated TF-IDF and BM25 Pages
Status: ready for Claude's final review

Commits (oldest first): `c1013712` tracker registration; `2ce5e7e6` implementation brief; `6df39b3f` calculation helpers and BM25 fixture; `93fd7849` TF-IDF/BM25 visualizers; `f6702912` inverted-index visualizer; `ba3dc005` chapters and route integration; `7875439a` typecheck/MDX corrections; `5c0fd50e` stable BM25 heading; `22503c1d` screenshots; `04a50c60` agy report; `3d603e00` review-fix brief; `2cab0cd8` sparsity wording; `0d991159` BM25 theory and retrieval-claim corrections; `ffcc45ae` fix report.

## What was built

- Dedicated TF-IDF and BM25 Learn chapters with worked examples, query/calculator visualizations, runnable Python, sources, failure modes, and navigation.
- Preserved `/docs/search-ranking-recommendations/text-search-bm25` as the inverted-index and Boolean retrieval lead-in; updated sidebar positions and metadata.
- Added TF-IDF/BM25 calculation helpers and fixtures, plus tests for the owner’s exact values. TF-IDF produces D1 = D3 = 0.1438 and D2 = 0.1233 for `machine learning`. BM25 uses the explicitly named Robertson/Lucene smoothed IDF and fixture output IDF 2.2986, TF factor 1.5714, score 3.6121.
- Added TF-IDF search, BM25 saturation/calculator, and inverted-index interaction visualizers with tests. Eight screenshots cover desktop/mobile in light/dark. I independently verified their dimensions (1200×900 and 375×812).
- Review corrections removed unsupported sparsity percentages, qualified variant and deployment claims, and clarified the conceptual (not exact posterior-odds) connection between 2-Poisson motivation and BM25 saturation.

## Checks and review

Agy reports passing `check:mdx` (2014 files), `check:links` (1986 files, no broken routes/anchors), typecheck, scoped tests (39/39), full Vitest (1097/1097), Playwright/Pyodide snippet execution, eight-image readiness/overflow checks, banned-phrase grep, tracker check, and `git diff --check`. The fix round separately reports MDX, links, typecheck, focused tests (36/36), writing-voice grep, tracker, and diff checks passing. I independently checked changed-file scope for the fix round, screenshot dimensions, the requested TF-IDF fixtures, navigation sequence, and tracker validation.

The alleged duplicated healthcare paragraph was already a single instance when the review brief ran. Agy preserved the single example instead of deleting it; this is documented in `docs/briefs/tfidf-bm25-pages-fix-1.md`.

## Not verified / risks

The static build was deferred because available memory was 4 GiB, below the repository’s 5 GiB threshold. CI should run the production build. I did not independently rerun the full suite after the prose-only fix round; that round ran typecheck and focused tests per its narrow brief.

## Decisions Claude must take

None. Please include the static build in CI before shipping.
