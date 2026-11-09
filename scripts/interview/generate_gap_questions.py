#!/usr/bin/env python3
"""Build and validate the 50 new gap questions for Neural Mastery interview practice."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

BANNED_WORDS = [
    "delve", "deep dive", "dive deep", "unleash", "unlock", "harness the power",
    "game-changer", "gamechanger", "revolutioniz", "cutting-edge", "cutting edge",
    "seamless", "in today's", "it's important to note", "it's worth noting",
    "in conclusion", "tapestry", "testament", "elevate", "empower", "supercharg",
    "effortless", "premier", "world-class", "ultimate guide", "let's dive"
]

NEW_QUESTIONS = {
  "coding": [
    {
      "id": "coding-chunker-token-aware",
      "title": "Implement a token-aware recursive text chunker in Python with configurable overlap and sentence boundary preservation. What would you test?",
      "answer": "A production chunker must count subword tokens using the actual model tokenizer rather than splitting on raw character or word counts, because character slicing splits multi-byte UTF-8 sequences and breaks subwords. We implement recursive splitting: start with paragraph boundaries (double newlines), fall back to sentence endings, and finally word boundaries. When accumulating tokens into the current chunk, once adding the next sentence exceeds max_tokens, we emit the chunk, start the new chunk by retaining the trailing overlap_tokens from the prior chunk, and continue. For testing, verify with edge cases: documents shorter than one chunk, single sentences longer than max_tokens where word-level splitting is forced, unicode emojis and accents, and exact overlap continuity where adjacent chunks share identical boundary tokens.",
      "tradeOffs": [
        "Token-exact counting guarantees chunks fit context windows, but invoking the BPE tokenizer for every sentence boundary adds CPU latency compared to character slicing.",
        "Larger overlap (e.g. 20%) preserves cross-chunk reasoning at the expense of duplicate storage and redundant vector search scoring."
      ],
      "followUps": [
        "How would you optimize tokenizer calls if chunking a 100 MB text corpus?",
        "What happens if a single Markdown table or code block exceeds the maximum token limit?"
      ],
      "wrongAnswers": [
        "Chunking by character length (e.g. text[:500]) and assuming each token is four characters. This causes token truncation, invalid UTF-8 fragments, and context window overflows.",
        "Splitting strictly on full stops without handling abbreviations (e.g. 'e.g.', 'U.S.') or numbers ('3.14'), fragmenting sentences prematurely."
      ],
      "rounds": ["coding", "ml-depth"],
      "roles": ["applied-ai-engineer", "ai-data-engineer"]
    },
    {
      "id": "coding-bm25-from-scratch",
      "title": "Implement Okapi BM25 scoring from scratch in Python given inverted document frequencies, term frequencies, and document lengths. What edge cases must you handle?",
      "answer": "Okapi BM25 scores a query against a document using inverse document frequency (IDF) weighted by non-linear term frequency saturation. We compute document length normalization: the term frequency numerator is multiplied by (k1 + 1), and the denominator is TF + k1 * (1 - b + b * (doc_len / avg_doc_len)), where k1 controls term frequency saturation (typically 1.2 to 2.0) and b controls document length penalty (typically 0.75). The IDF formula requires care: the classic Lucene/Robertson formula log(1 + (N - n + 0.5) / (n + 0.5)) prevents negative scores when a term appears in more than half of all documents. We handle edge cases: zero query matches returning score zero, zero document length (empty documents), terms missing from vocabulary receiving IDF zero, and floating-point stability when total document count N is small.",
      "tradeOffs": [
        "Robertson IDF with the plus-one floor guarantees strictly positive scores, whereas raw Robertson IDF turns negative for ubiquitous terms.",
        "BM25 captures exact lexical keywords with zero GPU compute, but cannot capture semantic synonyms or cross-lingual intent."
      ],
      "followUps": [
        "Why does BM25 saturate term frequency while standard TF-IDF grows linearly?",
        "How do you combine BM25 scores with dense embedding cosine similarity without one dominating the other?"
      ],
      "wrongAnswers": [
        "Using standard Robertson IDF without the positive floor, causing frequent stopwords to produce negative scores and rank irrelevant documents above empty ones.",
        "Failing to normalize document length by average corpus length, which heavily penalizes long documents that naturally contain more term occurrences."
      ],
      "rounds": ["coding", "ml-breadth"],
      "roles": ["applied-ai-engineer", "ai-data-engineer"]
    },
    {
      "id": "coding-cross-encoder-reranker",
      "title": "Implement a two-stage reranker pipeline in Python that scores candidate passages with a cross-encoder and blends semantic and lexical scores. How do you test it?",
      "answer": "In two-stage retrieval, the first stage retrieves top candidates (e.g. 50 to 100) cheaply using bi-encoder embeddings or BM25. The second stage feeds each (query, passage) pair together into a cross-encoder transformer, allowing full cross-attention across all layers between query tokens and document tokens. We normalize first-stage scores to zero-one using min-max scaling or sigmoid transformation, compute the cross-encoder logit, and produce a composite score: alpha * normalized_stage1 + (1 - alpha) * sigmoid(cross_encoder_logit). To test, create synthetic query-passage pairs: one with exact keyword match but wrong semantic context (BM25 ranks high, cross-encoder ranks low), one with semantic answer but zero lexical overlap (cross-encoder ranks high), and verify that top-ranked results reflect the tuned alpha weighting without NaN outputs on identical candidate scores.",
      "tradeOffs": [
        "Cross-encoders achieve significantly higher ranking precision because attention attends across query and document jointly, but inference cannot precompute embeddings and scales linearly with candidate count.",
        "Min-max score normalization is sensitive to outlier first-stage scores; z-score standardization or rank-based reciprocal rank fusion (RRF) is more resilient across heterogeneous score distributions."
      ],
      "followUps": [
        "Why can you not precompute document embeddings for a cross-encoder offline?",
        "When would you use Reciprocal Rank Fusion instead of weighted score interpolation?"
      ],
      "wrongAnswers": [
        "Directly adding raw BM25 scores (typically 5 to 30) to cross-encoder sigmoid probabilities (0 to 1) without normalization, causing BM25 to completely overpower the neural reranker.",
        "Running the cross-encoder over the entire corpus of millions of documents instead of restricting it to top-K retrieved candidates, blowing the p99 latency SLA."
      ],
      "rounds": ["coding", "system-design"],
      "roles": ["applied-ai-engineer", "inference-engineer"]
    },
    {
      "id": "coding-json-output-parser",
      "title": "Implement a streaming JSON output parser in Python that extracts complete key-value pairs from an LLM token stream before the closing brace arrives. What are the failure modes?",
      "answer": "When an LLM streams JSON tokens, waiting for the final closing brace forces high time-to-first-render for the user. A streaming JSON parser tracks character-level lexical state: brace nesting depth, bracket nesting depth, inside-string boolean, and escape sequences (like backslash-quote). When outside strings at object nesting depth one, the parser detects key string termination followed by a colon, then tracks the value. For scalar values (strings, numbers, booleans), once a terminating comma or closing delimiter arrives, the key-value pair is emitted immediately to downstream UI components. Failure modes include: unescaped quotes inside string values, numbers streamed across multiple token chunks (e.g. '12' followed by '.5'), unicode surrogates split across token boundaries, and unexpected model truncation where a trailing string never closes.",
      "tradeOffs": [
        "Emitting partial fields enables instant progressive rendering, but downstream code must handle partial arrays and cannot assume schema validation completed until EOF.",
        "Strict regex parsing fails on nested objects; a full state-machine lexer is required to track string escape states reliably."
      ],
      "followUps": [
        "How do you handle partial array streams where elements are complex nested dictionaries?",
        "How does constrained grammar decoding (like Outlines or llama.cpp grammars) compare to post-hoc streaming parsing?"
      ],
      "wrongAnswers": [
        "Running json.loads() on the accumulated string buffer after every token. This repeatedly raises JSONDecodeError, wastes CPU, and causes quadratic O(N^2) parsing overhead.",
        "Using regular expressions to search for keys, which breaks whenever string values contain escaped quotes, colons, or braces."
      ],
      "rounds": ["coding", "debugging"],
      "roles": ["applied-ai-engineer", "agentic-ai-engineer"]
    },
    {
      "id": "coding-eval-harness-precision-recall",
      "title": "Implement an evaluation harness in Python that computes macro and micro Precision, Recall, and F1 across multi-label classification outputs without using scikit-learn.",
      "answer": "In multi-label evaluation, each sample can belong to multiple classes simultaneously. We iterate over paired ground-truth and prediction sets, maintaining true positives (TP), false positives (FP), and false negatives (FN) per class. For micro-metrics, we aggregate global counts: micro_precision = sum(TP) / (sum(TP) + sum(FP)), and micro_recall = sum(TP) / (sum(TP) + sum(FN)). Micro-metrics give equal weight to every classification instance, meaning frequent classes dominate. For macro-metrics, we compute precision and recall independently for each class, handling zero-denominator cases by setting precision or recall to zero (or a configured fallback), and then average the per-class scores unweighted. Macro-metrics treat rare classes with equal importance to frequent classes. Finally, F1 is the harmonic mean: 2 * (P * R) / (P + R).",
      "tradeOffs": [
        "Macro averaging highlights failures on rare or safety-critical classes, but a single rare class with zero predictions can penalize the macro score drastically.",
        "Micro averaging reflects overall token or instance throughput accuracy, but masks complete degradation on tail classes."
      ],
      "followUps": [
        "How do you handle classes that appear in predictions but have zero ground-truth samples in the validation batch?",
        "When would you choose weighted macro F1 over standard unweighted macro F1?"
      ],
      "wrongAnswers": [
        "Averaging the F1 scores across individual samples instead of computing per-class or global contingency tables. Sample-averaged F1 is a distinct metric (example-based F1) with different operational semantics.",
        "Dividing by zero when a class has zero positive predictions without an explicit zero-division guard, causing unhandled runtime exceptions."
      ],
      "rounds": ["coding", "ml-breadth"],
      "roles": ["ai-evaluation-reliability-engineer", "applied-ai-engineer"]
    },
    {
      "id": "coding-dynamic-batcher",
      "title": "Implement an asynchronous dynamic batching queue in Python that flushes when batch size reaches a maximum or when a latency deadline fires.",
      "answer": "Dynamic batching groups individual concurrent requests into a single tensor execution to maximize GPU tensor core utilization without exceeding latency budgets. We build an async queue using asyncio: an incoming async function creates a Future, appends the request payload and Future to an in-memory list, and awaits the Future. A background worker loop manages batch flushing. The worker waits on an asyncio.Event or sleep timeout: it flushes when either len(current_batch) >= max_batch_size OR (len(current_batch) > 0 and now - batch_start_time >= max_delay_ms). Upon flushing, the worker extracts the batched inputs, invokes the model forward pass, distributes results to each corresponding Future, and resets the batch timer. We test with concurrent tasks under bursty traffic and verify that single isolated requests never wait longer than max_delay_ms.",
      "tradeOffs": [
        "A longer max_delay_ms (e.g. 10ms) increases batch saturation and overall throughput, but inflates p50 and p99 latency for low-concurrency requests.",
        "In-process Python dynamic batching suffers from GIL contention if tensor packing occurs on the event loop; offloading tensor collation to a worker thread or C++ runtime (like Triton) is required for high throughput."
      ],
      "followUps": [
        "How do you handle request cancellation when a client disconnects while its request is still sitting in the batch queue?",
        "What happens if individual requests have wildly different sequence lengths, and how does padding waste compute?"
      ],
      "wrongAnswers": [
        "Flushing strictly when batch size is reached without a timeout timer. Under low traffic, early requests wait indefinitely, violating latency SLAs.",
        "Running the batch inference directly on the asyncio event loop without run_in_executor, blocking all incoming event-loop network connections during model execution."
      ],
      "rounds": ["coding", "system-design"],
      "roles": ["inference-engineer", "applied-ai-engineer"]
    },
    {
      "id": "coding-token-bucket-rate-limiter",
      "title": "Implement a thread-safe token bucket rate limiter in Python supporting burst capacity and steady-state replenishment. What edge cases occur under high concurrency?",
      "answer": "A token bucket rate limiter permits bursts up to capacity while enforcing a sustained average refill rate. We avoid background timer threads by computing replenishment lazily upon request: tokens_to_add = (now - last_refreshed) * refill_rate_per_sec. Under a threading lock, we update current_tokens = min(capacity, current_tokens + tokens_to_add) and update last_refreshed = now. If current_tokens >= requested_tokens, we deduct requested_tokens and return true; otherwise return false or compute sleep_time = (requested - current_tokens) / refill_rate. Under high concurrency, clock resolution limits (like microsecond drift) can cause zero tokens to add on rapid successive calls, so last_refreshed must only update proportionally to credited tokens or track monotonic float timestamps. In distributed environments, atomic Redis Lua scripts replace Python locks to prevent race conditions.",
      "tradeOffs": [
        "Lazy timestamp arithmetic uses zero CPU when idle, but clock skew across distributed servers can cause inconsistent rate limiting without a shared clock or centralized store.",
        "Token bucket allows controlled bursts up to capacity, whereas leaky bucket enforces perfectly smooth outflow at the cost of queuing delay."
      ],
      "followUps": [
        "How would you translate this single-instance Python limiter into a distributed Redis implementation?",
        "How do you adapt the rate limiter to charge variable costs based on prompt plus completion token counts?"
      ],
      "wrongAnswers": [
        "Spawning an active background thread with a while True: sleep(1) loop to add tokens. This wastes CPU, drifts over time, and causes race conditions without strict lock synchronization.",
        "Using fixed-window counters instead of a token bucket, which permits double the burst allowance at window boundaries (the boundary burst problem)."
      ],
      "rounds": ["coding", "system-design"],
      "roles": ["applied-ai-engineer", "ai-data-engineer"]
    },
    {
      "id": "coding-streaming-sse-client",
      "title": "Implement a Server-Sent Events (SSE) streaming client in Python that parses delta tokens, handles reconnects with exponential backoff, and tracks last-event-id.",
      "answer": "Server-Sent Events stream unidirectional text events over persistent HTTP with Content-Type text/event-stream. Lines are separated by newlines; double newlines terminate an event block. We stream response chunks over an HTTP client (like httpx or aiohttp). We split incoming byte chunks on newlines and maintain a line buffer for partial frames. For each line, if it starts with 'id: ', we record last_event_id. If it starts with 'data: ', we accumulate the payload. When encountering an empty line, we emit the complete event payload (e.g. parsing JSON delta tokens). If the socket drops prematurely, we do not restart from scratch: we apply exponential backoff with full jitter (e.g. min(max_backoff, base * 2^attempt) + random), send the HTTP header 'Last-Event-ID' on reconnection, and resume token consumption without duplicates.",
      "tradeOffs": [
        "SSE is lightweight, uses standard HTTP/1.1 or HTTP/2, and passes through corporate proxies easily, but is strictly unidirectional from server to client.",
        "Tracking Last-Event-ID enables uninterrupted reconnection, but requires the inference server to maintain an ephemeral buffer of recent generation tokens per connection."
      ],
      "followUps": [
        "How do you distinguish between a graceful server-side stream termination (like data: [DONE]) and an unexpected TCP drop?",
        "Why is random jitter essential when reconnecting multiple dropped client streams simultaneously?"
      ],
      "wrongAnswers": [
        "Assuming each raw socket read chunk corresponds to exactly one SSE event. Socket chunks can arrive with partial lines or multiple events concatenated together.",
        "Reconnecting immediately in a tight while loop without backoff or jitter, creating a thundering herd that overwhelms recovering gateway servers."
      ],
      "rounds": ["coding", "debugging"],
      "roles": ["applied-ai-engineer", "agentic-ai-engineer"]
    },
    {
      "id": "coding-vector-l2-cosine-distance",
      "title": "Implement batched cosine similarity and squared Euclidean distance in NumPy without using scipy.spatial or scikit-learn. How do you avoid memory spikes?",
      "answer": "Given query matrix Q of shape (N, D) and database matrix K of shape (M, D), computing distances naively with 3D broadcasting (N, 1, D) - (1, M, D) materializes an (N, M, D) array, which instantly exhausts RAM for large matrices. For cosine similarity, we pre-normalize rows of Q and K by their L2 norms (with epsilon 1e-12 in denominator to prevent zero division), then compute similarity via a single matrix dot product: Q_norm @ K_norm.T, yielding shape (N, M) directly. For squared Euclidean distance, we expand ||q - k||^2 = ||q||^2 + ||k||^2 - 2(q . k). We compute row norms squared q_sq = sum(Q^2, axis=1, keepdims=True) of shape (N, 1) and k_sq = sum(K^2, axis=1, keepdims=True) of shape (1, M). The squared distance is q_sq + k_sq.T - 2 * (Q @ K.T), executing in O(NMD) compute with strictly 2D memory footprint.",
      "tradeOffs": [
        "The quadratic expansion identity ||q||^2 + ||k||^2 - 2(q.k) runs at peak BLAS speed, but floating-point subtraction can occasionally produce tiny negative numbers (-1e-16) due to roundoff, requiring np.maximum(dist, 0.0).",
        "Pre-normalizing vectors simplifies cosine similarity to dot product, but modifies original magnitudes if norms are needed downstream."
      ],
      "followUps": [
        "Why can the expansion trick produce negative numbers for identical vectors, and how do you sanitize the output?",
        "If M is 10 million vectors, how would you batch the matrix multiplication to stay within a 4 GB RAM budget?"
      ],
      "wrongAnswers": [
        "Using 3D broadcasting np.linalg.norm(Q[:, None, :] - K[None, :, :], axis=2). For N=1000, M=100000, D=1536, this attempts to allocate an 800 GB intermediate tensor and crashes with OutOfMemory.",
        "Forgetting to add a numerical stability epsilon when dividing by vector norms, resulting in NaN rows whenever an input vector is all zeros."
      ],
      "rounds": ["coding", "ml-depth"],
      "roles": ["applied-ai-engineer", "ai-data-engineer"]
    },
    {
      "id": "coding-exponential-decay-cache",
      "title": "Implement a semantic vector cache in Python with time-to-live expiration, cosine similarity thresholding, and least-recently-used eviction.",
      "answer": "A semantic cache checks if a new user query is semantically equivalent to a prior query, returning the cached LLM completion to save latency and token costs. We maintain an in-memory dictionary mapping key hashes to CacheEntry dataclasses (storing query_embedding, completion, timestamp, and last_accessed), alongside an OrderedDict for LRU ordering. On lookup, we first check exact text match via hash. If missed, we compute cosine similarity against stored unexpired embeddings. We filter out entries where now - timestamp > ttl_seconds. Among unexpired entries, if max_similarity >= threshold (e.g. 0.95), we record a cache hit, move the entry to the end of the OrderedDict, update last_accessed, and return the completion. On insert, if cache size exceeds max_entries, we pop the oldest item from the OrderedDict (popitem(last=False)) before inserting the new entry.",
      "tradeOffs": [
        "Linear scan over cached embeddings works well for small caches (under 5,000 entries), but indexing with FAISS or HNSW is required once cache size grows to prevent search latency from exceeding LLM inference time.",
        "A high similarity threshold (0.95) prevents returning wrong answers to subtle prompt variations, but reduces the overall cache hit rate."
      ],
      "followUps": [
        "How do you handle user-specific context or dynamic variables (like current date or user ID) in semantic cache keys?",
        "When would a semantic cache return an outdated or dangerous hallucination to a user?"
      ],
      "wrongAnswers": [
        "Setting a loose similarity threshold (e.g. 0.80). At 0.80 cosine similarity, queries like 'How do I cancel my subscription?' and 'How do I renew my subscription?' match, returning catastrophic incorrect completions.",
        "Storing embeddings without time-to-live or eviction limits, creating an unbounded memory leak that eventually crashes the container."
      ],
      "rounds": ["coding", "system-design"],
      "roles": ["applied-ai-engineer", "inference-engineer"]
    }
  ],
  "deep-learning": [
    {
      "id": "dist-ddp-allreduce-synchronous",
      "title": "In PyTorch Distributed Data Parallel (DDP), why is gradient synchronization synchronous, and how does DDP overlap computation with ring-AllReduce communication?",
      "answer": "PyTorch Distributed Data Parallel (DDP) is strictly synchronous data parallelism: every GPU rank holds an identical copy of model parameters and runs an identical optimizer step. During the forward pass, each rank computes activations on its independent local mini-batch. During the backward pass, autograd computes parameter gradients starting from the final layer backward. DDP does not wait for the backward pass to finish before communicating. Instead, it groups gradients into memory buckets (default 25 MB). As soon as all gradients in a bucket finish computing, DDP immediately launches an asynchronous non-blocking ring-AllReduce collective across ranks via NCCL on a dedicated CUDA communication stream, overlapping network transfer with the backward computation of earlier layers. Before optimizer.step() executes, all bucket AllReduce collectives must synchronize. Every rank ends up with the exact same averaged gradient, ensuring model parameters remain mathematically identical across all GPUs.",
      "tradeOffs": [
        "Synchronous AllReduce ensures deterministic, identical model updates across ranks without parameter divergence, but the step time is bounded by the slowest straggler GPU rank.",
        "Larger bucket sizes (e.g. 50 MB) improve network bandwidth utilization on high-speed interconnects, but delay the start of communication overlap."
      ],
      "followUps": [
        "What happens if DDP gradient bucketing order does not match the actual execution order of layers during the backward pass?",
        "Why is DDP preferred over PyTorch DataParallel (DP), and what causes the single-GPU bottleneck in DP?"
      ],
      "wrongAnswers": [
        "Claiming that DDP is asynchronous parameter updates where ranks update weights independently without synchronizing. That describes parameter server Hogwild methods, not DDP.",
        "Believing that AllReduce only begins after the entire backward pass has completely finished for all layers."
      ],
      "rounds": ["ml-depth", "system-design"],
      "roles": ["applied-ai-engineer", "inference-engineer"]
    },
    {
      "id": "dist-zero-stages-memory-tradeoff",
      "title": "Compare ZeRO-1, ZeRO-2, and ZeRO-3 in terms of memory reduction, communication overhead, and when to pick ZeRO-2 over ZeRO-3.",
      "answer": "For Adam optimizer in mixed precision, memory divides into model parameters (2 bytes per parameter in FP16/BF16), gradients (2 bytes), and Adam optimizer states (12 bytes: 4-byte FP32 master weight, 4-byte momentum, 4-byte variance), totaling 16 bytes per parameter. ZeRO-1 shards the 12-byte optimizer state across N ranks, reducing memory by up to 4x with zero additional communication volume compared to standard DDP. ZeRO-2 shards both optimizer states and gradients, keeping only 2 bytes of gradients per rank, reducing state to 4 bytes per rank with the exact same communication volume using ReduceScatter instead of AllReduce. ZeRO-3 shards optimizer states, gradients, and model parameters, keeping only 16/N bytes per rank. However, ZeRO-3 requires an AllGather collective before every layer's forward pass and another AllGather before its backward pass, increasing total communication volume by 50% (1.5x). Pick ZeRO-2 when models fit into GPU VRAM with sharded optimizer states and gradients, because ZeRO-2 avoids ZeRO-3's parameter all-gather communication overhead.",
      "tradeOffs": [
        "ZeRO-3 eliminates parameter redundancy completely and enables training models larger than any single GPU memory, but incurs 1.5x communication overhead and higher CUDA kernel launch overhead.",
        "ZeRO-2 offers the best throughput efficiency when memory fits, because it achieves significant memory savings without increasing total network communication volume over DDP."
      ],
      "followUps": [
        "How many bytes per parameter does AdamW require in mixed precision, and where does each byte go?",
        "Why does ZeRO-3 require an AllGather collective during the forward pass while ZeRO-2 does not?"
      ],
      "wrongAnswers": [
        "Stating that ZeRO-3 reduces communication compared to DDP. ZeRO-3 increases total communication volume by 1.5x because parameters must be gathered on every forward and backward pass.",
        "Assuming ZeRO-1 shards model weights during the forward pass. ZeRO-1 shards only the optimizer states; every GPU retains full model parameters and gradients."
      ],
      "rounds": ["ml-depth", "system-design"],
      "roles": ["applied-ai-engineer", "inference-engineer"]
    },
    {
      "id": "dist-fsdp-layer-allgather",
      "title": "Walk through how PyTorch Fully Sharded Data Parallel (FSDP) executes a forward pass layer-by-layer, when weights are all-gathered, and when they are discarded.",
      "answer": "PyTorch Fully Sharded Data Parallel (FSDP) implements ZeRO-3 natively. At initialization, FSDP wraps model modules (typically transformer layers) hierarchically, sharding parameters across all ranks so each GPU stores only 1/N-th of the layer weights. When the forward pass begins and reaches layer L, FSDP initiates an AllGather collective on the communication stream to gather unsharded weights from all ranks into a temporary buffer. Layer L computes its forward activations using the unsharded weights. The moment layer L completes its forward computation, FSDP immediately frees the gathered unsharded weights from GPU memory, retaining only its local 1/N-th shard, and prefetches the weights for layer L+1. In the backward pass, FSDP all-gathers weights again in reverse order to compute input gradients, reduces and shards gradients to their respective rank owners using ReduceScatter, and immediately frees both unsharded weights and unsharded gradients.",
      "tradeOffs": [
        "FSDP enables training models with tens of billions of parameters across commodity GPU clusters without specialized model parallel code, but communication latency must overlap with compute to prevent pipeline stalls.",
        "Wrapping units too granularly introduces excessive CUDA stream synchronization overhead, while wrapping too broadly creates large transient memory spikes during AllGather."
      ],
      "followUps": [
        "What is forward prefetching in FSDP, and how does it hide AllGather latency?",
        "Why is wrapping at the transformer block level the standard best practice in FSDP?"
      ],
      "wrongAnswers": [
        "Believing that FSDP keeps all model weights gathered in GPU memory throughout the entire forward pass. It discards unsharded weights immediately after each wrapped layer finishes computation.",
        "Thinking FSDP requires manual tensor parallel code modifications to attention projection matrices like Megatron-LM."
      ],
      "rounds": ["ml-depth", "system-design"],
      "roles": ["applied-ai-engineer", "inference-engineer"]
    },
    {
      "id": "dist-pipeline-parallelism-bubbles",
      "title": "What causes the pipeline bubble in pipeline parallelism, and how does the 1F1B schedule reduce peak activation memory compared to GPipe?",
      "answer": "Pipeline parallelism partitions a model's sequential layers across P pipeline stages on separate GPUs. To utilize the pipeline, a mini-batch is divided into M microbatches. The pipeline bubble is the idle GPU time during pipeline startup (where downstream stages wait for earlier stages to produce forward activations) and pipeline drain (where earlier stages wait for downstream stages to complete backward passes). In GPipe, all M microbatches execute their forward passes before any backward pass begins, meaning peak activation memory scales with all M microbatches: O(M). In contrast, the 1F1B (One-Forward-One-Backward) schedule runs startup microbatches until stage P begins backward, and then alternates: each stage executes one forward microbatch followed immediately by one backward microbatch for an earlier microbatch. In 1F1B, peak activation memory is bounded by the number of pipeline stages P rather than total microbatches M: O(P).",
      "tradeOffs": [
        "1F1B caps activation memory to O(P), enabling larger microbatch counts and smaller bubble ratios (bubble fraction approximately (P-1)/(M+P-1)), but requires complex scheduling and communication orchestration across stages.",
        "Increasing microbatch count M reduces the bubble percentage, but increases kernel launch overhead and communication frequency across stages."
      ],
      "followUps": [
        "What is the mathematical formula for the pipeline bubble fraction in terms of stages P and microbatches M?",
        "How does interleaved 1F1B reduce the bubble fraction further, and what is its trade-off?"
      ],
      "wrongAnswers": [
        "Claiming that pipeline parallelism has zero memory overhead because activations are discarded immediately. Downstream stages must hold forward activations in memory until the backward pass reaches them.",
        "Thinking GPipe and 1F1B have the same peak activation memory footprint."
      ],
      "rounds": ["ml-depth", "system-design"],
      "roles": ["applied-ai-engineer", "inference-engineer"]
    },
    {
      "id": "dist-tensor-parallelism-megatron",
      "title": "How does Megatron-LM split transformer attention and MLP matrices across GPUs, and why does Tensor Parallelism require high-bandwidth intra-node interconnects like NVLink?",
      "answer": "Megatron-LM splits individual weight matrices across GPUs without communication between intermediate projections. In multi-head attention, the query, key, and value projection matrices (W_Q, W_K, W_V) are column-parallel: split along output columns so each GPU computes attention for a subset of heads independently with zero communication. The output projection matrix (W_O) is row-parallel: split along input rows matching the concatenated attention heads. When the row-parallel projection executes, each GPU computes a partial sum. A single AllReduce collective across the tensor parallel group sums the partial vectors, producing the final attention output. The two-layer MLP follows the same pattern: column-parallel first linear layer with GeLU, row-parallel second linear layer, and one AllReduce. Because each transformer layer requires two AllReduce collectives directly in the critical path, TP incurs heavy communication per token. It requires 600 to 900 GB/s NVLink interconnects and is restricted to GPUs within a single physical server.",
      "tradeOffs": [
        "Tensor Parallelism reduces per-GPU parameter and activation memory inside the layer and keeps latency low for inference and training, but cannot scale effectively across standard Ethernet or low-bandwidth inter-node networks.",
        "TP degree is bounded by the number of attention heads (number of heads must be divisible by TP degree)."
      ],
      "followUps": [
        "Why is an AllReduce required only after W_O and not between W_QKV and attention computation?",
        "Why does running Tensor Parallelism across nodes over 100 Gbps Ethernet severely degrade training step time?"
      ],
      "wrongAnswers": [
        "Believing that Tensor Parallelism communicates activations after every single matrix multiplication. Megatron's column-to-row pairing pairs operations so AllReduce occurs only once per block.",
        "Thinking Tensor Parallelism can scale efficiently across multiple data center nodes over standard commodity network switches without NVLink."
      ],
      "rounds": ["ml-depth", "system-design"],
      "roles": ["inference-engineer", "applied-ai-engineer"]
    },
    {
      "id": "dist-gradient-accumulation-boundary",
      "title": "How does gradient accumulation simulate a larger effective batch size across distributed nodes, and why must DDP gradient AllReduce be disabled during accumulation steps?",
      "answer": "When GPU VRAM limits per-device physical batch size, gradient accumulation processes K smaller microbatches sequentially before performing an optimizer step. In PyTorch, calling loss.backward() accumulates gradients by adding into param.grad: param.grad += micro_grad / K. In Distributed Data Parallel (DDP), every backward pass by default launches an AllReduce across all ranks. If you run AllReduce on every microbatch, you waste massive network bandwidth communicating intermediate partial gradients K times. To prevent this, PyTorch provides the model.no_sync() context manager: inside no_sync(), DDP disables gradient communication and autograd only sums gradients locally on each GPU. On the K-th microbatch, you exit the no_sync() context, allowing DDP to execute a single AllReduce across ranks. Then optimizer.step() updates weights once, and model.zero_grad() resets gradients.",
      "tradeOffs": [
        "Gradient accumulation simulates arbitrarily large global batch sizes without extra GPU memory, but increases step wall-clock time linearly with accumulation steps K.",
        "Batch normalization layers behave differently with small physical microbatches; LayerNorm or RMSNorm (standard in transformers) is unaffected by microbatch size."
      ],
      "followUps": [
        "What happens to training throughput if you forget to use model.no_sync() during gradient accumulation in DDP?",
        "Why must you divide the loss by K before calling loss.backward() during accumulation?"
      ],
      "wrongAnswers": [
        "Dividing the accumulated gradient by K after all microbatches finish instead of scaling individual losses before backward, causing numerical overflow or unscaled gradients.",
        "Running gradient accumulation without disabling DDP synchronization, which communicates K times more network data than necessary."
      ],
      "rounds": ["ml-depth", "coding"],
      "roles": ["applied-ai-engineer", "ai-data-engineer"]
    },
    {
      "id": "dist-nccl-timeout-debugging",
      "title": "Your distributed training job halts with an NCCL watchdog timeout error on rank 4. How do you diagnose whether the cause is a hardware straggler, network packet drop, or CUDA OOM?",
      "answer": "When an NCCL watchdog timeout fires, the rank reporting the timeout (rank 4) is rarely the root cause; it simply reached the collective barrier and waited until the timeout threshold (e.g. 30 minutes) expired because another rank never arrived. First, check logs across all ranks: search for the earliest unhandled exception (like an out-of-memory error on rank 7 or an uncaught dataloader EOF exception on rank 0). Second, enable NCCL diagnostic tracing with environment variables NCCL_DEBUG=INFO and NCCL_DEBUG_SUBSYS=COLL,ENV. The trace logs the exact uncompleted collective (e.g. all_reduce on bucket 12) and the missing rank. Third, check hardware metrics: use nvidia-smi dmon or DCGM telemetry to inspect GPU clocks and thermal throttling across all nodes. A straggler GPU running at reduced PCIe bandwidth or thermal-throttled core frequency delays the collective for all ranks. Finally, check network interface counters (ethtool -S or ibstat) for dropped InfiniBand packets or RoCE PFC pause frames.",
      "tradeOffs": [
        "Setting NCCL_DEBUG=INFO provides detailed ring topology and collective logs, but generates high log volume under production multi-node clusters.",
        "Reducing NCCL_ASYNC_ERROR_HANDLING timeout detects hangs faster (e.g. 5 minutes instead of 30), but increases false-positive aborts during slow checkpoint saves."
      ],
      "followUps": [
        "Why does a CUDA OutOfMemory on rank 7 cause an NCCL watchdog timeout on rank 4 instead of an immediate cluster exit?",
        "How does InfiniBand Adaptive Routing prevent network congestion in multi-thousand GPU clusters?"
      ],
      "wrongAnswers": [
        "Assuming rank 4 is the faulty GPU because it emitted the timeout error message, and restarting the job on the same cluster without inspecting other rank logs.",
        "Increasing the NCCL timeout to several hours to 'fix' the hang, which merely causes the cluster to sit idle and burn GPU credits without solving the deadlocked rank."
      ],
      "rounds": ["debugging", "system-design"],
      "roles": ["inference-engineer", "applied-ai-engineer"]
    },
    {
      "id": "dist-activation-checkpointing-overhead",
      "title": "How does activation checkpointing trade extra compute for GPU memory, and what is the recomputation overhead on the backward pass?",
      "answer": "During standard transformer training, forward pass activations for every intermediate layer (attention QKV tensors, softmax attention maps, MLP activations) must be stored in GPU VRAM to compute gradients during the backward pass. For long sequence lengths, activation memory dwarfs parameter memory. Activation checkpointing (gradient checkpointing) discards intermediate activations during the forward pass, storing only the inputs to major layer blocks (the checkpoint boundaries). During the backward pass, when backpropagation reaches a checkpointed block, the forward computation for that specific block is re-executed on-the-fly to regenerate its intermediate activations right before backpropagating through it. This trades approximately 33% extra forward floating-point operations (or roughly 20% to 25% extra total training step wall-clock time) in exchange for reducing activation memory from O(L) layers down to O(sqrt(L)) or constant per-block memory, enabling 2x to 4x larger batch sizes or longer sequence lengths.",
      "tradeOffs": [
        "Activation checkpointing dramatically reduces peak VRAM, but increases total FLOPs by ~33% per step.",
        "Selective activation checkpointing (checkpointing only memory-heavy self-attention softmax while caching MLP activations) achieves the majority of memory savings with minimal recomputation overhead."
      ],
      "followUps": [
        "Why is attention softmax memory quadratic in sequence length while MLP activation memory is linear?",
        "What is selective activation checkpointing, and why is it preferred over full layer checkpointing in modern LLMs?"
      ],
      "wrongAnswers": [
        "Claiming that activation checkpointing saves checkpoint files to disk or persistent storage. It is purely an in-memory forward recomputation strategy during autograd.",
        "Stating that recomputation overhead is 100% (doubling training time). The backward pass takes ~2x the FLOPs of forward; recomputing only forward adds ~33% extra FLOPs total."
      ],
      "rounds": ["ml-depth", "system-design"],
      "roles": ["applied-ai-engineer", "inference-engineer"]
    },
    {
      "id": "dist-bf16-vs-fp16-mixed-precision",
      "title": "Why has bfloat16 largely replaced FP16 for distributed pre-training of large language models, and how does dynamic loss scaling work in FP16?",
      "answer": "Both bfloat16 (BF16) and IEEE half-precision (FP16) occupy 16 bits, but partition bits differently. FP16 allocates 1 sign bit, 5 exponent bits, and 10 mantissa bits. Its 5-bit exponent limits its dynamic range to 65,504, with minimum positive normal number ~6.1e-5. During backpropagation, small gradients frequently underflow to exact zero. FP16 requires dynamic loss scaling: multiply the forward loss by a scale factor S (e.g. 2^16) so gradients shift into FP16's representable range, then unscale gradients by S before optimizer.step(). If an Inf/NaN gradient occurs, the step is skipped and S is halved. In contrast, BF16 allocates 1 sign bit, 8 exponent bits (identical to FP32), and 7 mantissa bits. BF16 shares FP32's dynamic range (~1e38), completely eliminating gradient underflow and loss scaling, making pre-training stable without loss scale tuning despite slightly lower precision.",
      "tradeOffs": [
        "BF16 eliminates gradient underflow and simplifies training pipelines without loss scaling, but has lower precision (7 mantissa bits vs FP16's 10 bits), which can occasionally affect convergence on smaller vision models.",
        "BF16 requires hardware support (NVIDIA Ampere A100/H100 or later, Google TPUs) and is unavailable or emulated slowly on older Pascal or Turing GPUs."
      ],
      "followUps": [
        "How does dynamic loss scaling adjust the scale factor S when an Inf or NaN gradient is detected?",
        "Why can FP16 master weights not be updated directly in FP16, requiring an FP32 copy in the optimizer?"
      ],
      "wrongAnswers": [
        "Stating that BF16 has higher precision than FP16. BF16 has less precision (7 mantissa bits vs 10 bits) but a wider dynamic range (8 exponent bits vs 5 bits).",
        "Assuming dynamic loss scaling changes model parameters. Loss scaling scales only the loss scalar and intermediate gradients; it is undone before weights are updated."
      ],
      "rounds": ["ml-breadth", "ml-depth"],
      "roles": ["applied-ai-engineer", "inference-engineer"]
    },
    {
      "id": "dist-data-loader-sharding-determinism",
      "title": "When training across 64 GPUs, how do you configure the DistributedSampler to prevent duplicate sample ingestion and ensure reproducible shuffle seeds?",
      "answer": "In multi-GPU distributed training, each rank must process a disjoint, mutually exclusive subset of the dataset per epoch. PyTorch's DistributedSampler partitions dataset indices across ranks: rank r receives indices r, r + W, r + 2W, etc., where W is world size (64). For shuffling, DistributedSampler generates a pseudorandom permutation of dataset indices at the start of each epoch. Crucially, your training loop must call sampler.set_epoch(epoch) before iterating over the DataLoader. set_epoch sets the internal random seed to base_seed + epoch. If you omit sampler.set_epoch(epoch), the sampler uses the exact same seed on every epoch, causing the model to see data in the identical order repeatedly and impairing generalization. Additionally, if the dataset size is not divisible by world size, the sampler pads indices with duplicate samples to make lengths equal across ranks; ensure drop_last=True or trim evaluation metrics to prevent biased counts.",
      "tradeOffs": [
        "Setting drop_last=True discards trailing samples when dataset size is not divisible by world size, avoiding padding duplicates at the cost of omitting a few samples per epoch.",
        "Deterministic epoch seeding guarantees exact reproducibility across runs, but requires checkpointing the epoch index along with model weights."
      ],
      "followUps": [
        "What happens if you omit sampler.set_epoch(epoch) in a 100-epoch training run?",
        "How do you implement distributed data streaming for massive web datasets (like WebDataset or HuggingFace streaming) that cannot fit in memory?"
      ],
      "wrongAnswers": [
        "Relying on standard torch.manual_seed() inside the worker without calling sampler.set_epoch(epoch). The sampler will reuse the initial seed and repeat the same shuffle every epoch.",
        "Splitting data by manually slicing the dataset array across ranks without a sampler, which fails to shuffle across rank boundaries and leads to rank-correlated data distribution."
      ],
      "rounds": ["coding", "ml-depth"],
      "roles": ["ai-data-engineer", "applied-ai-engineer"]
    }
  ],
  "agents": [
    {
      "id": "agent-idempotency-key-design",
      "title": "How do you design an idempotency layer for agent tool execution so that network retries or model hallucinations do not repeat irreversible side-effects?",
      "answer": "Agents frequently retry tool invocations when network timeouts occur or when model reasoning loops repeat. Without idempotency, a tool like execute_refund or send_email executes duplicate transactions. We design a deterministic idempotency layer at the tool execution proxy. For each tool call, we generate an idempotency key: a deterministic hash (e.g. UUIDv5 or SHA-256) of tenant_id, session_id, tool_name, and the canonicalized JSON payload of arguments. Before executing, the proxy queries an ACID key-value store (like Redis or Postgres) with an atomic SETNX or conditional insert. If the key exists and its status is 'COMPLETED', the proxy immediately returns the stored output without invoking the tool. If status is 'IN_PROGRESS', the call waits or returns a concurrent execution lock error. If the key is new, it records 'IN_PROGRESS' with a 30-second TTL, executes the tool, stores the result, and marks 'COMPLETED'.",
      "tradeOffs": [
        "Deterministic payload hashing handles retries automatically without agent awareness, but fails if the tool payload includes dynamic timestamps or unseeded random nonces.",
        "Setting key TTL requires balancing: too short risks duplicate execution on long-running tools, while too long prevents legitimate identical actions later in the same session."
      ],
      "followUps": [
        "How do you canonicalize JSON payloads to ensure key ordering differences do not generate different idempotency hashes?",
        "What should the proxy do if a tool execution crashes midway while the idempotency key is stuck in 'IN_PROGRESS'?"
      ],
      "wrongAnswers": [
        "Instructing the LLM via system prompt to 'never call the refund tool twice'. LLMs cannot guarantee execution consistency and will violate prompt instructions during retries.",
        "Using client-generated random UUIDs for idempotency keys without tying them deterministically to the argument payload. If the agent retries with a new random UUID, duplicate execution occurs."
      ],
      "rounds": ["system-design", "debugging"],
      "roles": ["agentic-ai-engineer", "applied-ai-engineer"]
    },
    {
      "id": "agent-tool-permission-scopes",
      "title": "How do you architect a least-privilege permission model for agent tool calling, distinguishing read-only, mutating, and privileged actions?",
      "answer": "An agent should never possess blanket administrative access. We architect a three-tier permission model enforced at an external deterministic gateway, completely decoupled from LLM prompt text. Tier 1 is Read-Only (e.g. search_docs, get_order): safe queries with zero external side-effects that execute automatically with standard rate limits. Tier 2 is Mutating-Idempotent (e.g. update_ticket_status, create_draft_reply): operations that modify state but are constrained to user-owned resources, requiring valid entity ownership verification and idempotency keys before execution. Tier 3 is Privileged-Irreversible (e.g. process_payment, delete_user, deploy_code): actions with financial, security, or data-loss consequences that cannot be executed autonomously. Tier 3 actions trigger an immediate suspension of the agent loop, emitting an authorization request to an authenticated human approver. The gateway validates the calling session's JWT token, evaluates role-based access control (RBAC) scopes, and enforces resource tenancy before invoking tool handlers.",
      "tradeOffs": [
        "Granular tool scopes minimize security blast radius, but require extensive RBAC configuration and policy maintenance across hundreds of enterprise tools.",
        "Tier 3 human elevation prevents catastrophic autonomous errors, but introduces asynchronous user wait time that pauses the agent workflow."
      ],
      "followUps": [
        "How do you prevent an agent from using a read-only tool to exfiltrate private data into a public tool invocation?",
        "Where should the boundary between Tier 2 and Tier 3 lie for automated refund processing?"
      ],
      "wrongAnswers": [
        "Relying on the LLM to inspect user permissions inside the prompt context. Malicious users can use prompt injection to trick the model into declaring permissions granted.",
        "Assigning a single master service-account API key to the agent runtime with full database read/write access across all tenant records."
      ],
      "rounds": ["system-design", "ml-depth"],
      "roles": ["agentic-ai-engineer", "applied-ai-engineer"]
    },
    {
      "id": "agent-human-in-the-loop-elevation",
      "title": "When an agent determines it needs to invoke a high-impact tool like a database migration or refund, how do you design the human approval gate without losing execution context?",
      "answer": "When an agent identifies a privileged action, execution must pause cleanly without losing in-flight memory or re-generating prior reasoning tokens. We implement a Suspended Execution pattern. The tool execution proxy intercepts the privileged call, serializes the full agent state (conversation history, tool call name, exact arguments, reason summary, and execution graph pointer) into a persistent store (e.g. PostgreSQL or Redis), and generates an approval ticket with a secure cryptographic token. The agent runtime transitions to state 'AWAITING_APPROVAL' and notifies the approver via Slack, webhook, or UI. The approver inspects the exact diff and payload. Upon approval, an event triggers the orchestrator: it loads the serialized state from storage, validates the approval token signature, executes the tool under the approver's authenticated identity, appends the tool output to the message history, and resumes the agent loop directly.",
      "tradeOffs": [
        "State serialization preserves full execution context and avoids re-running prior tools upon resumption, but serialized state can become stale if underlying database records change during long approval delays.",
        "Resuming from persistent checkpoints saves LLM inference cost, but requires strict schema versioning for serialized agent state across code deployments."
      ],
      "followUps": [
        "What happens if an approver rejects the action or modifies the proposed tool arguments?",
        "How do you handle timeout expiration if an approval request is neither accepted nor rejected within 24 hours?"
      ],
      "wrongAnswers": [
        "Keeping an active HTTP connection or Python thread blocked and waiting in a sleep loop for hours until the human clicks approve. This exhausts server connection pools and fails on server restarts.",
        "Restarting the entire agent conversation from scratch after approval, forcing the LLM to re-run all preceding tools and re-spend tokens."
      ],
      "rounds": ["system-design", "customer"],
      "roles": ["agentic-ai-engineer", "forward-deployed-ai-engineer"]
    },
    {
      "id": "agent-content-addressed-caching",
      "title": "How does content-addressing tool arguments with SHA-256 enable deterministic caching and safe replay of external API tool calls?",
      "answer": "In multi-step agents, identical read queries (like searching documentation or fetching customer profile metadata) are frequently invoked multiple times across reasoning steps. Content-addressed caching computes a deterministic cache key by hashing tool invocation metadata: key = SHA256(canonical_tool_name + ':' + sorted_json_args + ':' + environment_salt). Canonical JSON sorting (sorting keys alphabetically and removing insignificant whitespace) ensures that {'id': 1, 'type': 'user'} and {'type': 'user', 'id': 1} produce the identical hash. When the agent emits a tool call, the runtime checks the cache store (like Redis). If present and unexpired, the cached tool response is returned in sub-millisecond time with zero external API calls. Content-addressing also enables exact replay debugging: offline evaluation harnesses can replay past agent trajectories deterministically by mocking external tool responses from recorded content-addressed key-value stores.",
      "tradeOffs": [
        "Content-addressed caching drastically cuts API latency and token costs, but must strictly be restricted to read-only, idempotent tools; caching mutating actions causes state desynchronization.",
        "Handling time-dependent queries (e.g. 'get_weather_today') requires salting the key with date boundaries or setting short TTLs to prevent serving stale data."
      ],
      "followUps": [
        "Why must JSON keys be sorted alphabetically before computing the SHA-256 hash?",
        "How do you configure cache invalidation when underlying database records are updated by an external service?"
      ],
      "wrongAnswers": [
        "Using Python's built-in hash() function, which randomizes its seed across process restarts, making cache keys non-deterministic across servers.",
        "Caching tool calls that contain dynamic timestamps or unseeded random numbers in their payload without stripping non-deterministic fields first."
      ],
      "rounds": ["system-design", "coding"],
      "roles": ["agentic-ai-engineer", "ai-evaluation-reliability-engineer"]
    },
    {
      "id": "agent-policy-engine-pre-execution",
      "title": "Where should policy enforcement sit in an agent runtime: in the system prompt, in the tool wrapper, or in a standalone deterministic policy proxy?",
      "answer": "Policy enforcement must sit in a standalone deterministic policy proxy positioned between the LLM and the tool execution environment. Relying on the system prompt for security is fundamentally vulnerable to prompt injection, jailbreaks, and instruction drifting: an adversarial prompt can instruct the model to ignore safety rules. Placing checks inside individual tool wrappers leads to duplicated code and inconsistent policy enforcement across heterogeneous tools. A standalone policy proxy acts as an independent security gateway: it intercepts the raw tool call payload emitted by the model, parses the parameters, and validates them against declarative deterministic rules (such as Open Policy Agent or Cedar policies). The proxy checks argument schemas, rate limits, spending quotas, tenant boundaries, and destination domain allowlists. If the call violates policy, the proxy halts execution and returns a structured error to the agent without invoking the tool.",
      "tradeOffs": [
        "A standalone policy proxy provides centralized, auditable, and tamper-resistant security enforcement, but adds an extra network hop (typically 2 to 5ms) to every tool invocation.",
        "Declarative policy engines decouple security rules from application code, but require maintaining a separate policy repository and testing suite."
      ],
      "followUps": [
        "How do you prevent indirect prompt injection from bypassing the policy proxy?",
        "What structured error feedback should the policy proxy return to the LLM so it can recover gracefully without crashing?"
      ],
      "wrongAnswers": [
        "Relying entirely on system prompt guardrails like 'You are a safe assistant; never delete customer records'. Prompts are probabilistic and easily overridden by adversarial context.",
        "Hardcoding security checks inside individual frontend UI components where backend agent workers can bypass them."
      ],
      "rounds": ["system-design", "design-review"],
      "roles": ["agentic-ai-engineer", "applied-ai-engineer"]
    },
    {
      "id": "agent-partial-failure-saga-rollback",
      "title": "An agent executes three tools in sequence and fails on the third. How do you implement a saga or compensation pattern to revert preceding mutations?",
      "answer": "Distributed multi-step agent actions cannot use single database ACID transactions because tools interact with heterogeneous external APIs (e.g. Stripe, GitHub, Jira). We implement the Saga Compensation Pattern. When the agent plans a multi-step mutation, the orchestrator registers a saga log. For each mutating tool executed, the tool registration contract mandates an associated compensating action: create_user pairs with delete_user, reserve_credit pairs with release_credit, create_branch pairs with delete_branch. The saga coordinator records each forward step execution and its return identifiers in persistent storage. If step three fails and retries are exhausted, the coordinator initiates rollback: it traverses the saga log in reverse order, executing compensating actions for step two and step one. If a compensating action fails, the coordinator alerts human operators via an incident queue with full transaction state rather than silently leaving orphaned resources.",
      "tradeOffs": [
        "Sagas guarantee eventual consistency across disparate external microservices, but intermediate states are visible to other users before compensation completes (no isolation).",
        "Writing reliable compensating actions requires external APIs to support reversible operations; actions like sending an external SMS or email cannot be physically undone."
      ],
      "followUps": [
        "How do you handle external tools that have no natural compensating inverse (like sending an email or webhook)?",
        "What happens if a compensating rollback action itself encounters a network timeout?"
      ],
      "wrongAnswers": [
        "Attempting to wrap distributed HTTP API calls in a SQL BEGIN TRANSACTION / ROLLBACK block. Relational database transactions cannot rollback external third-party API mutations.",
        "Silently stopping execution on failure without attempting rollback, leaving databases, payment gateways, and third-party systems in corrupted, half-applied states."
      ],
      "rounds": ["system-design", "debugging"],
      "roles": ["agentic-ai-engineer", "applied-ai-engineer"]
    },
    {
      "id": "agent-sandboxed-file-access-isolation",
      "title": "An agent is granted permission to inspect and edit files in a repository. How do you prevent path traversal outside the project directory while allowing legitimate paths?",
      "answer": "When coding agents accept file paths as tool arguments, attackers can use path traversal attacks (like '../../etc/passwd' or symlink redirection) to escape the workspace. We enforce path isolation in three layers. First, canonical path validation: we resolve relative paths using os.path.realpath() or std::filesystem::canonical to resolve all '..' segments and follow symlinks to their ultimate physical targets. We then verify that the canonical target path starts with the canonical root directory prefix using os.path.commonpath([root, path]) == root. If not, the tool rejects the call immediately. Second, filesystem isolation: the agent process executes inside an unprivileged Linux container or user mount namespace with a read-only root filesystem, mounting only the target project workspace as read-write. Third, we block creation of symlinks that point outside the project root to prevent post-validation symlink swap attacks.",
      "tradeOffs": [
        "Strict canonical path validation prevents traversal, but can break legitimate workflows in mono-repos that rely on symlinks to shared parent directories.",
        "Containerized sandboxing (e.g. gVisor, Docker) provides defense-in-depth against kernel exploits, but adds startup latency when spinning up fresh workspaces."
      ],
      "followUps": [
        "How does a Time-of-Check to Time-of-Use (TOCTOU) symlink race condition work in file editing agents, and how do you prevent it?",
        "Why is checking for '..' string presence in the path string insufficient for security?"
      ],
      "wrongAnswers": [
        "Filtering paths using simple string checks like path.startswith('/app') without resolving symlinks or '..' segments. Symlinks and relative paths bypass simple string prefixes trivially.",
        "Running the agent tool executor as root on the host machine and relying on LLM good behavior to avoid editing system configuration files."
      ],
      "rounds": ["system-design", "coding"],
      "roles": ["agentic-ai-engineer", "applied-ai-engineer"]
    },
    {
      "id": "agent-credential-vault-least-privilege",
      "title": "How do you pass authentication credentials to agent-invoked tools without exposing long-lived API tokens or database passwords to the LLM context window?",
      "answer": "Never inject raw API keys, passwords, or connection strings into the agent prompt context. Once credentials enter the context window, they can be exfiltrated via prompt injection, logged in plaintext telemetry, or echoed back to end users. We implement an Out-of-Band Credential Broker. The LLM interacts with tools using abstract symbolic names and functional parameters: e.g. query_customer_db(customer_id='123'). When the tool invocation payload reaches the execution proxy, the proxy authenticates the agent session, retrieves scoped short-lived credentials from a secrets vault (like HashiCorp Vault or AWS Secrets Manager), and injects the authorization headers directly into the outgoing HTTP request or database connection pool. The raw credential never touches the agent orchestrator memory or LLM context. Furthermore, credentials should use downscoped, short-lived tokens (e.g. 15-minute TTL) with least-privilege role boundaries.",
      "tradeOffs": [
        "Out-of-band credential injection completely eliminates secret exfiltration risks from context, but requires maintaining an authenticated secret broker proxy in front of every tool integration.",
        "Short-lived tokens limit blast radius if compromised, but require handling token refresh logic transparently inside the tool proxy."
      ],
      "followUps": [
        "How do you prevent an agent from invoking a tool that makes an outbound HTTP request to an attacker-controlled webhook to exfiltrate private response data?",
        "How does OAuth token exchange work when an agent acts on behalf of a specific delegated user?"
      ],
      "wrongAnswers": [
        "Putting API keys in the system prompt with an instruction like 'Secret key is xyz; never share this with the user'. Attackers extract these trivially with simple prompt injections.",
        "Giving the agent an unrestricted long-lived administrative token because it is convenient during development."
      ],
      "rounds": ["system-design", "design-review"],
      "roles": ["agentic-ai-engineer", "applied-ai-engineer"]
    },
    {
      "id": "agent-recursion-depth-circuit-breaker",
      "title": "How do you set deterministic recursion depth and step count limits in an agentic loop, and how do you handle state recovery when the limit is breached?",
      "answer": "Autonomous agent loops must possess hard deterministic bounds on recursion depth, step counts, and wall-clock execution time. An unconstrained while True loop will burn thousands of dollars in tokens when an agent becomes stuck in a reasoning cycle. We configure a hard step limit (e.g. maximum 15 tool steps per user request) and a wall-clock timeout (e.g. 60 seconds). At each iteration of the orchestrator, we increment an atomic counter: if step_count >= max_steps, the loop terminates immediately, tripping a CircuitBreakerException. Rather than returning a raw server error to the user, we trigger a state recovery handler: the handler analyzes the accumulated execution trace, formats a structured progress summary ('I completed steps A and B, but reached the execution step limit while working on C'), lists the remaining open tasks, and gives the user an interactive prompt button to authorize an additional execution budget to continue.",
      "tradeOffs": [
        "A strict step limit prevents runaway token expenditure, but can interrupt complex, legitimate multi-step workflows prematurely if set too low.",
        "Generating a graceful fallback summary consumes one additional lightweight LLM call, but provides a vastly superior user experience compared to an unhandled crash."
      ],
      "followUps": [
        "How do you distinguish between an agent that is making steady forward progress vs one that is thrashing when deciding whether to extend budget?",
        "What metrics should you alert on in Datadog or Prometheus when the step-limit circuit breaker trips frequently in production?"
      ],
      "wrongAnswers": [
        "Letting the agent loop run until the LLM naturally decides to stop. When models hit reasoning deadlocks or unhelpful tool outputs, they loop indefinitely.",
        "Returning a generic HTTP 500 error when the step limit is reached without saving intermediate work or explaining what was accomplished."
      ],
      "rounds": ["system-design", "debugging"],
      "roles": ["agentic-ai-engineer", "applied-ai-engineer"]
    },
    {
      "id": "agent-cycle-detection-state-hashing",
      "title": "An agent repeatedly queries a search tool with minor wording variations without making forward progress. How do you detect and break this semantic loop?",
      "answer": "When an agent fails to find expected information, it often enters a semantic loop: generating near-identical search queries repeatedly with slight synonym substitutions (e.g. 'refund policy', 'return policy', 'how to return product'). To detect this, we maintain a sliding window of recent tool calls (e.g. the last 5 steps). We compute two checks: first, an exact fingerprint hash SHA256(tool_name + ':' + canonical_args). If the exact hash appears twice in the window, a loop is confirmed. Second, for text search arguments, we compute embedding cosine similarity between the current query and prior queries in the window. If similarity exceeds 0.90 for 3 consecutive calls without new document IDs retrieved, the semantic cycle detector trips. We break the loop by injecting an explicit system intervention: 'You have repeated this search query 3 times without new results. You must either use alternative tools or inform the user that the information is unavailable.' If the next step repeats, we terminate.",
      "tradeOffs": [
        "Embedding similarity detects subtle paraphrases that exact hash matching misses, but adds vector computation latency to each tool planning step.",
        "Intervening with corrective prompt guidance gives the model a chance to pivot autonomously before forcing hard termination."
      ],
      "followUps": [
        "How do you handle intentional iterative refinement (e.g. an agent refining Python code after test failures) without falsely flagging it as a semantic loop?",
        "What threshold of embedding similarity reliably separates productive query refinement from unhelpful looping?"
      ],
      "wrongAnswers": [
        "Relying solely on exact string equality of tool arguments. Attackers and LLMs easily bypass exact matching by changing a single word or punctuation mark.",
        "Killing the session immediately on the first repeated query without providing feedback, which prevents legitimate query retries after transient network errors."
      ],
      "rounds": ["debugging", "system-design"],
      "roles": ["agentic-ai-engineer", "ai-evaluation-reliability-engineer"]
    },
    {
      "id": "agent-cost-token-budget-circuit-breaker",
      "title": "How do you implement an execution budget circuit breaker that terminates runaway agent tasks based on rolling token consumption and API dollar spend?",
      "answer": "Multi-agent workflows with tool use and self-reflection can consume millions of tokens in minutes if unconstrained. We implement an Execution Budget Circuit Breaker operating at the LLM gateway proxy. Each user request is allocated a token budget (e.g. 50,000 total tokens) and a financial dollar ceiling (e.g. $0.50 per task). As the agent loop executes, the gateway intercepts every completion response, extracts exact token usage from response.usage (prompt_tokens, completion_tokens, cached_tokens), multiplies by model price per token, and updates an atomic session accumulator. If total spend crosses an 80% soft warning threshold, the gateway injects a system note: 'Budget constraint: 80% of token budget consumed; finalize response immediately.' If spend reaches 100%, the circuit breaker trips: subsequent LLM calls are blocked, and an automated synthesizer emits a partial completion summarizing findings to that point.",
      "tradeOffs": [
        "Hard dollar limits prevent catastrophic runaway cloud bills, but can cut off legitimate complex reasoning tasks right before completion.",
        "Tracking usage at the gateway proxy ensures accurate billing across diverse models, but requires maintaining up-to-date pricing tables per model identifier."
      ],
      "followUps": [
        "How do prompt caching discounts (e.g. Anthropic or OpenAI prefix caching) factor into real-time token cost calculations?",
        "How do you partition budgets across a team of 4 collaborating sub-agents working on a shared parent task?"
      ],
      "wrongAnswers": [
        "Estimating token counts using character length divided by 4 instead of parsing exact usage metrics from API headers. Character heuristics diverge drastically on code, tables, and non-English text.",
        "Checking costs only after the entire agent workflow completes. By the time a post-hoc check runs, thousands of dollars in tokens have already been burned."
      ],
      "rounds": ["system-design", "cost-capacity"],
      "roles": ["agentic-ai-engineer", "applied-ai-engineer"]
    },
    {
      "id": "agent-stuck-tool-timeout-isolation",
      "title": "When an external tool called by an agent hangs or encounters high network latency, how do you prevent the agent orchestration thread from blocking indefinitely?",
      "answer": "External APIs, database queries, and sandboxed code execution environments are prone to deadlocks, network timeouts, and resource starvation. If an agent calls a hanging tool synchronously, the orchestration thread freezes, locking user resources and blocking subsequent events. We isolate tool execution using asynchronous task wrappers with strict timeout deadlines: asyncio.wait_for(execute_tool(...), timeout=timeout_seconds). Each tool registration defines an operational timeout (e.g. 5 seconds for web search, 15 seconds for sandboxed Python execution). If the timeout fires, the wrapper cancels the underlying async task, terminates active subprocesses with SIGTERM/SIGKILL, and returns a synthetic ToolTimeoutError payload into the message stream: 'Tool execution timed out after 10s. The external service did not respond.' The LLM observes the failure as a normal tool result and can choose an alternative action or notify the user.",
      "tradeOffs": [
        "Aggressive timeouts (e.g. 3s) keep agent responsiveness high, but cause false-positive terminations on legitimate slow workloads like heavy SQL queries.",
        "Canceling asynchronous tasks in Python requires proper signal handling in subprocesses to avoid leaving zombie processes or unclosed TCP sockets."
      ],
      "followUps": [
        "How do you cleanly kill a sandboxed Docker container executing user code when its execution timeout expires?",
        "What is the difference between client-side tool timeout and server-side connection timeout?"
      ],
      "wrongAnswers": [
        "Invoking tool requests using synchronous libraries (like standard requests.get) without a timeout parameter. Default HTTP connections can hang indefinitely on dropped TCP sockets.",
        "Terminating the entire agent session and throwing a 500 error whenever a single tool times out, instead of reporting the failure back to the model as a recoverable tool observation."
      ],
      "rounds": ["debugging", "system-design"],
      "roles": ["agentic-ai-engineer", "inference-engineer"]
    },
    {
      "id": "agent-hallucinated-tool-termination",
      "title": "What runtime guard should intercept an agent when it invokes non-existent tools or hallucinated argument schemas repeatedly?",
      "answer": "LLMs under domain pressure occasionally hallucinate tool names (e.g. calling 'search_google' when only 'search_web' is registered) or invent invalid argument schemas. If unhandled, the orchestrator returns error strings, and the model enters an error-thrashing loop, repeating the same hallucination. We implement a Tool Validation Guard at the dispatch layer using strict Pydantic schema validation. When the model emits a tool call, the guard checks: 1) Is tool_name in registered_tools? 2) Do arguments validate against the tool's Pydantic schema? If validation fails, we return an actionable feedback prompt specifying the exact error: 'Tool search_google does not exist. Available tools are: [search_web, read_doc]. Did you mean search_web?' We track consecutive validation errors: if the model fails validation twice in a row, the guard trips, halts tool execution, and forces the model to explain its impasse directly in prose.",
      "tradeOffs": [
        "Actionable error feedback often allows the model to self-correct on the next turn, but consumes context window tokens detailing schema requirements.",
        "Strict Pydantic validation rejects malformed types early, but requires all tools to define comprehensive type hints and input models."
      ],
      "followUps": [
        "How does constrained grammar decoding at the sampling level eliminate tool name hallucinations entirely?",
        "Why should you limit consecutive error retries to 2 instead of allowing 5 or 10 attempts?"
      ],
      "wrongAnswers": [
        "Silently dropping hallucinated tool calls and returning an empty string. The model has no idea what happened and will repeatedly retry the hallucinated call.",
        "Letting tool handlers throw unhandled Python AttributeError or KeyError exceptions that crash the server process."
      ],
      "rounds": ["debugging", "system-design"],
      "roles": ["agentic-ai-engineer", "applied-ai-engineer"]
    },
    {
      "id": "agent-cascading-failure-multi-agent-backoff",
      "title": "In a multi-agent system where Agent A delegates to Agent B, how do you prevent recursive retry storms and cascading failures when Agent B fails?",
      "answer": "In hierarchical multi-agent architectures, if sub-agent B encounters an outage, parent agent A will often retry delegation repeatedly. If multiple parent agents delegate to B, their simultaneous retries trigger a thundering herd retry storm that prevents B from recovering. We prevent cascading failures using three patterns. First, Delegation Hop Limits: each delegated task carries an execution metadata header with depth and max_depth (e.g. max_depth=3). If a delegation attempt exceeds max_depth, it is rejected immediately. Second, Circuit Breakers: the delegation proxy tracks failure rates of sub-agent endpoints. If error rate exceeds 30% over a 1-minute sliding window, the circuit breaker opens: subsequent delegation calls fail fast immediately without contacting sub-agent B. Third, Exponential Backoff with Jitter: retries must apply randomized exponential backoff: sleep = min(max_backoff, base * 2^attempt) + uniform(0, jitter), spreading out incoming recovery traffic evenly.",
      "tradeOffs": [
        "Circuit breakers protect downstream sub-agents from collapse, but require parent agents to implement graceful degradation fallback paths when the circuit is open.",
        "Adding hop limits prevents infinite recursive delegation loops, but requires passing distributed trace headers across all inter-agent message queues."
      ],
      "followUps": [
        "How do distributed tracing tools (like OpenTelemetry) track causal execution trees across asynchronous multi-agent delegation?",
        "What fallback action should parent Agent A take when the circuit breaker for sub-agent B is open?"
      ],
      "wrongAnswers": [
        "Configuring immediate retries in a while True loop on the parent agent. This guarantees a thundering herd that keeps failing sub-agents down permanently.",
        "Allowing sub-agents to delegate back to parent agents without hop counting, creating infinite mutual recursion cycles that crash both services."
      ],
      "rounds": ["system-design", "debugging"],
      "roles": ["agentic-ai-engineer", "applied-ai-engineer"]
    },
    {
      "id": "agent-graceful-fallback-on-abort",
      "title": "When an agent execution is aborted by a user or terminated by a safety watchdog, how do you synthesize a coherent, safe explanation rather than returning a raw error?",
      "answer": "Aborting an agent task (via user cancellation or safety watchdog trip) must leave the system in a clean, explainable state. Returning raw errors like 'TaskCancelledError' or 'ExecutionAborted' leaves users confused about whether partial actions occurred. We implement a Graceful Termination Lifecycle. When an abort signal arrives, the orchestrator immediately sets an atomic cancelled flag, cancels active background tool subprocesses, and captures the latest execution snapshot. It then passes the snapshot to a lightweight deterministic formatter (or fast completion model with a strict template): 'Task was stopped because [User Cancelled / Safety Rule Triggered]. Completed actions: [list verified mutations]. Unfinished actions: [list pending tasks].' This response is delivered to the user with actionable next steps (e.g. 'Resume from step 3' or 'Discard changes'). All uncommitted temporary files are purged, and audit logs record the termination reason.",
      "tradeOffs": [
        "Synthesizing an explanatory summary delivers clear visibility into partial execution, but requires preserving execution state during the cancellation sequence.",
        "Allowing users to resume from partial checkpoints improves efficiency, but requires ensuring external state did not mutate while the task was stopped."
      ],
      "followUps": [
        "How do you ensure compensating rollback actions execute reliably even when the abort signal was triggered by a user cancellation?",
        "Why is returning raw stack traces to end users considered a security vulnerability in production agent deployments?"
      ],
      "wrongAnswers": [
        "Instantly killing the Python process with SIGKILL (kill -9). This leaves orphaned database locks, incomplete file edits, and unclosed network connections.",
        "Displaying an unformatted runtime exception to the user without indicating whether previously executed mutating tools were completed or reverted."
      ],
      "rounds": ["system-design", "customer"],
      "roles": ["agentic-ai-engineer", "forward-deployed-ai-engineer"]
    }
  ],
  "cost-capacity": [
    {
      "id": "gpu-fair-share-drf-scheduling",
      "title": "How does Dominant Resource Fairness (DRF) allocate multi-tenant cluster resources when workloads compete for both GPU compute and CPU or host memory?",
      "answer": "In multi-tenant AI clusters, jobs require heterogeneous resources: e.g. training jobs are GPU-heavy, while data preprocessing jobs are CPU and host RAM-heavy. Simple slot-based or single-resource fair sharing leads to severe resource starvation. Dominant Resource Fairness (DRF) normalizes each tenant's consumption by cluster total capacity. For tenant i, we compute its allocation share for each resource type: s_gpu = allocated_gpu / total_gpu, s_cpu = allocated_cpu / total_cpu, s_mem = allocated_mem / total_mem. The tenant's dominant share is the maximum of these shares: max(s_gpu, s_cpu, s_mem), and the corresponding resource is its dominant resource. The DRF scheduler always picks the next pending job from the tenant that currently has the lowest dominant share across the entire cluster. This mathematically satisfies four fundamental properties: sharing incentive (no tenant prefers a statically partitioned cluster), strategy-proofness (tenants cannot game the scheduler by misreporting demands), Pareto efficiency, and envy-freeness.",
      "tradeOffs": [
        "DRF maximizes multi-resource utilization and fair sharing across heterogeneous jobs, but does not enforce hard job completion deadlines or latency SLAs.",
        "DRF assumes malleable or small job allocations; scheduling very large, non-preemptible gang-scheduled jobs (e.g. 512-GPU training runs) can lead to temporary head-of-line blocking."
      ],
      "followUps": [
        "What happens in DRF if one tenant requests only GPUs while another tenant requests only CPU and memory?",
        "How does gang-scheduling (all-or-nothing scheduling) integrate with DRF in distributed training?"
      ],
      "wrongAnswers": [
        "Allocating resources purely by counting GPU count and ignoring CPU and RAM. A tenant running CPU-heavy data loading jobs can hoard all host RAM, blocking GPU jobs from running.",
        "Assuming DRF gives every tenant an equal percentage of every resource. It equalizes only the dominant share of each tenant."
      ],
      "rounds": ["system-design", "ml-depth"],
      "roles": ["inference-engineer", "applied-ai-engineer"]
    },
    {
      "id": "gpu-mig-vs-mps-tradeoffs",
      "title": "When partitioning an NVIDIA A100 or H100 across multiple inference services, what are the architectural trade-offs between Multi-Instance GPU (MIG) and Multi-Process Service (MPS)?",
      "answer": "When serving smaller models that do not utilize an entire 80 GB A100 or H100, partitioning prevents hardware waste. Multi-Instance GPU (MIG) partitions the GPU at the hardware silicon level into up to seven independent GPU instances. Each MIG instance has dedicated Streaming Multiprocessors (SMs), memory controllers, crossbar paths, and isolated high-bandwidth VRAM (e.g. 1g.10gb has 10 GB VRAM). MIG provides absolute hardware fault isolation, guaranteed quality-of-service, and zero memory interference: an out-of-memory crash in one instance cannot affect neighboring instances. However, MIG partitions are rigid and static; repartitioning requires draining all jobs. Multi-Process Service (MPS) multiplexes multiple processes onto a single CUDA context in software. MPS shares compute and memory dynamically, achieving higher aggregate throughput on uneven or bursty workloads. However, MPS offers no hard memory isolation: an unhandled CUDA error or OOM in one client process can crash the shared MPS server, impacting all sharing tenants.",
      "tradeOffs": [
        "Use MIG for multi-tenant, untrusted, or strict-SLA production environments where fault isolation and predictable latency are non-negotiable.",
        "Use MPS for internal, cooperative microservices with bursty, complementary traffic where dynamic VRAM sharing and maximum compute saturation are prioritized."
      ],
      "followUps": [
        "Why can you not use MIG for models whose weights and KV cache exceed 10 GB on an A100?",
        "How does CUDA time-slicing differ from MPS, and what is its context-switching latency penalty?"
      ],
      "wrongAnswers": [
        "Claiming that MPS provides hardware-level memory protection. MPS shares a single CUDA context; a memory corruption or CUDA exception in one process can terminate all co-located workloads.",
        "Believing that MIG partitions can be dynamically resized on-the-fly while workloads are running. MIG reconfiguration requires deleting and recreating instances."
      ],
      "rounds": ["system-design", "inference-serving"],
      "roles": ["inference-engineer", "applied-ai-engineer"]
    },
    {
      "id": "gpu-preemption-graceful-checkpointing",
      "title": "When a high-priority production job preempts a low-priority research job on a shared GPU cluster, how do you coordinate graceful state preservation without corrupting weights?",
      "answer": "In multi-tenant clusters, high-priority production jobs must access GPUs immediately, but killing research jobs abruptly loses hours of compute and corrupts in-flight checkpoints. We implement a Graceful Preemption Protocol. When the cluster scheduler (e.g. Kubernetes with Kueue or Slurm) selects a node for preemption, it issues a POSIX SIGTERM signal to the preempted container and starts a grace period timer (e.g. 90 to 120 seconds). The training harness registers a signal handler for SIGTERM: upon receipt, it sets an atomic termination_requested flag. The training loop finishes the current mini-batch, skips the next forward pass, and triggers an atomic checkpoint save: write model weights, optimizer state, and dataloader epoch index to a temporary checkpoint directory on shared distributed storage (NFS/Ceph/S3), flush buffers, and perform an atomic POSIX rename to 'checkpoint_latest.pt'. The process then exits with return code 0. If the job fails to exit before the grace period expires, the scheduler issues SIGKILL.",
      "tradeOffs": [
        "Atomic rename ensures checkpoint files are never half-written or corrupted if killed, but saving multi-gigabyte models requires sufficient grace period time and storage write bandwidth.",
        "Distributed asynchronous checkpointing (like PyTorch Distributed Checkpoint DCP) writes shards in parallel, dramatically cutting save time during preemption."
      ],
      "followUps": [
        "Why is writing directly to the final checkpoint file path dangerous during preemption?",
        "How does PyTorch Distributed Checkpoint (DCP) save state faster than standard torch.save()?"
      ],
      "wrongAnswers": [
        "Using SIGKILL immediately to preempt jobs without a grace period. This destroys hours of training progress and risks leaving corrupted, unreadable checkpoint files.",
        "Writing checkpoint weights from rank 0 only while other ranks exit immediately, which fails in FSDP or ZeRO where weights are sharded across all ranks."
      ],
      "rounds": ["system-design", "debugging"],
      "roles": ["inference-engineer", "ai-data-engineer"]
    },
    {
      "id": "gpu-credit-token-bucket-fairness",
      "title": "How do you design a token-bucket or credit-based quota system for multi-tenant LLM inference to prevent one team from starving the cluster?",
      "answer": "In an enterprise multi-tenant LLM gateway, one team deploying an automated batch job can generate millions of requests, starving interactive production users. We implement a Credit Token Bucket Quota architecture at the inference API gateway. Each tenant is provisioned with a quota tier defined by burst capacity C and a sustained refill rate R (tokens per second or dollar credits per hour). Inbound requests authenticate via tenant API keys. When a request arrives, the gateway estimates consumption (e.g. prompt_tokens + estimated max_tokens). An atomic Redis Lua script checks if current_credits >= estimated_cost: if true, it deducts the estimated cost and forwards the request to the inference engine (vLLM/Triton). When streaming generation completes, the gateway calculates actual consumed tokens, refunds any over-estimated credits back to the bucket, and logs usage. If credits reach zero, the gateway rejects the request with HTTP 429 and a Retry-After header.",
      "tradeOffs": [
        "Pre-deducting estimated tokens prevents budget over-runs from concurrent requests, but requires reconciling actual tokens post-generation.",
        "Enforcing quotas at the gateway decouples billing from backend inference engines, but adds sub-millisecond Redis latency to request dispatch."
      ],
      "followUps": [
        "What happens if a client disconnects halfway through generation, and how are credits reconciled?",
        "How do you allow critical production teams to burst beyond their quota while strictly throttling internal dev teams?"
      ],
      "wrongAnswers": [
        "Deducting credits only after generation finishes. Under high concurrency, an automated script can launch 1,000 concurrent requests simultaneously before credits deduct, blowing quota by orders of magnitude.",
        "Setting rate limits purely by HTTP requests per minute rather than token volume. A single request with a 100,000-token context consumes 100x more compute than a 100-token request."
      ],
      "rounds": ["system-design", "cost-capacity"],
      "roles": ["applied-ai-engineer", "inference-engineer"]
    },
    {
      "id": "gpu-vram-fragmentation-prevention",
      "title": "In a shared inference cluster, what causes GPU VRAM fragmentation over time, and how do memory allocators prevent out-of-memory errors?",
      "answer": "In LLM serving, requests arrive with unpredictable prompt lengths and generate variable completion lengths. Standard CUDA memory allocation (cudaMalloc and cudaFree) is notoriously slow and causes external memory fragmentation: allocating and freeing variable-sized activation and KV cache tensors creates small, non-contiguous free memory gaps. Over time, total free VRAM might be 15 GB, but the largest contiguous block is only 2 GB, causing a new allocation to fail with an OutOfMemory error. Production inference engines eliminate this through two mechanisms. First, PyTorch's caching allocator maintains pools of allocated memory blocks, splitting and merging contiguous blocks without calling cudaFree. Second, modern LLM engines (like vLLM) use PagedAttention: they pre-allocate 90% of available GPU VRAM at startup into a fixed-size block pool (e.g. 16 tokens per block). KV cache is allocated as non-contiguous physical pages mapped via a virtual page table, eliminating KV cache fragmentation entirely.",
      "tradeOffs": [
        "PagedAttention completely eliminates KV cache fragmentation and boosts throughput by 2x to 4x, but requires virtual page table lookup overhead in custom CUDA attention kernels.",
        "Pre-allocating GPU VRAM at engine startup prevents other processes from sharing the GPU dynamically."
      ],
      "followUps": [
        "How does PagedAttention borrow architectural concepts from virtual memory in operating systems?",
        "What is the difference between internal and external memory fragmentation in GPU allocators?"
      ],
      "wrongAnswers": [
        "Calling torch.cuda.empty_cache() after every inference request. empty_cache() forces synchronization across all CUDA streams and flushes memory pools to the OS, causing massive latency spikes.",
        "Assuming that GPU memory fragmentation is caused by model weight tensors. Model weights are static; fragmentation is driven by dynamic KV cache and activation allocations."
      ],
      "rounds": ["inference-serving", "ml-depth"],
      "roles": ["inference-engineer", "applied-ai-engineer"]
    },
    {
      "id": "gpu-burst-quota-noisy-neighbors",
      "title": "How do you allow teams to burst beyond their baseline GPU quota during off-peak hours while guaranteeing zero latency degradation for production SLAs?",
      "answer": "To maximize cluster utilization without buying excess hardware, clusters allow idle capacity to be consumed as burst quota. However, burst workloads must never degrade production latency SLAs. We implement a Two-Tier Priority Class and Preemption Architecture on Kubernetes or Slurm. Every node pool defines Guaranteed Capacity and Opportunistic Capacity. Production workloads run with PriorityClass 'Production-High' and declare explicit resource requests matching limits. Internal research and batch workloads run with PriorityClass 'Batch-Opportunistic'. When the cluster is idle, batch jobs scale up into spare GPUs. The moment a production request or job arrives, the scheduler immediately schedules it: if all GPUs are full, the scheduler preempts (evicts) the lowest-priority batch job, freeing the GPU. Furthermore, to prevent network and memory bus noisy-neighbor interference on co-located nodes, we use MIG or dedicated node taints to isolate production traffic from batch workloads.",
      "tradeOffs": [
        "Opportunistic bursting increases overall cluster hardware utilization from 40% to over 85%, but batch workloads must be designed to tolerate frequent preemptions and resume from checkpoints.",
        "Hard node isolation guarantees zero noisy-neighbor interference, but reduces the pool of shared burstable nodes."
      ],
      "followUps": [
        "How do Kubernetes resource requests vs limits differ when scheduling burstable GPU workloads?",
        "How do you prevent noisy-neighbor memory bandwidth contention on multi-GPU nodes when one GPU saturates PCIe bus bandwidth?"
      ],
      "wrongAnswers": [
        "Giving all teams the same priority class and hoping fair-share scheduling responds fast enough for sub-second production inference traffic.",
        "Allowing burst jobs to run without preemption support, forcing production jobs to wait in queue behind multi-hour batch runs."
      ],
      "rounds": ["system-design", "cost-capacity"],
      "roles": ["inference-engineer", "applied-ai-engineer"]
    },
    {
      "id": "gpu-idle-workload-reclamation",
      "title": "How do you design an automated GPU reclamation controller that detects zombie or idle development notebooks and frees allocated VRAM?",
      "answer": "In AI development clusters, data scientists frequently spin up GPU Jupyter notebooks, run experiments, and leave them idle overnight, locking expensive A100/H100 instances. We design an Automated GPU Reclamation Controller running as a Kubernetes controller daemon. The controller queries NVIDIA Data Center GPU Manager (DCGM) metrics exported to Prometheus at 60-second intervals. For each active pod, it evaluates two primary signals: 1) Average GPU compute utilization (DCGM_FI_DEV_GPU_UTIL) over a rolling 30-minute window, and 2) Active CUDA kernel execution count. If compute utilization remains below 1% and no kernel runs for 30 consecutive minutes, the controller transitions the pod to 'IDLE_WARNING' state, sending an automated notification to the owner via Slack or email with a 15-minute grace period link to dismiss. If no user heartbeat is received before grace expires, the controller takes a lightweight pod snapshot, unbinds the GPU resource, and shuts down the container.",
      "tradeOffs": [
        "Automated idle reclamation recovers 20% to 35% of wasted cluster GPU spend, but can accidentally terminate legitimately waiting interactive sessions if utilization thresholds are set too aggressively.",
        "Measuring GPU compute utilization alone is insufficient; memory read/write activity and active CPU data loaders must be factored in to prevent killing jobs waiting on slow I/O."
      ],
      "followUps": [
        "Why is checking nvidia-smi memory usage alone insufficient to determine whether a notebook is idle?",
        "How do you preserve unsaved notebook code when an idle development container is terminated?"
      ],
      "wrongAnswers": [
        "Checking only allocated VRAM to detect idle status. PyTorch pre-allocates and holds VRAM even when completely idle, so an idle notebook will falsely appear 100% active.",
        "Immediately killing containers without a warning notification or grace period, frustrating researchers and destroying uncheckpointed exploratory code."
      ],
      "rounds": ["system-design", "debugging"],
      "roles": ["ai-data-engineer", "applied-ai-engineer"]
    },
    {
      "id": "gpu-slurm-vs-k8s-orchestration",
      "title": "Compare Kubernetes with the NVIDIA GPU Operator against Slurm for managing large-scale multi-tenant AI training clusters.",
      "answer": "Slurm and Kubernetes originate from different paradigms. Slurm was purpose-built for High-Performance Computing (HPC) and tightly coupled MPI/NCCL multi-node batch training. It natively supports gang-scheduling (all-or-nothing scheduling of hundreds of nodes), topology-aware placement (allocating GPUs on the same InfiniBand leaf switches to minimize network hops), and low-overhead job queues with advanced fair-share algorithms. However, Slurm lacks native microservices support, container-native CI/CD, and dynamic API autoscaling. Kubernetes is the industry standard for cloud-native microservices, continuous serving, and heterogeneous infrastructure. With the NVIDIA GPU Operator, it manages driver installation, device plugins, and monitoring. However, standard Kubernetes kube-scheduler lacks native batch gang-scheduling and fair-share queuing; supporting large training clusters requires adding specialized open-source schedulers like Volcano or Kueue. In production, enterprises often run Slurm for multi-thousand GPU foundational pre-training clusters, and Kubernetes for fine-tuning, inference serving, and end-to-end AI applications.",
      "tradeOffs": [
        "Slurm offers superior network-topology-aware job placement and minimal scheduling latency for monolithic distributed pre-training runs.",
        "Kubernetes provides a unified control plane for inference serving, web APIs, vector databases, and MLOps pipelines under a single ecosystem."
      ],
      "followUps": [
        "What is topology-aware scheduling, and why does placement across InfiniBand leaf switches impact AllReduce speed?",
        "How does Kueue bring batch scheduling capabilities to standard Kubernetes clusters?"
      ],
      "wrongAnswers": [
        "Claiming that standard default Kubernetes can handle large-scale distributed training out of the box without specialized batch schedulers. Without gang-scheduling, default Kubernetes schedules partial pods and deadlocks.",
        "Assuming Slurm can easily run dynamic, auto-scaling real-time web microservices with ingress routing."
      ],
      "rounds": ["system-design", "ml-depth"],
      "roles": ["inference-engineer", "applied-ai-engineer"]
    }
  ],
  "safety": [
    {
      "id": "gov-audit-trail-tamper-evident",
      "title": "How do you design a tamper-evident audit logging architecture for LLM interactions that records prompts, model IDs, generation parameters, and output hashes for compliance?",
      "answer": "Regulated enterprise AI deployments (in healthcare, finance, and legal domains) require auditable proof of what exact prompt was submitted, which model processed it, and what completion was returned. We design an append-only, tamper-evident audit logging architecture at the AI gateway. Every interaction generates a canonical AuditRecord containing: unique request ID, tenant ID, user identity, UTC timestamp, exact model identifier and weights checksum, hyper-parameters (temperature, top_p, seed), input prompt text, output completion text, token counts, and latency. To guarantee tamper-evidence, each record contains a cryptographic SHA-256 hash: hash_n = SHA256(record_n_payload + hash_{n-1}), creating an immutable hash chain where any post-hoc alteration invalidates all subsequent hashes. Audit records are asynchronously streamed to Write-Once-Read-Many (WORM) storage (such as AWS S3 Object Lock with strict compliance retention modes) preventing deletion or modification even by root administrators.",
      "tradeOffs": [
        "Cryptographic hash chaining and immutable WORM storage satisfy stringent regulatory compliance (SOC2, HIPAA, EU AI Act), but require managing PII encryption keys to allow compliance with GDPR right-to-be-forgotten deletion requests.",
        "Streaming full prompt and completion payloads increases storage footprint; separating metadata from encrypted payload storage balances searchability with cost."
      ],
      "followUps": [
        "How do you reconcile immutable audit logs with GDPR's 'Right to be Forgotten' requirement to delete user personal data?",
        "How do you verify the integrity of an audit hash chain during an external compliance audit?"
      ],
      "wrongAnswers": [
        "Storing audit logs in a mutable relational database table without cryptographic hashing or write-lock protection, allowing administrators to modify or delete logs.",
        "Logging only the output summary or token counts without recording the exact prompt text and model version checksum."
      ],
      "rounds": ["system-design", "design-review"],
      "roles": ["ai-evaluation-reliability-engineer", "applied-ai-engineer"]
    },
    {
      "id": "gov-pii-redaction-bidirectional",
      "title": "How do you implement bidirectional PII scrubbing that sanitizes sensitive data before sending prompts to an external LLM and verifies responses before returning them to the user?",
      "answer": "Sending unmasked customer Personally Identifiable Information (PII) to third-party LLM providers violates data privacy regulations. We implement bidirectional PII scrubbing at the proxy layer using a two-way tokenization pipeline. On the inbound path, the proxy passes user prompts through a hybrid detection engine: deterministic regex for high-precision structured entities (credit card numbers, social security numbers, phone numbers) and a fast Named Entity Recognition (NER) model (e.g. RoBERTa or Microsoft Presidio) for contextual entities (names, addresses). Detected PII is stored in an ephemeral, in-memory encrypted session vault and replaced in the prompt with typed surrogate tokens: e.g. 'John Smith' becomes '<PERSON_1>'. The sanitized prompt is sent to the LLM. On the outbound path, the response is inspected: surrogate tokens are de-anonymized back to original values for the client. Crucially, the outbound response is also scanned for accidental PII reconstruction or model training data memorization before client delivery.",
      "tradeOffs": [
        "Surrogate replacement (<PERSON_1>) preserves grammatical structure and semantic relationships for the LLM, whereas blank redaction ([REDACTED]) impairs model comprehension.",
        "NER models add 15 to 40ms of latency to prompt preprocessing and can occasionally misclassify uncommon proper nouns as sensitive names."
      ],
      "followUps": [
        "How do you handle subtle or unstructured PII (like a user casually mentioning their rare medical condition) that regex and standard NER miss?",
        "Why must outbound LLM completions be inspected for PII even if the prompt was fully sanitized?"
      ],
      "wrongAnswers": [
        "Relying on the LLM via system prompt instructions like 'Please ignore and do not store any PII in this prompt'. The data has already left your secure boundary the moment the HTTP request is dispatched.",
        "Permanently hashing PII with a one-way hash on the inbound path without surrogate tracking, which leaves the model output reading 'Hello <e3b0c442>' with no way to restore the recipient's name."
      ],
      "rounds": ["system-design", "ml-breadth"],
      "roles": ["applied-ai-engineer", "ai-evaluation-reliability-engineer"]
    },
    {
      "id": "gov-hallucination-audit-monitoring",
      "title": "What statistical and automated metrics do you track in production to detect and audit systematic hallucinations in regulated enterprise deployments?",
      "answer": "In regulated enterprise AI, hallucination is an existential risk. We track three complementary layers of telemetry in production. First, Citation Faithfulness and Span Attribution: for RAG and document-grounded tasks, we measure what percentage of claims in the generated response are directly entailed by the retrieved context using an NLI (Natural Language Inference) entailment model or citation check. If faithfulness drops below 0.95, the response is flagged. Second, Semantic Entropy and Self-Consistency: at inference time, we sample multiple completions (e.g. N=3 at temperature 0.7) and measure semantic clustering divergence; high semantic entropy indicates low model certainty and high hallucination likelihood. Third, Continuous Offline Audit Sampling: we sample a stratified 1% random slice of all production queries, pass them through a calibrated LLM-as-a-judge rubric scoring factual correctness against authoritative truth bases, and track historical drift in Datadog/Prometheus dashboards to detect model degradation.",
      "tradeOffs": [
        "NLI entailment checks provide instant automated scores on retrieved contexts, but cannot verify general world-knowledge assertions that fall outside the context.",
        "Sampling multiple completions to compute semantic entropy reliably flags hallucinations, but triples inference compute cost if run on every production query."
      ],
      "followUps": [
        "What is the mathematical formulation of semantic entropy, and how does it differ from raw token log-probability entropy?",
        "When an audit detects a spike in hallucination rate on a production model, what are your immediate mitigation steps?"
      ],
      "wrongAnswers": [
        "Relying on user thumbs-up/thumbs-down feedback alone to detect hallucinations. Users cannot verify complex domain facts and consistently give thumbs-up to fluent, plausible-sounding hallucinations.",
        "Assuming that high average token confidence (low perplexity) means the output is factually accurate. Models hallucinate false statements with extremely high token confidence."
      ],
      "rounds": ["system-design", "ml-depth"],
      "roles": ["ai-evaluation-reliability-engineer", "applied-ai-engineer"]
    },
    {
      "id": "gov-model-card-metadata-provenance",
      "title": "What metadata must an enterprise model registry capture to prove regulatory compliance, training data provenance, and alignment evaluations?",
      "answer": "Under frameworks like the EU AI Act, NIST AI RMF, and internal enterprise governance, deploying an unversioned black-box model is a severe compliance violation. An enterprise model registry must capture an immutable Model Card capturing: 1) Model Identity & Architecture: unique model ID, base foundation model, exact parameter count, weights cryptographic SHA-256 checksum, quantization format, and tokenizer version. 2) Data Provenance: exact manifests of pre-training, fine-tuning, and RLHF datasets, including source URLs, licensing terms, date ranges, PII scrubbing verification, and copyright clearance hashes. 3) Alignment & Evaluation Metrics: benchmark score cards covering task performance, safety red-teaming results, toxicity evaluation, bias benchmarks across demographic groups, and refusal calibration rates. 4) Operational Boundaries: explicit intended use cases, documented out-of-scope deployments, known failure modes, hardware requirements, and carbon/energy footprint estimates.",
      "tradeOffs": [
        "Capturing comprehensive provenance data satisfies audit requirements and ensures reproducible deployments, but requires strict CI/CD gatekeeping that slows down ad-hoc prototyping.",
        "Maintaining dataset hashes and license manifests requires continuous legal and data engineering coordination."
      ],
      "followUps": [
        "How do you cryptographically sign a model card so that production serving clusters refuse to load unsigned or unapproved model weights?",
        "What data provenance details are required if a fine-tuning dataset includes synthetic data generated by another commercial model?"
      ],
      "wrongAnswers": [
        "Treating a model card as an informal, static Markdown file checked into git without automated verification during deployment pipelines.",
        "Tracking only the model name and final benchmark accuracy without recording dataset licenses, training hyperparameters, or safety evaluation reports."
      ],
      "rounds": ["design-review", "ml-breadth"],
      "roles": ["ai-evaluation-reliability-engineer", "applied-ai-engineer"]
    },
    {
      "id": "gov-access-control-row-level-rag",
      "title": "When deploying an enterprise RAG system over proprietary company documents, how do you enforce document-level and row-level access control without leaking embeddings?",
      "answer": "In an enterprise RAG system spanning engineering, HR, and finance documents, users must only retrieve information they are explicitly authorized to view. We avoid Post-Retrieval Filtering (retrieving top-50 documents and filtering out unauthorized ones), because if a user queries a topic dominated by confidential documents, post-filtering discards all matches, returning zero results even when authorized documents exist. Instead, we implement Metadata Pre-Filtering at the vector database index. Every ingested document chunk is annotated with an Access Control List (ACL) metadata array: e.g. allowed_groups: ['engineering', 'finance_leads']. When an authenticated user submits a query, their JWT token is decoded to extract their authorized security groups. The vector search query applies a hard boolean filter: vector_search(query_embedding, filter={'allowed_groups': {'$in': user_groups}}). Only authorized chunks are scored by approximate nearest neighbors, guaranteeing zero confidential data leakage.",
      "tradeOffs": [
        "Metadata pre-filtering guarantees that exactly K authorized results are returned without information leakage, but requires indexing and updating ACL metadata alongside vector vectors.",
        "When an employee changes roles or groups, updating ACLs across millions of vector chunks requires efficient metadata re-indexing or group-indirection mappings."
      ],
      "followUps": [
        "Why does post-retrieval filtering introduce a security vulnerability known as the 'oracle leakage' attack in RAG systems?",
        "How do you design ACL metadata when document permissions are managed dynamically in external systems like Google Drive or SharePoint?"
      ],
      "wrongAnswers": [
        "Relying on the LLM via prompt instruction: 'Only answer if the user has permission to see finance documents'. The LLM has already received confidential context in the prompt, creating complete data leakage.",
        "Using post-retrieval filtering alone, which results in empty or depleted result sets and leaks document existence through timing side-channels."
      ],
      "rounds": ["system-design", "customer"],
      "roles": ["applied-ai-engineer", "forward-deployed-ai-engineer"]
    },
    {
      "id": "gov-automated-policy-guardrails",
      "title": "Compare rule-based input filters with semantic guardrails in terms of latency, bypass resistance, and false positive rates.",
      "answer": "Input guardrails protect LLM applications against prompt injection, jailbreaks, and toxic inputs. Rule-based input filters (regex, keyword blocklists, substring matching) execute with sub-millisecond latency (under 1ms) and deterministic predictability. For known fixed patterns (e.g. credit card formats, explicit slurs), they have zero false positives. However, their bypass resistance is extremely low: attackers easily evade them using leetspeak, unicode homoglyphs, spacing tricks, base64 encoding, or adversarial semantic rephrasing. Semantic guardrails (small classifier models, LLM-as-a-judge, or NeMo Guardrails) embed the input and evaluate semantic intent. They offer high bypass resistance, catching nuanced jailbreaks, indirect injections, and policy violations. However, they introduce significant latency (20 to 100ms for small classifiers, 500ms+ for LLM judges) and suffer from false positive rejections of legitimate domain queries. Production architectures use a tiered funnel: fast regex filters run first, followed by cached or asynchronous semantic classification.",
      "tradeOffs": [
        "A tiered guardrail funnel filters out obvious attacks in sub-millisecond time while reserving computationally expensive neural classifiers for ambiguous inputs.",
        "Overly aggressive semantic guardrails frustrate legitimate users through false-positive refusals; guardrails must be calibrated against real production traffic baselines."
      ],
      "followUps": [
        "How do attackers use unicode homoglyph substitutions to bypass regex filters, and how do you normalize inputs before filtering?",
        "When should guardrail classification run asynchronously alongside model prefill instead of blocking sequentially in front of the model?"
      ],
      "wrongAnswers": [
        "Believing that an extensive regex blocklist of bad words is sufficient to secure an LLM against prompt injection attacks.",
        "Placing an expensive 70B parameter LLM judge sequentially in front of every simple user query, quadrupling inference latency and cloud costs."
      ],
      "rounds": ["system-design", "ml-depth"],
      "roles": ["ai-evaluation-reliability-engineer", "applied-ai-engineer"]
    },
    {
      "id": "gov-bias-disparate-impact-testing",
      "title": "How do you statistically test an AI scoring or categorization system for disparate impact and demographic parity prior to production deployment?",
      "answer": "Prior to deploying AI systems that score, filter, or categorize humans (such as hiring screening, credit risk, or insurance underwriting), models must undergo formal statistical auditing for algorithmic bias across protected attributes (gender, race, age). We evaluate two primary statistical metrics. First, Demographic Parity and the Four-Fifths (80%) Rule: we compute the selection rate SR = P(Y_hat = 1 | A = a) across each protected group a. The Adverse Impact Ratio (AIR) is the selection rate of the protected group divided by the selection rate of the most favored group: AIR = SR_protected / SR_favored. Under regulatory guidelines (like EEOC in the US), an AIR below 0.80 indicates disparate impact. Second, Equalized Odds: we evaluate whether true positive rates and false positive rates are equal across demographic groups: P(Y_hat=1 | Y=1, A=0) == P(Y_hat=1 | Y=1, A=1). If disparities exceed thresholds, we apply pre-processing re-weighting or post-hoc threshold calibration.",
      "tradeOffs": [
        "Enforcing demographic parity can require adjusting classification thresholds across groups, which can create a trade-off against raw unconstrained accuracy.",
        "The Fairness Impossibility Theorem proves that Demographic Parity, Equalized Odds, and Predictive Parity cannot be satisfied simultaneously unless the base rates are identical across groups."
      ],
      "followUps": [
        "What does the Fairness Impossibility Theorem state regarding calibration and equalized odds?",
        "How do you audit for bias when protected attribute labels are missing or noisy in the training dataset?"
      ],
      "wrongAnswers": [
        "Assuming that removing protected attribute columns (like race or gender) from the dataset eliminates bias (fairness through unawareness). Correlated proxy features (like zip code or education history) recreate demographic bias easily.",
        "Claiming that a model is unbiased simply because it achieved identical overall accuracy across groups, ignoring wildly divergent false positive and false negative rates."
      ],
      "rounds": ["ml-breadth", "system-design"],
      "roles": ["ai-evaluation-reliability-engineer", "applied-ai-engineer"]
    }
  ]
}

def main():
    print("Validating 50 new gap questions...")
    total_new = 0
    for topic, qlist in NEW_QUESTIONS.items():
        print(f"  Topic: {topic} -> {len(qlist)} questions")
        total_new += len(qlist)
    assert total_new == 50, f"Expected 50 questions, got {total_new}"

    # Check for banned words across all fields
    banned_hits = []
    for topic, qlist in NEW_QUESTIONS.items():
        for q in qlist:
            text = f"{q['title']} {q['answer']} {' '.join(q.get('tradeOffs', []))} {' '.join(q.get('followUps', []))} {' '.join(q.get('wrongAnswers', []))}"
            for b in BANNED_WORDS:
                if re.search(r"\b" + re.escape(b) + r"\b", text, re.I):
                    banned_hits.append((q['id'], b))
    if banned_hits:
        print("ERROR: Found banned words in new questions:")
        for qid, b in banned_hits:
            print(f"  {qid}: {b}")
        sys.exit(1)
    print("Zero banned words found. Writing voice standards satisfied.")

    # Load existing senior questions
    senior_file = ROOT / "src/data/interviewSeniorQuestions.json"
    senior_data = json.loads(senior_file.read_text())

    # Check deduplication against existing senior questions and existing practice catalog
    practice_file = ROOT / "src/data/interviewPractice.json"
    practice_data = json.loads(practice_file.read_text())
    existing_titles = set()
    existing_ids = set()
    for t in practice_data["topics"]:
        for q in t["questions"]:
            existing_ids.add(q["id"])
            existing_titles.add(q["title"].strip().lower())

    for topic, qlist in NEW_QUESTIONS.items():
        for q in qlist:
            clean_title = q["title"].strip().lower()
            if clean_title in existing_titles:
                print(f"DUPLICATE TITLE DETECTED: {q['title']}")
                sys.exit(1)
            if f"senior:{q['id']}" in existing_ids:
                print(f"DUPLICATE ID DETECTED: {q['id']}")
                sys.exit(1)

    print("Zero duplicate titles or IDs detected.")

    # Merge into senior_data
    for topic, qlist in NEW_QUESTIONS.items():
        if topic not in senior_data:
            senior_data[topic] = []
        for q in qlist:
            # Append dict format
            senior_data[topic].append(q)

    senior_file.write_text(json.dumps(senior_data, indent=2, ensure_ascii=False) + "\n")
    print(f"Successfully updated {senior_file} with 50 new gap questions.")

if __name__ == "__main__":
    main()
