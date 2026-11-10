# New Key-Points Held-Out Verification — 10 November 2026

The new key-point sets added this week exceed the historical baseline in both detection rate and precision: across 36 held-out answers (144 point decisions) on 12 newly keyed questions, the live browser WASM judge achieved **37 correct detections (true positives)** and only **2 false positives**, yielding **74.3% overall agreement** (107/144).

By comparison, the original frozen baseline scored 23 correct detections and 3 false positives across 30 rubric answers (135 point decisions) with 65.9% agreement. The new key points show higher positive recall (51.4% vs 34.8%), lower false positive rate on negative points (2.8% vs 4.3%), and high discriminative power on weak answers (46/48 true negatives, 95.8% agreement).

> [!NOTE]
> **Methodology & Rater Transparency**:
> Per the task specification, these 36 held-out answers and ground-truth hand marks were authored by an AI agent (Antigravity), not an independent human rater. The 36 answers and ground-truth labels were committed to version control in `docs/evidence/interview/new-keypoints-heldout.json` (`2692a644`) before launching any model or evaluation process.

---

## Performance vs Original Baseline

| Metric | Original Rubric Baseline (30 answers) | New Key-Points Run (36 answers) | Delta / Trend |
| :--- | ---: | ---: | :--- |
| **Total answers scored** | 30 | 36 | +6 answers |
| **Total point decisions** | 135 | 144 | +9 decisions |
| **Correct detections (True Positives)** | **23** | **37** | **+14 (+60.9% increase)** |
| **False Positives** | **3** | **2** | **-1 (-33.3% reduction)** |
| **True Negatives** | 66 | 70 | +4 |
| **False Negatives** | 43 | 35 | -8 (-18.6% reduction) |
| **Positive Recall (TP / [TP + FN])** | 34.8% | 51.4% | +16.6% |
| **False Positive Rate (FP / [FP + TN])** | 4.3% | 2.8% | -1.5% |
| **Overall Agreement ([TP + TN] / Total)** | **65.9%** | **74.3%** | **+8.4%** |

---

## Breakdown by Answer Strength (New Key Points)

Each of the 12 questions was evaluated on 3 distinct answers (4 points per question = 48 point decisions per tier):

| Answer Tier | Expected Hits | Detected (TP) | False Positives (FP) | False Negatives (FN) | True Negatives (TN) | Agreement |
| :--- | :---: | ---: | ---: | ---: | ---: | ---: |
| **Strong** (12 answers) | 48 | 27 | 0 | 21 | 0 | **56.3%** (27/48) |
| **Partial** (12 answers) | 24 | 10 | 0 | 14 | 24 | **70.8%** (34/48) |
| **Weak** (12 answers) | 0 | 0 | 2 | 0 | 46 | **95.8%** (46/48) |
| **Total** (36 answers) | 72 | **37** | **2** | **35** | **70** | **74.3%** (107/144) |

### Key Observations:
1. **Zero False Positives in Partial Answers**: On partial answers, the judge cleanly detected 10 covered points while correctly rejecting all 24 omitted points (100% specificity).
2. **Robust Handling of Swapped Definitions**: The weak answer set included two deliberately swapped definitions:
   - `genai-cost-latency-ttft-tpot-weak` (swapped TTFT and TPOT definitions)
   - `genai-dense-vs-sparse-search-weak` (swapped dense and sparse search definitions)
   Both swapped answers scored 0 false positives on their respective swapped points, correctly classifying them as not covered.
3. **Primary Error Mode (False Negatives)**: False negatives accounted for 35 of the 37 errors. Analysis of the runtime traces reveals that MobileBERT NLI's sentence-level conflict detector (`conflicts >= 0.8`) frequently flags cross-talk between different valid sentences within comprehensive answers, overriding genuine point matches.

---

## 12 Held-Out Questions Sampled Across Tracks

Two questions were selected from each of the 6 core domains, all using newly generated key points from `src/data/interviewKeyPoints.json`:

1. **Evaluation**:
   - `genai-eval-llm-as-judge`: *How do you design an LLM-as-a-judge evaluation harness and mitigate systematic biases?*
   - `genai-eval-rag-triad-hallucination`: *How do you evaluate RAG systems for hallucination using the RAG Triad?*
2. **Agents**:
   - `genai-agent-react-tool-calling`: *How does an autonomous ReAct agent loop work and how do you prevent runaway execution?*
   - `genai-agent-single-vs-multi`: *When should you build a multi-agent system versus a single agent with multiple tools?*
3. **Inference**:
   - `genai-cost-latency-ttft-tpot`: *How do you measure and optimize Time-To-First-Token (TTFT) and Time-Per-Output-Token (TPOT)?*
   - `genai-serving-kv-cache-pagedattention`: *Why does the KV cache bottleneck LLM serving memory, and how does PagedAttention solve it?*
4. **RAG**:
   - `genai-chunking-strategies`: *How do you choose chunk size and chunking strategy in a production RAG system?*
   - `genai-dense-vs-sparse-search`: *Why do production retrieval systems combine dense vector search with sparse keyword search?*
