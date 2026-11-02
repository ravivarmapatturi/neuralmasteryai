# Track Deepening & AI Engineering Progress Notes

This document records the pages deepened, new tracks added, primary sources verified with active URLs, and execution verification notes in compliance with `AGENTS.md` and the task brief `docs/briefs/agy-tracks-and-blog.md`.

---

## 1. Blog Post

- **Path**: `src/content/blog/what-is-changing-in-ai-engineering-and-what-to-learn-next.mdx`
- **Slug**: `what-is-changing-in-ai-engineering-and-what-to-learn-next`
- **Title**: What Is Changing in AI Engineering and What to Learn Next
- **Word count**: 2,094 words
- **Diagram Component**: `src/viz/diagrams/AiEngineeringLearningLadder.tsx` (tested via `AiEngineeringLearningLadder.test.tsx`, 2 passing tests)
- **Primary Sources & Attributions**:
  - Hoang Nguyen, *A Practical Roadmap to Learn Agentic Engineering*, Codeaholicguy (June 10, 2026): [https://codeaholicguy.com/2026/06/10/a-practical-roadmap-to-learn-agentic-engineering/](https://codeaholicguy.com/2026/06/10/a-practical-roadmap-to-learn-agentic-engineering/)
  - Wes Reisz with Karthik Ramgopal & Prince Valluri (LinkedIn), *Platform Engineering for AI: Scaling Agents and MCP at LinkedIn*, InfoQ Podcast (December 10, 2025): [https://www.infoq.com/podcasts/platform-engineering-scaling-agents/](https://www.infoq.com/podcasts/platform-engineering-scaling-agents/)
  - Matt Tanner, *Context Engineering for AI Agents: Complete 2026 Guide*, Sourcegraph (September 15, 2026): [https://sourcegraph.com/blog/context-engineering](https://sourcegraph.com/blog/context-engineering)
  - Aron Schuhmann & Sam Bhagwat, *Context Engineering for AI Agents: A Practical Guide*, Mastra [vendor article] (August 7, 2026): [https://mastra.ai/articles/context-engineering](https://mastra.ai/articles/context-engineering)
  - OMC Cloud press release citing Gartner cloud forecast, *Inference Overtakes Training: 2026 Is the Year AI Moved Into Production*, EIN Presswire [press release citing Gartner] (October 12, 2026): [https://www.einpresswire.com/article/949027583/inference-overtakes-training-2026-is-the-year-ai-moved-into-production](https://www.einpresswire.com/article/949027583/inference-overtakes-training-2026-is-the-year-ai-moved-into-production)
  - Gnana, *AI Engineer Skills Companies Want in 2026: 3,449-Posting Analysis*, DEV Community [analysis of 3,449 active postings on the InterviewStack.io job board] (May 12, 2026): [https://dev.to/gnana_6392e836fd500a957dc/ai-engineer-skills-companies-want-in-2026-3449-posting-analysis-5f9l](https://dev.to/gnana_6392e836fd500a957dc/ai-engineer-skills-companies-want-in-2026-3449-posting-analysis-5f9l)
- **Artifact Tested**: In-browser Python context management harness executed directly in Python 3.12 with assertions passing.
- **Commit**: `d9014de6`

---

## 2. Deepened Tracks

### Track A: `harness-engineering`
Target bar: 2,000–5,000 words, worked example carried through diagram/prose/code, real commands/config, When Not to Use It, Remember table, Sources with real opened URLs, zero banned phrases, verified python3 execution.

1. **`harness-architecture.mdx`**
   - **Word count**: 2,041 words
   - **Key mechanisms**: Bubblewrap/gVisor container isolation, process supervision, `kill -9` timeout traps, bidirectional stdio JSON-RPC.
   - **Sources**: bubblewrap GitHub (containers/bubblewrap), gVisor Architecture (gvisor.dev), Anthropic Building Effective Agents, Linux namespaces (man7.org/linux/man-pages/man7/namespaces.7.html).
   - **Commit**: `645410ee`

2. **`context-and-instruction-design.mdx`**
   - **Word count**: 2,099 words
   - **Key mechanisms**: Static prefix caching alignment, AST code compression, XML envelope structure, dynamic sliding context windows.
   - **Sources**: Anthropic Prompt Caching Guide (docs.anthropic.com), OpenAI Prompt Caching Guide (platform.openai.com), Liu et al. Lost in the Middle (arxiv.org/abs/2307.03172), Python `ast` module documentation (docs.python.org/3/library/ast.html).
   - **Commit**: `c2c97113`

3. **`state-continuity-and-memory.mdx`**
   - **Word count**: 2,039 words
   - **Key mechanisms**: `feature_list.json` structured state, atomic JSON writes (`tempfile` + `os.replace`), git worktree isolation, multi-turn rollback.
   - **Sources**: Git Worktree documentation (git-scm.com/docs/git-worktree), POSIX rename atomic semantics (pubs.opengroup.org), Packer et al. MemGPT (arxiv.org/abs/2310.08560).
   - **Commit**: `1ced3e4c`

4. **`verification-loops.mdx`**
   - **Word count**: 2,056 words
   - **Key mechanisms**: 3-layer verification gate, diagnostic XML error envelopes, reproduction-first testing invariant, mutation testing heuristics.
   - **Sources**: Jia & Harman Mutation Testing (doi.org/10.1109/TSE.2010.62), Pytest Documentation (docs.pytest.org), SWE-bench Benchmark (arxiv.org/abs/2310.06770).
   - **Commit**: `30e4f60f`

5. **`autonomous-loops-and-supervisors.mdx`**
   - **Word count**: 2,157 words
   - **Key mechanisms**: Cycle detection via SHA-256 tool argument hashing, supervisor triad (Circuit Breaker, Progress Sentinel, Budget Governor), token velocity rate limiting.
   - **Sources**: Wang et al. Voyager (arxiv.org/abs/2305.16291), Shinn et al. Reflexion (arxiv.org/abs/2303.11366), Anthropic Building Effective Agents (anthropic.com/research/building-effective-agents).
   - **Commit**: `716c08bc`

---

### Track B: `inference-engineering`
Target bar: 2,000–5,000 words, worked example carried through diagram/prose/code, real commands/config, When Not to Use It, Remember table, Sources with real opened URLs, zero banned phrases, verified python3 execution.

1. **`disaggregation-prefix-caching-and-production.mdx`**
   - **Word count**: 2,132 words
   - **Interactive Visualizer**: `src/viz/diagrams/DisaggregationPrefixCachingVisualizer.tsx`
   - **Key mechanisms**: Radix tree prefix node-splitting, Prefill-Decode disaggregation over RDMA, 158x prompt reuse speedup.
   - **Sources**: Zheng et al. SGLang RadixAttention (arxiv.org/abs/2312.07104), Patel et al. Splitwise Prefill-Decode Disaggregation (arxiv.org/abs/2311.18677), vLLM Production Deployment Guide (docs.vllm.ai).
   - **Commit**: `542d4e51`

2. **`hardware-acceleration-and-kernels.mdx`**
   - **Word count**: 2,290 words
   - **Interactive Visualizer**: `src/viz/diagrams/KernelMemoryHierarchyVisualizer.tsx`
   - **Key mechanisms**: FlashAttention online softmax derivation, HBM to SRAM tiling, register allocation, fused CUDA kernels.
   - **Sources**: Dao et al. FlashAttention (arxiv.org/abs/2205.14135), Dao FlashAttention-2 (arxiv.org/abs/2307.08691), NVIDIA Hopper H100 Architecture Whitepaper (nvidia.com), OpenAI Triton Language (triton-lang.org).
   - **Commit**: `318cd0b5`

3. **`roofline-and-kv-cache.mdx`**
   - **Word count**: 2,218 words
   - **Key mechanisms**: Roofline model operational intensity ($\text{FLOPs}/\text{Byte}$), GQA KV cache memory derivation, PagedAttention block allocation.
   - **Sources**: Williams et al. Roofline Model (doi.org/10.1145/1498765.1498785), Kwon et al. PagedAttention vLLM (arxiv.org/abs/2309.06180), Ainslie et al. GQA (arxiv.org/abs/2305.13245).
   - **Commit**: `80f7431c`

4. **`continuous-batching-and-speculative-decoding.mdx`**
   - **Word count**: 2,110 words
   - **Key mechanisms**: Orca iteration-level continuous batching, speculative decoding rejection sampling distribution proof, draft model speedup calculations ($K=4$).
   - **Sources**: Yu et al. Orca Continuous Batching (OSDI 2022), Leviathan et al. Speculative Decoding (arxiv.org/abs/2211.17192), Chen et al. Accelerating LLM Decoding with Speculative Sampling (arxiv.org/abs/2302.01318).
   - **Commit**: `78e38aa9`

5. **`quantization-and-compression.mdx`**
   - **Word count**: 2,156 words
   - **Key mechanisms**: Uniform affine & symmetric quantization formulas, scale factor & zero-point derivation, AWQ activation-aware salient weight protection, GPTQ second-order Hessian inversion.
   - **Sources**: Lin et al. AWQ (arxiv.org/abs/2306.00978), Frantar et al. GPTQ (arxiv.org/abs/2210.17323), Dettmers et al. LLM.int8() (arxiv.org/abs/2208.07339).
   - **Commit**: `60b17ccc`

6. **`edge-and-tinyml-architecture.mdx`**
   - **Word count**: 2,270 words
   - **Key mechanisms**: Execute-in-Place (XIP) NOR Flash memory planning, ping-pong 48KB static tensor arena, int8 per-channel quantization, CMSIS-NN SIMD intrinsics.
   - **Sources**: David et al. TensorFlow Lite Micro (arxiv.org/abs/2010.08678), Lai et al. CMSIS-NN (arxiv.org/abs/1801.06601), ARM Cortex-M55 Processor Technical Reference Manual (developer.arm.com).
   - **Commit**: `851c40a2`

---

## 3. New Tracks Added

### Track 1: `context-engineering`
- **Location**: `src/content/docs/context-engineering/`
- **Registered in**: `src/data/sectionMeta.ts` under `/docs/category/agents--applications`
- **Diagram Component**: `src/viz/diagrams/ContextBudgetWaterfallVisualizer.tsx` (tested via `NewTrackVisualizers.test.tsx`)
- **Chapters**:
  1. `overview.mdx` (2,042 words) — The Context Engine: Architecture, Token Allocation & Lifecycle. Explains the transition from prompt engineering to context engineering, prompt cache alignment, and working memory boundaries.
  2. `token-budgeting-and-compaction.mdx` (2,537 words) — Deterministic token budgeting, sliding windows, AST compaction, and Lost-in-the-Middle attention U-curves.
  3. `dynamic-tool-discovery.mdx` (2,495 words) — Dynamic semantic tool routing, meta-discovery registries (`search_tools`), schema pruning, and BFCL tool saturation curves.
  4. `external-memory-and-persistence.mdx` (2,327 words) — Hierarchical 3-tier memory engine (L1 KV cache, L2 SQLite episodic WAL, L3 vector store), cross-encoder reranking, and cache-preserving memory injection blocks.
- **Total Track Words**: 9,401 words across 4 chapters.

### Track 2: `agent-observability`
- **Location**: `src/content/docs/agent-observability/`
- **Registered in**: `src/data/sectionMeta.ts` under `/docs/category/safety--evaluation`
- **Diagram Component**: `src/viz/diagrams/AgentTraceWaterfallVisualizer.tsx` (tested via `NewTrackVisualizers.test.tsx`)
- **Chapters**:
  1. `overview.mdx` (2,186 words) — Agent Observability Architecture & Production Telemetry. The four pillars of agent observability, OTel GenAI semantic conventions, and interactive trace waterfall.
  2. `opentelemetry-and-distributed-tracing.mdx` (2,154 words) — OpenTelemetry Spans, Trace Trees & Agent Execution Graphs. W3C traceparent header propagation across subagents, W3C baggage, and streaming TTFT latency span events.
  3. `token-and-cost-attribution.mdx` (2,187 words) — Token Accounting, Cost Attribution & Latency Profiling. Multi-tier pricing formulas (uncached, cache-read, cache-write, output), derivative burn velocity alarms, and multi-tenant FinOps chargebacks.
  4. `failure-taxonomy-and-anomaly-detection.mdx` (2,329 words) — Agent Failure Taxonomy, Loop Detection & Anomaly Alarms. The 6 core failure classes, canonical signature hash algorithms, ping-pong oscillation detection, and Premature Victory assertion guards.
- **Total Track Words**: 8,856 words across 4 chapters.

---

## 4. Verification & Quality Gate Proof

All verification gates have been executed empirically on this branch (`tracks-depth`):

1. **Layer 1: Typecheck**:
   - `npm run typecheck` (`tsc -b`) exits with code 0.
2. **Layer 2: Internal Links**:
   - `npm run check:links` (`check-internal-links.mjs` + `check-anchor-links.mjs`) scans 1,851 MDX files and reports 0 broken internal prose links and 0 broken anchor links.
3. **Layer 3: Unit Tests**:
   - `npx vitest run src/viz/diagrams/AiEngineeringLearningLadder.test.tsx src/viz/diagrams/InferenceVisualizers.test.tsx src/viz/diagrams/NewTrackVisualizers.test.tsx src/data/sectionMeta.test.ts` reports 4 passed test files, 16 passed tests.
4. **Prose Quality**:
   - Zero banned phrases across all authored pages.
   - Direct, authoritative first-party engineering voice throughout.
   - All Python code snippets tested directly with `python3` with assertions passing.
5. **No Full Build on 8 GB RAM Machine**:
   - In accordance with `AGENTS.md` and brief instructions, `npm run build` was not run on this 8 GB machine to prevent heap exhaustion. CI will run full static prerendering on push.
