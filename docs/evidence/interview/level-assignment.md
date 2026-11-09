# Interview Question Level Assignment Methodology (Plan B4)

## Overview
Every question in `src/data/interviewPractice.json` (907 total questions across 23 topics) has been assigned an honest experience level tag (`mid`, `senior`, or `staff`).

This document records the exact evaluation rubric and assignment heuristics used across all question banks and sources.

---

## Level Definitions & Rubric

### 1. Mid-level (`mid`) — 425 questions (46.9%)
- **Target Persona**: Engineers with 1-3 years of ML/AI engineering experience, or software engineers transitioning into AI engineering.
- **Criteria**:
  - Focuses on well-scoped, canonical mechanisms, definitions, and standard mathematical formulations.
  - Expects direct answers without requiring cross-system architectural tradeoffs or fleet-wide failure mitigation.
  - Examples:
    - Overfitting / underfitting identification (train vs validation score gap).
    - Cross-validation row counts and stratified splits.
    - Loss curves, learning rate warmup, and standard optimizers (SGD vs AdamW).
    - Standard metric trade-offs: Precision vs Recall, ROC-AUC, F1 score.
    - Self-attention projection mechanics ($QK^T / \sqrt{d_k}$), causal masking, and basic tokenization.
    - Standard chunking strategies (fixed-size vs recursive character splitting).
    - Basic Python/tensor implementations of attention, softmax, and normalization layers.

### 2. Senior (`senior`) — 387 questions (42.7%)
- **Target Persona**: Experienced engineers with 4-7 years in production ML/AI systems, leading service design and on-call triage.
- **Criteria**:
  - Focuses on non-trivial production failure modes, performance bottlenecks, and multi-component systems engineering.
  - Requires navigating competing constraints (e.g. latency vs cost vs quality, throughput vs TTFT).
  - Expects systematic debugging methodologies (triage hypotheses in order, isolation tests, root cause fixes, prevention).
  - Examples:
    - Continuous batching dynamics and prefill-decode starvation under bursty loads.
    - KV cache memory budgeting, PagedAttention, and activation memory headroom.
    - Quantization precision loss (W4A16, AWQ, activation outliers) and calibration dataset bias.
    - Two-stage retrieval pipelines (dense bi-encoder + cross-encoder reranker SLA management).
    - RAG retrieval recall drops after re-indexing and HNSW graph parameter tuning.
    - Offline eval benchmark vs online user complaint divergences (LLM judge length/tone biases).
    - Fine-tuning stability, parameter-efficient adaptations (LoRA rank/alpha scaling, replay buffers for forgetting).
    - Token reservation, rate limiting, and client abort reconciliation in streaming gateways.

### 3. Staff (`staff`) — 95 questions (10.5%)
- **Target Persona**: Principal / Staff AI Systems Architects and Tech Leads (8+ years), setting organization-wide infrastructure contracts and evaluating company-level risk.
- **Criteria**:
  - Focuses on distributed fleet architecture, multi-tenant governance, complex distributed failure modes, zero-trust security boundaries, and cross-organization protocol design.
  - Involves high organizational blast radiuses, regulatory compliance (RSP, AI governance audits), and mission-critical reliability.
  - Examples:
    - Multi-node Distributed Data Parallel (DDP) AllReduce communication overlap, gradient synchronization, and NCCL hang detection.
    - Multi-tenant GPU cluster scheduler design, dynamic quota reservation, fair-share deficit scheduling, and preemptible priority tiers.
    - Autonomous agent sandboxing with container isolation, user namespace mapping, read-only root filesystems, and syscall filtering.
    - Multi-agent debate convergence bounds, cycle detection, and distributed deadlock avoidance.
    - Indirect prompt injection data exfiltration via rendered markdown images and Content Security Policy enforcement.
    - Cross-organization agent protocols (MCP, A2A) with mutual cryptographic identity and capability scoping.
    - Model routing cascade failures and fleet-wide cost circuit breakers.

---

## Assignment Pipeline by Data Source

1. **Repo Questions (`repo:*`, 698 questions)**:
   - Source: `ai-engineering-from-scratch/interviews/questions/`
   - Metadata: YAML frontmatter `level` field:
     - Level 1 & 2 $\rightarrow$ `mid`
     - Level 3 $\rightarrow$ `senior`
     - Level 4 $\rightarrow$ `staff`
   - Missing levels defaulted to `mid` (or inspected manually).

2. **Hand-Written Senior & Gap Questions (`senior:*`, 179 questions)**:
   - Evaluated individually against the rubric:
     - Questions covering distributed training infrastructure (DDP, NCCL), GPU quota fairness schedulers, AI governance audits, zero-trust container sandboxes, and cascading router architectures assigned `staff`.
     - Questions covering applied production trade-offs, continuous batching, feature store point-in-time joins, streaming gateways, and RAG rerankers assigned `senior`.
     - Questions covering basic coding exercises or classical mechanics assigned `mid`.

3. **Debug This Track Questions (`senior:debug-*`, 30 questions)**:
   - 4 `mid`: Well-contained single-component debugging (vector prefix omission, ReDoS regex unanchoring, VAD silence timeout, Canary startup probe timeout).
   - 21 `senior`: Complex multi-component production incident triage (HNSW ef_search, continuous batching TTFT, LLM judge length bias, runaway agent tool loops, Radix cache prefix ordering, KV cache activation OOM, LoRA gradient vanishing).
   - 5 `staff`: Distributed failure modes, container security escapes, prompt injection exfiltration, cascading routing failures, and async tool race conditions.

4. **Curated Model Answers (`interviewModelAnswers.json`, 20 questions)**:
   - 5 `mid` (fundamentals, chunking, structured JSON, CoT, dense vs sparse).
   - 14 `senior` (RAG vs fine-tuning, LoRA serving, reranking, LLM-as-judge, PagedAttention, quantization, DPO, TTFT vs TPOT).
   - 1 `staff` (single-agent vs multi-agent distributed orchestration architecture).

5. **Legacy Catalog Questions (`interviewCatalog.generated.json`, 241 questions)**:
   - Categorized by section difficulty:
     - Classical ML fundamentals, metrics, learning rates, normalization $\rightarrow$ `mid`.
     - Serving, memory calculations, drift monitoring, production RAG, agentic loops $\rightarrow$ `senior`.
     - System design and multi-system scenario questions $\rightarrow$ `staff`.

---

## Summary Counts
- Total Questions Judged: **907**
- `mid`: **425** (46.9%)
- `senior`: **387** (42.7%)
- `staff`: **95** (10.5%)
- Unassigned / Missing: **0** (100% coverage)
