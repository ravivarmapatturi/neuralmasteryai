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
        "First, examine ef_search and M index hyperparameters. With query latency dropping from 42ms to 8ms, the search is likely traversing a much narrower graph frontier. Second, inspect chunk token counts and embedding normalization. Third, verify the distance metric in the query pipeline matches index creation. Test hypothesis one by measuring recall across an ef_search sweep from 16 to 256 on a held-out eval set. Test hypothesis two by checking dot products of sample unit vectors. Test hypothesis three by diffing collection schema configs. The root cause is ef_search defaulted to 16 in the new Terraform deployment, down from 128, terminating beam search too early. Fix it by tuning ef_search=128 dynamically via the client connection. To prevent recurrence, add automated recall assertion gates in CI that evaluate 500 gold queries against any newly built index snapshot before switching production alias pointers.",
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
        "First, evaluate prefill-decode interference: large incoming prompt prefills are preempting active decode iterations on the single engine. Second, check KV cache memory exhaustion causing request preemptions and recomputations. Third, check token budget exhaustion per forward pass. Test hypothesis one by plotting TTFT against input prompt length distribution and logging GPU compute engine occupancy during spikes. Test hypothesis two by monitoring vLLM's num_preemptions metric. Test hypothesis three by checking if max_num_batched_tokens is uncapped. The root cause is prefill starvation: a sudden burst of 4k-token document prompts entered the engine, monopolizing tensor cores for multiple 800ms compute steps and stalling queued decode and prefill requests. Fix it by configuring chunked prefill with enable_chunked_prefill=True and capping max_num_batched_tokens=2048. To prevent recurrence, disaggregate prefill and decode onto separate GPU node pools connected via KV cache transfer, completely isolating prompt computation from generation SLAs.",
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
        "First, investigate benchmark dataset contamination or overfitting to the judge's static rubric. Second, check length bias, where the judge rewards verbose answers while users abandon long responses. Third, check distribution shift between the test dataset and live production queries. Test hypothesis one by running an LLM judge permutation test with inverted criteria on historical failures. Test hypothesis two by computing average character length for new versus old answers and correlating length with user thumbs-down events. Test hypothesis three by clustering production query embeddings against the eval benchmark using cosine distance. The root cause is length and tone bias: the prompt was tuned to generate comprehensive 600-word disclaimers that scored full marks on the judge's compliance rubric, but users on mobile apps wanted immediate 2-sentence actionable summaries. Fix it by rewriting the prompt with strict brevity bounds and calibrating the judge rubric with negative penalties for verbosity. To prevent recurrence, ground eval suites in weekly sampled production conversations with human labelers alongside automated LLM judges.",
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
        "First, inspect the agent's step count distribution per task. Second, analyze input token accumulation across multi-turn context windows. Third, check tool call loops or recursive retries on external APIs. Test hypothesis one by querying trace logs in OpenTelemetry to compare pre-change and post-change execution step percentiles. Test hypothesis two by plotting cumulative context token growth per iteration. Test hypothesis three by filtering traces for identical consecutive tool invocations. The root cause is runaway verification loops: the phrase 'verify all sources' caused the agent to launch three to five recursive web searches for every intermediate claim, accumulating 45,000 prompt tokens across ten turns instead of finishing in two. Fix it by setting a hard limit of max_turns=4, adding an explicit termination condition to verify at most two primary sources, and passing only relevant search snippets rather than full web pages. To prevent recurrence, enforce step budget circuit breakers in the runtime harness and require token cost regression tests before prompt merges.",
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
        "First, inspect the token order of prompt assembly at the gateway. Second, verify whether session or request IDs are inserted ahead of the shared prompt. Third, check memory pressure causing premature LRU radix tree node eviction. Test hypothesis one by diffing tokenized prompt prefixes across consecutive user requests. Test hypothesis two by inspecting gateway middleware serializers. Test hypothesis three by monitoring cache usage and tree node eviction counts. The root cause is prefix order disruption: the new personalization middleware prepended a dynamic timestamp and user profile dictionary at token index zero, preceding the 3,000-token system prompt and few-shot examples, invalidating Radix tree prefix matches for the entire payload. Fix it by restructuring prompt layout: place the invariant 3,000-token system prompt and static tool definitions first, followed by few-shot exemplars, then dynamic user profiles, and finally the user query. To prevent recurrence, implement prefix regression unit tests verifying that the first N tokens of all standard prompts remain byte-identical across requests.",
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
        "First, inspect draft token acceptance length on legal domain queries versus general chat. Second, profile GPU compute saturation and kernel launch overhead for target verification passes. Third, verify draft model vocabulary and tokenizer alignment with the target model. Test hypothesis one by logging per-query acceptance rate distributions from the serving engine. Test hypothesis two by running Nsight Systems to measure target verification latency versus draft latency. Test hypothesis three by tokenizing sample legal terms with both tokenizers and checking token ID parity. The root cause is low acceptance rate on domain vocabulary: the draft model achieved an average acceptance length of only 1.1 tokens on dense legal jargon, meaning the target model spent verification passes rejecting drafts while paying draft generation overhead. Fix it by setting dynamic speculative routing: if acceptance length drops below 1.5 tokens on a 10-token rolling window, fall back to pure autoregressive decoding. To prevent recurrence, benchmark draft models against domain-specific test sets and train specialized draft heads on domain tokens.",
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
        "First, verify vector normalization: cosine similarity requires unit-normalized embeddings, otherwise magnitude distortions produce false matches. Second, check query-document asymmetric instruction formatting required by models like E5 or BGE. Third, check index vector compression or dimensional truncation. Test hypothesis one by calculating vector L2 norm on query and document embeddings. Test hypothesis two by checking if query strings include required task prefixes like 'query: '. Test hypothesis three by evaluating retrieval precision with and without dimensionality truncation. The root cause is missing asymmetric query prefixes: the new model was trained with 'query: ' and 'passage: ' instruction prefixes, and un-prefixed short queries collapsed onto generic embedding centroids with high background cosine similarity across all passages. Fix it by adding the required task prefix in the query preprocessor and verifying L2 normalization before indexing. To prevent recurrence, write retrieval sanity tests asserting that out-of-domain random text scores low similarity against standard short queries.",
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
        "First, inspect the calibration dataset used during quantization to check language representation. Second, check activation outlier clipping across key projection layers. Third, verify repetition penalty and frequency penalty generation parameters. Test hypothesis one by inspecting language distribution metadata in the calibration dataset. Test hypothesis two by measuring per-channel activation scales on multilingual inputs versus English inputs. Test hypothesis three by testing generation with high repetition penalty. The root cause is calibration dataset bias: the AWQ calibration set contained 100% English data, causing quantization scale factors to clip salient activation channels that activate specifically for non-Latin token distributions and non-English syntactic structures, zeroing out Spanish and Hindi attention signals. Fix it by re-quantizing the model using a multilingual calibration set that reflects production traffic proportions across all supported languages. To prevent recurrence, establish automated multilingual perplexity gates that evaluate quantized weights against parallel corpora in every target language before deployment.",
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
        "First, inspect client disconnection handling during streaming responses. Second, analyze token debit timing relative to stream lifecycle. Third, verify Redis atomic reservation and refund scripts. Test hypothesis one by filtering gateway logs for client abort events during active generation. Test hypothesis two by comparing total tokens reserved versus total tokens generated per session in the database. Test hypothesis three by running concurrency tests against the Redis rate-limiting Lua script. The root cause is missing stream cancellation refunds: when users closed browser tabs or canceled generations mid-stream, the gateway aborted the HTTP connection but never credited back the unconsumed tokens that were reserved up front based on max_tokens=4096. Fix it by attaching an abort listener on client connections that terminates generation and immediately calculates and refunds unconsumed tokens back to Redis. To prevent recurrence, add automated integration tests simulating abrupt client disconnects and asserting that tenant token balance reconciles to exact usage.",
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
        "First, evaluate the fine-tuned model's function-calling training format against the inference prompt schema. Second, check whether constrained decoding is enabled. Third, check output token truncation from restrictive max token limits. Test hypothesis one by inspecting raw model output strings before JSON parsing in error logs. Test hypothesis two by verifying whether vLLM or SGLang guided decoding is configured. Test hypothesis three by checking if failed responses end with unclosed brackets at token boundaries. The root cause is unconstrained generation on smaller model weights: the 8B model occasionally outputs trailing commas, unescaped quotes in arguments, or conversational preambles before the JSON payload. Fix it by enforcing grammar-constrained decoding in the serving engine, forcing the model to emit only tokens that conform to the tool schema. To prevent recurrence, require constrained decoding as an architectural invariant for all tool-calling endpoints, and test schema conformance on 1,000 synthetic requests in CI.",
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
        "First, inspect input batch data for corrupt tokens, empty sequences, or division-by-zero masks. Second, check gradient norm spikes and unscaled optimizer states across nodes. Third, check learning rate schedule transitions and warmup decay boundaries. Test hypothesis one by replaying batch 4,210 through a single GPU worker and logging loss. Test hypothesis two by checking gradient norm telemetry preceding step 4,210. Test hypothesis three by verifying learning rate and weight decay values at the step boundary. The root cause is an anomalous batch containing a single sequence of all padding tokens, resulting in zero denominator in the cross-entropy loss reduction and computing 0/0 = NaN, which propagated through optimizer momentum to all model weights. Fix it by adding a non-zero epsilon to the loss normalization denominator, filtering all-pad batches in the data loader, and resuming training from checkpoint 4,200 with gradient clipping enabled at max_norm=1.0. To prevent recurrence, add dataset verification sanitizers that reject batches with zero non-masked tokens before AllReduce.",
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
        "First, verify whether the model was fine-tuned on long sequences after modifying rope_theta. Second, check attention scale factor adjustments and temperature scaling. Third, check position ID integer overflow in positional embedding buffers. Test hypothesis one by inspecting training history: changing rope_theta alters wavelength dynamics across rotary dimensions without teaching the model how to attend to distant tokens. Test hypothesis two by testing needle-in-a-haystack retrieval at 16k context. Test hypothesis three by checking tensor shapes and position tensor dtypes. The root cause is naive RoPE base scaling without fine-tuning: increasing rope_theta compresses high-frequency dimensions, which preserves local grammar, but completely disturbs the relative phase relationships learned during pretraining for long-range attention heads. Fix it by applying YaRN with temperature correction and fine-tuning on long-context datasets for at least 1,000 steps. To prevent recurrence, require needle-in-a-haystack retrieval evals across the full target length before certifying extended context windows.",
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
        "First, inspect the computational complexity of the cross-encoder: cross-encoders concatenate query and document into a single transformer input, scaling quadratically with sequence length and linearly with candidate count. Second, check GPU batch size saturation and queuing delays on the reranker service. Third, check document length truncation limits. Test hypothesis one by calculating total token compute for 100 pairs versus 25 pairs. Test hypothesis two by profiling GPU kernel utilization and queue depth on the reranking pod. Test hypothesis three by measuring token lengths of retrieved candidate documents. The root cause is compute saturation: running full cross-attention across 100 documents with an average of 400 tokens per document exceeded single-batch GPU compute capacity, causing batch serialization and queuing delays. Fix it by implementing a two-stage cascaded reranker: use ColBERT late interaction to score 100 down to 25 candidates in 15ms, then run the expensive cross-encoder only on the top 25 candidates. To prevent recurrence, enforce latency budgets on retrieval stages and alert when candidate pool size changes without load testing.",
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
        "First, profile finite state machine construction and per-token vocabulary masking overhead. Second, check regex complexity for catastrophic backtracking in the grammar parser. Third, check GPU-to-CPU synchronization stalls during logit masking. Test hypothesis one by measuring token generation time with grammar masking versus unconstrained generation. Test hypothesis two by compiling the schema FSM independently and benchmarking transition lookup times. Test hypothesis three by profiling CUDA stream synchronization in PyTorch. The root cause is FSM index lookup latency: complex nested unions and unconstrained regex patterns created an FSM with tens of thousands of states, causing CPU-bound logit mask computations that blocked the GPU before every single token. Fix it by replacing complex regex patterns with simplified bounded schemas, precompiling the FSM once at startup, or migrating to XGrammar with compressed GPU-resident grammar state. To prevent recurrence, benchmark schema FSM compilation time and per-token masking latency in CI before deploying new Pydantic definitions.",
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
        "First, inspect the LoRA rank, alpha parameter, and target modules. Second, analyze the fine-tuning dataset composition and training epoch count. Third, check learning rate magnitude and weight decay. Test hypothesis one by inspecting whether LoRA was applied to all projection matrices with an excessively high rank. Test hypothesis two by calculating data diversity and checking for overfitting across multiple epochs. Test hypothesis three by evaluating intermediate checkpoints across training steps. The root cause is target module saturation and dataset homogeneity: LoRA was trained with high rank r=64 across all linear layers for 5 epochs on pure SQL pairs with zero general replay data, overwriting foundational attention and MLP pathways. Fix it by reducing rank to r=16 targeting only W_q and W_v, lowering learning rate to 1e-4, and mixing in 15% replay data of general instruction and reasoning tasks during fine-tuning. To prevent recurrence, evaluate every checkpoint on both target domain benchmarks and general evaluation suites in the CI training harness.",
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
        "First, inspect regex patterns used in input sanitizers for catastrophic backtracking. Second, check input payload size limits at the ingress controller. Third, verify CPU limits and worker process isolation in the container. Test hypothesis one by running the guardrail regex against synthetic repeating strings using Python's re module with profiling. Test hypothesis two by checking ingress client_max_body_size configuration. Test hypothesis three by checking Kubernetes resource limits. The root cause is catastrophic backtracking in an unanchored nested quantifier regex used for prompt injection detection, causing exponential evaluation steps on non-matching repetitive strings. Fix it by rewriting regex patterns using linear-time regex engines like Google RE2, removing nested quantifiers, and enforcing a strict 8KB payload truncation gate at the API gateway before guardrail inspection. To prevent recurrence, audit all security regex patterns with static analysis tools and benchmark against pathological test payloads in CI.",
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
        "First, check the semantic similarity threshold in the cache lookup pipeline. Second, analyze cache invalidation and eviction mechanisms on upstream data mutations. Third, check whether cache keys incorporate metadata partitions. Test hypothesis one by checking similarity scores between the incoming query and the cached entry that served the stale response. Test hypothesis two by reviewing how the pricing update service notifies the vector cache. Test hypothesis three by examining cached vector metadata payloads. The root cause is twofold: the similarity threshold was set too loosely at cosine_similarity >= 0.82, matching today's query with historical promotional queries, and the cache had no entity-level invalidation hooks when catalog prices changed. Fix it by raising the similarity threshold to 0.95, partitioning the cache by product SKU and currency, and publishing an invalidation webhook from the pricing service that purges all cache entries matching updated SKUs. To prevent recurrence, enforce TTL limits of 30 minutes on volatile data and add automated drift tests that compare cache outputs against live database queries.",
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
        "First, inspect the consensus termination condition and loop exit criteria in the orchestration code. Second, analyze the critic's output format to check for parsing failures. Third, check async concurrency locks or unawaited task futures between agents. Test hypothesis one by inspecting execution traces of timed-out sessions to see if critic and generator are stuck in an oscillating loop. Test hypothesis two by reviewing state transitions in the orchestrator state machine. Test hypothesis three by checking event loop thread pools. The root cause is an unhandled oscillation deadlock: when the critic rejects an answer without producing actionable feedback, the generator produces the original response again, causing an infinite oscillation that never satisfies the consensus threshold or triggers an exit rule. Fix it by enforcing a hard maximum turn limit of max_rounds=3, implementing a divergence tie-breaker where the orchestrator returns the highest-scoring candidate if rounds exhaust, and setting per-agent turn timeouts of 15 seconds. To prevent recurrence, add property-based tests verifying that the debate state machine terminates within finite bounds for all inputs.",
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
        "First, inspect Voice Activity Detection silence duration threshold parameters. Second, check speech-to-text endpointing logic and final transcript event triggers. Third, analyze background noise floor and audio chunking boundaries. Test hypothesis one by reviewing VAD settings in the audio pipeline config. Test hypothesis two by logging websocket audio stream events and timestamping VAD silence triggers. Test hypothesis three by testing with clean audio versus background office noise. The root cause is an overly aggressive silence threshold: min_silence_duration_ms was set to 400ms, which is shorter than natural human conversational pauses (typically 600ms to 900ms), causing the VAD to trigger a premature end-of-speech signal. Fix it by increasing min_silence_duration_ms to 750ms, adding 200ms of speech padding to prevent clipping trailing consonants, and implementing semantic completion checks: if the partial transcript ends mid-clause, wait an additional 500ms before triggering the LLM. To prevent recurrence, test voice pipelines against audio datasets containing natural hesitation pauses and measure cutoff rates across speaking rates.",
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
        "First, inspect volume mount configurations and Docker run flags. Second, check user permissions and capabilities inside the container. Third, analyze path validation in the agent's file system tools. Test hypothesis one by inspecting docker run flags for broad host directory mounts. Test hypothesis two by checking whoami and verifying if the container runs as root without dropped capabilities. Test hypothesis three by testing tool calls with relative path traversal payloads. The root cause is container privilege misconfiguration: the container ran as root, was mounted with the host root or broader parent directory, and had full Linux capabilities, allowing the agent to follow symlinks and write outside its directory. Fix it by running the container as an unprivileged user, dropping all capabilities with --cap-drop=ALL, mounting the workspace volume with explicit boundaries, mounting the root filesystem read-only, and validating canonical paths with os.path.realpath in file tools. To prevent recurrence, run automated sandbox escape regression suites in CI before approving agent runtime images.",
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
        "First, inspect feature value distributions between offline training datasets and online feature store lookups. Second, check point-in-time correctness in the offline feature pipeline. Third, verify feature computation logic parity between SQL batch pipelines and real-time streaming engines. Test hypothesis one by computing Kolmogorov-Smirnov tests on feature values between online logs and offline training tables. Test hypothesis two by checking event timestamp joins for future-data leakage in training SQL. Test hypothesis three by sending sample payloads through both offline SQL and online Python feature encoders. The root cause is target leakage via point-in-time lookups: offline training joined customer 30-day chargeback counts using event_timestamp, but the batch query updated the aggregate table daily without time-travel partitions, leaking future fraud records into historical training features. Fix it by enforcing point-in-time correctness in the feature store using AS OF time-travel joins, and standardizing feature definitions in Feast so the exact same definition generates both offline training sets and online Redis keys. To prevent recurrence, establish automated data drift and distribution parity tests comparing online feature logs against offline training splits.",
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
        "First, investigate memory fragmentation in the PyTorch CUDA allocator versus the serving engine's paging system. Second, check tensor parallel buffer allocation and temporary activation memory spikes during large prefill batches. Third, check memory leaks in custom CUDA kernels or embeddings. Test hypothesis one by checking whether PagedAttention is enabled and inspecting page table allocation metrics. Test hypothesis two by checking torch.cuda.memory_summary() for reserved versus allocated block discrepancies. Test hypothesis three by testing with chunked prefill to cap activation buffers. The root cause is activation memory surge during unchunked prefill: while KV cache memory was capped at 58%, a burst of long 16k-token prompts required large contiguous activation memory blocks for intermediate attention projection matrices, colliding with pre-allocated KV blocks and causing PyTorch allocator failure. Fix it by configuring gpu_memory_utilization=0.90 properly, reserving a 15% safety headroom for activations, and enabling chunked prefill to bound maximum activation tensor size per step. To prevent recurrence, load-test serving instances with maximum context length inputs alongside high concurrent requests to verify memory stability under worst-case activation loads.",
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
        "First, inspect batch composition and negative sampling logic in the DataLoader. Second, check temperature parameter scaling in the InfoNCE loss function. Third, check for duplicate or identical passages appearing within the same batch. Test hypothesis one by examining batch construction code for leakage. Test hypothesis two by inspecting temperature tau value. Test hypothesis three by printing passage ID sets per batch. The root cause is batch contamination from duplicate documents: the dataset contained duplicate passages with different IDs, or multiple queries mapped to the exact same positive passage within the same training batch. The InfoNCE loss treated these identical passages as both positive and negative, producing degenerate zero loss and blowing up gradients. Fix it by deduplicating the corpus, ensuring that no batch contains duplicate passages, and adding an identity mask that zeroes out loss for identical query-document pairs in the similarity matrix. To prevent recurrence, add data loader assertions verifying that all passage IDs in any batch are mutually exclusive.",
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
        "First, inspect generated Markdown for dynamic image or link rendering tags. Second, check if the uploaded PDF contained hidden prompt injection instructions. Third, verify outbound network egress rules in the web app container. Test hypothesis one by inspecting raw LLM output in the database for injected markdown image tags. Test hypothesis two by extracting text layers from the malicious PDF to reveal invisible or small-font injection payloads. Test hypothesis three by monitoring egress network connections from the rendering client. The root cause is indirect prompt injection coupled with markdown image exfiltration: the PDF contained white-on-white text instructing the LLM to summarize sensitive account data and append it as URL query parameters in a markdown image tag, which the frontend rendered as an image tag, causing the user's browser to execute an unauthorized GET request. Fix it by implementing a strict Content Security Policy blocking external image domains, sanitizing LLM output to strip external image URLs before rendering, and running a prompt injection classifier on document inputs. To prevent recurrence, treat all document-derived data as untrusted and enforce sandboxed, zero-network iframe rendering for AI output.",
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
        "First, inspect the Kubernetes livenessProbe and readinessProbe definitions in the deployment manifest. Second, check model loading and GPU weight initialization duration. Third, profile the health check endpoint latency under initial weight compilation. Test hypothesis one by running kubectl describe pod to inspect termination reasons and probe failure events. Test hypothesis two by timing container startup from image pull to first successful inference. Test hypothesis three by testing the health check endpoint directly during startup. The root cause is an overly aggressive liveness probe: initialDelaySeconds was set to 30s with timeoutSeconds=5, but loading 28GB of weights into GPU VRAM and compiling initial CUDA kernels took 95 seconds, causing the liveness probe to fail 3 times and prompting Kubernetes to kill the healthy initializing container. Fix it by configuring a startupProbe with failureThreshold=30 and periodSeconds=10, giving 300 seconds for weight loading and warm-up, and separating readiness probes from liveness so traffic is only routed after the first dummy inference pass completes. To prevent recurrence, require startup time benchmarking in staging and include startup probes in all ML Helm chart templates.",
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
        "First, inspect the fallback trigger criteria in the router gateway. Second, analyze latency and error rate metrics on the 8B model cluster. Third, check downstream quota limits and circuit breakers. Test hypothesis one by reviewing router code: check whether timeouts, validation errors, or confidence thresholds trigger fallback. Test hypothesis two by checking latency distribution and queue depth on the 8B model pods. Test hypothesis three by inspecting gateway logs for fallback classification codes. The root cause is a tight timeout fallback trigger: the router had a 1,000ms SLA for the 8B model; a minor database hiccup increased 8B latency by 50ms, causing 40% of queries to hit the timeout and fallback to the 70B model, which overwhelmed the 70B cluster, increasing overall queueing and triggering universal fallback. Fix it by introducing a circuit breaker and rate cap on fallback traffic: fall back only on explicit model errors or low confidence scores, never on simple queue timeouts, and cap fallback traffic at a maximum of 10% of total volume. To prevent recurrence, decouple fallback routing from latency spikes and implement backpressure shedding.",
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
        "First, inspect randomization and hashing logic used to assign users to test buckets. Second, check for variant-specific redirect latency or crash drops before telemetry logging. Third, analyze user attrition and bot filtering across test variants. Test hypothesis one by testing user ID hashing distribution across a synthetic set of 1,000,000 IDs. Test hypothesis two by comparing client-side assignment logs against server-side render logs to detect missing event pings. Test hypothesis three by checking error rates and load times partitioned by variant. The root cause is variant-induced client abandonment: the new hybrid search algorithm added 450ms of reranking latency, causing mobile users on weak connections to drop off or bounce before the client tracking beacon fired, systematically undercounting variant sessions. Fix it by logging bucket assignment server-side at the routing layer before rendering, and fixing the 450ms latency regression in the variant pipeline. To prevent recurrence, implement automated daily SRM checks with chi-square tests in experiment dashboards, and invalidate experiment conclusions whenever an SRM is detected.",
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
        "First, inspect document chunking configuration and chunk boundary splits. Second, examine retrieved context passages returned by vector search for this query. Third, check embedding similarity between the query and surrounding policy paragraphs. Test hypothesis one by inspecting the raw text of the chunks retrieved in the RAG prompt. Test hypothesis two by searching the document store for the exact phrase 'Refunds are permitted'. Test hypothesis three by checking chunk overlap settings. The root cause is naive character chunking without semantic boundary awareness: the chunking script split the sentence directly after 'No,' on token 512, placing 'Refunds are permitted within 30 days...' into the subsequent chunk, which scored lower in similarity and was dropped from top-k context. Fix it by migrating from fixed-character chunking to sentence-aware recursive chunking with at least 50 tokens of overlap (chunk_size=400, chunk_overlap=80), and implementing parent-document retrieval so matching chunks return the full enclosing section to the LLM. To prevent recurrence, evaluate retrieval chunkers against negative assertion test suites to ensure conditional clauses remain intact.",
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
        "First, inspect the effective LoRA learning rate scaling formula alpha / r. Second, check adapter weight initialization (Matrix A Gaussian, Matrix B zero). Third, check learning rate and optimizer parameter groups. Test hypothesis one by calculating the scaling ratio: alpha / r = 8 / 64 = 0.125, which significantly scales down the adapter gradients. Test hypothesis two by logging gradient norms of adapter weights across initial steps. Test hypothesis three by verifying that adapter parameters have requires_grad=True while base weights have requires_grad=False. The root cause is severe gradient under-scaling due to mismatched alpha and r: setting alpha=8 with r=64 attenuated gradient updates by an effective factor of 8x relative to standard convention (alpha = 2 * r or alpha = r), rendering the base learning rate ineffective. Fix it by setting alpha=64 or alpha=128 (or equivalently raising the base learning rate for adapter parameters), ensuring effective scaling alpha/r >= 1.0. To prevent recurrence, establish standard configuration validation that asserts alpha >= r and logs effective adapter learning rates before training starts.",
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
        "First, inspect the concurrency model for tool execution and agent state mutation. Second, check database transaction isolation levels on state updates. Third, analyze tool response ordering and reconciliation in agent memory. Test hypothesis one by reviewing whether tool calls execute asynchronously without synchronization locks on shared agent state. Test hypothesis two by logging tool dispatch and resolution timestamps in traces. Test hypothesis three by testing with sequential tool execution. The root cause is a read-modify-write race condition: the agent dispatched 'search_flight' and 'book_hotel' concurrently; when 'book_hotel' resolved, it updated the conversation memory state without acquiring an atomic lock, overwriting concurrent updates and causing the agent to re-trigger hotel booking on the next reasoning step. Fix it by enforcing idempotency keys on all state-mutating tool calls, making agent state updates atomic using transactional mutexes or append-only event sourcing, and separating read-only tools (which can run concurrently) from state-mutating tools (which must execute sequentially). To prevent recurrence, require idempotency tokens for all transactional agent actions and write concurrency tests in the agent evaluation harness.",
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
    SENIOR_FILE.write_text(json.dumps(data, indent=2) + "\n")
    print(f"Successfully wrote {len(DEBUG_QUESTIONS)} questions to {SENIOR_FILE} under 'debug'")


if __name__ == "__main__":
    main()
