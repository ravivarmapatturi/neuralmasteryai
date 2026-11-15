# Review: Search, Ranking & Recommendations

Plan reviewed against `search-rank-rec` at `3c9e4bf3` and the existing Learn content tree.

## Verdict

The 11-page sequence is technically coherent: lexical retrieval precedes dense and hybrid retrieval; ranking and learning-to-rank build on candidate generation; recommendation methods then reuse the same retrieval/ranking architecture; system design closes the loop. Keep the sequence and the requested four batches.

Batch 1 needs a small navigation dependency pulled forward. `contentTree.ts` builds the sidebar from page metadata and `_category_.json`, so a new content folder appears in the sidebar as soon as its first page is generated. `sectionMeta.test.ts` also requires every real sidebar folder to belong to a top-level learning group. Batch 1 therefore must add the new folder to the Models group and increase its page count for its three pages. The rest of integration (incoming cross-links, page-meta regeneration as each batch adds pages, and consistency checks) can remain in the final batch. This minimal early entry avoids an ungrouped live section and a known full-suite failure.

## Existing content and boundaries

- `src/content/docs/machine-learning/learning-to-rank.mdx` already defines Precision@k, Recall@k, MRR, DCG/NDCG, pointwise/pairwise/listwise training, LambdaRank and LambdaMART. It has a reorderable NDCG example, so the new evaluation page should focus its interactive calculator on one fixed graded list, show the metrics changing together, then extend to recommendation-specific coverage, diversity, novelty and serendipity. Link to the existing page for ranking-loss derivations; do not reproduce them.
- `src/content/docs/machine-learning/recommender-systems.mdx` already explains the retrieve → rank → re-rank funnel and its purpose. The new overview should give a short shared map for search and recommendations, then link to that page for the recommendation implementation detail.
- `src/content/docs/llms-genai/rag.mdx` already describes BM25, its TF saturation and length normalization, sparse/dense retrieval, and reciprocal-rank fusion. The new BM25 page should own the full lexical-search progression and a reproducible numerical BM25 calculation, with an explicit formula and IDF variant. Point to the RAG page for the sparse/dense hybrid application.
- Existing visuals include `NdcgRankingDiagram`, `RetrievalFunnelMissDiagram`, and a BM25 term-frequency helper/test (`src/viz/lib/bm25.ts`). Reuse sound computations and patterns where they fit. The new requirements still call for an accessible multi-metric calculator and a full BM25 parameter explorer; do not describe a term-frequency-only graphic as complete BM25.
- Keep all existing permalinks working. Batch 1 adds outgoing cross-links from its new pages; incoming links from the existing pages can be added in batch 4 with the wider integration pass.

## Accuracy and teaching constraints

- BM25 implementations vary in IDF smoothing and query-term handling. State the chosen Okapi-style variant, define every symbol, and calculate all document statistics and displayed scores from one small corpus. Label the corpus and values as a worked toy example. Explain that `k1` controls term-frequency saturation and `b` controls length normalization; avoid claiming any parameter pair is universally optimal.
- Make the worked BM25 table, the diagram, and runnable Python use identical corpus/query values. The implementation should handle absent terms, zero-length documents, invalid parameters and repeated query terms deliberately. Use standard-library Python or NumPy only.
- For ranking metrics, state relevance judgments, the cutoff `k`, gain convention, treatment of an undersized result list, and query aggregation. Precision, recall, MRR, MAP and NDCG have established definitions, but catalog coverage, diversity, novelty and serendipity need a chosen operational definition; identify those choices as proxies rather than universal standards.
- Offline judgments and logged clicks have selection and position bias. Frame an offline score as evidence on its test set, not proof of online product lift. An online experiment should name a primary outcome and guardrails; CTR alone can reward low-value clicks.
- Use the named owner sources as orientation and teach from primary sources for equations: Robertson & Zaragoza (2009) for BM25, Manning et al. (2008) for classical IR metrics, and Järvelin & Kekäläinen (2002) for cumulative gain. Do not reuse source wording or unsupported benchmark figures.

## Batch order and acceptance

1. Overview, text search/BM25, evaluation metrics.
2. Semantic/hybrid search, relevance signals and PageRank, learning-to-rank.
3. Recommendation foundations, factorization/embeddings, deep recommenders.
4. Exploration/feedback loops, system design, remaining navigation and incoming-link integration.

For every batch, agy must record exact commands and outputs in its brief. Codex independently reviews all changed files and runs the brief's checks through `/tmp/nm-heavy.lock`. Content review covers the plan's worked-example consistency, sourced or computed numbers, links, writing-voice grep, and the applicable Learn/visualization standards. Visual evidence is required at 1200 px and 375 px in light and dark themes for each interactive visual. No push; Claude owns final review and shipping.

## Sources checked

- Owner-supplied orientation: [LinkedIn overview of search and evaluation](https://www.linkedin.com/pulse/search-ranking-evaluation-metrics-kailash-thiyagarajan/), [PyTerrier tutorial](https://pyterrier-tutorial.github.io/), [Microsoft search and ranking overview](https://medium.com/data-science-at-microsoft/search-and-ranking-for-information-retrieval-ir-5f9ca52dd056), [Towards AI introduction](https://pub.towardsai.net/search-ranking-with-machine-learning-learning-to-rank-a-complete-introduction-517819b360f2), [search system design guide](https://www.systemdesignhandbook.com/guides/search-ranking-system-design/), and [NVIDIA recommender glossary](https://www.nvidia.com/en-in/glossary/recommendation-system/).
- Primary references: [Robertson & Zaragoza, “The Probabilistic Relevance Framework: BM25 and Beyond” (2009)](https://doi.org/10.1561/1500000019); [Manning, Raghavan & Schütze, *Introduction to Information Retrieval* (2008), evaluation chapters](https://nlp.stanford.edu/IR-book/html/htmledition/evaluation-in-information-retrieval-1.html); [Järvelin & Kekäläinen, “Cumulated Gain-based Evaluation of IR Techniques” (2002)](https://doi.org/10.1145/582415.582418).

## Open decisions for Claude

None. The early `sectionMeta.ts` update is a mechanical dependency of the generated sidebar and its completeness test, not a change to the agreed batch order.
