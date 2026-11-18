# Machine Learning batch 4 scorecard

Pages: Association Rule Mining; PCA, Kernel PCA & Truncated SVD; Gaussian Mixture Models & Spectral Clustering; Recommender Systems.

| Page | Why + PenFlow + Worksheet | Worked example grounded in printed values | Try it prompt | Mistakes + avoid-use | Output fence | Browser / SVG guard |
| --- | --- | --- | --- | --- | --- | --- |
| Association rules | Pass | 87 itemsets; confidence/lift examples; 40 null-data rules | Pass | Pass | Preserved and labelled | Deferred: 0 GiB available |
| PCA/SVD | Pass | reconstruction errors, explained variance, kernel accuracy and sparse dimensions | Pass | Pass | Preserved and labelled | Deferred: 0 GiB available |
| GMM/spectral | Pass | EM likelihood, ARI, BIC and eigenvalue results | Pass | Pass | Preserved and labelled | Deferred: 0 GiB available |
| Recommender systems | Pass | 37,419 ratings, RMSE by rank and top-10 hit rates | Pass | Pass | Preserved and labelled | Deferred: 0 GiB available |

## Runtime outputs observed

Executed each existing Python example locally with the installed scientific Python stack. Association results matched the checked-in output (timings naturally varied); PCA values matched; GMM and spectral values matched; recommender values matched including 649 users and top-10 hit rates 0.245 / 0.166. Full captures are retained in the page's `output` fences.

## Verification

Passed: `npm run check:notebook` (4 pages, 0 violations), `npm run check:math` (1,991 MDX), `npm run check:mdx` (2,019 pages, 0 failures), `npm run check:links` (2,147 routes, no broken links or anchors), `npm run typecheck`, `node scripts/check-agent-tracker.mjs`, and `git diff --check`.

Deferred: four-view browser screenshots, browser RunnableCode execution, and the SVG overlap guard. `free -g` reported 0 GiB available; the repository requires at least 5 GiB for browser/build-heavy work. The four page SVG routes are therefore not marked visually passed.
