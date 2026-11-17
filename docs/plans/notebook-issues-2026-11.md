# Issue list: pages that are not clear, simple, visual and handwritten (17 Nov 2026)

Owner goal: every complex topic explained **simply and clearly**, with **visualisations**, in a **handwritten notebook** style, with no AI slop. This file is the issue list. Step 1: Claude's list (below). Step 2: Codex verifies every item in a real browser, adds what Claude missed, and writes the final list. Step 3: fix in batches. Step 4: Claude releases.

## A. Found by Claude in the owner's 6 screenshots

| # | Page | What is wrong | Category |
|---|------|---------------|----------|
| A1 | tf-idf, "Explore TF-IDF" widget | Crisp rectangular cards and a plain grid table; looks like a dashboard, not a notebook. Shouty small-caps labels ("LEXICAL SCORING & SPARSE RETRIEVAL", "SELECT SEARCH QUERY:"). Formula written as code text `IDF(t) = ln(N / df)` instead of maths. | Not handwritten, widget chrome |
| A2 | tf-idf, "Vector Space Model" | Academic tone ("Beyond summing scalar weights… mathematical foundation… Salton et al., 1975", "|V|-dimensional Euclidean space", "projecting all documents onto a unit hypersphere"). No picture of documents as arrows in a space, which is the whole idea. | Not simple, no visual |
| A3 | tf-idf | Fake code: a `doc_vector = [0.0, 0.0, 0.0719…]` "code" block that is really an illustration. Should be a drawn sparse vector (row of boxes, most empty). | Rule 1 fake code |
| A4 | tf-idf, cosine formula | Big nested-sum formula with no picture of the angle between two arrows; formula frame not hand-drawn. | No visual, maths frame |
| A5 | tf-idf, PredictFirst | Four plain rectangular option boxes; reads like a test form. | Not handwritten |
| A6 | tf-idf, "Limitations" | "automobile repair" vs "how to fix a car" shown as monospace strings plus a centred formula `Score(...) = 0.0000`; this is a perfect spot for a two-column drawing (query words / document words, no lines connecting). Jargon: "principled relevance weighting", "lexical matching", "Furnas et al. 1987", "projecting synonyms into continuous embedding spaces". | Not simple, no visual |
| A7 | harness-engineering/context-and-instruction-design | Whole AGENTS.md shown as an uncoloured plain fence (markdown pseudo-code), then an ASCII arrow flow ("Raw Python File … ▼"). Headings like "Production AGENTS.md Specification", "authoritative reference configuration". | Rule 1, Rule 2, jargon |
| A8 | recommendation-foundations | ASCII flow "Query-Driven Search: [User Query] ─→ Lexical / Dense Match ─→ …" in a code box; must be a pen diagram (two lanes: search vs recommendation). Text: "derive the mathematical foundations of user-item candidate generation", "context-driven modalities", "x_u", "R ∈ ℝ^{m×n}" before any picture of the matrix. | Rule 2, not simple |
| A9 | recommendation-foundations | "Simple Explanation" box is a perfect rectangle with a heavy border; good content, wrong look. | Not handwritten |
| A10 | bm25 (live screenshot 16 Nov) | Calculator result cards are crisp rectangles with tiny caps labels; footnote text in tiny font ("Fixed corpus: N=1,000 …"). Symbol table is a plain HTML grid with a stacked `\frac` (avgdl) in a cell. "Deriving the Robertson BM25 Formula" heading and "Parameter Heuristics in Production" (a plain-text pseudo-heading). | Not handwritten, Rule 3, Rule 4 |

## B. Sitewide numbers from `node scripts/check-notebook.mjs --report` (static scan, 17 Nov)

276 pages with 882 violations: fake / unnamed code fences 309, ASCII diagrams 388, single-line or table-cell maths 13, bold pseudo-headings 5, long pages with fewer than 3 visuals 167. Worst sections: MLOps 192, Machine Learning 160, Blog 121, Deep Learning 87, Agents 85, Practice problems 62, Search/Ranking/Recs 39. Full list: `docs/evidence/site-audit/notebook-violations.json`.

## C. Patterns the static check cannot see (must be checked in a real browser, per page)

1. **Look:** no ruled paper, no red margin, crisp rectangular cards/tables/widgets everywhere, small-caps "eyebrow" labels, tiny grey footnotes.
2. **Tone (AI slop):** academic register, citations in the main text, words like "principled", "canonical", "authoritative", "modalities", "fundamental limitation inherent to", long sentences stacking three ideas. Theory and history belong in one `GoDeeper`.
3. **Order:** formula or symbols before the picture and the plain-words idea. The order must be: problem → picture → plain words → small worked numbers → formula → calculator.
4. **Missing pictures** where the concept is visual (vectors, angles, matrices, pipelines, before/after).
5. **Widgets:** interactive pieces that look like admin dashboards (rectangles, uppercase labels, code-style formulas) instead of a page someone drew.
6. **Numbers:** same worked numbers in text, picture, table and calculator.
7. **Cut / overflow:** anything clipped at 375 px or on desktop.

## D. What Codex must do with this list

1. Verify each A item in a real browser (1440 and 375 px). Mark confirmed / not reproduced, with a screenshot path.
2. Run the C checks on the 13 search pages, the 10 most-visited Learn pages, and 10 random pages from MLOps, ML, Deep Learning, Agents, Blog. Add every new issue with page, section, category and screenshot.
3. Write the final ranked list to `docs/evidence/site-audit/final-issue-list.md` (worst and most-visited first). STOP and report; Claude reviews it with the owner before fixes.
