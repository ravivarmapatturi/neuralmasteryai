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
| MLOps / Roadmap (landing page) | Short landing variant drafted | Not applicable | No code widgets | Four views captured/inspected; route label guard passed | Notebook pass | Global static pass | Checked |

## Notes

- Full Vitest passed (231 files, 1,172 tests) after the MLOps SyncVsAsync diagram repair. MLOps label guard passed 8/8; all six MLOps RunnableCode exercises passed in the browser.
- Four-view screenshots are captured for BM25 and Ranking Fundamentals in `search-1/`, and Semantic & Hybrid Search and Autonomous Loops in `search-2/`. All four samples rendered at 1440 and 375 px in light and dark themes, with no console errors or horizontal overflow. Screenshots remain local evidence and are not staged.
- The production build is deferred if available RAM remains below 5 GiB, per `AGENTS.md`.
- “Cross-checked” confirms only that the new worksheet cells reuse the listed page example values; it does not replace a full editorial review.

| MLOps / Overview (landing page) | Short landing variant drafted | Not applicable | No code widget | SVG/label guard passed; route render was observed | Notebook pass | Global static pass | Checked |
| MLOps / Roadmap (landing page) | Short landing variant drafted | Not applicable | No code widget | Four views captured and inspected; label guard passed | Notebook pass | Global static pass | Checked |
| MLOps / Experiment Tracking | Standard sections and examples ordered; mechanism headings retained | Worksheet values copied from four-run MLflow result table | Python winner-selection exercise passed in browser | Four-view sample not required; route label guard passed | Notebook pass | Global static pass | Checked |
| MLOps / Engineering Foundations | Standard section order with package process and test mechanisms | Worked cases match tests (`$1,200.50`, `0`, `-42`, `N/A`) | Standard-library Pyodide exercise passed in browser | Four views captured/inspected; SVG label guard passed | Notebook pass | Global static pass | Checked |

| MLOps / Big Data & Analytics | Standard structure complete | Three sales rows and group totals match worksheet/query | Python aggregation passed in browser | SVG label guard passed | Notebook pass | Global static pass | Checked |
| MLOps / Data Engineering & Versioning | Standard structure complete; existing mechanisms retained | Four transaction rows match contract example | Data validation count exercise passed in browser | SVG label guard passed | Notebook pass | Global static pass | Checked |
| MLOps / Pipeline Orchestration | Standard structure complete; retry delays match equation and worksheet | 30-second initial delay, 300-second cap, attempts 0–4 | Backoff exercise passed in browser | SVG label guard passed | Notebook pass | Global static pass | Checked |
| MLOps / Message Queues & Async Processing | Standard structure complete; queue arithmetic and delivery mechanisms | 8 arrivals/s minus 6 completions/s yields 120 added/min | Backlog exercise passed in browser | SVG label guard passed after SyncVsAsync repair | Notebook pass | Global static pass | Checked |

| MLOps / Containers | Standard sections complete | Worked Docker image-to-container example | Copyable Docker commands | Four views captured/inspected; 3-viewport label guard passed | Notebook pass | Math / MDX / links pass | Checked |
| MLOps / Cloud Computing | Standard sections complete | Storage and compute choices matched to ML workloads | Copyable AWS CLI commands | Four views captured/inspected; 3-viewport label guard passed | Notebook pass | Math / MDX / links pass | Checked |
| MLOps / Deploying Models on AWS & Azure | Standard sections complete | Traffic shape matched to four deployment modes | Copyable SageMaker CLI command | 3-viewport label guard passed | Notebook pass | Math / MDX / links pass | Checked |
| MLOps / Kubernetes | Standard sections complete; mechanisms retained | 100 requests/s per pod example matches worksheet | Copyable kubectl commands | 3-viewport label guard passed | Notebook pass | Math / MDX / links pass | Checked |
| MLOps / Infrastructure as Code | Standard sections complete; mechanisms retained | One-to-eight GPU replacement plan matches worksheet | Copyable Terraform plan commands | 3-viewport label guard passed | Notebook pass | Math / MDX / links pass | Checked |
| MLOps / CI/CD & ML CI/CD | Standard sections complete; mechanisms retained | Candidate intervals match the gate example | Copyable lint, test, and gate commands | 3-viewport label guard passed | Notebook pass | Math / MDX / links pass | Checked |
| MLOps / Feature Stores & Model Registry | Standard sections complete; mechanisms retained | October 6 and October 10 as-of values match source example | Copyable Feast commands | 3-viewport label guard passed | Notebook pass | Math / MDX / links pass | Checked |
| MLOps / APIs & Model Serving | Standard sections complete; mechanisms retained | Queueing values match the 100 requests/s example | Copyable pytest and Uvicorn commands | 3-viewport label guard passed | Notebook pass | Math / MDX / links pass | Checked |

