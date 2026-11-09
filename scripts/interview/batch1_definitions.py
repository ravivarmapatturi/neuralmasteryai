# Batch 1 revised questions (50 questions)
# Technical fixes: BF16 underflow, regex false positives, unsourced latencies, no invented names.
# Voice: spoken aloud, short plain sentences, idea then trade-off, under 200 words, no bracket lists.

BATCH_1_REVIEWS = [
    {
        "id": "coding-chunker-token-aware",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud with idea-then-trade-off structure. Replaced dense bracket phrasing with plain conversational sentences."
    },
    {
        "id": "coding-bm25-from-scratch",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained non-linear term saturation and document length normalization without unsourced constant assertions."
    },
    {
        "id": "coding-cross-encoder-reranker",
        "verdict": "fixed",
        "reason": "Removed unsourced candidate numbers stated as fact. Rewritten for speaking aloud explaining full cross-attention and quadratic compute trade-offs."
    },
    {
        "id": "coding-json-output-parser",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud with clear state machine explanation and trade-off of early UI rendering versus partial malformed streaming."
    },
    {
        "id": "coding-eval-harness-precision-recall",
        "verdict": "fixed",
        "reason": "Rewritten for spoken delivery. Replaced formula bracket syntax with clear spoken definitions of macro vs micro aggregation trade-offs."
    },
    {
        "id": "coding-dynamic-batcher",
        "verdict": "fixed",
        "reason": "Replaced fixed latency assertions with rough operational windows. Rewritten for speaking aloud explaining throughput versus individual request latency."
    },
    {
        "id": "coding-token-bucket-rate-limiter",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained lazy timestamp calculation instead of polling sleep loops, and burst allowance versus downstream saturation."
    },
    {
        "id": "coding-streaming-sse-client",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained stream reassembly and framing simplicity versus binary payload efficiency."
    },
    {
        "id": "coding-vector-l2-cosine-distance",
        "verdict": "fixed",
        "reason": "Verified mathematical derivation. Rewritten for speaking aloud explaining unit-norm projection and directional similarity versus magnitude loss."
    },
    {
        "id": "coding-exponential-decay-cache",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained semantic embedding matching trade-offs and threshold tuning."
    },
    {
        "id": "dist-ddp-allreduce-synchronous",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained Ring-AllReduce gradient synchronization and bucket overlap trade-offs."
    },
    {
        "id": "dist-zero-stages-memory-tradeoff",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained ZeRO memory reduction progression and the communication overhead trade-off."
    },
    {
        "id": "dist-fsdp-layer-allgather",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained FSDP forward and backward communication lifecycle and memory versus interconnect bandwidth trade-offs."
    },
    {
        "id": "dist-pipeline-parallelism-bubbles",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained pipeline idle bubbles and 1F1B memory trade-offs."
    },
    {
        "id": "dist-tensor-parallelism-megatron",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained column and row parallel splits and intra-node NVLink requirement."
    },
    {
        "id": "dist-gradient-accumulation-boundary",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained no_sync context manager mechanism and batch normalization warmup boundaries."
    },
    {
        "id": "dist-nccl-timeout-debugging",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained systematic diagnostic sequence without assuming causes."
    },
    {
        "id": "dist-activation-checkpointing-overhead",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained recomputation idea and memory-compute trade-off."
    },
    {
        "id": "dist-bf16-vs-fp16-mixed-precision",
        "verdict": "fixed",
        "reason": "CRITICAL FIX: Corrected inaccurate claim that BF16 completely eliminates underflow. Clarified that 8-bit exponent matches FP32 dynamic range, reducing underflow and avoiding loss scaling, but accepting lower mantissa precision."
    },
    {
        "id": "dist-data-loader-sharding-determinism",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained DistributedSampler, set_epoch, and checkpoint reproducibility."
    },
    {
        "id": "agent-idempotency-key-design",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained deterministic hashing and execution replay trade-off."
    },
    {
        "id": "agent-tool-permission-scopes",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained tiered permission scopes and trade-off of autonomy versus blast radius."
    },
    {
        "id": "agent-human-in-the-loop-elevation",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained execution suspension, durable state persistence, and resumption trade-offs."
    },
    {
        "id": "agent-content-addressed-caching",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained canonical JSON hashing and cache freshness trade-offs."
    },
    {
        "id": "agent-policy-engine-pre-execution",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained defense-in-depth: prompt advisory vs middleware policy vs sandbox isolation."
    },
    {
        "id": "agent-partial-failure-saga-rollback",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained saga pattern with compensating transactions and irreversible side effects."
    },
    {
        "id": "agent-sandboxed-file-access-isolation",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained Linux namespaces, realpath resolution, and egress controls."
    },
    {
        "id": "agent-credential-vault-least-privilege",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained proxy injection of secrets away from model context."
    },
    {
        "id": "agent-recursion-depth-circuit-breaker",
        "verdict": "fixed",
        "reason": "AVOIDED INVENTED PRODUCT NAME: Replaced product-style circuit breaker branding with mechanism-first description of recursion limits and step counters."
    },
    {
        "id": "agent-cycle-detection-state-hashing",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained state hashing and embedding distance to detect repetitive semantic loops."
    },
    {
        "id": "agent-cost-token-budget-circuit-breaker",
        "verdict": "fixed",
        "reason": "AVOIDED INVENTED PRODUCT NAME: Replaced circuit breaker product branding with mechanism-first description of token spending and cost quota enforcement."
    },
    {
        "id": "agent-stuck-tool-timeout-isolation",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained non-blocking timeouts, process termination, and zombie avoidance."
    },
    {
        "id": "agent-hallucinated-tool-termination",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained pre-dispatch catalog validation and structured corrective error feedback."
    },
    {
        "id": "agent-cascading-failure-multi-agent-backoff",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained propagation of hop limits, exponential backoff, and full jitter across subagent trees."
    },
    {
        "id": "agent-graceful-fallback-on-abort",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained clean workspace checkpoints, stashing uncommitted state, and structured user reporting."
    },
    {
        "id": "gpu-fair-share-drf-scheduling",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained Dominant Resource Fairness mechanics across heterogeneous compute and trade-offs."
    },
    {
        "id": "gpu-mig-vs-mps-tradeoffs",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained hardware-level MIG isolation vs software-level MPS multiplexing."
    },
    {
        "id": "gpu-preemption-graceful-checkpointing",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained preemption signals, grace periods, atomic checkpointing, and trade-offs."
    },
    {
        "id": "gpu-credit-token-bucket-fairness",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained separate prompt prefill and decode token bucket quotas."
    },
    {
        "id": "gpu-vram-fragmentation-prevention",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained contiguous allocation fragmentation and PagedAttention block mapping."
    },
    {
        "id": "gpu-burst-quota-noisy-neighbors",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained priority classes, preemptible burst scheduling, and QoS node pools."
    },
    {
        "id": "gpu-idle-workload-reclamation",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained dual-signal telemetry (GPU compute + socket activity) and graceful reclamation."
    },
    {
        "id": "gpu-slurm-vs-k8s-orchestration",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained batch HPC gang scheduling vs cloud-native microservice scaling trade-offs."
    },
    {
        "id": "gov-audit-trail-tamper-evident",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained cryptographic hash chaining and append-only cloud storage trade-offs."
    },
    {
        "id": "gov-pii-redaction-bidirectional",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained deterministic surrogate tokens, in-memory mapping, and model context distortion."
    },
    {
        "id": "gov-hallucination-audit-monitoring",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained reference-free metrics (NLI entailment, self-consistency) and drift tracking."
    },
    {
        "id": "gov-model-card-metadata-provenance",
        "verdict": "fixed",
        "reason": "REMOVED STACKED LIST: Converted bracketed numbered categories into conversational spoken explanation covering data provenance, evaluation benchmarks, and operational bounds."
    },
    {
        "id": "gov-access-control-row-level-rag",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained vector database metadata pre-filtering vs post-filtering and zero leakage."
    },
    {
        "id": "gov-automated-policy-guardrails",
        "verdict": "fixed",
        "reason": "CRITICAL FIX: Removed false claim that regex has zero false positives. Explained regex false positive and false negative realities and tiered defense with semantic classifiers."
    },
    {
        "id": "gov-bias-disparate-impact-testing",
        "verdict": "fixed",
        "reason": "Rewritten for speaking aloud. Explained Adverse Impact Ratio (Four-Fifths rule) and the fairness-accuracy trade-off."
    }
]
print(f"Loaded {len(BATCH_1_REVIEWS)} Batch 1 reviews.")