5. **Debug This**:
   - `senior:debug-retrieval-recall-drop-reindex`: *After re-indexing 2M documents with a new HNSW index in Milvus, top-10 retrieval recall dropped from 89% to 64% while query latency dropped from 42ms to 8ms. How do you triage this?*
   - `senior:debug-continuous-batching-ttft-tail-spike`: *After enabling continuous batching in vLLM with max_num_seqs=256, p50 time-to-first-token stayed flat at 110ms, but p99 TTFT jumped from 180ms to 2,850ms during peak 40 req/s load. What is happening?*
6. **Coding**:
   - `senior:coding-chunker-token-aware`: *Implement a token-aware recursive text chunker in Python with configurable overlap and sentence boundary preservation. What would you test?*
   - `senior:coding-bm25-from-scratch`: *Implement Okapi BM25 scoring from scratch in Python given inverted document frequencies, term frequencies, and document lengths. What edge cases must you handle?*

---

## Top 10 Points with Disagreements & Recommended Rewordings

While the new key points performed better than baseline, 10 points exhibited elevated false negatives or false positives. The root cause is primarily compound multi-clause sentences or vocabulary disconnects with lightweight 8-bit cross-encoders.

| # | Question ID | Current Point Text | Error Pattern | Diagnosis & Recommended Rewording |
| :--- | :--- | :--- | :---: | :--- |
| 1 | `genai-eval-rag-triad-hallucination` | *Faithfulness checks claims against retrieved context.* | 2 FN (missed) | **Root Cause**: Embedding similarity fell below `0.35` threshold when candidates used terms like "groundedness" or "factual support".<br>**Rewording**: *"Faithfulness verifies response claims are grounded in context."* |
| 2 | `genai-agent-single-vs-multi` | *Start with a single agent.* | 2 FN (conflict) | **Root Cause**: Discussing when to transition to multi-agent architectures triggered high NLI conflict against "single agent".<br>**Rewording**: *"Default to a single agent before splitting into multiple agents."* |
| 3 | `genai-cost-latency-ttft-tpot` | *Shorten prompts and cache shared prefixes for TTFT.* | 2 FN (conflict) | **Root Cause**: Compound clause combining prompt length and prefix caching.<br>**Rewording**: *"Optimize TTFT using prompt caching and concise prompts."* |
| 4 | `genai-serving-kv-cache-pagedattention` | *Cache memory grows with tokens and concurrent requests.* | 2 FN (missed) | **Root Cause**: Low embedding similarity against technical descriptions of batch size, layer count, and sequence lengths.<br>**Rewording**: *"KV cache memory scales with sequence length and concurrency."* |
| 5 | `genai-chunking-strategies` | *Small chunks improve precision but lose context.* | 2 FN (missed/conflict) | **Root Cause**: Contrast clause ("improve X but lose Y") creates contradictory entailment signals in NLI models.<br>**Rewording**: *"Small chunks give high retrieval precision but less context."* |
| 6 | `genai-chunking-strategies` | *Large chunks dilute embeddings and consume more tokens.* | 2 FN (conflict) | **Root Cause**: Compounded clause ("dilute embeddings and consume more tokens").<br>**Rewording**: *"Large chunks dilute vector representations and context window."* |
| 7 | `genai-dense-vs-sparse-search` | *Sparse retrieval preserves exact names, codes and rare terms.* | 1 FN, 1 FP | **Root Cause**: Weak answer triggered false positive match due to mentioning lexical terms.<br>**Rewording**: *"Sparse keyword search matches exact terms, IDs and rare words."* |
| 8 | `senior:debug-continuous-batching-ttft-tail-spike` | *Long prefills block queued generations.* | 2 FN (missed) | **Root Cause**: "Generations" vs "decoding" vocabulary gap in MiniLM embeddings.<br>**Rewording**: *"Compute-heavy prompt prefills starve or delay decode requests."* |
| 9 | `senior:coding-chunker-token-aware` | *Split by paragraphs, then sentences, then words as needed.* | 2 FN (missed) | **Root Cause**: Procedural enumeration ("then... then...") has low semantic similarity with descriptions of recursive delimiter hierarchies.<br>**Rewording**: *"Recursively split text using a hierarchy of delimiters."* |
| 10 | `senior:coding-bm25-from-scratch` | *Combine inverse document frequency with saturated term frequency.* | 2 FN (conflict/missed) | **Root Cause**: "Saturated term frequency" phrasing was marked as conflicting when candidate answers discussed parameter `k1` and length penalties.<br>**Rewording**: *"Multiply IDF by term frequency with saturation control."* |

---

## Execution Environment & Safety Verification

1. **Live Model Mirror**: Pinned model assets were served via `scripts/interview/judge-v2-models.mjs serve` on `http://127.0.0.1:5188` from `/tmp/neuralmastery-judge-v2-models`.
2. **Host Memory Guard**: Execution ran under `scripts/speech-accuracy/with-memory-floor.mjs` with an active 2,048 MiB available RAM floor. Available memory remained above 2,500 MiB throughout the scoring run.
3. **Execution Runtime**: 36 answers scored in 16.4 seconds (~455 ms per answer) on 1 CPU thread via browser WASM (Chromium).
4. **Cleanup Verification**: All background server tasks (`task-100`) and browser processes were terminated immediately upon completion. Port 5188 was verified closed (`lsof -i :5188` returned empty).