| MLOps / Deployment Strategies | Standard sections complete | 1% of 600 requests/min for 10 min gives 60 requests | Existing canary calculation and copyable deployment steps | Four views captured/inspected; 3-viewport label guard passed | Notebook pass | Math / MDX / links pass | Checked |
| MLOps / Monitoring & Drift Detection | Standard sections complete | PSI/Wasserstein example matches 1,000 and 100,000 sample results | Existing Python drift measurements | 3-viewport label guard passed | Notebook pass | Math / MDX / links pass | Checked |
| MLOps / Observability | Standard sections complete | 95×20 ms + 5×2,000 ms yields 119 ms mean | Existing instrumented API and rule commands | 3-viewport label guard passed | Notebook pass | Math / MDX / links pass | Checked |
| MLOps / GPU Infrastructure & Distributed Training | Standard sections complete; ELI5 and ending added | Batch 256 over 8 processes gives 32 examples/process | Copyable torchrun and DeepSpeed commands | 3-viewport label guard passed | Notebook pass | Math / MDX / links pass | Checked |
| MLOps / Federated Learning | Standard sections complete; ending added | FedAvg of 10 examples at 0.0 and 30 at 1.0 gives 0.75 | Copyable Flower simulation command | 3-viewport label guard passed | Notebook pass | Math / MDX / links pass | Checked |
| MLOps / LLM Inference Engines | Standard sections complete | 16-request throughput values match batch-size experiment | Existing benchmark code and engine CLI prompt | 3-viewport label guard passed | Notebook pass | Math / MDX / links pass | Checked |
| MLOps / LLM Hosting & Serving Patterns | Standard sections complete | At 50% utilization, cost rounds to $0.56 per million tokens | Existing sizing and utilization examples | Four views captured/inspected; 3-viewport label guard passed | Notebook pass | Math / MDX / links pass | Checked |
| MLOps / LLM Evaluation & RAGOps | Standard sections complete | BM25 and dense Recall@3/MRR/nDCG values match evaluation output | Existing retrieval evaluation script | 3-viewport label guard passed | Notebook pass | Math / MDX / links pass | Checked |

| MLOps / AI Cost Engineering | Standard sections complete | Monthly cost values match calculator: $66,600 → $50,400 → $23,400 → $17,400 | Existing cost calculator | Four views captured/inspected; 3-viewport label guard passed | Notebook pass | Math / MDX / links pass | Checked |
| MLOps / Caching Strategies | Standard sections complete | 50%, 90%, and 99% hit-rate latencies match worksheet | Existing Redis examples | 3-viewport label guard passed | Notebook pass | Math / MDX / links pass | Checked |
| MLOps / Legal Licensing & Governance | Standard sections complete; primary EU references | AI Act application dates match cited timeline | No code widget | 3-viewport label guard passed | Notebook pass | Math / MDX / links pass | Checked |
| MLOps / Security & Reproducibility | Standard sections complete | No numeric worksheet; artifact provenance preserved | Existing reproducibility examples | 3-viewport label guard passed | Notebook pass | Math / MDX / links pass | Checked |
| MLOps / ML & LLM Testing | Standard sections complete | Wilson intervals match 19/20, 190/200, and 50/50 examples | Existing statistical calculation | 3-viewport label guard passed | Notebook pass | Math / MDX / links pass | Checked |
| MLOps / Production Reliability | Standard sections complete | Availability and downtime values match worksheet | Existing reliability examples | 3-viewport label guard passed | Notebook pass | Math / MDX / links pass | Checked |
| MLOps / Architecture & Roadmap | Standard sections complete; lifecycle and CI/CD diagrams | No numeric worksheet | Existing diagrams | Four views captured/inspected; 3-viewport label guard passed | Notebook pass | Math / MDX / links pass | Checked |
