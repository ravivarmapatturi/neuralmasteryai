# Brief: Machine Learning Models Atlas track (agy)

Worktree: `neuralmastery/platform-vite-mlatlas`, branch `ml-models-atlas`. Do not push. Commit on the branch; Claude reviews and ships.

## Goal

A new Atlas page, `/docs/atlas/ml-models`, that walks classical machine learning from **linear regression (1805/1809, least squares)** to **e-means (2026)**, in time order, in the same style as the existing atlases. Follow `src/content/docs/atlas/training.mdx` + `src/components/atlas/training/TrainingAtlas.tsx` (timeline, search, category filter, expandable rows, `AtlasTimeline.tsx`, `useAtlasHash.ts`) and copy their tests' pattern. Add the page to the Atlas hub (`src/components/AtlasHubPage.tsx`) and the sidebar.

Follow AGENTS.md and the skills `visualization`, `ui-design`, `writing-voice`, `learn-page`. White notebook, all visible text in Kalam, maths in KaTeX, code mono. Narrative prose, no fine print, no marketing tone.

## Algorithms (in order; add any you find missing that matter)

Linear regression (least squares) · Logistic regression · Naive Bayes · LDA/QDA · k-nearest neighbours · Perceptron · Decision trees (ID3/CART) · k-means (Lloyd) · Hierarchical clustering · PCA/SVD · Ridge · Lasso · Elastic net · SVM (+ kernels) · Random forest · AdaBoost / gradient boosting · XGBoost / LightGBM / CatBoost · GMM + EM · DBSCAN / HDBSCAN · Spectral clustering · t-SNE / UMAP · Isolation forest · Conformal prediction · **e-means (2026)**.

e-means source: https://e-means.github.io/ (Bessa, Mazaré, Szilvasy, Touvron, Picard, Douze, Jégou; Meta FAIR + ENPC; arXiv 2611.09501; code `faiss/contrib/e_means`). It is a mini-batch k-means: each cluster keeps a running sum S_j and count N_j updated by an exponential moving average, S_j ← (1−α)S_j + α·s_j, N_j ← (1−α)N_j + α·n_j, centroid c_j = S_j/N_j; batch size and α₀ come from fitted scaling laws, α follows a cosine decay to 0.1·α₀; dead clusters are revived by splitting a large cluster; Lloyd is the special case B = n, α = 1. Reported: Lloyd's 25-epoch loss in ~1.2–3 epochs. Read the page yourself and cite it; state only what it says.

## Each entry must have, in this order

1. **What problem it was built to solve** — one plain paragraph. Example: linear regression finds the linear relationship between input features and a numeric label.
2. **What came before and what it fixed** — the limit of the previous method.
3. **How it works — the maths** — the objective/loss, the update or closed form, and a tiny worked example with real numbers (KaTeX).
4. **Visualisation** — an interactive or animated figure showing the algorithm working (e.g. the line fitting, the tree splitting, centroids moving, the margin forming, k-means vs e-means converging).
   - First reuse what exists: check `src/viz/` (e.g. `LinearRegressionStudio`, `DecisionBoundaryPlayground`, `viz/diagrams/*`) and the imports in `src/content/docs/machine-learning/*.mdx`. Reuse the component if it fits.
   - If an algorithm has no proper visual, build one in `src/components/atlas/ml-models/` (SVG/canvas, deterministic seeded toy data, readable in light and dark, no horizontal overflow at 320 px). k-means vs e-means needs a new side-by-side figure: same data, Lloyd full-batch iterations vs e-means mini-batch EMA updates, with the loss curve.
5. **Evaluation metrics** — which metrics fit it and why (RMSE/R², log-loss/AUC, silhouette/inertia, etc.).
6. **Applications** — 2–3 real uses.
7. **Primary source** (paper/year link) and the related Learn page link (`/docs/machine-learning/...`).

## Tests and checks you run

- Unit tests for the new atlas component (order is chronological, search/filter works, every entry has all 7 sections, e-means is last, every entry has a visual).
- Unit tests for any new visual's maths (e.g. e-means update equals Lloyd when α=1 and B=n; k-means loss decreases).
- `npm run typecheck`, `npm run check:mdx`, `npm run check:links` and the targeted vitest files, each via `flock /tmp/nm-heavy.lock` (8 GB laptop, one heavy job at a time, no full build, no full Playwright).
- Add a small Playwright spec `tests/ml-models-atlas.spec.ts`: page loads, opening an entry shows its visual, no horizontal overflow at 375 and 320 px. Run only that spec with `--workers=1`.
- Check it yourself in `npm run dev` at desktop and 375 px, light and dark; look at every visual.
- Add an `AGENT_TRACKER.md` row and run `npm run check:tracker`. Commit in sensible pieces. Report: list of entries, which visuals were reused vs new, test output.

## Part 2: blog post on e-means (after the atlas is committed)

Write `src/content/blog/` post on e-means (follow the `blog-post` and `writing-voice` skills and the frontmatter of existing posts). Source: https://e-means.github.io/ and the arXiv paper 2611.09501 — read them; state only what they say, cite them.

- Story: k-means is everywhere (vector search indexes, quantization, clustering embeddings); Lloyd's full-batch passes are slow at scale; what e-means changes (running sums with an EMA, scaling-law batch size and step, cosine decay, dead-cluster splitting, exact finalization) and why Lloyd is a special case of it.
- Maths with a tiny worked example (3–4 points, 2 clusters, one EMA step by hand).
- Reuse the k-means vs e-means figure you built for the atlas, plus any in-article figure the blog skill asks for.
- A short runnable NumPy snippet (Pyodide-safe, no faiss) showing Lloyd vs the EMA mini-batch update on toy data and printing the losses; test that it runs.
- Reported results exactly as the authors give them (≈ Lloyd's 25-epoch loss in 1.2–3 epochs; 10–45× GPU vs Flash-KMeans, 8–15× CPU vs Faiss), labelled as the authors' numbers.
- Link the atlas entry and `/docs/machine-learning/kmeans-hierarchical-clustering`.
- Check: `npm run check:mdx`, `npm run check:links`, the blog tests, view it in `npm run dev` light/dark and at 375 px. Commit separately.
