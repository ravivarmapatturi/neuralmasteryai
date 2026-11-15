# Batch 2 review fixes — evidence, PageRank convergence, LambdaMART tutorial

## Objective

Resolve the factual and numerical issues from Codex's independent review of batch 2. Keep worked examples, visuals, helper outputs, and runnable code in agreement. Do not expand scope or rewrite the three chapters wholesale.

## Required corrections

### Semantic & Hybrid Search

1. Audit every operational or performance number in the page and its diagram/caption. Remove or source claims that lexical/BM25 lookup is guaranteed sub-millisecond, CPU scans of the stated size take hundreds of milliseconds, or HNSW/IVF recall and latency fall within the listed percentage/range. In the ANN comparison table, either cite a primary/official benchmark and state the dataset/configuration that produced it, or remove the benchmark percentages, corpus-size cutoffs, and sub-5ms assertions. Preserve complexity and byte calculations that are derived on-page. Label all retained retrieval-pool sizes and final slate counts as illustrative.
2. Describe $k=60$ in RRF as a commonly used reference setting from the cited RRF paper, not a universal standard. The current `PredictFirst` claims Cormack et al. chose it specifically to prevent top-rank outliers with the presented explanation; revise to what the paper supports (empirical parameter choice) or remove the asserted rationale. Keep the rank arithmetic if clearly labeled as an illustrative calculation.
3. Replace absolute statements such as dense channels' vectors “frequently” smoothing identifiers and ColBERT being orders faster/near cross-encoder quality with qualified, sourced explanations. Avoid claiming BM25 score is exactly zero for semantic synonyms unless the tokenization/expansion assumptions are made explicit.
4. The small-catalog threshold and flat-scan latency in “When Not to Use” are not supported. Make the threshold explicitly illustrative, derive it from a stated memory calculation, or give qualitative decision factors only.

### Ranking Fundamentals / PageRank

5. Fix the convergence statement around `ranking-fundamentals.mdx:180`. The current claim that $d=0.85$ yields high precision in 20–30 iterations across millions of nodes is unsupported and does not follow from the contraction bound. Explain that the iteration error contracts by a factor bounded by $d$ per step under the stated stochastic model; give a computed number of iterations only after naming the error tolerance and initial bound (e.g. derive $d^t$ for a selected tolerance), or remove a fixed iteration count. Do not equate iteration count with graph size.
6. Label the 40% vs 4% eye-tracking click example as a hypothetical illustration, or use actual cited study figures. Likewise mark the “9:00 AM” fresh-document example as a scenario, not production data.
7. Audit the remaining thresholds and counts in this page (including “millions to several hundred” and the fewer-than-1,000-daily-query boundary): cite a source, label as illustrative, or remove. Preserve the 4-node PageRank worked values only if prose, `WORKED_PAGERANK_GRAPH`, visualizer, and NumPy code match. Confirm converged values against the helper and add/extend an assertion for the stated vector within a tolerance.

### Learning to Rank

8. Audit every ungrounded quantity and absoluteness in `learning-to-rank.mdx`: the 50-vs-3 query example, rank-1-vs-100 implications, “production algorithm powers” specific engines, “SOTA”, `min_child_samples >= 50`, `colsample_bytree=0.8`, $K=30$, $p>0.05$, 1,000 trees / 64 leaves / >20 ms / top 50, `<1 ms`, and “thousands of judgments”. Keep values that are computed by the worked example; mark the rest as illustrative and cite a primary/official source, or replace with qualitative guidance. Do not make blanket model-best claims.
9. Correct pointwise loss discussion: per-document MSE does not inherently force equal weighting per query; an unweighted per-document objective gives more influence to queries with more judged candidates, while query or group weighting can change that. State the assumption precisely and qualify the 50-vs-3 example as hypothetical.
10. Align the LambdaMART explanation and Python code. The prose calls the leaf update an optimal Newton-Raphson step $sum_i\lambda_i/\sum_i w_i$, but the educational stump uses a mean of lambdas without Hessian weights. Either implement the documented second-order step with a well-defined Hessian/regularization in prose and code, or keep the simpler mean pseudo-residual stump and label it a pedagogical first-order approximation—not an optimal Newton step. Update its heading, comments, returned labels, diagram copy, and `Remember` row consistently. No contradiction between page text, diagram, and runnable code.
11. Remove hard-coded fixed white `#fff` labels in `PageRankVisualizer.tsx`; use an appropriate light/dark visualization token for selected button text. Keep all three diagrams token-based and verify accessible contrast.

## Allowed files

- `AGENT_TRACKER.md`
- This brief and `docs/briefs/search-ranking-recommendations-batch-2.md` (append report only)
- `src/content/docs/search-ranking-recommendations/{semantic-and-hybrid-search,ranking-fundamentals,learning-to-rank}.mdx`
- `src/viz/diagrams/{SemanticHybridSearchDiagram,PageRankVisualizer,LearningToRankDiagram}.tsx` and their existing focused tests
- `src/viz/lib/{hybridSearch,pageRank,learningToRank}.ts` and their existing tests
- Existing screenshot evidence under `docs/evidence/search-ranking-recommendations/batch-2/` only if a visual changes

Do not edit other files. Keep routes unchanged. If a necessary correction needs another file, stop and ask under `## Report from agy`.

## Verification

Run sequentially through `flock /tmp/nm-heavy.lock`:

1. `npm run check:mdx`
2. `npm run check:links`
3. `npm run typecheck`
4. `npx vitest run src/viz/lib/hybridSearch.test.ts src/viz/lib/pageRank.test.ts src/viz/lib/learningToRank.test.ts src/viz/diagrams/SemanticHybridSearchDiagram.test.tsx src/viz/diagrams/PageRankVisualizer.test.tsx src/viz/diagrams/LearningToRankDiagram.test.tsx`
5. Run/inspect the affected runnable snippets and diagram in the browser if code or diagram output changed; capture only the affected page at 1200px/375px light/dark if needed.
6. `npm run check:tracker`, `git diff --check`, and writing-voice banned phrase grep.
7. Build only if available RAM is at least 5 GiB. Otherwise record `free -g` and defer build to CI. Do not overlap heavy commands.

Review the final diff against the allowed-file list, commit small steps, and never push.

## Report from agy
