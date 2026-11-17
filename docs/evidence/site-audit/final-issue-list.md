# Final live-site notebook issue list

Audit date: 17 November 2026. Target: `https://neuralmasteryai.com`. Browser: headless Chromium via Playwright, direct live-site navigation. Captures are full-page page screenshots at 1440 × 900 and 375 × 900. Every selected route loaded with HTTP 200, and the mobile document width measured 375 px. No horizontal page overflow was observed in sampled mobile pages. This does not establish that every embedded formula or widget is internally unclipped.

Traffic ranking data was not available locally or on the public site. The ten Learn routes below are a high-traffic proxy covering core transformer, neural-network, RAG, prompt, LLM, MLOps, security, and evaluation chapters, not a verified analytics ranking. Ranking prioritizes broad failures on core search pages, then the additional samples.

## Claude's A items: browser verification

| Item | Result | Evidence |
|---|---|---|
| A1 — TF-IDF explorer cards, grid, small-caps labels, formula | Confirmed: crisp blue rectangular panels and a conventional grid; compact dashboard-like controls; no ruled notebook surface. | [1440 px](shots/search-search-ranking-recommendations--tf-idf-1440.png) · [375 px](shots/search-search-ranking-recommendations--tf-idf-375.png) |
| A2 — Vector Space Model academic prose and missing vector-space picture | Confirmed: prose/formula/table led; no pen sketch of document arrows and their shared vector space. | Same TF-IDF captures |
| A3 — illustrative sparse vector in a code fence | Confirmed: sparse-vector example is code-style content, not empty/non-empty coordinate boxes drawn on the page. | Same TF-IDF captures |
| A4 — cosine formula without angle sketch or hand-drawn frame | Confirmed: typeset formula, without paired arrow/angle picture or irregular pen-drawn formula frame. | Same TF-IDF captures |
| A5 — PredictFirst options look like form controls | Confirmed: regular rectangular choices, not sketched options. | Same TF-IDF captures |
| A6 — synonym limitation shown as strings and score, with jargon | Confirmed: textual/numeric explanation without a two-column query/document word drawing. | Same TF-IDF captures |
| A7 — context-and-instruction-design AGENTS.md fence and ASCII flow | Confirmed on the exact live route: the page includes the plain AGENTS.md specification block and raw-file flow within a conventional documentation page. | [1440 px](shots/a7-context-and-instruction-design-1440.png) · [375 px](shots/a7-context-and-instruction-design-375.png) |
| A8 — recommendation-foundations ASCII flow and unexplained symbols | Confirmed: document-style prose, formulas and straight-edged panels without a notebook surface. | [1440 px](shots/search-search-ranking-recommendations--recommendation-foundations-1440.png) · [375 px](shots/search-search-ranking-recommendations--recommendation-foundations-375.png) |
| A9 — rectangular “Simple Explanation” panel | Confirmed: clean rectangular card rather than sketch box. | Same Recommendation Foundations captures |
| A10 — BM25 cards, footnote, table fraction and heading hierarchy | Confirmed: calculator panels/table are straight-edged; supporting labels are small. The formula/table and pseudo-heading details match the reported source pattern. | [1440 px](shots/search-search-ranking-recommendations--bm25-1440.png) · [375 px](shots/search-search-ranking-recommendations--bm25-375.png) |

## Ranked issues

### 1. Missing notebook page surface on core Search & Recommendation chapters

**Pages:** all 13 Search & Recommendation routes listed under Route coverage.

**Category:** Site styling / notebook identity. **Severity:** highest: pervasive across the first-party search curriculum.

The live reading surface is a conventional white documentation page: no visible ruled paper, red margin line, notebook masthead/date, or persistent hand-drawn page treatment. This makes useful explanations feel like clean technical documentation. See [TF-IDF desktop](shots/search-search-ranking-recommendations--tf-idf-1440.png) and [mobile](shots/search-search-ranking-recommendations--tf-idf-375.png). Every route has paired captures named `search-search-ranking-recommendations--<slug>-<width>.png`.

### 2. Search widgets and callouts use crisp dashboard/document controls

**Pages/sections:** TF-IDF Explore TF-IDF, PredictFirst, Limitations; BM25 calculator; Recommendation Foundations Simple Explanation; similar scoring and selection widgets across the section.

**Category:** Widget chrome / handwritten style.

