# Plan: fix cut-off formulas sitewide, and make the search pages simple and visual (owner escalation)

Owner: Claude. Senior engineer: Codex (brief, run agy, review, report). Implementer: agy.
Worktree `platform-vite-srr`, branch `search-rank-rec` (already merged to main; rebase on origin/main first). Only Claude pushes. **High priority.**

## What the owner saw

On https://neuralmasteryai.com/docs/search-ranking-recommendations/bm25 the BM25 formula's numerator is cut off and fractions are squashed. He wants no cut content anywhere, everything in the handwritten notebook style, simple and clear, with visuals.

## Root cause (verified by Claude in a real browser)

Display formulas written on one line, `$$ … $$`, are parsed by remark-math as **inline** maths. The BM25 page renders 0 `.katex-display` elements out of 100 formulas; TF-IDF 0 of 97; attention-transformers (formulas written with `$$` on their own lines) renders 6 correctly. `grep` finds 81 MDX files with single-line `$$…$$`.

## Part A: sitewide maths fix

1. A script (`scripts/fix-display-math.mjs`) that rewrites every line whose trimmed content is exactly `$$…$$` into three lines (`$$`, body, `$$`) keeping the line's indentation (so list items keep working). It must not touch code blocks/fences, JSX string props, `RunnableCode` code, or inline `$$` inside a sentence. Run it once; commit the result separately.
2. Formulas inside table cells that are fractions or long equations: rewrite as simple inline maths without `\frac` stacks (e.g. `tf·(k₁+1)/(tf+k₁·B)`) or move them out of the table into a display block under it.
3. A guard: `npm run check:math` that fails when any MDX line is a standalone single-line `$$…$$`; add it to CI next to `check:mdx`.
4. Verify with a Playwright script on the dev server: for the 13 search pages plus 10 other changed pages, every formula that was standalone is now `.katex-display`, and no `.katex-display` element is clipped (its `scrollHeight` ≤ `clientHeight`+2 or it scrolls horizontally on phones). Contact sheets at 1440 px and 375 px.

## Part B: BM25 and TF-IDF pages, simple and visual (owner's draft is the tone reference)

- Keep the owner's structure: problem → visual → formula → calculator → summary → why it still matters.
- Plain language first. Move theory (Probabilistic Relevance Framework, 2-Poisson, Robertson–Spärck Jones derivation, Lucene IDF negativity) into one `GoDeeper` block. No headings like "Architectural Dimension"; use the owner's simple 6-row TF-IDF vs BM25 table (Term frequency, Document length, IDF, Tunable parameters, Semantic understanding, Search engine usage) with plain words, no fractions in cells.
- Replace the ASCII "hybrid retrieval" diagram (cut off on the right) with a real SVG diagram (query → BM25 inverted index and vector ANN index → RRF → cross-encoder → results) built with `useVizTokens`, labelled arrows, fits 375 px. Same for any other ASCII-art diagram in the 13 search pages.
- Every subsection title is a real Markdown heading (H3/H4), not bold or plain text.
- Keep all numbers already verified (TF-IDF tie 0.1438/0.1233; BM25 2.2986, 1.5714, 3.6121, 4.862).

## Part C: same audit on the other 11 search pages

Cut formulas (Part A), ASCII diagrams, jargon-heavy headings, squashed table formulas, wide content cut on phones. Fix each; keep content correct.

## Done when

`check:math` passes and is in CI; `check:mdx`, `check:links`, typecheck and the touched tests pass; the Playwright formula/clipping check passes on all 13 search pages and the 10 sampled others at 1440 and 375 px; contact sheets in `docs/evidence/math-fix/`; report in `docs/plans/math-and-clarity-fix-report.md`.
