# Page standard rollout scorecard

Statuses describe the current worktree. “Global pass” means the named check passed against the combined changed-page set. Browser, live RunnableCode, and page-by-page editorial review remain pending until observed.

| Page | Required opening and section order | Worksheet matches example | RunnableCode present | Visual labels + 4-view browser | Notebook | Math / MDX / links | Voice grep |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Search / BM25 | Drafted; review order | Cross-checked | Yes; runtime pending | Four views captured and inspected; SVG guard pending | Global pass | Global pass | Checked |
| Search / Deep recommenders | Drafted; review order | Cross-checked | Yes; runtime pending | Pending | Global pass | Global pass | Checked |
| Search / Exploration loops | Drafted; review order | Cross-checked | Yes; runtime pending | Pending | Global pass | Global pass | Checked |
| Search / Learning to rank | Drafted; review order | Cross-checked | Yes; runtime pending | Pending | Global pass | Global pass | Checked |
| Search / Matrix factorization | Drafted; review order | Cross-checked | Yes; runtime pending | Pending | Global pass | Global pass | Checked |
| Search / Ranking metrics | Drafted; review order | Cross-checked | Yes; runtime pending | Pending | Global pass | Global pass | Checked |
| Search / Ranking fundamentals | Drafted; review order | Cross-checked | Yes; runtime pending | Four views captured and inspected; SVG guard pending | Global pass | Global pass | Checked |
| Search / Recommendation foundations | Drafted; review order | Cross-checked | Yes; runtime pending | Pending | Global pass | Global pass | Checked |
| Search / Semantic and hybrid search | Drafted; review order | Cross-checked | Yes; runtime pending | Four views captured and inspected; SVG guard pending | Global pass | Global pass | Checked |
| Search / System design | Drafted; review order | Cross-checked | Yes; runtime pending | Pending | Global pass | Global pass | Checked |
| Search / Inverted indexes | Drafted; review order | Cross-checked | Yes; runtime pending | Pending | Global pass | Global pass | Checked |
| Harness / Autonomous loops | Drafted; review order | Cross-checked | Yes; runtime pending | Four views captured and inspected; SVG guard pending | Global pass | Global pass | Checked |
| Harness / Context and instructions | Drafted; review order | Cross-checked | Yes; runtime pending | Pending | Global pass | Global pass | Checked |
| Harness / Architecture | Drafted; review order | Cross-checked | Yes; runtime pending | Pending | Global pass | Global pass | Checked |
| Harness / State continuity | Drafted; review order | Cross-checked | Yes; runtime pending | Pending | Global pass | Global pass | Checked |
| Harness / Verification loops | Drafted; review order | Cross-checked | Yes; runtime pending | Pending | Global pass | Global pass | Checked |
| Harness / Roadmap (landing page) | Short variant drafted | Existing architecture drawing | No code widgets | Pending | Global pass | Global pass | Checked |
| Deep Learning / Neural Network Fundamentals | Drafted; needs full section/diagram review | XOR labels and fixed-seed predictions copied from the exercise | NumPy exercise added; Pyodide runtime pending | Pending | Notebook pass | MDX, links, math pass | Checked |
| LLMs & GenAI / RAG | Drafted; needs full mechanism/section review | Five-chunk retrieval and reranking counts match the example | Standard-library scoring exercise added; runtime pending | Pending; route-specific guard pending | Notebook, MDX, links, math pass | Global static pass | Checked |
| MLOps / LLM Inference Optimization | Drafted; needs full mechanism/section review | Roofline worksheet matches the 8B/H100 code example | Standard-library roofline exercise added; runtime pending | Pending; route-specific guard pending | Notebook, MDX, links, math pass | Global static pass | Checked |
| MLOps / Roadmap (landing page) | Short landing variant drafted | Not applicable | No code widgets | Four-view browser run queued behind `/tmp/nm-heavy.lock` | Notebook pass | MDX and link pass; broad typecheck/math pending rerun | Voice check pending |

## Notes

- Full Vitest passed (231 files, 1,172 tests) after the inference diagram edit. Focused Playwright route checks passed RAG and inference optimization; Learning to Rank and Matrix Factorization still time out before their article H1 renders. The roadmap four-view capture is waiting for the shared lock.
- Four-view screenshots are captured for BM25 and Ranking Fundamentals in `search-1/`, and Semantic & Hybrid Search and Autonomous Loops in `search-2/`. All four samples rendered at 1440 and 375 px in light and dark themes, with no console errors or horizontal overflow. Screenshots remain local evidence and are not staged.
- The production build is deferred if available RAM remains below 5 GiB, per `AGENTS.md`.
- “Cross-checked” confirms only that the new worksheet cells reuse the listed page example values; it does not replace a full editorial review.

| MLOps / Overview (landing page) | Short landing variant drafted | Not applicable | No code widget | SVG/label guard passed; route render was observed | Notebook pass | Global static pass | Checked |
| MLOps / Roadmap (landing page) | Short landing variant drafted | Not applicable | No code widget | Four views captured and inspected; label guard passed | Notebook pass | Global static pass | Checked |
| MLOps / Experiment Tracking | Standard sections and examples reordered; mechanism headings need normalization | Worksheet values copied from four-run MLflow result table | Python winner-selection exercise; browser runtime pending | SVG/label guard passed; full four-view page capture not yet done | Notebook pass | Global static pass | Checked |
