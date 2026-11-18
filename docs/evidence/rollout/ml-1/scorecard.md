# Machine Learning batch 1 scorecard

| Page | Part 1 structure | Big picture / Worksheet | Worked example / Try it | Mistakes / avoid / remember | Diagram and viewport evidence | Math, code, sources, words |
| --- | --- | --- | --- | --- | --- | --- |
| Overview | Pass for required heading order; deep survey retained, so strict short-variant length is partial | PenFlow and six-model score Worksheet | Existing model comparison retained; best-score exercise passed in Pyodide | Mistake table and existing ending sections | Four views captured; route guard passed | MDX, links, math, and banned-word scan passed; primary-source audit not repeated |
| Roadmap | Pass for required heading order; deep roadmap retained, so strict short-variant length is partial | PenFlow and six-stage Worksheet | Existing diabetes checkpoint retained; curvature exercise passed in Pyodide | Existing standard-fixes table is now Common mistakes | Route guard passed | MDX, links, math, and banned-word scan passed; primary-source audit not repeated |
| ML Workflow Fundamentals | Pass | PenFlow and 60/20/20 split Worksheet | Existing runnable analysis retained; new split exercise passed in Pyodide | Page-specific tables added | Route guard passed; overview used in four-view captures | Math, MDX, links, typecheck, and banned-word scan passed; sources retained |
| Supervised Learning | Pass | PenFlow and loss-choice Worksheet | Existing model comparison retained; mean/median exercise passed in Pyodide | Page-specific tables added | Route guard passed | Math, MDX, links, typecheck, and banned-word scan passed; sources retained |
| Linear Regression | Pass; legacy `#9-minimal-implementation` anchor preserved | PenFlow and exact-line Worksheet | Existing NumPy implementation retained; slope/intercept exercise passed in Pyodide | Page-specific tables added | Route guard passed after repairing the clipped gradient-loop labels; four views captured | Remember and five-source list added; math, MDX, links, typecheck, and banned-word scan passed |
| Ridge Regression | Pass | PenFlow and duplicate-feature Worksheet | Existing solver retained; coefficient-sharing exercise passed in Pyodide | Page-specific tables added | Route guard passed | Math, MDX, links, typecheck, and banned-word scan passed; sources retained |
| Lasso Regression | Pass | PenFlow and soft-threshold Worksheet | Existing solver retained; threshold exercise passed in Pyodide | Page-specific tables added | Route guard passed | Math, MDX, links, typecheck, and banned-word scan passed; sources retained |
| Elastic Net | Pass | PenFlow and duplicate-feature Worksheet | Existing solver retained; mixed-penalty exercise passed in Pyodide | Page-specific tables added | Route guard passed | Math, MDX, links, typecheck, and banned-word scan passed; sources retained |

## Checks and captured runtime output

```output
$ npm run check:notebook
Notebook check (changed-files): 8 pages, 0 violation(s).
✓ Static Typography Guard: 24 content files clean (0 heading/table overrides).

$ npm run check:math
[check:math] PASSED: All display math across 1991 MDX file(s) correctly formatted as multi-line blocks.

$ npm run check:mdx
check-mdx-compile: 2019 files, 0 failed.

$ npm run check:links
check-internal-links: scanned 1991 MDX file(s), found 2147 valid route(s).
check-internal-links: no broken internal prose links found.
check-anchor-links: no broken anchor links found.

$ npm run typecheck
(exit 0; no diagnostics)

$ npx vitest run
Test Files  231 passed (231)
Tests  1172 passed (1172)

$ npx playwright test tests/notebook-label-overlap.spec.ts --grep 'docs/machine-learning' --workers=1
8 passed (43.2s)

Pyodide exercise output:
ml-workflow-fundamentals: total: 1000; shares: [0.6, 0.2, 0.2]
supervised-learning: squared-loss choice: 4.67; absolute-loss choice: 3
linear-regression: slope: 2.0; intercept: 1.0
ridge-regression: weights: [1.5, 1.5]; prediction weight: 3.0; squared size: 4.5
lasso-regression: 3 -> 2; 0.7 -> 0
elastic-net: weight per duplicate feature: 1.0; combined prediction weight: 2.0

Four-view browser capture:
overview and linear-regression loaded at 1440px and 375px in light and dark themes; no page errors, console errors, or horizontal overflow. Full-page PNGs and route diagnostics are in this folder.

$ free -g
Mem: 7 3 2 0 1 3
```

Build was deferred because available RAM was 3 GiB, below the repository's 5 GiB threshold. The agy launch failed before editing because the Antigravity agent is not registered; Codex implemented the batch under the user's fallback instruction.

The two landing pages retain their existing deeper surveys and runnable checkpoints after the required heading sequence. This preserves their existing examples and output fences while keeping the section's reference material available; it remains a partial match to the strict short-variant instruction and is called out for review.
