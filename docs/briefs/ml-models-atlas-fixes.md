# Review fixes for the ML models atlas and e-means blog (agy)

Claude reviewed commits bf4982e0 and 4861b4a0 in the browser. I already changed the per-entry h3 headings to h4 so the "On this page" list only shows the eras; keep that. Fix everything below, then rerun the checks from the original brief and commit. Do not push.

## 1. Blog: remove claims the source does not make (must fix)

The authors' page (https://e-means.github.io/) does not contain these. Remove them or replace them with what the page says, and quote/cite the page or arXiv 2611.09501 for each number. If you can open the arXiv PDF and a claim is there, keep it and add the section/table reference in the text.

- "DINO10B", "10 billion 256-dimensional DINO embeddings", "16 million centroids", "converged in just 2.5 epochs", "weeks of GPU cluster time" — not on the page.
- "1.4 to 2.6 epochs across core vision benchmarks" — the page says "1.2 to 3 epochs" and "Every dataset needs between 1.6 and 2.4 epochs, against Lloyd's 25".
- "NVIDIA H100 and A100" — the page only mentions one H100 ("one H100, 10 million vectors, 65,536 clusters").
- "ImageNet features, text embeddings" — the page describes the VIBE benchmark: text, code, image and multimodal embeddings, d = 200 to 3,072, k = 8,192 or 16,384.
- Heading "10× fewer epochs, 10–45× faster GPUs" — reword to the authors' framing ("about 1.2–3 epochs instead of 25; 10–45× faster than Flash-KMeans on GPU, 8–15× than Faiss on CPU, as reported by the authors").
- The "Where it breaks" section: points 3 and 4 are your own reasoning, not the paper's. Either mark them clearly as our analysis or drop them.

## 2. Atlas: raw LaTeX shown as text (must fix)

Prose fields (workedExample, metrics, cameBefore, problem, etc.) contain LaTeX like `\frac{...}`, `\lambda`, `X^T X`, `\bar{x}` that renders as raw backslash text (seen in Ridge metrics and every worked example). Render inline maths properly: wrap maths in `$...$` in the data and render those spans with KaTeX (inline mode), plain text elsewhere. Add a unit test that no rendered entry text contains a backslash command (e.g. `/\\[a-z]+/`) outside KaTeX output.

## 3. Atlas visuals: overlapping labels and empty space

- k-NN: the "Radius … Neighbors: 2 Red, 1 Blue (Red wins)" label is drawn over the circle/points at the top. Move labels so nothing overlaps.
- Ridge (and check Lasso / Elastic Net): the caption "Shrinks both weights non-zero (dense, smooth shrinkage)" overlaps the contour ellipses and the `w_OLS` label overlaps the text. Same rule.
- k-means vs e-means: the points occupy a small area in the middle of large empty panels; scale the data to fill the panel. The loss chart is a nearly empty box at step 0; show the full curve for all steps (computed up front) with the current step marked, and label axes.
- Caption under that figure says "saving 10–45× GPU compute": change to the authors' wording (wall-clock speed-up vs Flash-KMeans, as reported by the authors).
- Go through every one of the 24 visuals at 1200 px and 375 px, light and dark, and fix any other overlap or clipped text. Take screenshots of each (Playwright, `--workers=1`, under flock) into `docs/screenshots/ml-atlas/` (do not commit them) and list in your report which ones you changed.

## 4. Report

List each fix with file:line, the test output, and anything in the blog you kept because you found it in the arXiv paper (with where).