Rectangular cards, even borders, small uppercase labels, and ordinary grid tables dominate interactive sections. They look like dashboard components instead of sketches on a learner's page. TF-IDF is clearest (A1, A5, A9); BM25 repeats the pattern (A10). See the linked captures above.

### 3. Visual concepts lack the picture that carries the idea

**Pages/sections:** TF-IDF Vector Space Model and cosine similarity; TF-IDF synonym limitation; Recommendation Foundations query/recommendation pipeline and user-item matrix; current Context Engineering route for the cited context/instruction flow.

**Category:** Missing/non-pen visual / teaching order.

Vector arrows and their angle, sparse coordinates, query/document word overlap, search-versus-recommendation lanes, and matrix structure should be pictured before notation. Current explanations rely on prose, formulas, code-like blocks, or straight-edged UI. Exact A7 content was not reproduced on the current route; its captures establish only the broader style finding.

### 4. Technical register and symbols arrive before an intuitive visual

**Pages/sections:** TF-IDF Vector Space Model and Limitations; Recommendation Foundations opening and mathematical setup; BM25 derivation/heuristics.

**Category:** Clarity / tone / ordering.

Academic framing and citation-heavy explanation interrupt the simple explanation. Terms and symbols such as vector-space dimension, unit hypersphere, modalities, and matrix notation appear before a concrete picture. Move history and formal details into `GoDeeper` after the problem, picture, plain-language explanation, small numbers, and formula. Evidence: TF-IDF and Recommendation Foundations captures above.

### 5. Dense supporting text and tables are hard to scan on phones

**Pages:** BM25 and TF-IDF worked examples/tables; repeated supporting labels on Search & Recommendation pages.

**Category:** Readability / hierarchy.

Small grey labels and footnotes are difficult to read at phone size; dense tables are compressed to fit rather than simplified or contained in an intentional scroll frame. Sampled documents fit the 375 px viewport, but full-page captures show compressed table/footnote text. This is a readability issue without horizontal overflow. See [BM25 mobile](shots/search-search-ranking-recommendations--bm25-375.png) and [TF-IDF mobile](shots/search-search-ranking-recommendations--tf-idf-375.png).

### 6. The sampled Learn, Agents, MLOps, ML, Deep Learning, and Blog pages share document-first styling

**Category:** Sitewide notebook consistency. **Scope:** 10 pages, two each from MLOps, Machine Learning, Deep Learning, Agents, Blog, at both widths.

The sampled pages use conventional documentation/blog layouts and do not consistently show ruled paper, red margin, masthead, and hand-drawn page treatment. Paired screenshots have prefix `sample-` in `shots/`:

- MLOps: `llm-evaluation-and-ragops`, `llm-hosting-and-serving-patterns`.
- Machine Learning: `decision-tree`, `boosting`.
- Deep Learning: `recurrent-looped-transformers`, `optimizers`.
- Agents: `multi-agent-systems`, `context-engineering`.
- Blog: `agent-skills-explained`, `do-agents-need-a-memory-system`.

Some initial guessed paths returned 404 and are excluded; valid routes above replaced them.

## Route coverage

- Search & Recommendation (13): `overview`, `text-search-bm25`, `tf-idf`, `bm25`, `semantic-and-hybrid-search`, `ranking-fundamentals`, `ranking-evaluation-metrics`, `learning-to-rank`, `recommendation-foundations`, `matrix-factorization-embeddings`, `deep-recommenders`, `exploration-feedback-loops`, `search-recommendation-system-design`.
- High-traffic proxy Learn set (10): `deep-learning/attention-transformers`, `deep-learning/neural-network-fundamentals`, `llms-genai/rag`, `llms-genai/prompt-engineering`, `llms-genai/foundation-model-internals`, `mlops/llm-inference-optimization`, `mlops/ml-and-llm-testing`, `ml-system-design/llm-capacity-estimation`, `ai-security/owasp-llm-top-10-and-prompt-attacks`, `ai-evaluation/llm-rag-agent-evaluation`.
- Category sample (10): two routes per category listed under issue 6.

## Method and limits

The public site was opened in Chromium one page at a time. Screenshots are actual full-page captures at 1440 × 900 and 375 × 900. The probe checked HTTP response, page heading, and mobile document width. The A-item pages and sample screenshots were visually reviewed for the listed style and layout patterns. This was a default-theme audit; it does not assess dark mode, and worked-number consistency was not recomputed on every route. Traffic ranking was unavailable; the ten Learn routes are a reasoned popularity proxy.
