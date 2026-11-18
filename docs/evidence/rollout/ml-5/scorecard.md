# Machine Learning batch 5 scorecard

Pages: ICA/t-SNE/UMAP; DBSCAN/HDBSCAN; Anomaly Detection; Learning to Rank; Topic Modeling.

| Page | Standard sections | Worksheet source | Local runtime | Output fence | Browser / overlap |
| --- | --- | --- | --- | --- | --- |
| ICA/t-SNE/UMAP | Pass | Existing printed values | Partial: stopped at missing `umap` module | Preserved, labelled | Deferred, 0 GiB RAM |
| DBSCAN/HDBSCAN | Pass | Existing output, also locally replayed | Pass | Preserved, labelled | Deferred, 0 GiB RAM |
| Anomaly Detection | Pass | Existing output, locally replayed | Pass | Preserved, labelled | Deferred, 0 GiB RAM |
| Learning to Rank | Pass | Existing output, locally replayed; local pointwise NDCG 0.7307 vs recorded 0.7344 | Pass with minor pointwise variation | Preserved, labelled | Deferred, 0 GiB RAM |
| Topic Modeling | Pass | Existing printed output | Gibbs loop exceeded 2 minutes; interrupted before output | Preserved, labelled | Deferred, 0 GiB RAM |

## Runtime notes

- DBSCAN/HDBSCAN output matched the checked-in output.
- Anomaly detection output matched the checked-in output.
- Learning to Rank matched except pointwise boosted trees: local 0.7307, checked-in 0.7344. Other displayed values matched; the original printed output is preserved.
- ICA/t-SNE/UMAP could not run because `umap-learn` is not installed.
- Topic Modeling's 300-iteration Python Gibbs sampler did not finish within two minutes and was interrupted. Its checked-in output was retained and used to create the Worksheet.

## Verification

Passed: `check:notebook` (9 changed pages, 0 violations), `check:math` (1,991 MDX), `check:mdx` (2,019, 0 failures), `check:links` (2,147 routes, no broken links or anchors), `typecheck`, tracker check, and `git diff --check`.

Deferred: four-view browser screenshots, browser RunnableCode execution, SVG overlap guard, full Vitest and build. Memory reported 0 GiB available, below the 5 GiB heavy-work threshold.
