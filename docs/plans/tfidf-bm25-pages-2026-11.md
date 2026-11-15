# Plan: dedicated TF-IDF page and dedicated BM25 page (owner request, high priority)

Owner: Claude. Senior engineer: Codex (brief, run agy, review, report). Implementer: agy.
Worktree: `platform-vite-srr`, branch `search-rank-rec`. Do this right after batch 2 is reviewed and reported (batch 2 fix-3 is the last open item). Only Claude pushes.

## What the owner wants

Two separate Learn pages in the Search, Ranking & Recommendations section, built from first principles in the owner's own structure (his draft is below, keep its flow, examples and tone; rewrite only for accuracy and our house style):

1. `tf-idf.mdx`: **TF-IDF explained from first principles**. Toy search engine with 4 documents and the query "machine learning"; TF; IDF; TF-IDF; summed query score and ranking; an **interactive TF-IDF search engine** (choose a query, see IDF per term and the ranked documents with per-term breakdown); why it is sparse retrieval (vector picture); limitations (no meaning: "automobile repair" vs "how to fix a car"); sources (scikit-learn TF-IDF docs, Stanford IR book).
2. `bm25.mdx`: **BM25 vs TF-IDF: what exactly BM25 improved**. The two problems (repeated keywords, document length); an **interactive TF vs BM25 saturation chart** with a k1 slider; the document-length problem; the BM25 formula with a symbol table; an **interactive one-term BM25 calculator** (term frequency, document length, k1, b sliders; shows IDF, TF factor and score); TF-IDF vs BM25 summary table; the "BM25 is not simply TF-IDF with two parameters" nuance; why BM25 still matters in RAG (IDs, error codes, medical codes, legal references, rare terms) and hybrid retrieval.

The existing batch-1 page `text-search-bm25.mdx` becomes the lead-in (tokenization, inverted index, Boolean matching) that hands off to these two pages; its BM25 explorer can move to `bm25.mdx` if that is cleaner. Keep its URL working (redirect or keep the page). Update the sidebar order, section overview links and next/previous links.

## Owner's draft: accuracy fixes Codex must apply

- **TF table word counts are wrong in the draft's static table.** "deep learning is part of machine learning" is **7** words (not 8), and "machine learning improves search" is **4** words (not 5). The draft's interactive widget already uses the right counts. Recompute every TF, TF-IDF and the ranking from the true counts and make the prose, the static table, the widget and any RunnableCode agree exactly. With the draft's formula (TF = count/length, IDF = ln(N/df), score = sum), D1 and D3 tie at 0.1438 and D2 is 0.1233: say so plainly and explain the tie.
- The BM25 calculator's stated numbers check out (N = 1000, df = 100, avgdl = 100, tf = 3, |D| = 100, k1 = 1.2, b = 0.75 → IDF = ln(1 + (N−df+0.5)/(df+0.5)) = 2.299, TF factor = 1.571, score = 3.612). State that IDF variant explicitly on the page.
- Typical-parameter claims ("k1 often 1.2–2.0, b often 0.75") must be cited (Robertson & Zaragoza 2009 or Manning et al.) or labelled as common defaults.
- Remove tracking parameters (`?utm_source=chatgpt.com`) from every source link.
- No unsourced claims about what "search engines use"; scope them.

## House rules

`.agents/skills/learn-page/SKILL.md`, `visualization`, `writing-voice`, `ui-design`: ELI5 at top, PredictFirst, worked numbers, interactive visuals with `useVizTokens`, white notebook + Kalam, 375 px fit, light and dark, RunnableCode (stdlib/NumPy) that reproduces the page's numbers exactly, "When not to use", Remember, Next, Sources.

## Done when

Unit tests for the TF-IDF and BM25 calculation helpers (the draft's numbers as fixtures), diagram interaction tests, `check:mdx`, `check:links`, typecheck, screenshots at 1200 px and 375 px in both themes; Codex report in `docs/plans/tfidf-bm25-pages-report.md`.
