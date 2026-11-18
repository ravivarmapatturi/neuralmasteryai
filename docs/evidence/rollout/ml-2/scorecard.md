# Machine Learning batch 2 scorecard

Pages: Logistic Regression, Unsupervised Learning, Decision Tree, Random Forest, Boosting, XGBoost/LightGBM/CatBoost, Support Vector Machines, and k-Nearest Neighbors.

The eight pages now follow the rollout heading sequence, include a page-specific PenFlow and Worksheet, and add Worked example, Try it yourself, Common mistakes, When not to use it, Remember, Next, and Sources. Existing mechanisms, code, diagrams, and numerical outputs remain. Exercises have `# Try it:` markers; existing output blocks use the `output` fence language. Logistic Regression's bold Step 3 was promoted to a heading and its fraction notation was made notebook-checker compatible.

## Verification

- `check:notebook`: passed, zero violations.
- `check:math`: passed, 1,991 pages.
- `check:mdx`: passed, 2,019/2,019.
- `check:links`: passed, 2,147 routes; no broken links or anchors.
- `typecheck`: passed.
- `check:tracker` and `git diff --check`: passed.
- Full Vitest: 231 files and 1,172 tests passed.
- Diagram overlap guard: all eight routes passed across 1440, 768, and 375 px. Logistic Regression passed on isolated retry after one transient initial article-load timeout.
- Pyodide examples: all eight completed; outputs are summarized in `browser-results.json`.
- Browser captures: Decision Tree and XGBoost/LightGBM/CatBoost, light and dark at 1440 and 375 px. No page or console errors and no horizontal overflow.
- Build deferred: available RAM was 3 GiB, below the required 5 GiB.

## Captures

- `decision-tree-light-1440.png`, `decision-tree-light-375.png`, `decision-tree-dark-1440.png`, `decision-tree-dark-375.png`
- `xgboost-lightgbm-catboost-light-1440.png`, `xgboost-lightgbm-catboost-light-375.png`, `xgboost-lightgbm-catboost-dark-1440.png`, `xgboost-lightgbm-catboost-dark-375.png`

## Limitations

The overlap guard initially timed out waiting for Logistic Regression's article; it passed when rerun by itself. No content issue reproduced. The static production build was not run under the machine memory rule.
