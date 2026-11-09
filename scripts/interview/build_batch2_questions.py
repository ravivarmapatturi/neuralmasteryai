#!/usr/bin/env python3
"""Build batch2_questions.py with 50 new questions across thin themes:
continuous batching (5), a2a (4), quantization (5), model routing (5),
feature stores (4), ab-testing (5), recommendation systems (5),
prompt caching (4), semantic cache (4), rate limits (4), voice (5)."""

QUESTIONS = {
  "inference-serving": [
    {
      "id": "serving-continuous-batching-iteration",
      "title": "How does iteration-level continuous batching differ from static request batching, and how does it maximize GPU tensor core utilization?",
      "answer": "In static request batching, the model server groups several requests together, runs the forward pass until every single request finishes, and then emits responses. Because generation lengths vary widely, short requests finish early but remain trapped in GPU memory, while the server waits for the longest request to complete. Iteration-level continuous batching schedules requests at the granularity of individual generated tokens. At every decoding step, the engine removes requests that emitted an end-of-sequence token and inserts newly arrived requests into the running batch without pausing ongoing generations. The engine processes prompt prefill and token decoding dynamically across iterations. The trade-off is scheduling complexity versus hardware utilization: continuous batching adds a small CPU scheduling overhead to manage dynamic batch state at every iteration, but it increases serving throughput by three to four times and eliminates idle GPU tensor core stalls.",
      "tradeOffs": [
        "Iteration-level scheduling maximizes GPU saturation across requests of diverse lengths, but requires dynamic KV-cache block allocation per token.",
        "Co-scheduling compute-heavy prefill phases with memory-bound decode phases can cause brief tail latency jitter unless prefill is chunked."
      ],
      "followUps": [
        "What happens when GPU memory fills up completely while several continuous batching requests are still generating?",
        "How does iteration-level scheduling interact with CUDA graph execution?"
      ],
      "wrongAnswers": [
        "Padding all requests to the maximum sequence length and waiting for all outputs to finish before returning any results.",
        "Running separate GPU server instances for every individual incoming concurrent request, causing memory bandwidth starvation."
      ],
      "rounds": ["systems-design", "ml-depth"],
      "roles": ["inference-platform-engineer", "ml-systems-engineer"]
    },
    {
      "id": "serving-chunked-prefill-disaggregation",
      "title": "How does chunked prefill prevent long prompt evaluations from causing time-to-next-token latency spikes for concurrent decode requests?",
      "answer": "Prompt prefill is compute-bound, processing hundreds of input tokens in parallel, while token generation is memory-bandwidth bound, generating one token at a time. In standard continuous batching, when a user submits a long prompt of several thousand tokens, the engine runs the full prefill in one step. This monopolizes GPU compute for hundreds of milliseconds, stalling concurrent active decodes and causing sharp spikes in time-to-next-token latency. Chunked prefill solves this by dividing long prompts into fixed-size chunks, typically 512 tokens. At each iteration, the engine schedules a prompt chunk alongside running decode tokens, keeping the total token count within a balanced budget. The trade-off is time-to-first-token versus decode consistency: chunking slightly delays the initial response for that single long prompt, but it keeps time-to-next-token flat and predictable across all concurrent users.",
      "tradeOffs": [
        "Chunked prefill bounds inter-token latency spikes for active decodes, but increases time-to-first-token for long incoming prompts.",
        "Prefill-decode disaggregation separates prefill and decode onto different GPU pools, eliminating interference at the cost of network KV transfer."
      ],
      "followUps": [
        "How does chunk size affect GPU compute efficiency during the prefill phase?",
        "What network bandwidth is required to transfer KV cache tensors between disaggregated prefill and decode nodes?"
      ],
      "wrongAnswers": [
        "Processing long prompts all at once without chunking, accepting 500ms+ latency freezes for concurrent streaming users.",
        "Splitting prompts across separate models without sharing intermediate KV states, forcing redundant recalculations."
      ],
      "rounds": ["systems-design", "cost-capacity"],
      "roles": ["inference-platform-engineer", "applied-ai-engineer"]
    },
    {
      "id": "serving-paged-attention-block-eviction",
      "title": "How does PagedAttention manage block allocation tables, and what eviction policy should an engine use when GPU memory is saturated?",
      "answer": "PagedAttention treats GPU memory like virtual memory in an operating system. Instead of allocating contiguous memory for the maximum sequence length, it partitions the KV cache into fixed-size physical blocks, typically 16 or 32 tokens. A logical-to-physical block table tracks which blocks belong to each sequence, allocating new blocks on demand as tokens are generated. When physical GPU memory is saturated and an active request needs a new block, the engine must resolve the memory pressure. It can preempt lower-priority requests using one of two strategies: recomputation or host swapping. In recomputation, the engine frees the request's KV blocks and re-runs prefill when capacity frees up. In swapping, the engine offloads the KV blocks over PCIe to host CPU RAM and pages them back when memory clears. The trade-off is memory utilization versus preemption recovery time: PagedAttention virtually eliminates external fragmentation, but CPU swapping introduces PCIe transfer latency during heavy burst traffic.",
      "tradeOffs": [
        "Non-contiguous block mapping eliminates external memory fragmentation, but introduces software page-table management overhead.",
        "Swapping KV blocks to CPU memory preserves partial token progress, but PCIe transfer bandwidth limits how fast requests can be resumed."
      ],
      "followUps": [
        "How does copy-on-write enable zero-memory branching during parallel sampling and beam search in PagedAttention?",
        "What determines whether an engine should recompute prompt tokens versus swapping KV blocks to host RAM?"
      ],
      "wrongAnswers": [
        "Pre-allocating max_tokens contiguous memory buffers for every request, wasting up to 80% of VRAM on unreserved space.",
        "Terminating active user requests with fatal out-of-memory errors instead of swapping or preempting with recomputation."
      ],
      "rounds": ["systems-design", "ml-depth"],
      "roles": ["inference-platform-engineer", "ml-systems-engineer"]
    },
    {
      "id": "serving-speculative-decoding-verification",
      "title": "Walk through speculative decoding verification. Why does throughput degrade if the draft acceptance rate falls below fifty percent?",
      "answer": "Speculative decoding accelerates inference by pairing a small, fast draft model with a large target model. The draft model autoregressively generates K candidate tokens cheaply. The target model then verifies all K tokens in a single forward pass, evaluating their conditional probabilities in parallel using modified causal attention masks. If the target model agrees with the draft token, the token is accepted; at the first mismatch, the target model samples a replacement token from a modified residual distribution and discards subsequent draft tokens. If the acceptance rate is high, the system generates multiple tokens per target forward pass. However, if the acceptance rate drops below approximately fifty percent, the target model rejects most draft tokens. The system still pays the latency of running the draft model and setting up verification tensors, but gains only one or two tokens per step. The trade-off is inference speedup versus draft compute overhead: speculative decoding achieves two times speedups when the draft aligns with target distributions, but degrades latency when drafting low-entropy code or math where draft models diverge frequently.",
      "tradeOffs": [
        "Speculative decoding achieves significant speedups without changing output distribution, but requires extra GPU memory to host the draft model.",
        "A large draft token window K increases potential speedup, but wastes draft compute when early tokens in the window are rejected."
      ],
      "followUps": [
        "How does the target model sample from the residual probability distribution when rejecting a draft token?",
        "What is Medusa and how does it generate draft tokens without a separate draft model?"
      ],
      "wrongAnswers": [
        "Accepting all draft tokens without verification, altering the output distribution and producing lower-quality text.",
        "Running the target model verification autoregressively token by token, losing the parallel matrix multiplication advantage."
      ],
      "rounds": ["ml-depth", "systems-design"],
      "roles": ["inference-platform-engineer", "applied-scientist"]
    },
    {
      "id": "serving-radix-prefix-caching",
      "title": "How does radix tree prefix caching reuse KV-cache tensors across multi-turn conversations and shared system prompts?",
      "answer": "In multi-turn chat and agent workflows, consecutive requests frequently share identical token prefixes, such as system prompts, few-shot examples, or prior conversation history. Standard serving runtimes recompute the KV cache for the entire prompt on every single turn. Radix tree prefix caching organizes the physical KV blocks in a radix tree structure where edges represent token subsequences. When a new request arrives, the engine matches its prompt token IDs against the radix tree from the root. Any matching prefix branch is immediately reused, bypassing the prefill forward pass for those tokens and starting generation immediately. When GPU memory fills up, the engine evicts leaf nodes using a least-recently-used policy while keeping popular root prefixes resident in memory. The trade-off is memory retention versus tree indexing overhead: radix caching reduces time-to-first-token by 80% on long shared prefixes, but requires keeping cached blocks allocated in VRAM even when requests finish.",
      "tradeOffs": [
        "Radix caching eliminates redundant prefill compute on common prefixes, but retains KV memory across requests, reducing space for active batches.",
        "Exact token prefix matching is required: modifying a single token early in the prompt invalidates the entire downstream cache branch."
      ],
      "followUps": [
        "How do you implement cache eviction when multi-tenant requests compete for the same physical KV memory?",
        "Why must prompt caching engines enforce deterministic tokenization across identical string inputs?"
      ],
      "wrongAnswers": [
        "Re-running prompt prefill from scratch on every turn of a multi-turn conversation, wasting GPU compute on identical history.",
        "Matching prompt prefixes using character substrings rather than token sequences, causing cache misses due to token boundary shifts."
      ],
      "rounds": ["systems-design", "ml-depth"],
      "roles": ["inference-platform-engineer", "applied-ai-engineer"]
    },
    {
      "id": "routing-pareto-cost-latency-quality",
      "title": "How do you design a model router that optimizes the Pareto frontier across latency, cost, and output quality across multiple LLM tiers?",
      "answer": "Not every user query requires a frontier reasoning model. Simple tasks like sentiment analysis, summarization, or entity extraction can be handled by smaller models at a fraction of the cost and latency. A model router evaluates incoming queries and directs them to the most efficient model that satisfies the task's quality bar. We train a lightweight classifier, or use embedding similarity against categorized reference queries, to predict task complexity. We establish strict routing rules: structured entity extraction and classification route to small local models; complex multi-step reasoning, mathematical derivations, and policy generation route to frontier models. We monitor the Pareto frontier by plotting average cost per thousand requests against benchmark accuracy. The trade-off is routing overhead and misclassification risk versus aggregate cost reduction: a classifier adds a few milliseconds of latency and can occasionally misroute a subtle query to a smaller model, but it reduces overall fleet API costs by 60% to 80% without degrading perceived quality.",
      "tradeOffs": [
        "Dynamic routing cuts aggregate inference spend significantly, but introduces routing latency and the risk of under-powering difficult queries.",
        "Embedding-based routing allows adding new categories without retraining, while fine-tuned classifiers achieve higher routing accuracy."
      ],
      "followUps": [
        "How do you calibrate router confidence thresholds to prevent difficult edge cases from routing to small models?",
        "What metric best captures the trade-off between cost savings and user dissatisfaction from misrouted queries?"
      ],
      "wrongAnswers": [
        "Sending 100% of user queries to the most expensive frontier model regardless of task difficulty, wasting budget.",
        "Routing solely based on query character length, assuming short queries are always easy and long queries are always hard."
      ],
      "rounds": ["systems-design", "cost-capacity"],
      "roles": ["applied-ai-engineer", "platform-engineer"]
    },
    {
      "id": "routing-fallback-timeout-cascade",
      "title": "How do you implement a fallback cascade that handles provider rate limits (HTTP 429) and latency timeouts without breaking client streams?",
      "answer": "When building production applications on external LLM APIs, provider outages, regional rate limits, and unexpected latency spikes are inevitable. A fallback cascade routes traffic across multiple providers with graceful degradation. When a request begins, the gateway calls the primary model endpoint under an aggressive initial token deadline. If the primary provider returns an HTTP 429 rate limit error or fails to stream the first token within the deadline, the client cancels the primary connection and dispatches the request to a fallback provider or an on-premise open-source model. If the stream had already started emitting tokens to the user, cancelling is not an option; the gateway must maintain the connection and handle retries only at step boundaries. The trade-off is system availability versus output consistency: fallback cascades guarantee 99.9% uptime during third-party outages, but secondary models may differ in reasoning style, formatting compliance, or refusal boundaries.",
      "tradeOffs": [
        "Provider fallbacks ensure high availability during outages, but secondary models can produce inconsistent formatting or tool-calling schemas.",
        "Aggressive initial token deadlines catch slow provider hangs quickly, but can prematurely abandon valid slow-prefill requests."
      ],
      "followUps": [
        "How do you prevent a cascading thundering herd where failing traffic on Provider A immediately overwhelms Provider B?",
        "What state must be preserved when falling back midway through a multi-step agent tool invocation?"
      ],
      "wrongAnswers": [
        "Failing the user request immediately with a 500 error upon receiving a single upstream HTTP 429 rate limit response.",
        "Attempting to switch to a fallback model after already streaming partial text to the user, creating disjointed responses."
      ],
      "rounds": ["systems-design", "production-mlops"],
      "roles": ["applied-ai-engineer", "platform-engineer"]
    },
    {
      "id": "routing-semantic-intent-clustering",
      "title": "Compare embedding cluster routing with fine-tuned transformer classification for intent dispatch in production query gateways.",
      "answer": "When dispatching incoming queries to specialized domain models or prompt templates, gateways rely on either embedding clustering or fine-tuned sequence classification. Embedding cluster routing maps user queries into vector space using an embedding model and calculates cosine similarity against cluster centroids representing known intents. Its major advantage is flexibility: engineers can add, split, or update intent categories simply by adding reference examples, requiring zero model retraining. However, embedding models are computationally heavier than small classifiers and struggle to separate semantically similar queries with opposite intents. Fine-tuned classification uses a small encoder, such as ModernBERT, trained on labeled intent data. It runs inference in a few milliseconds and learns sharp decision boundaries on fine-grained keywords. The trade-off is operational agility versus inference efficiency: embedding routing allows instant runtime updates without redeploying models, whereas fine-tuned classifiers achieve lower latency and higher classification accuracy at the cost of retraining pipelines.",
      "tradeOffs": [
        "Embedding clustering allows instant category updates without retraining, but requires maintaining vector indexes and embedding inference compute.",
        "Fine-tuned classifiers achieve sub-10ms classification latency with high accuracy, but require labeled data and retraining when intents change."
      ],
      "followUps": [
        "How do you handle out-of-distribution queries that do not match any known intent cluster?",
        "What metric should you monitor to detect intent drift in production query streams?"
      ],
      "wrongAnswers": [
        "Using regular expression keyword matching as the primary intent classifier, which breaks on natural language variations and typos.",
        "Prompting a large generative model to classify the intent of every incoming query, adding 500ms of latency and unnecessary cost."
      ],
      "rounds": ["ml-depth", "systems-design"],
      "roles": ["applied-ai-engineer", "data-scientist-evals"]
    },
    {
      "id": "routing-uncertainty-escalation",
      "title": "How do you quantify model uncertainty in an automated classification pipeline to escalate ambiguous queries to human reviewers?",
      "answer": "In high-stakes applications like content moderation, medical document triage, or loan classification, models must recognize when they do not know the answer. We quantify uncertainty using both prediction probabilities and output entropy. For classification models, examining the top softmax probability alone is misleading because neural networks are notoriously overconfident on out-of-distribution data. Instead, we compute the margin between the top two probabilities, and calculate Shannon entropy across the probability distribution: high entropy indicates that probability mass is spread across multiple conflicting classes. For generative models, we sample multiple completions at a low temperature and measure semantic consistency across outputs. When entropy exceeds a calibrated threshold or semantic agreement is low, the pipeline flags the item as high-uncertainty, halts automated processing, and routes the ticket to a human review queue. The trade-off is automated throughput versus decision risk: conservative uncertainty thresholds ensure safety but increase human review volume, while loose thresholds risk silent model errors.",
      "tradeOffs": [
        "Multi-sample semantic entropy provides reliable uncertainty signals for generative models, but increases token compute costs.",
        "Strict escalation thresholds reduce error rates on critical decisions, but increase human review staffing requirements."
      ],
      "followUps": [
        "How does temperature scaling or Platt scaling calibrate raw model logits into reliable probabilities?",
        "What is the difference between aleatoric uncertainty (data noise) and epistemic uncertainty (model ignorance) in production?"
      ],
      "wrongAnswers": [
        "Using raw uncalibrated softmax confidence scores as the sole escalation criterion, trusting overconfident false predictions.",
        "Escalating a fixed arbitrary percentage of queries rather than using data-driven uncertainty thresholds."
      ],
      "rounds": ["ml-depth", "evaluation"],
      "roles": ["data-scientist-evals", "applied-scientist"]
    },
    {
      "id": "routing-dynamic-prompt-compression",
      "title": "How do you implement dynamic prompt compression before routing long contexts to smaller, cost-effective models?",
      "answer": "When routing complex queries to smaller models, passing full conversational history or retrieved documents can exceed their context windows or degrade their attention quality. Dynamic prompt compression removes redundant tokens and filler phrases while preserving key semantic information. We implement compression using extractive token scoring, such as calculating perplexity with a small distilled model. Tokens that contribute low information content—such as repetitive boilerplate, filler words, and predictable sentence structures—are pruned based on their information density. Alternatively, we use structured schema compression: stripping decorative markdown, converting verbose JSON arrays into compact delimited tables, and pruning unreferenced schema definitions. The compressed prompt is then dispatched to the smaller model. The trade-off is compression compute latency versus token cost savings: running a compression pass adds a few milliseconds of compute, but it reduces token volume by 30% to 50%, saving inference latency and cost on downstream models.",
      "tradeOffs": [
        "Extractive prompt compression reduces context length and token spend significantly, but risks accidentally dropping crucial constraints.",
        "Structured schema minimization preserves semantic guarantees, but requires format-specific parsing pipelines."
      ],
      "followUps": [
        "How do you evaluate whether compressed prompts degrade downstream task accuracy on complex reasoning benchmarks?",
        "What is the difference between extractive prompt compression (LLMLingua) and abstractive summarization?"
      ],
      "wrongAnswers": [
        "Truncating prompts by naively cutting off the beginning or end of text, destroying system instructions or user questions.",
        "Using a large frontier model to summarize prompts before sending them to small models, negating all cost savings."
      ],
      "rounds": ["systems-design", "cost-capacity"],
      "roles": ["applied-ai-engineer", "ml-systems-engineer"]
    },
    {
      "id": "cache-prompt-prefix-breakpoint-alignment",
      "title": "How do you architect system prompts, tools, and few-shot examples to maximize provider-level prompt cache hit rates?",
      "answer": "Provider prompt caching (such as Anthropic and OpenAI prompt caching) stores KV cache tensors for identical prompt prefixes across API calls. Because cache matching requires strict character-for-character prefix equality, any dynamic value inserted early in the prompt invalidates the entire cache for all subsequent text. We architect prompts in a strict static-to-dynamic hierarchy. At the absolute top, we place invariant system instructions, role descriptions, and policy rules. Immediately following, we place static tool definitions and canonical few-shot examples. Only at the very bottom of the prompt do we insert dynamic variables: the current timestamp, user profile attributes, conversation history, and the user's latest query. In providers that support explicit cache control breakpoints, we tag the boundary immediately after the static tools. The trade-off is prompt layout constraints versus API cost: standardizing prompt order requires disciplined template design, but it delivers up to 90% cost discounts and significant time-to-first-token reductions on cached prefixes.",
      "tradeOffs": [
        "Strict static-to-dynamic prefix structuring achieves 80%+ cache hit rates, but prevents embedding dynamic timestamps early in system prompts.",
        "Explicit cache breakpoint tags guarantee cache boundaries, but require managing provider-specific API parameters."
      ],
      "followUps": [
        "What happens to prompt cache hit rates if you dynamically sort tool definitions alphabetically on every request?",
        "How does prompt caching interact with temperature and top-p sampling parameters?"
      ],
      "wrongAnswers": [
        "Inserting current timestamps or user IDs at the very top of the system prompt, invalidating the cache on every single request.",
        "Randomizing or dynamically filtering tool schemas per request, causing prefix cache misses across team members."
      ],
      "rounds": ["systems-design", "cost-capacity"],
      "roles": ["applied-ai-engineer", "platform-engineer"]
    },
    {
      "id": "cache-prompt-radix-tree-vllm",
      "title": "How do modern serving runtimes like vLLM and SGLang use radix trees to manage KV caches across multi-turn agent threads?",
      "answer": "In multi-turn agent workflows, an agent repeatedly invokes tools, appends tool outputs to its history, and calls the model again. In naive serving, each turn recomputes the entire prompt history from scratch. Runtimes like vLLM and SGLang organize memory into a radix tree prefix cache where nodes represent sequences of tokens and store references to physical KV memory blocks. When an agent submits a multi-turn prompt, the serving engine walks the radix tree to find the longest matching prefix. It reuses the pre-computed KV blocks for all prior turns and runs the prefill forward pass only for the newly added tool result tokens. When branching into multiple speculative trajectories or parallel tool calls, the tree branches naturally, sharing ancestor KV blocks across child branches with zero memory duplication. The trade-off is tree maintenance overhead versus compute savings: managing radix tree lock structures adds minor CPU overhead, but it eliminates 70% to 90% of redundant prefill compute in agentic loops.",
      "tradeOffs": [
        "Radix tree caching eliminates redundant prefill FLOPs on multi-turn conversations, but requires keeping inactive KV blocks allocated in VRAM.",
        "Shared prefix branching enables zero-copy tree search and parallel sampling, but requires reference-counted block eviction."
      ],
      "followUps": [
        "How does radix caching handle memory eviction when multiple agent threads exhaust total GPU VRAM?",
        "What happens if two concurrent requests share a prefix that is currently being computed by the first request?"
      ],
      "wrongAnswers": [
        "Discarding all KV cache memory after every turn of an agent loop and re-evaluating the full conversation history from scratch.",
        "Using flat hash tables for prompt caching, which cannot match partial prefixes or shared hierarchical conversation branches."
      ],
      "rounds": ["systems-design", "ml-depth"],
      "roles": ["inference-platform-engineer", "ml-systems-engineer"]
    },
    {
      "id": "cache-prompt-eviction-lru-cost-weighted",
      "title": "When GPU VRAM is constrained, compare LRU eviction with cost-weighted prefix eviction for shared prompt caches.",
      "answer": "When GPU memory fills up, the prompt caching engine must evict stored KV blocks to free space for incoming requests. Least Recently Used (LRU) eviction discards the prefix that has not been accessed for the longest time. While simple and effective for uniform workloads, LRU ignores the asymmetry of computation costs: recomputing a 50-token prefix takes negligible time, whereas recomputing a 4,000-token system prompt containing complex documentation wastes thousands of FLOPs. Cost-weighted eviction assigns an eviction score combining access recency, access frequency, and the computational cost required to regenerate the prefix (measured in token length and FLOPs). High-cost root prefixes like company-wide system prompts and large reference manuals are protected from eviction, while short, cheap leaf prefixes are evicted aggressively. The trade-off is eviction algorithm complexity versus recomputation FLOP savings: cost-weighted eviction requires maintaining priority queues and token metrics, but it minimizes total cluster compute waste under heavy memory pressure.",
      "tradeOffs": [
        "Cost-weighted eviction protects expensive long prefixes from eviction, maximizing compute savings under memory pressure.",
        "Maintaining priority queues with dynamic cost-decay scores introduces more scheduling complexity than a simple doubly-linked LRU list."
      ],
      "followUps": [
        "How do you prevent a very long, rarely-used prefix from permanently consuming memory under cost-weighted eviction?",
        "What metric best quantifies prompt cache efficiency: token hit rate or request hit rate?"
      ],
      "wrongAnswers": [
        "Evicting prefixes randomly when GPU memory is exhausted, frequently discarding heavily-used system prompt caches.",
        "Measuring cache performance solely by request hit rate, ignoring that hitting a 10,000-token prompt saves 100x more compute than a 100-token prompt."
      ],
      "rounds": ["systems-design", "cost-capacity"],
      "roles": ["inference-platform-engineer", "platform-engineer"]
    },
    {
      "id": "cache-prompt-context-ordering-multi-tenant",
      "title": "What context ordering and schema standardization rules allow multiple teams to share a single prompt cache across multi-tenant tools?",
      "answer": "In multi-tenant platforms, different teams often call shared internal tools while adding their own team-specific instructions. If each team formats tool schemas with different key orderings or places team identifiers at the top of the prompt, the serving engine treats them as completely distinct prompts, achieving zero cache sharing. We enforce organizational prompt standardization rules. First, all shared foundational instructions and global tool definitions are serialized using a canonical schema with sorted keys and identical whitespace. Second, we establish a strict slot-ordered prompt layout: Slot 1 is global system policy; Slot 2 is shared enterprise tool schemas; Slot 3 is tenant-level policy; Slot 4 is session history; and Slot 5 is the user query. This ensures that Slot 1 and Slot 2 form a massive shared prefix that hits the GPU KV cache across all teams and tenants in the company. The trade-off is developer autonomy versus platform efficiency: teams must adhere to platform schema rules, but the organization achieves 80% prompt cache hit rates across departments.",
      "tradeOffs": [
        "Canonical prompt ordering enables cross-tenant prefix cache sharing across the organization, slashing global GPU serving costs.",
        "Enforcing standardized prompt layouts requires governance tooling and linting in developer CI/CD pipelines."
      ],
      "followUps": [
        "How do you detect when a team accidentally introduces non-standardized whitespace that breaks cross-tenant prompt cache hits?",
        "How do tenant-specific security permissions interact with shared cached prefix blocks?"
      ],
      "wrongAnswers": [
        "Allowing every developer team to format prompt headers and JSON schemas in arbitrary order, destroying cross-tenant cache hit rates.",
        "Placing tenant API keys or user IDs at the start of prompts, isolating cache blocks to individual users."
      ],
      "rounds": ["systems-design", "applied-ai-engineer"],
      "roles": ["platform-engineer", "applied-ai-engineer"]
    }
  ],
  "gpu-memory-quantization": [
    {
      "id": "quant-ptq-vs-qat-activation-outliers",
      "title": "Why do activation outliers cause perplexity spikes in Post-Training Quantization (PTQ), and how does Quantization-Aware Training (QAT) mitigate them?",
      "answer": "In large language models starting around 6 billion parameters, certain hidden state dimensions exhibit extreme activation values—often 20 to 100 times larger than normal activations. In Post-Training Quantization (PTQ), we quantize weights and activations on calibration data without full retraining. Because uniform quantization maps the entire dynamic range into a small integer grid (like INT8 with 256 levels), scaling down to accommodate these massive outliers crushes the precision of normal values, causing severe degradation and perplexity explosions. Quantization-Aware Training (QAT) models quantization noise directly during fine-tuning. In the forward pass, weights and activations are quantized to low precision to simulate quantization error, but gradients in the backward pass are computed using the Straight-Through Estimator in FP32. The model weights learn to suppress activation spikes and distribute information across channels that tolerate low precision. The trade-off is compute cost versus precision: PTQ runs in minutes with zero labeled data, while QAT requires retraining cycles and labeled training sets.",
      "tradeOffs": [
        "PTQ quantizes models in minutes with minimal compute, but suffers accuracy loss when activation outliers exceed integer dynamic ranges.",
        "QAT recovers full precision by adapting weights to quantization noise, but requires significant training compute and hyperparameter tuning."
      ],
      "followUps": [
        "How does SmoothQuant mathematically redistribute activation outliers into weight matrices prior to quantization?",
        "Why do activation outliers concentrate in specific feature dimensions across all sequence tokens?"
      ],
      "wrongAnswers": [
        "Clipping all activation outliers to zero during PTQ, which destroys essential linguistic representations and model coherence.",
        "Assuming weights have large outliers, when transformer outliers are overwhelmingly concentrated in hidden activation states."
      ],
      "rounds": ["ml-depth", "systems-design"],
      "roles": ["ml-infrastructure-engineer", "pre-training-engineer"]
    },
    {
      "id": "quant-weight-only-vs-weight-activation",
      "title": "Compare weight-only quantization (AWQ, GPTQ) with weight-activation quantization (FP8, INT8) in terms of compute vs memory-bound inference.",
      "answer": "The choice between weight-only quantization and weight-activation quantization depends on whether inference is memory-bandwidth bound or compute bound. In token generation decoding, the GPU loads billions of parameters to generate a single token, making execution memory-bandwidth bound. Weight-only quantization (such as AWQ or GPTQ at INT4) compresses model weights in VRAM by four times. During matrix multiplication, weights are transferred from GPU memory in 4-bit and dequantized into FP16 in registers before computation. This speeds up decoding significantly without quantizing activations. During prompt prefill or large-batch serving, matrix multiplications are compute-bound on tensor cores. Weight-activation quantization (such as FP8 or SmoothQuant INT8) quantizes both weights and activations. Matrix multiplications execute directly on dedicated low-precision tensor cores, doubling compute throughput. The trade-off is numerical sensitivity versus speedup profile: weight-only quantization preserves output quality easily and accelerates single-user decoding, while weight-activation quantization accelerates prefill compute but requires careful outlier management.",
      "tradeOffs": [
        "Weight-only quantization accelerates memory-bound decoding and cuts VRAM usage with minimal accuracy loss, but does not accelerate compute-bound prefill.",
        "Weight-activation quantization doubles tensor core compute throughput for large batches, but requires outlier suppression to avoid perplexity degradation."
      ],
      "followUps": [
        "Why is token decoding memory-bound while prompt prefill is compute-bound?",
        "How does Activation-aware Weight Quantization (AWQ) protect the top 1% most salient weight channels?"
      ],
      "wrongAnswers": [
        "Expecting weight-only quantization to double matrix multiplication FLOP throughput on GPU tensor cores.",
        "Applying INT4 weight-activation quantization without calibration, which results in catastrophic output collapse."
      ],
      "rounds": ["ml-depth", "systems-design"],
      "roles": ["inference-platform-engineer", "applied-scientist"]
    },
    {
      "id": "quant-kv-cache-compression",
      "title": "What are the trade-offs of quantizing the KV cache to FP8 or INT4 in long-context transformer serving?",
      "answer": "In long-context serving (such as 32k to 128k tokens), the KV cache consumes far more GPU VRAM than the model weights themselves. A 70-billion parameter model serving a single 64k request requires over 40 gigabytes of memory just for its KV cache in standard FP16. Quantizing the KV cache to FP8 cuts memory footprint in half, while INT4 reduces it by four times, enabling serving engines to support twice as many concurrent users or double sequence lengths on the same GPU. However, attention keys and values have differing numerical tolerances. Keys determine attention score distributions: quantizing keys too aggressively alters softmax probabilities, causing the model to miss needle-in-a-haystack facts across long contexts. Values directly scale the attended output vectors and are somewhat more tolerant of quantization noise. Modern runtimes apply per-token or per-head dynamic scaling factors. The trade-off is context concurrency versus retrieval accuracy: FP8 KV caching preserves virtually full model quality with 2x memory savings, whereas INT4 requires calibration and can impair long-context reasoning.",
      "tradeOffs": [
        "FP8 KV caching cuts memory by 50% with negligible loss in perplexity, enabling doubled batch concurrency.",
        "INT4 KV caching delivers 4x memory compression, but requires per-channel scaling to prevent severe degradation on long-context retrieval tasks."
      ],
      "followUps": [
        "Why does quantizing attention keys cause more retrieval errors than quantizing attention values?",
        "How do you implement dynamic per-token scaling for FP8 KV cache blocks in custom CUDA kernels?"
      ],
      "wrongAnswers": [
        "Quantizing weights to 4-bit while leaving KV cache in FP16 for 128k context lengths, leading to immediate out-of-memory errors on concurrent batches.",
        "Using static global quantization scaling for KV cache tensors across thousands of diverse document tokens."
      ],
      "rounds": ["ml-depth", "cost-capacity"],
      "roles": ["inference-platform-engineer", "ml-systems-engineer"]
    },
    {
      "id": "quant-per-channel-vs-per-token-scaling",
      "title": "Compare per-tensor, per-channel, and per-token dynamic scaling factors for activation quantization in transformer inference.",
      "answer": "Quantization maps continuous floating-point numbers to discrete integer grids using a scaling factor. The granularity of this scaling factor determines how well quantization handles variations across layers and tokens. Per-tensor scaling uses a single scale factor for the entire activation tensor. If a single token in a long prompt contains a large activation outlier, the entire tensor's scale factor expands, crushing the precision of all other tokens. Per-channel scaling computes a separate scale factor for each feature dimension across all tokens. This handles features that are consistently large across time, but cannot adapt when activations spike unexpectedly on specific tokens. Per-token dynamic scaling calculates the scale factor on the fly for each individual token vector during the forward pass. This isolates token outliers completely: an outlier token scales within its own vector without degrading adjacent tokens. The trade-off is kernel computation overhead versus quantization precision: per-token scaling requires computing vector maximums dynamically in SRAM, but it provides the highest accuracy retention for 8-bit serving.",
      "tradeOffs": [
        "Per-token dynamic scaling isolates activation spikes to individual tokens, preventing global precision collapse with minimal accuracy loss.",
        "Calculating scale factors dynamically in custom kernels adds minor reduction overhead compared to pre-computed static scales."
      ],
      "followUps": [
        "How does fused kernel execution hide the reduction latency of calculating per-token dynamic scales?",
        "When is grouped per-block scaling (e.g. block size 128) preferred over pure per-channel scaling?"
      ],
      "wrongAnswers": [
        "Using a single static per-tensor scaling factor for activations across diverse multi-turn user requests.",
        "Assuming per-token dynamic scaling requires a full extra memory round-trip to GPU DRAM, missing that reductions happen in on-chip SRAM."
      ],
      "rounds": ["ml-depth", "systems-design"],
      "roles": ["inference-platform-engineer", "applied-scientist"]
    },
    {
      "id": "quant-qlora-nf4-double-quant",
      "title": "How does QLoRA combine 4-bit NormalFloat (NF4), double quantization, and paged optimizers to fine-tune large models on a single GPU?",
      "answer": "Fine-tuning large models requires immense GPU memory to store model parameters, gradients, and optimizer states. QLoRA enables fine-tuning a 70-billion parameter model on a single 80-gigabyte GPU through three innovations. First is 4-bit NormalFloat: pre-trained neural network weights follow a zero-mean normal distribution. NF4 constructs an information-theoretically optimal quantile grid where each bin has equal probability under a normal distribution, achieving lower quantization error than standard linear INT4. Second is Double Quantization: quantizing weights into 64-element blocks requires storing floating-point scale factors. Double quantization quantizes these scale factors themselves into 8-bit integers, saving roughly 0.37 bits per parameter. Third is Paged Optimizers: when memory spikes during long-context gradient computation, memory blocks for the Adam optimizer are automatically paged over PCIe to host CPU memory. Low-rank adapter matrices (LoRA) remain in full 16-bit precision and receive gradient updates. The trade-off is fine-tuning memory versus training speed: QLoRA cuts memory by 4x, but dequantizing weights during forward and backward passes adds 20% to 30% execution time overhead.",
      "tradeOffs": [
        "QLoRA reduces fine-tuning memory footprint by 4x, making frontier model tuning accessible on commodity GPUs.",
        "On-the-fly dequantization of 4-bit weights into 16-bit registers during every forward and backward pass slows training throughput relative to native FP16."
      ],
      "followUps": [
        "Why must LoRA adapter weights remain in 16-bit precision rather than being quantized to 4-bit alongside the base model?",
        "How does NF4 guarantee equal information density across all quantization bins for normally distributed weights?"
      ],
      "wrongAnswers": [
        "Quantizing both the base model weights and the active LoRA adapter gradients to 4-bit, which causes training divergence.",
        "Claiming QLoRA reduces inference latency compared to full models, missing that QLoRA is strictly a fine-tuning memory optimization."
      ],
      "rounds": ["ml-depth", "cost-capacity"],
      "roles": ["applied-scientist", "ml-infrastructure-engineer"]
    }
  ],
  "multi-agent": [
    {
      "id": "a2a-supervisor-vs-peer-choreography",
      "title": "Compare hierarchical supervisor architectures with peer-to-peer agent choreography in multi-agent systems. How do you prevent deadlocks?",
      "answer": "In multi-agent systems, agents must coordinate to complete complex workflows. In a hierarchical supervisor architecture, a central coordinator agent receives the primary user request, decomposes it into sub-tasks, assigns work to specialized worker agents, synthesizes their results, and maintains global state. Communication is strictly vertical: workers report only to the supervisor. In peer-to-peer agent choreography, agents communicate directly with each other via message buses or direct calls without a central controller, negotiating responsibilities dynamically. Supervisor patterns provide predictable execution, centralized budget tracking, and deterministic debugging, but the supervisor can become a reasoning and token bottleneck. Peer-to-peer patterns allow organic problem solving, but risk circular message storms and deadlocks where Agent A waits for Agent B while Agent B waits for Agent A. To prevent deadlocks, we enforce strict acyclic message graphs using hop counters and timeout deadlines. The trade-off is coordination predictability versus emergent autonomy: supervisors guarantee deterministic completion, while peer choreography offers flexibility for collaborative research tasks.",
      "tradeOffs": [
        "Hierarchical supervisors eliminate circular deadlocks and simplify trace debugging, but create a single point of failure and higher token overhead.",
        "Peer choreography allows flexible emergent problem solving, but requires distributed deadlock detection and hop budgets."
      ],
      "followUps": [
        "How do you implement distributed cycle detection across asynchronous peer agent message queues?",
        "When does a supervisor agent decide to replace an underperforming worker agent rather than retrying?"
      ],
      "wrongAnswers": [
        "Allowing peer agents to send unbounded synchronous messages to each other without timeouts, leading to circular deadlocks.",
        "Treating multi-agent coordination as a single un-partitioned prompt where all agent personae speak in a shared context window."
      ],
      "rounds": ["agent-architecture", "systems-design"],
      "roles": ["agent-engineer", "applied-ai-engineer"]
    },
    {
      "id": "a2a-protocol-mcp-vs-jsonrpc",
      "title": "How does the Model Context Protocol (MCP) standardize cross-agent tool discovery and execution compared to bespoke JSON-RPC schemas?",
      "answer": "When multiple agents collaborate across distributed services, integrating tools using custom JSON-RPC schemas creates an exponential integration problem: every agent framework requires custom glue code to discover and invoke another framework's tools. The Model Context Protocol (MCP) standardizes three core primitives over JSON-RPC transports: Tools, Resources, and Prompts. Tools define executable functions with strict JSON Schema arguments; Resources expose read-only contextual data like files and documentation; Prompts provide standardized parameterized workflow templates. When an agent connects to an MCP server, it invokes tools/list to dynamically discover available capabilities, their schemas, and required permissions without hardcoded client integrations. The client handles execution isolation and security approval, while the server executes the action. The trade-off is protocol framing overhead versus ecosystem modularity: MCP adds a layer of standardized JSON-RPC framing, but it allows any agent runtime to immediately use any tool server across organizations with zero custom adapter code.",
      "tradeOffs": [
        "MCP provides standardized, dynamic tool discovery and uniform permission models, enabling plug-and-play tool integration across vendors.",
        "Standardized protocol abstractions introduce minor JSON-RPC serialization overhead compared to direct in-process function pointers."
      ],
      "followUps": [
        "What is the difference between MCP Server-Sent Events (SSE) transports and standard stdio transports?",
        "How do you enforce authentication and access control when an agent calls an external remote MCP server?"
      ],
      "wrongAnswers": [
        "Hardcoding custom HTTP endpoints and ad-hoc schemas for every single tool in each agent codebase, creating technical debt.",
        "Assuming MCP allows tools to execute code directly inside the host LLM without external runtime sandboxes."
      ],
      "rounds": ["agent-architecture", "systems-design"],
      "roles": ["agent-engineer", "platform-engineer"]
    },
    {
      "id": "a2a-distributed-tracing-opentelemetry",
      "title": "How do you propagate distributed trace contexts across asynchronous multi-agent delegation trees using OpenTelemetry?",
      "answer": "When an agent delegates a task to multiple subagents across message queues or asynchronous HTTP calls, debugging failures without distributed tracing is nearly impossible. A bug in a third-tier subagent appears as an opaque failure in the top-level supervisor. We implement distributed tracing using OpenTelemetry context propagation. When the root agent receives a request, it initializes a root span with a unique trace ID. When delegating a task to another agent, the client injects standard W3C Trace Context headers—traceparent and tracestate—into the outgoing message payload or HTTP headers. The recipient subagent extracts these headers and starts a child span linked directly to the parent span. In the span metadata, we record the agent's role, the prompt token count, tool execution parameters, and model completion tokens. The trade-off is telemetry overhead versus operational visibility: trace propagation adds small payload headers and requires centralized trace storage, but it visualizes the entire execution waterfall, isolating the exact subagent that stalled or hallucinated.",
      "tradeOffs": [
        "OpenTelemetry context propagation makes complex asynchronous agent graphs visible and debuggable, but increases telemetry storage volume.",
        "Logging full prompts and tool outputs inside trace spans provides rich debugging, but requires strict PII scrubbing to prevent data leakage."
      ],
      "followUps": [
        "How do you correlate distributed traces with financial cost and token consumption metrics per tenant?",
        "What happens to trace context when an agent execution is suspended for hours awaiting human approval?"
      ],
      "wrongAnswers": [
        "Logging agent execution using isolated, un-correlated log lines with no shared trace ID, making it impossible to reconstruct call trees.",
        "Passing trace context in the conversational prompt text where the LLM can alter or erase trace headers."
      ],
      "rounds": ["agent-architecture", "production-mlops"],
      "roles": ["agent-engineer", "ml-systems-engineer"]
    },
    {
      "id": "a2a-shared-workspace-concurrency-control",
      "title": "How do you implement optimistic concurrency control and file locks when multiple agents collaborate on a shared codebase workspace?",
      "answer": "When multiple autonomous agents work simultaneously in a shared workspace—such as one agent writing unit tests while another refactors application code—uncontrolled concurrent writes cause race conditions where one agent silently overwrites another agent's edits. We implement optimistic concurrency control backed by cryptographic file hashing. Before an agent begins editing a file, it reads the content and captures its SHA-256 hash as a version tag. When the agent finishes generating its changes and submits the update, the execution runtime checks whether the current file on disk still matches the original version tag. If the hash matches, the write commits atomically and the version updates. If another agent modified the file in the interim, the hash check fails: the runtime rejects the write, returns a concurrency conflict error, and provides the current file diff to the agent, prompting it to re-apply its changes on top of the latest version. The trade-off is merge retry overhead versus workspace integrity: optimistic concurrency allows parallel agent collaboration with zero lock contention, but highly active files require retry handling when conflicts occur.",
      "tradeOffs": [
        "Optimistic concurrency control allows multiple agents to work in parallel without blocking locks, but requires agents to handle write conflict retries.",
        "Pessimistic file locking prevents conflict retries, but can cause agents to sit idle waiting for locks to release."
      ],
      "followUps": [
        "How do you handle workspace conflicts when an agent renames or deletes a file that another agent is editing?",
        "How can operational transformation or Git-style three-way merging automate conflict resolution for non-overlapping edits?"
      ],
      "wrongAnswers": [
        "Allowing multiple agents to write directly to shared disk files with no version checks or locks, corrupting codebases.",
        "Holding long-lived exclusive file locks across multi-minute LLM generation steps, causing severe multi-agent pipeline stalls."
      ],
      "rounds": ["agent-architecture", "systems-design"],
      "roles": ["agent-engineer", "ml-systems-engineer"]
    }
  ],
  "production-mlops": [
    {
      "id": "feature-store-point-in-time-correctness",
      "title": "What is point-in-time correctness in feature stores, and how do AS OF joins prevent data leakage during offline training set generation?",
      "answer": "Point-in-time correctness ensures that when generating training data for past events, the feature values matched to each label reflect exactly what was known at the historical moment the event occurred. Without this, offline models suffer from temporal data leakage. For example, if predicting loan default at the application timestamp of June 1st, using a feature computed on July 1st that reflects subsequent missed payments leaks the future label into training, producing an artificially high validation score that collapses in production. Feature stores solve this using AS OF time-travel joins. Each feature update in the offline store is recorded with an observation timestamp. When generating training sets from an observation table containing entity IDs and event timestamps, the feature store joins the latest feature value whose timestamp is strictly less than or equal to the event timestamp. The trade-off is query complexity and storage volume versus model reliability: maintaining immutable temporal feature logs requires partitioned time-series storage, but it guarantees zero future leakage in training.",
      "tradeOffs": [
        "AS OF joins eliminate temporal leakage and guarantee training-serving feature equivalence, but require partitioned event-time storage.",
        "Computing time-travel joins over billions of historical records requires distributed query engines like Spark or Snowflake."
      ],
      "followUps": [
        "How do you handle late-arriving event data that updates historical feature values retroactively?",
        "What is the difference between event time and ingestion time in feature store tables?"
      ],
      "wrongAnswers": [
        "Joining historical training events against the current snapshot of a database table, causing severe temporal data leakage.",
        "Assuming that training-serving skew only occurs in online serving, ignoring that offline training datasets can leak future states."
      ],
      "rounds": ["production-mlops", "systems-design"],
      "roles": ["ai-data-engineer", "applied-scientist"]
    },
    {
      "id": "feature-store-online-offline-parity",
      "title": "How does a modern feature store maintain parity between low-latency online stores (Redis) and high-throughput offline stores (Snowflake)?",
      "answer": "A core problem in production machine learning is training-serving skew, where features used in offline training are computed with batch SQL queries while features used in live online serving are re-implemented in Python or Java microservices with differing logic. Over time, subtle logic divergences cause live model performance to degrade. A feature store maintains parity through a single canonical feature definition. Developers write transformation logic once—such as aggregations or windowed counts—in a declarative framework. The feature store engine compiles this definition into two execution paths: a batch pipeline that computes historical features and writes them to an offline warehouse (like Snowflake or BigQuery) for training, and a streaming pipeline that computes live updates and writes them to an in-memory key-value store (like Redis or DynamoDB) with sub-10ms lookup latency for online serving. The trade-off is infrastructure management versus feature consistency: managing dual storage layers adds operational complexity, but it guarantees that live model scoring receives mathematically identical features to training.",
      "tradeOffs": [
        "Single-source feature definitions eliminate training-serving skew, but require maintaining dual storage layers and synchronization pipelines.",
        "Streaming ingestion keeps online feature values fresh in real time, but introduces small synchronization lag relative to batch updates."
      ],
      "followUps": [
        "How do you test and verify that features served from Redis match features queried from Snowflake?",
        "What happens when an offline batch backfill overwrites recent streaming updates in the online store?"
      ],
      "wrongAnswers": [
        "Writing feature computation SQL for offline training and separate Python code for online serving, creating training-serving skew.",
        "Querying the offline analytical warehouse directly during live user inference, causing 5-second latency timeouts."
      ],
      "rounds": ["production-mlops", "systems-design"],
      "roles": ["ai-data-engineer", "ml-systems-engineer"]
    },
    {
      "id": "feature-store-streaming-ingestion-kafka",
      "title": "How do you design a streaming feature pipeline with Kafka and Flink to serve rolling window aggregations with sub-10ms point lookups?",
      "answer": "Real-time machine learning models—such as fraud detection or dynamic pricing—rely on up-to-the-minute behavior features, like the number of credit card transactions in the last ten minutes. Standard batch pipelines run hours too late to detect active fraud attacks. We architect a real-time streaming pipeline using Kafka, Apache Flink, and Redis. Raw application events are published to a distributed Kafka topic. A stateful Flink streaming job consumes the event stream and maintains rolling window aggregations in memory, utilizing Flink's managed state and RocksDB state backend. As transactions arrive, Flink updates sliding-window counts and sums, and immediately writes the updated feature vectors to an in-memory Redis cluster partitioned by user entity ID. When a transaction inference request arrives at the model service, it performs an MGET lookup on Redis, retrieving all pre-computed features in under five milliseconds. The trade-off is streaming operational complexity versus feature freshness: running stateful stream processors requires managing checkpointing and out-of-order events, but it delivers sub-second feature freshness to online scoring.",
      "tradeOffs": [
        "Flink stateful stream processing delivers real-time rolling aggregates to Redis with sub-second freshness, but requires 24/7 stream cluster operations.",
        "Pre-computing features into Redis decouples inference latency from feature aggregation complexity, but increases memory storage costs."
      ],
      "followUps": [
        "How do you handle out-of-order events or network blips in Flink using watermarks?",
        "What eviction and TTL policies ensure Redis memory does not fill up with inactive user entities?"
      ],
      "wrongAnswers": [
        "Computing rolling window aggregates dynamically from raw transaction logs during the live inference API call, blowing past latency SLAs.",
        "Using stateless stream consumers that query an external database on every event to calculate sliding sums, creating database bottlenecks."
      ],
      "rounds": ["production-mlops", "systems-design"],
      "roles": ["ai-data-engineer", "ml-systems-engineer"]
    },
    {
      "id": "feature-store-drift-psi-monitoring",
      "title": "How do you monitor feature drift in production feature stores using Population Stability Index (PSI) and Wasserstein distance?",
      "answer": "Machine learning models degrade silently when the distribution of live input features shifts away from the distribution observed during training. Because ground-truth labels often arrive weeks late, monitoring feature drift provides an early warning system before model accuracy collapses. We monitor feature drift by comparing the distribution of live online features served over a sliding window against the baseline training distribution. For categorical features, we compute the Population Stability Index (PSI): we bucket feature values and sum the difference between actual and expected percentages multiplied by the natural log of their ratio. A PSI below 0.1 indicates stability, while a PSI above 0.25 flags significant distributional drift requiring attention. For continuous numeric features, we compute the Wasserstein or Earth Mover's Distance, which measures the minimum work required to transform one probability distribution into another. The trade-off is detection sensitivity versus alert fatigue: calculating statistical distances over small windows catches sudden data corruption quickly, but natural weekend or seasonal shifts can trigger false positive alerts unless baselines adapt.",
      "tradeOffs": [
        "Distributional drift monitoring catches upstream data pipeline corruptions and behavioral shifts before labels arrive, preventing silent model failure.",
        "Setting PSI alert thresholds too sensitive causes false-alarm fatigue on benign seasonal shifts, while loose thresholds miss genuine drift."
      ],
      "followUps": [
        "How do you distinguish between covariate shift (feature distribution changes) and concept drift (relationship to target changes)?",
        "What automated retraining trigger should execute when a critical feature's PSI exceeds 0.25 for three consecutive days?"
      ],
      "wrongAnswers": [
        "Monitoring only model prediction output distributions while ignoring input feature drift, missing upstream pipeline bugs.",
        "Computing drift metrics on static single-day snapshots without accounting for weekly seasonality or holiday traffic patterns."
      ],
      "rounds": ["production-mlops", "evaluation"],
      "roles": ["data-scientist-evals", "ml-systems-engineer"]
    },
    {
      "id": "ratelimit-dual-token-bucket-tpm-rpm",
      "title": "How do you architect a dual token-bucket rate limiter that enforces Tokens Per Minute (TPM) and Requests Per Minute (RPM) simultaneously?",
      "answer": "In multi-tenant LLM gateways, rate limiting based solely on request counts is dangerous: a user sending ten requests of 100,000 tokens consumes vastly more GPU compute than a user sending ten requests of 50 tokens. Conversely, limiting only tokens allows a flood of tiny requests that overwhelm HTTP connection pools. We architect a dual token-bucket rate limiter that enforces Requests Per Minute (RPM) and Tokens Per Minute (TPM) concurrently. Each tenant is allocated two independent token buckets. The RPM bucket tracks discrete request allowances and refills at a fixed rate per second. The TPM bucket tracks token volume and refills proportionally based on token limits. When a request arrives, the gateway estimates the token size (prompt tokens plus requested max completion tokens) and attempts to acquire tokens from both buckets atomically. If either bucket has insufficient tokens, the request is rejected with an HTTP 429 status code indicating which limit was breached. The trade-off is quota predictability versus request queuing: dual enforcement protects both connection pools and GPU memory, but requires client SDKs to handle retry backoff gracefully.",
      "tradeOffs": [
        "Enforcing both RPM and TPM protects API gateways from connection saturation and GPU clusters from memory exhaustion simultaneously.",
        "Reserving max completion tokens up front prevents over-subscription, but can temporarily block concurrent requests from users who finish early."
      ],
      "followUps": [
        "How do you reconcile the TPM bucket when a model completes generation using far fewer tokens than the requested maximum?",
        "How do you configure tenant burst capacities to accommodate legitimate batch jobs without degrading interactive users?"
      ],
      "wrongAnswers": [
        "Rate limiting solely on raw HTTP request counts without tracking token volume, allowing one user to exhaust cluster GPU memory.",
        "Checking RPM and TPM sequentially in separate un-locked operations, creating race conditions under high concurrent traffic."
      ],
      "rounds": ["systems-design", "production-mlops"],
      "roles": ["platform-engineer", "ml-systems-engineer"]
    },
    {
      "id": "ratelimit-redis-sliding-window-distributed",
      "title": "How do you implement distributed sliding-window rate limiting in Redis using sorted sets and atomic Lua scripts?",
      "answer": "Fixed-window rate limiters suffer from the boundary burst problem: if a user is allowed 100 requests per minute, they can send 100 requests at 11:59 and another 100 requests at 12:00, sending 200 requests across two seconds and overwhelming backend services. A sliding-window log provides smooth, continuous rate enforcement. In a distributed gateway fleet, we implement this using Redis sorted sets and atomic Lua scripts. For each tenant, the Redis key stores a sorted set where each member and score is the microsecond timestamp of an approved request. When a new request arrives, our Lua script executes three steps atomically: first, it removes all entries with timestamps older than current time minus the window duration using ZREMRANGEBYSCORE. Second, it counts the remaining elements in the set with ZCARD. Third, if the count is below the allowed limit, it adds the current timestamp with ZADD and returns an allowed response; otherwise, it calculates the retry-after delay from the oldest element and returns a rejected response. The trade-off is Redis memory footprint versus rate smoothness: sliding logs eliminate burst spikes completely, but storing individual timestamps consumes more memory in Redis than simple integer counters.",
      "tradeOffs": [
        "Sliding-window logs eliminate boundary burst spikes completely, providing smooth, continuous rate enforcement across distributed nodes.",
        "Storing every request timestamp in a Redis sorted set consumes O(N) memory per client, requiring TTLs to clean up expired sets."
      ],
      "followUps": [
        "How does a sliding-window counter approximate a sliding log with fixed memory footprint?",
        "What happens to rate limiting if the Redis cluster experiences a failover or network partition?"
      ],
      "wrongAnswers": [
        "Using simple Redis INCR with EXPIRE, which creates fixed-window boundary spikes that allow double the rate limit across window edges.",
        "Executing the remove, count, and add commands across multiple separate network round-trips to Redis, causing race conditions."
      ],
      "rounds": ["systems-design", "production-mlops"],
      "roles": ["platform-engineer", "ml-systems-engineer"]
    },
    {
      "id": "ratelimit-priority-shedding-http429",
      "title": "When upstream LLM providers return HTTP 429 rate limit errors, how do you implement priority load shedding to protect critical production traffic?",
      "answer": "During peak traffic or upstream provider degradations, third-party LLM APIs frequently return HTTP 429 rate limit errors. If an application gateway treats all traffic equally, critical interactive user requests fail alongside low-priority background jobs. We implement priority load shedding at our API gateway. We classify all incoming requests into three priority tiers: Tier 1 is interactive customer-facing requests where latency directly impacts user experience; Tier 2 is asynchronous business workflows like email generation or batch document processing; Tier 3 is offline tasks like evaluation runs, synthetic data generation, and internal analytics. When upstream 429 responses or queue latencies cross threshold limits, the gateway activates load shedding: it immediately drops or defers Tier 3 batch jobs into durable message queues with exponential backoff. If pressure persists, it throttles Tier 2 jobs, preserving 100% of available upstream capacity for Tier 1 interactive users. The trade-off is background job processing delay versus customer experience protection: non-critical tasks experience processing backlogs, but customer-facing applications remain responsive during external provider crises.",
      "tradeOffs": [
        "Priority load shedding preserves uptime for interactive user experiences during provider capacity crises, but delays background batch jobs.",
        "Durable queue buffering ensures dropped lower-tier requests are eventually processed without data loss once capacity recovers."
      ],
      "followUps": [
        "How do you determine when to restore normal traffic processing after upstream 429 errors subside?",
        "What backoff strategy should background workers use when consuming deferred tasks from the queue?"
      ],
      "wrongAnswers": [
        "Retrying all failed requests immediately upon receiving an HTTP 429 error, creating a retry storm that worsens upstream throttling.",
        "Treating internal test and eval runs with the same priority as paying end users, causing customer outages during benchmark testing."
      ],
      "rounds": ["systems-design", "production-mlops"],
      "roles": ["platform-engineer", "applied-ai-engineer"]
    },
    {
      "id": "ratelimit-streaming-token-reservation",
      "title": "How do you implement token reservation and reconciliation for streaming LLM responses to prevent quota overshoots?",
      "answer": "In streaming inference, token counts are unknown when the request starts because generation length depends on model decisions and stop sequences. If a gateway only debits tokens after generation finishes, a user with ten tokens remaining in their quota can initiate ten concurrent streaming requests that each generate 1,000 tokens, overshooting their quota by 10,000 tokens. We implement token reservation and reconciliation. When a streaming request arrives, the gateway inspects the prompt length, adds the requested max_tokens, and reserves that total from the tenant's token bucket up front. If the tenant has insufficient tokens, the request is rejected immediately. As the stream executes, if the user aborts the connection or the model emits an early stop token, the stream terminates. Upon completion, the gateway reads the exact token count reported in the final stream chunk, calculates the difference between reserved tokens and actual tokens consumed, and immediately credits the unused tokens back to the tenant's bucket. The trade-off is temporary quota reservation contention versus financial overdraft protection: reserving max tokens up front prevents unauthorized over-generation, but can temporarily block concurrent requests from users until short generations finish.",
      "tradeOffs": [
        "Up-front token reservation guarantees tenants cannot exceed billing quotas across concurrent streams, but requires atomic reserve and credit logic.",
        "Over-reserving max_tokens can temporarily throttle legitimate concurrent requests until actual usage is reconciled."
      ],
      "followUps": [
        "How do you handle token reconciliation if the gateway server crashes in the middle of an active streaming response?",
        "What default reservation limit should you apply if a client does not specify max_tokens in their API request?"
      ],
      "wrongAnswers": [
        "Debiting tokens only after the stream finishes, allowing malicious users to launch massive concurrent streams that blow past quotas.",
        "Permanently deducting max_tokens without refunding unused capacity when a short answer finishes early."
      ],
      "rounds": ["systems-design", "production-mlops"],
      "roles": ["platform-engineer", "applied-ai-engineer"]
    }
  ],
  "evaluation": [
    {
      "id": "experiment-switchback-marketplace-sutva",
      "title": "Why does standard user-level A/B testing fail in two-sided marketplaces, and how do switchback experiments prevent SUTVA violations?",
      "answer": "Standard user-level A/B testing assumes the Stable Unit Treatment Value Assumption (SUTVA): the treatment assigned to one user must not affect the outcomes of other users. In two-sided marketplaces like ride-sharing, food delivery, or shared compute clusters, this assumption fails completely due to shared supply pools. For example, if treatment users receive an aggressive algorithm that dispatches couriers faster, they consume available drivers, leaving fewer drivers for control users. Control users experience higher wait times not because their algorithm is worse, but because treatment cannibalized shared supply, leading to false positive experiment results. We solve this using switchback experimentation. Instead of randomizing by user, we randomize by geographical clusters and discrete time windows, such as alternating treatment and control every 30 minutes in a specific city zone. All users and drivers in that zone experience the identical policy during that window, eliminating direct interference. The trade-off is sample size and carryover effects versus causal validity: switchbacks produce unbiased causal estimates, but require longer runtimes and order-of-magnitude larger sample sizes to overcome temporal autocorrelation.",
      "tradeOffs": [
        "Switchback testing eliminates supply cannibalization and SUTVA violations, but reduces effective sample size from millions of users to hundreds of time-cluster units.",
        "Short time windows maximize sample count, but risk carryover effects where the state of the previous window bleeds into the next."
      ],
      "followUps": [
        "How do you determine the optimal switchback window length (e.g. 15 minutes vs 60 minutes) to balance carryover against variance?",
        "How do cluster-based randomization schemes differ from temporal switchback experiments?"
      ],
      "wrongAnswers": [
        "Randomizing individual buyers in a shared marketplace 50/50, ignoring that treatment demand directly starves control inventory.",
        "Treating consecutive 30-minute switchback time slots as independent and identically distributed, ignoring temporal autocorrelation."
      ],
      "rounds": ["ml-depth", "evaluation"],
      "roles": ["applied-scientist", "data-scientist-evals"]
    },
    {
      "id": "experiment-interleaving-vs-ab-ranking",
      "title": "Compare Team Draft interleaving with standard A/B testing for evaluating search and recommendation ranking algorithms.",
      "answer": "Evaluating ranking models with standard A/B testing requires large sample sizes and weeks of user traffic to detect subtle improvements in click-through rates. Furthermore, user variance between control and treatment cohorts introduces statistical noise. Team Draft interleaving evaluates two ranking algorithms simultaneously on the same user search query with 100 times fewer samples. When a user submits a search, the system blends results from Algorithm A and Algorithm B into a single presentation list, alternating picks analogously to team captains drafting players. The system tracks which algorithm contributed each item, without showing labels to the user. When the user clicks an item, the corresponding algorithm receives credit. Because both algorithms are evaluated on the exact same user query and presentation layout, user-level preference variance is eliminated. The trade-off is ranking sensitivity versus long-term business measurement: interleaving rapidly detects pure ranking preference with tiny sample sizes, but it cannot measure holistic user behavior metrics like session retention, checkout conversion, or long-term engagement.",
      "tradeOffs": [
        "Interleaving requires orders of magnitude less traffic to detect ranking preference differences, accelerating offline-to-online experimentation.",
        "Interleaving measures relative click preferences within a single session, but cannot evaluate holistic business outcomes like 30-day retention or revenue."
      ],
      "followUps": [
        "How does Team Draft interleaving correct for presentation bias (the fact that higher-ranked items receive more clicks)?",
        "When can an algorithm win an interleaving test but lose a subsequent long-term A/B test?"
      ],
      "wrongAnswers": [
        "Showing Algorithm A's list to User 1 and Algorithm B's list to User 2 and calling it interleaving, which is standard A/B testing.",
        "Using interleaving to measure bottom-of-funnel subscription revenue, which cannot be attributed to individual interleaved clicks."
      ],
      "rounds": ["ml-depth", "evaluation"],
      "roles": ["applied-scientist", "data-scientist-evals"]
    },
    {
      "id": "experiment-guardrail-metrics-automated-rollback",
      "title": "How do you design guardrail metrics and automated rollback triggers for production machine learning canary deployments?",
      "answer": "When releasing a new machine learning model to production, evaluating primary success metrics like conversion rate is insufficient. A model might increase short-term clicks by recommending sensationalist content while silently causing a spike in uninstalls, error rates, or serving latency. We design canary deployments paired with strict guardrail metrics and automated rollback triggers. In a canary release, the new model receives a small percentage of traffic (such as 2% to 5%). We evaluate primary metrics alongside non-negotiable guardrail metrics: API error rate, p99 serving latency, model timeout percentage, and user complaint or unsubscription rates. We configure statistical threshold triggers using sequential testing methods. If p99 latency degrades by more than 15%, or if unhandled exception rates cross 0.1%, the continuous deployment pipeline immediately aborts the canary, routes 100% of traffic back to the stable control model, and generates an automated incident report. The trade-off is canary release velocity versus user protection: automated guardrails prevent catastrophic widespread outages, but volatile canary metrics can trigger false-alarm rollbacks during temporary network blips.",
      "tradeOffs": [
        "Automated guardrail rollbacks prevent production outages and customer churn from bad model weights, but require robust canary routing infrastructure.",
        "Sequential statistical testing bounds false positive rollback triggers, but requires adequate canary sample volume to detect regressions."
      ],
      "followUps": [
        "Why are standard fixed-sample t-tests invalid when monitoring live canary metrics continuously over time?",
        "How do you handle delayed guardrail metrics (like 24-hour customer support complaints) that arrive after a canary has expanded?"
      ],
      "wrongAnswers": [
        "Promoting a new model directly to 100% of production traffic without a canary stage, exposing all users to unforeseen failure modes.",
        "Monitoring only conversion metrics while ignoring system latency, allowing a slow model to degrade overall platform performance."
      ],
      "rounds": ["production-mlops", "systems-design"],
      "roles": ["ml-systems-engineer", "data-scientist-evals"]
    },
    {
      "id": "experiment-sample-ratio-mismatch-detection",
      "title": "How do you detect and diagnose Sample Ratio Mismatch (SRM) in an online experiment, and why does SRM invalidate results?",
      "answer": "In an online A/B experiment configured for a 50/50 traffic split, observing 52,000 users in control and 48,000 users in treatment may look like random fluctuation, but statistically it represents a severe Sample Ratio Mismatch (SRM). SRM indicates that the assignment or tracking mechanism is broken, meaning the observed cohorts are no longer comparable and all downstream causal conclusions are completely invalid. We detect SRM using a Chi-Square goodness-of-fit test comparing observed sample counts to the theoretical assignment ratio. If the p-value is below 0.001, an SRM alert is triggered. Diagnosing SRM requires investigating the user lifecycle: first, did the treatment model introduce high latency that caused users to bounce before the tracking event fired? Second, did bot detection filters disproportionately flag and remove treatment requests? Third, were assignment redirects failing on specific mobile browsers? The trade-off is experiment velocity versus scientific integrity: when SRM occurs, the experiment cannot be salvaged by statistical weighting; it must be stopped, debugged, and re-run.",
      "tradeOffs": [
        "Automated SRM checks catch experimental bugs early, preventing teams from shipping invalid features based on biased data.",
        "Invalidating experiments with SRM forces teams to discard weeks of test data, but running decisions on broken splits causes revenue losses."
      ],
      "followUps": [
        "Why can you not simply re-weight the treatment cohort using propensity scores when an SRM is detected?",
        "How can a performance regression in treatment cause an apparent drop in treatment user count?"
      ],
      "wrongAnswers": [
        "Ignoring an SRM alert and trusting the statistical significance of revenue metrics, missing that the underlying cohorts are fundamentally biased.",
        "Assuming that a Chi-Square p-value of 0.0001 is acceptable because the overall sample size is large."
      ],
      "rounds": ["evaluation", "production-mlops"],
      "roles": ["data-scientist-evals", "applied-scientist"]
    },
    {
      "id": "experiment-multi-armed-bandits-thompson",
      "title": "When should you use Thompson Sampling multi-armed bandits instead of fixed-split A/B testing for recommendation item exploration?",
      "answer": "Fixed-split A/B testing allocates a static percentage of traffic (such as 50% to Variant A and 50% to Variant B) for the entire duration of an experiment. While ideal for long-term causal hypothesis testing, fixed splits are inefficient for short-lived content like news headlines, seasonal promotions, or viral videos: half the users are exposed to the inferior option for weeks just to gather statistical power. Multi-armed bandits minimize cumulative regret by dynamically shifting traffic toward better-performing options while the test is running. Thompson Sampling maintains a posterior probability distribution for each candidate item's reward rate (using Beta distributions for click-through rates). For every incoming user, it samples a score from each item's posterior and recommends the item with the highest sample. High-performing items receive the vast majority of traffic rapidly, while uncertain items continue to receive exploratory traffic. The trade-off is regret minimization versus unbiased causal inference: bandits maximize revenue and engagement during the exploration period, but make calculating standard unbiased average treatment effect estimates difficult.",
      "tradeOffs": [
        "Thompson Sampling dynamically minimizes regret and maximizes conversions on short-lived content, but shifts traffic away from suboptimal arms.",
        "Bandit data exhibits policy-dependent selection bias, making offline counterfactual evaluation significantly more complex than standard A/B logs."
      ],
      "followUps": [
        "How do you incorporate contextual features (like user demographics or device type) into contextual Thompson Sampling?",
        "When is a traditional fixed-split A/B test strictly preferred over a multi-armed bandit?"
      ],
      "wrongAnswers": [
        "Running fixed 50/50 A/B tests for 3-day holiday promotional banners, leaving half the users on a poorly performing banner for the entire holiday.",
        "Using a greedy argmax policy with zero exploration, causing the system to lock onto the first item that receives lucky early clicks."
      ],
      "rounds": ["ml-depth", "systems-design"],
      "roles": ["applied-scientist", "data-scientist-evals"]
    }
  ],
  "system-design": [
    {
      "id": "recsys-two-tower-in-batch-negatives",
      "title": "How do two-tower retrieval models use in-batch negatives for training, and how do you correct for item popularity sampling bias?",
      "answer": "Two-tower models perform large-scale candidate retrieval by mapping user context and candidate items into a shared embedding space using separate user and item neural networks. In a production catalog of 100 million items, computing full softmax over all items is computationally impossible. In-batch negative sampling solves this: within a training mini-batch of B user-item interaction pairs, the positive item for User i serves as a negative item for all other B minus one users in that same batch. This allows computing B-by-B dot products efficiently using a single matrix multiplication without sampling explicit negatives from disk. However, in-batch negative sampling introduces popularity bias: popular items appear more frequently in user interactions, meaning they are sampled as negatives far more often than rare items, causing the model to penalize popular items unfairly. We correct this using logQ correction: we compute each item's marginal sampling probability Q and subtract the log of Q from the raw dot product logit before applying cross-entropy loss. The trade-off is computational efficiency versus negative hardness: in-batch negatives provide fast O(B^2) training samples, but lack challenging hard negatives unless paired with dedicated hard negative mining.",
      "tradeOffs": [
        "In-batch negative training achieves massive sample efficiency via matrix multiplication, but requires logQ correction to avoid popularity distortion.",
        "Batch size directly determines the negative sample pool: small batches lack diversity, while massive batches require distributed negative sharding."
      ],
      "followUps": [
        "How do you incorporate hard negatives (e.g. items displayed but not clicked) alongside in-batch random negatives?",
        "Why is approximate nearest neighbor (ANN) search needed during online serving of two-tower models?"
      ],
      "wrongAnswers": [
        "Training two-tower retrieval with pure random uniform negatives sampled from the catalog, which are too easy and fail to separate subtle categories.",
        "Omitting logQ correction on in-batch negatives, causing the retrieval model to systematically under-recommend popular items."
      ],
      "rounds": ["systems-design", "ml-depth"],
      "roles": ["applied-scientist", "recsys-engineer"]
    },
    {
      "id": "recsys-multi-task-ranking-mmoe",
      "title": "How does Multi-gate Mixture-of-Experts (MMoE) balance competing user engagement objectives (clicks, completion, watch time) in ranking stages?",
      "answer": "In production recommendation systems, ranking models must predict multiple distinct objectives simultaneously: the probability of a click (CTR), the probability of video completion, and expected continuous watch time. Optimizing for clicks alone promotes clickbait that users quickly abandon, hurting retention. Hard parameter sharing—where all tasks share lower layers and split into task-specific heads—suffers from negative transfer when tasks conflict (such as clicking versus finishing a 30-minute video). Multi-gate Mixture-of-Experts (MMoE) uses multiple shared expert sub-networks, but gives each task its own gating network. For Task A, its gating network computes a softmax over all experts, determining how much to weight each expert's representation for its specific prediction; Task B learns completely different gating weights over the same shared experts. Experts naturally specialize in distinct representations without interference. The trade-off is parameter scale and inference latency versus prediction accuracy: MMoE eliminates negative transfer across competing business metrics, but increases model parameter size and scoring compute relative to single-task models.",
      "tradeOffs": [
        "MMoE decouples task learning and prevents negative transfer across conflicting objectives, while sharing common underlying representations.",
        "Multiple gating networks and expert matrix multiplications increase inference FLOPs during high-throughput heavy ranking stages."
      ],
      "followUps": [
        "How do you combine multiple predicted probabilities (e.g. pCTR, pComplete, expected_watch_time) into a final single ranking score?",
        "What is Progressive Layered Extraction (PLE) and how does it improve on MMoE by separating shared and task-specific experts?"
      ],
      "wrongAnswers": [
        "Training separate standalone deep neural networks for every single business metric, duplicating feature extraction and doubling serving latency.",
        "Forcing all tasks into a single shared dense backbone with no task-specific gating, causing negative transfer that degrades completion prediction."
      ],
      "rounds": ["systems-design", "ml-depth"],
      "roles": ["recsys-engineer", "applied-scientist"]
    },
    {
      "id": "recsys-sequential-user-session-modeling",
      "title": "Compare Deep Interest Network (DIN) attention over user history with static user embedding features in real-time recommendation ranking.",
      "answer": "Traditional recommendation ranking models compress a user's entire historical interaction sequence into a single fixed-length embedding vector using average pooling or sum pooling. This creates a severe information bottleneck: a user's diverse interests (e.g. electronics, running shoes, and cooking knives) are averaged together into a single vector that cannot adapt when the user is currently evaluating a specific candidate item. The Deep Interest Network (DIN) replaces static pooling with candidate-aware local activation attention. When scoring a candidate item—such as a pair of running shoes—DIN computes soft attention weights across all items in the user's recent history relative to the candidate. Past running shoe purchases and sports apparel receive high attention weights, while unrelated cooking knife purchases receive near-zero weights. The resulting user representation adapts dynamically for every candidate scored. The trade-off is model expressiveness versus ranking serving latency: DIN dramatically improves ranking accuracy and click-through rates, but running attention over hundreds of historical items for thousands of candidates increases ranking latency significantly.",
      "tradeOffs": [
        "Candidate-aware attention dynamically highlights relevant historical interests for each candidate item, boosting click-through prediction.",
        "Computing attention across user history for hundreds of candidate items increases ranking phase inference latency relative to static vectors."
      ],
      "followUps": [
        "How does the Behavior Sequence Transformer (BST) utilize multi-head self-attention over user interaction histories?",
        "How do you truncate or bucket long user interaction histories to meet strict sub-50ms ranking SLAs?"
      ],
      "wrongAnswers": [
        "Averaging a user's entire past 500 clicks into a single static embedding vector, washing out specific intent when evaluating niche candidates.",
        "Assuming sequential attention models can be computed during candidate retrieval across 100 million items, confusing retrieval with ranking."
      ],
      "rounds": ["systems-design", "ml-depth"],
      "roles": ["recsys-engineer", "applied-scientist"]
    },
    {
      "id": "recsys-exploration-cold-start-contextual",
      "title": "How do you design a cold-start exploration pipeline using LinUCB contextual bandits to discover engagement on newly published items?",
      "answer": "When a creator uploads a new video or a merchant lists a new product, collaborative filtering models have zero user interaction history for that item. If the recommendation engine relies purely on historical click signals, new items receive zero impressions and remain permanently cold. We solve this using a cold-start exploration pipeline powered by Linear Upper Confidence Bound (LinUCB) contextual bandits. For each new item, we represent user and item features in a shared context vector. LinUCB assumes expected reward is linear in context features and maintains a ridge regression model along with a covariance matrix capturing parameter uncertainty. When a user requests recommendations, LinUCB estimates the item's expected reward and adds an exploration bonus proportional to parameter uncertainty. An item with zero impressions has wide confidence bounds and receives an exploration boost. As users interact with the item, uncertainty shrinks, and the item transitions into standard ranking models based on its true performance. The trade-off is short-term engagement versus catalog vitality: exploratory impressions slightly reduce immediate click rates, but discover viral content and prevent creator churn.",
      "tradeOffs": [
        "Contextual bandits provide mathematically bounded regret while rapidly exploring new items, solving cold-start organically.",
        "Allocating a fixed percentage of inventory (e.g. 5%) to exploration sacrifices a fraction of short-term conversion for long-term discovery."
      ],
      "followUps": [
        "How do you transition an item from the bandit exploration tier to the mainstream collaborative filtering index?",
        "What happens if an exploratory item receives early clicks due to clickbait and how do you prevent runaway exploration bonuses?"
      ],
      "wrongAnswers": [
        "Randomly inserting new items into all user feeds without context, annoying users and ruining personal recommendations.",
        "Waiting for search queries alone to surface new items, leaving 90% of new catalog items un-discovered."
      ],
      "rounds": ["systems-design", "ml-depth"],
      "roles": ["recsys-engineer", "applied-scientist"]
    },
    {
      "id": "recsys-diversity-reranking-mmr-dpp",
      "title": "Compare Maximal Marginal Relevance (MMR) with Determinantal Point Processes (DPP) for diversity re-ranking in recommendation trays.",
      "answer": "If a recommendation heavy ranker scores items independently, the top-10 list often consists of near-identical items (such as ten consecutive iPhone phone cases), creating a redundant, boring experience for the user. Diversity re-ranking balances individual item relevance with catalog diversity across the final presentation slate. Maximal Marginal Relevance (MMR) is a greedy heuristic that iteratively selects the next item by maximizing a linear combination of its relevance score minus a penalty for its maximum similarity to already-selected items. MMR is fast (quadratic in slate size) and simple to tune with a single lambda parameter, but it only considers pairwise similarity. Determinantal Point Processes (DPP) model diversity globally as the volume spanned by item feature vectors in a Hilbert space. The probability of selecting a subset is proportional to the determinant of its similarity kernel matrix: highly similar items collapse the determinant volume to zero, while diverse, orthogonal items maximize volume. The trade-off is computational speed versus slate diversity elegance: MMR runs in a few milliseconds and is standard in production, while DPP provides global diversity guarantees at the expense of higher algorithmic complexity.",
      "tradeOffs": [
        "MMR provides intuitive, low-latency greedy diversity tuning with a single lambda trade-off parameter.",
        "DPP optimizes global slate diversity mathematically through matrix determinants, but is computationally heavier during fast re-ranking stages."
      ],
      "followUps": [
        "How do you determine the optimal diversity penalty without hurting overall platform click-through rates?",
        "What categories of recommendations (e.g. news vs music playlists) require higher diversity penalties?"
      ],
      "wrongAnswers": [
        "Showing the raw top-10 items straight out of the ranking model without diversity re-ranking, resulting in redundant homogeneous slates.",
        "Applying diversity filters that replace high-relevance items with completely irrelevant random items, destroying user trust."
      ],
      "rounds": ["systems-design", "ml-depth"],
      "roles": ["recsys-engineer", "applied-scientist"]
    }
  ],
  "rag": [
    {
      "id": "cache-semantic-vector-similarity-thresholds",
      "title": "How do you evaluate and tune cosine similarity thresholds in semantic vector caches to balance hit rate against false answers?",
      "answer": "A semantic vector cache intercepts repeated LLM queries by comparing incoming query embeddings against cached query vectors. Because users rarely type identical queries character-for-character, exact string caches achieve low hit rates. Semantic caches use vector similarity to match paraphrases. Tuning the cosine similarity threshold is the critical trade-off. If the threshold is set too low (such as 0.85), queries with contrasting meanings or subtle domain differences match incorrect cached answers—such as returning an explanation of 'DDP' for a query asking about 'FSDP'. If the threshold is set too high (such as 0.99), even minor wording changes miss the cache, dropping hit rates down to exact-match levels. We evaluate thresholds empirically on historical query pairs using ROC curves, plotting false semantic match rates against cache hit rates. In production, thresholds are typically calibrated tightly between 0.94 and 0.97 using domain-tuned embedding models. The trade-off is cost savings versus answer correctness: semantic caching cuts 30% to 50% of LLM compute, but requires strict threshold validation to avoid returning false answers to subtly different questions.",
      "tradeOffs": [
        "Calibrated semantic thresholds catch diverse paraphrases that miss string caches, delivering major API cost savings.",
        "Setting similarity thresholds too loose causes false semantic hits, delivering confidently wrong answers to subtle query variations."
      ],
      "followUps": [
        "Why do general-purpose embedding models struggle with negation queries in semantic caches?",
        "How does semantic cache efficiency vary between consumer chat and structured enterprise search?"
      ],
      "wrongAnswers": [
        "Using an arbitrary loose similarity threshold (e.g. 0.80) without validation, causing users to receive answers meant for different questions.",
        "Relying entirely on exact MD5 string matching, achieving less than 5% cache hit rates on conversational traffic."
      ],
      "rounds": ["systems-design", "applied-ai-engineer"],
      "roles": ["applied-ai-engineer", "data-scientist-evals"]
    },
    {
      "id": "cache-semantic-asymmetric-invalidation",
      "title": "How do you design asymmetric cache invalidation when underlying enterprise knowledge documents or database records update?",
      "answer": "In enterprise RAG systems, knowledge documents are updated frequently—such as an HR policy revision or a corrected API documentation page. In a standard semantic cache, cached answers contain synthesized text derived from past versions of these documents. If the underlying document changes, cached answers become stale and incorrect, but the cached query vectors have no direct relationship to the document URLs. We design asymmetric cache invalidation using dependency tagging. When an answer is generated and stored in the semantic cache, the cache entry records metadata tags listing every source document chunk ID and database entity ID cited in the response. When our data ingestion pipeline detects an updated or deleted document, it publishes an invalidation event containing the modified chunk IDs. An asynchronous worker queries the cache metadata for all entries tagged with those chunk IDs and purges them immediately from the vector index. The trade-off is ingestion tracking overhead versus knowledge freshness: tracking provenance adds metadata overhead on cache writes, but it guarantees that stale information is purged as soon as source documents update.",
      "tradeOffs": [
        "Document-tagged cache invalidation guarantees knowledge freshness when enterprise source data changes, eliminating stale answers.",
        "Maintaining dependency graphs between cached queries and source document IDs adds metadata complexity on cache writes."
      ],
      "followUps": [
        "How do you handle partial document updates where only one paragraph in a 50-page PDF is modified?",
        "What happens if an invalidation worker experiences lag during a rapid batch document update?"
      ],
      "wrongAnswers": [
        "Relying solely on simple time-to-live (TTL) expiration, allowing stale answers to persist for days after a critical policy is updated.",
        "Flushing the entire enterprise cache whenever any single document updates, destroying cache hit rates for unrelated departments."
      ],
      "rounds": ["systems-design", "production-mlops"],
      "roles": ["applied-ai-engineer", "ai-data-engineer"]
    },
    {
      "id": "cache-semantic-multi-tenant-isolation",
      "title": "How do you enforce security and multi-tenant isolation boundaries in a shared corporate semantic vector cache?",
      "answer": "In an enterprise deploying a centralized semantic cache across multiple departments, users must never receive cached answers containing information they are unauthorized to see. For example, if an executive asks about upcoming layoffs and the answer is cached, an engineer asking a similar question must not receive the cached executive response. We enforce multi-tenant security isolation using partition keys and Access Control List (ACL) pre-filtering. Every semantic cache entry stores metadata containing the tenant ID, department code, and the minimum security clearance role required to view the answer. When a user submits a query, their authenticated JWT token is validated to extract their tenant ID and authorized role scopes. The semantic similarity search applies a hard boolean filter matching the tenant ID and role constraints before vector scoring. If no authorized match exists, the request bypasses the cache and invokes the RAG pipeline with user-specific permissions. The trade-off is cache hit sharing versus data privacy: strictly isolating cache partitions by user role prevents cross-tenant data leakage, but slightly reduces overall cache hit rates relative to an open unpartitioned cache.",
      "tradeOffs": [
        "ACL-filtered vector cache search guarantees zero cross-tenant data leakage, ensuring compliance with enterprise security policies.",
        "Partitioning cache entries by security boundaries reduces cache deduplication across teams that have partially overlapping access."
      ],
      "followUps": [
        "How do you prevent cache timing attacks where an unauthorized user infers confidential facts from query response latency?",
        "What happens if a user's permissions are revoked after an answer has already been cached?"
      ],
      "wrongAnswers": [
        "Sharing a single un-partitioned semantic cache across all employees regardless of access permissions, leaking private data.",
        "Filtering unauthorized cache hits after vector retrieval, which returns empty results when top matches are restricted."
      ],
      "rounds": ["security-governance", "systems-design"],
      "roles": ["security-engineer", "applied-ai-engineer"]
    },
    {
      "id": "cache-semantic-negation-false-positives",
      "title": "Why do embedding models struggle with negation queries in semantic caches, and how do you prevent false positive cache hits on conflicting constraints?",
      "answer": "Standard dense embedding models encode topical semantics rather than exact logical constraints. Because 'How do I enable two-factor authentication?' and 'How do I disable two-factor authentication?' share identical keywords and domain context, their embedding vectors achieve over 0.95 cosine similarity in most off-the-shelf embedding spaces. In a naive semantic cache, an inquiry asking how to disable a feature will hit the cached answer explaining how to enable it, producing a dangerous false positive hit. We prevent negation and constraint false positives using a hybrid verification stage. When a candidate cache hit exceeds the semantic similarity threshold, we do not return the answer immediately. We run a fast lexical constraint checker that compares boolean operators, negation words ('not', 'without', 'disable', 'never'), and named entities between the candidate query and the cached query. If conflicting polarities or mismatched entity constraints are detected, the cache hit is invalidated and the query routes to the full LLM pipeline. The trade-off is verification compute versus semantic safety: running lexical verification adds a few milliseconds to cache lookups, but it prevents catastrophic false positive answers on high-stakes queries.",
      "tradeOffs": [
        "Hybrid lexical-semantic validation prevents false positive cache hits on negation queries, protecting users from opposite answers.",
        "Running entity and negation checks on candidate cache hits adds a small parsing step to cache lookup latency."
      ],
      "followUps": [
        "How do fine-tuned cross-encoders compare against heuristic lexical checkers for verifying cache hit validity?",
        "What other categories of queries (e.g. temporal dates, version numbers) exhibit semantic false positive risks?"
      ],
      "wrongAnswers": [
        "Relying solely on dense embedding cosine similarity for semantic cache hits, returning opposite answers to negation queries.",
        "Assuming that modern embedding models reliably encode boolean negation out of the box without special training."
      ],
      "rounds": ["ml-depth", "systems-design"],
      "roles": ["applied-ai-engineer", "data-scientist-evals"]
    }
  ],
  "multimodal": [
    {
      "id": "voice-streaming-tts-neural-vocoder",
      "title": "How do you architect a streaming text-to-speech pipeline with chunked neural vocoders to achieve sub-200ms time-to-first-audio?",
      "answer": "In conversational voice AI, waiting for an LLM to generate an entire sentence before beginning speech synthesis creates noticeable latency that breaks human conversational flow. We architect a streaming text-to-speech pipeline that operates concurrently with LLM token generation. As the LLM streams text tokens, a text normalizer accumulates tokens into grammatical phrase chunks (typically 4 to 8 words) delimited by commas or pauses. The phrase chunk is immediately dispatched to an acoustic model that generates mel-spectrogram frames. A lightweight neural vocoder—such as HiFi-GAN or a flow-matching vocoder—synthesizes raw 24kHz audio waveforms from the spectrogram in small chunks, streaming PCM audio frames over a WebSocket directly to the client browser. Audio playback starts on the client while downstream text is still being generated. The trade-off is time-to-first-audio versus prosody naturalness: streaming small phrase chunks achieves time-to-first-audio under 200 milliseconds, but synthesis models lack full sentence context, which can cause slight pitch and prosody discontinuities at phrase boundaries.",
      "tradeOffs": [
        "Chunked streaming text-to-speech achieves sub-200ms time-to-first-audio, creating responsive real-time voice conversations.",
        "Synthesizing speech in small phrase chunks reduces cross-sentence prosodic context, risking minor pitch glitches across boundaries."
      ],
      "followUps": [
        "How do you handle audio phase alignment when stitching together streaming audio chunks in the client audio buffer?",
        "What happens if the LLM token generation rate falls below real-time audio playback speed?"
      ],
      "wrongAnswers": [
        "Buffering the entire LLM response text before initiating text-to-speech synthesis, forcing users to wait several seconds in silence.",
        "Sending single-word chunks to the vocoder, causing unnatural robotic cadence and boundary clicks."
      ],
      "rounds": ["systems-design", "ml-depth"],
      "roles": ["speech-ai-engineer", "applied-ai-engineer"]
    },
    {
      "id": "voice-vad-pause-detection-turn-taking",
      "title": "How do you tune Voice Activity Detection (VAD) pause thresholds to balance conversational responsiveness against interrupting user pauses?",
      "answer": "In spoken conversational agents, determining when a user has finished speaking versus when they are taking a brief mid-sentence pause is the fundamental challenge of natural turn-taking. If the Voice Activity Detection (VAD) pause threshold is set too short (such as 300ms), the agent interrupts the user whenever they pause to think. If the threshold is set too long (such as 1,500ms), conversations feel awkward and sluggish. We implement a two-stage turn-taking architecture using a lightweight neural VAD model (like Silero VAD) paired with semantic end-of-turn classification. The VAD operates on 30-millisecond audio frames, outputting speech probabilities. We maintain a baseline silence threshold, typically calibrated around 600 to 800 milliseconds. When speech stops, the system passes the transcribed text transcript to a fast semantic end-of-turn classifier: if the transcript ends on an incomplete clause or trailing conjunction (like 'because...'), the system extends the pause threshold by another 700 milliseconds. If the transcript is grammatically complete, the agent responds immediately. The trade-off is conversational fluidity versus interruption risk: semantic turn-taking feels human, but requires sub-50ms classifier latency to avoid adding delay.",
      "tradeOffs": [
        "Semantic turn-taking combined with neural VAD allows natural human mid-sentence pauses without premature agent interruptions.",
        "Extending pause thresholds on trailing conjunctions prevents interruptions, but delays response times if the user genuinely stopped speaking."
      ],
      "followUps": [
        "How do you calibrate energy-based versus neural VAD models in noisy acoustic environments (e.g. cafes)?",
        "What role do acoustic pitch and prosody cues play in signaling turn completion in human speech?"
      ],
      "wrongAnswers": [
        "Using a fixed 400ms silence threshold with no semantic context, causing the agent to constantly cut off users while thinking.",
        "Using a fixed 2,000ms threshold for all turns, making the conversation feel unresponsive and broken."
      ],
      "rounds": ["ml-depth", "systems-design"],
      "roles": ["speech-ai-engineer", "applied-ai-engineer"]
    },
    {
      "id": "voice-streaming-asr-chunk-overlap",
      "title": "How do you manage sliding audio window overlap and prefix freezing in streaming speech-to-text (ASR) to prevent silence hallucinations?",
      "answer": "Streaming speech-to-text models process continuous microphone audio in small increments to output text with minimal delay. However, splitting audio arbitrarily at chunk boundaries cuts phonemes in half, causing transcription errors. Furthermore, encoder-decoder ASR models (like Whisper) frequently hallucinate repetitive phrases when processing audio chunks containing pure ambient silence. We implement streaming ASR using sliding audio windows with boundary overlap and prefix freezing. The audio stream is accumulated in a growing buffer. At each step, we feed an audio window containing new audio plus 1 to 2 seconds of trailing overlap from the previous chunk. We align the new transcription with previous output, freeze the stable prefix that has repeated across consecutive passes, and emit only the finalized tokens. When our VAD flags that an audio chunk contains no human speech, we bypass model inference entirely, feeding pure silence tokens and clearing audio buffers to prevent hallucination loops. The trade-off is redundant audio compute versus boundary transcription stability: re-processing overlapping audio segments increases ASR compute by roughly 30%, but it eliminates boundary word mutilation.",
      "tradeOffs": [
        "Sliding window overlap and prefix freezing eliminate word clipping at chunk boundaries and stabilize streaming text output.",
        "Re-processing overlapping audio segments consumes additional GPU compute compared to single-pass non-overlapping chunking."
      ],
      "followUps": [
        "How does CTC (Connectionist Temporal Classification) compare to autoregressive attention for streaming speech transcription?",
        "What causes encoder-decoder models to loop phrases repeatedly when transcribing ambient background noise?"
      ],
      "wrongAnswers": [
        "Chunking raw audio into disjoint 1-second chunks without overlap, causing words split across boundaries to be transcribed as nonsense.",
        "Feeding non-speech audio into autoregressive models without VAD gating, triggering repetitive hallucination loops."
      ],
      "rounds": ["ml-depth", "systems-design"],
      "roles": ["speech-ai-engineer", "applied-scientist"]
    },
    {
      "id": "voice-wer-normalization-accents",
      "title": "How do you design a rigorous Word Error Rate (WER) evaluation harness with text normalization to benchmark speech models across regional accents?",
      "answer": "Evaluating speech recognition models across regional accents requires a standardized evaluation harness to prevent aggregate metrics from hiding performance disparities. Standard Word Error Rate computes Levenshtein edit distance on word tokens: substitutions plus deletions plus insertions divided by total reference words. However, raw ASR transcripts contain formatting artifacts like numbers, dates, contractions, and punctuation that distort WER if evaluated directly against ground truth. We apply a strict text normalizer before scoring: converting text to lowercase, expanding numbers to spoken words (e.g. '42' to 'forty-two'), stripping punctuation, and standardizing contractions. Crucially, evaluating an aggregate WER score across a pooled dataset hides severe accent bias: an overall WER of 8% can conceal that native speakers score 4% while non-native regional accents score 25%. We partition evaluation sets into stratified demographic cohorts across accents, background noise levels, and speaking rates, reporting per-cohort WER distributions and worst-case tail performance. The trade-off is normalization breadth versus semantic nuance: aggressive text normalization isolates acoustic recognition accuracy, but ignores capitalization and punctuation quality needed by downstream LLM prompts.",
      "tradeOffs": [
        "Standardized text normalization isolates phonetic speech accuracy from superficial casing and punctuation formatting differences.",
        "Stratified cohort evaluation exposes regional accent performance gaps, preventing aggregate averages from masking real user failures."
      ],
      "followUps": [
        "What is Character Error Rate (CER) and when is it preferred over Word Error Rate for non-concatenative or agglutinative languages?",
        "How do you test speech recognition accuracy on domain-specific technical jargon and acronyms?"
      ],
      "wrongAnswers": [
        "Evaluating raw un-normalized transcripts, penalizing models for formatting differences like 'Dr.' versus 'Doctor'.",
        "Reporting only aggregate global WER, hiding that the model fails on non-native or regional accents."
      ],
      "rounds": ["evaluation", "ml-depth"],
      "roles": ["data-scientist-evals", "speech-ai-engineer"]
    },
    {
      "id": "voice-full-duplex-barge-in",
      "title": "How do you architect a full-duplex voice pipeline that supports user barge-in interruptions and acoustic echo cancellation?",
      "answer": "In a natural conversation, a user does not wait for a speaker to finish a paragraph before interjecting; they interrupt or ask clarifications immediately. Half-duplex voice bots mute the microphone while speaking, preventing users from interrupting. A full-duplex voice architecture keeps the microphone active at all times while the agent speaks. This introduces acoustic echo: the agent's synthesized speech emitted from device speakers is picked up by the microphone and fed back into speech recognition, causing the agent to interrupt and transcribe itself. We solve this using WebRTC Acoustic Echo Cancellation (AEC) and hardware-level reference stream subtraction. The microphone input is scrubbed of the speaker output signal before reaching our VAD. When the VAD detects genuine user speech above an energy and duration threshold while the agent is speaking, a barge-in event fires immediately: the server halts downstream LLM generation, issues a cancellation signal to the streaming audio player to flush remaining buffers, and switches the agent into listening mode. The trade-off is barge-in responsiveness versus accidental interruptions: aggressive interruption thresholds cancel agent speech on faint background coughs or speaker echo leaks, while conservative thresholds make interrupting difficult.",
      "tradeOffs": [
        "Full-duplex barge-in allows immediate, natural interruptions, creating human-like conversational fluidity.",
        "Acoustic echo cancellation leakage or overly sensitive VAD can cause the agent to interrupt itself on faint speaker reverberations."
      ],
      "followUps": [
        "How does WebRTC Acoustic Echo Cancellation (AEC3) mathematically model room impulse responses to cancel speaker echo?",
        "What state cleanup is required when an agent's streaming audio is abruptly cut off by a user barge-in?"
      ],
      "wrongAnswers": [
        "Muting the user's microphone during agent speech playback, forcing users into frustrating walkie-talkie style turn-taking.",
        "Relying on software volume ducking alone without acoustic echo cancellation, causing the agent to transcribe its own speaker echo."
      ],
      "rounds": ["systems-design", "ml-depth"],
      "roles": ["speech-ai-engineer", "applied-ai-engineer"]
    }
  ]
}

with open("scripts/interview/batch2_questions.py", "w") as f:
    f.write("# Generated Batch 2 new questions on thin themes\n")
    f.write(f"NEW_QUESTIONS = {repr(QUESTIONS)}\n")

print("batch2_questions.py generated successfully.")
