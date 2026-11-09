import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
path = ROOT / "src/data/interviewSeniorQuestions.json"
data = json.loads(path.read_text())

# Map existing questions to their problemId
EXISTING_MAP = {
    "coding-chunker-token-aware": "coding-text-chunker",
    "coding-bm25-from-scratch": "rag-bm25",
    "coding-cross-encoder-reranker": "coding-simple-reranker",
    "coding-json-output-parser": "coding-json-output-repair",
    "coding-eval-harness-precision-recall": "coding-eval-regression-harness",
    "coding-dynamic-batcher": "coding-request-batcher",
    "coding-token-bucket-rate-limiter": "coding-token-bucket",
    "coding-exponential-decay-cache": "coding-semantic-cache",
    "implement-attention": "attn-scaled-dot-product",
    "implement-metrics": "met-macro-micro-f1",
}

# Update existing list items
for item in data["coding"]:
    qid = item[0] if isinstance(item, list) else item.get("id")
    if qid in EXISTING_MAP:
        prob_id = EXISTING_MAP[qid]
        if isinstance(item, list):
            # Ensure length is at least 10: item[8] is level, item[9] is problemId
            while len(item) < 8:
                item.append(None)
            if len(item) == 8:
                item.append("senior")
            if len(item) == 9:
                item.append(prob_id)
            else:
                item[9] = prob_id
        else:
            item["problemId"] = prob_id

# The 10 new runnable coding questions to complete the 20
NEW_CODING_QUESTIONS = [
    [
        "coding-reciprocal-rank-fusion",
        "Implement Reciprocal Rank Fusion (RRF) in Python to merge ranked lists from multiple search algorithms.",
        "We merge ranked candidate lists using Reciprocal Rank Fusion without relying on raw score calibration. Because keyword retrievers like BM25 yield unbounded positive scores while dense retrievers return cosine similarities between 0 and 1, direct score arithmetic produces distorted rankings. We iterate through each searcher's ordered results, taking 1-based ranks. For each document, we accumulate 1 / (60 + rank). We sort the resulting fused list by reciprocal score descending, breaking ties by document identifier ascending. Testing covers identical rankings, disjoint lists, differing list lengths, and stability under edge-case ties. The trade-off is ranking stability against loss of score margin: RRF discards the confidence spread between adjacent items, treating the gap between rank 1 and 2 identically whether the score delta was massive or negligible.",
        ["Why is the smoothing constant k conventionally set to 60?", "When would min-max score normalisation be preferred over reciprocal rank fusion?"],
        ["Adding raw BM25 and dense similarity scores together directly, allowing the uncalibrated BM25 scale to decide the entire order.", "Using 0-based rank indexing without a smoothing constant, causing a division by zero on the top document."],
        ["coding", "rag"],
        ["applied-ai-engineer", "ai-data-engineer"],
        ["RRF requires zero calibration across disparate score distributions, but completely discards intra-ranking score confidence intervals.", "Adding an empirical smoothing constant k=60 prevents top-ranked outliers from dominating the ensemble."],
        "senior",
        "coding-reciprocal-rank-fusion",
    ],
    [
        "coding-retry-backoff-jitter",
        "Implement exponential backoff with full jitter in Python to desynchronize retry storms on rate-limited model endpoints.",
        "When remote LLM endpoints return HTTP 429 Too Many Requests, clients retrying with fixed intervals or pure exponential backoff synchronize their requests into destructive thundering herds. We implement exponential backoff with full jitter. For each attempt index from zero to attempts minus one, we calculate the exponential ceiling as min(max_delay, base_delay * 2^attempt). We then draw a uniform random float between zero and this ceiling using a seeded pseudorandom generator. Testing covers attempt zero base scaling, capping at max_delay, zero attempts returning empty lists, and uniform delay distribution under load. The trade-off is bounded completion latency against server recovery: full jitter maximizes randomness to disperse request spikes, but individual retries may occasionally draw very short delays near zero.",
        ["What is the mathematical difference between Full Jitter, Equal Jitter, and Decorrelated Jitter?", "How do circuit breakers complement exponential backoff during prolonged infrastructure outages?"],
        ["Using deterministic exponential backoff without jitter, which causes all concurrent failed callers to sleep for the exact same duration and crash the service again simultaneously.", "Setting unbounded exponential growth without a max_delay cap, causing subsequent retries to sleep for days."],
        ["coding", "inference-serving"],
        ["applied-ai-engineer", "platform-engineer"],
        ["Full jitter minimizes thundering herd collisions on shared model gateways, but introduces variable request latency for end users.", "Setting a strict max_delay cap protects user turnaround times at the expense of giving downstream servers less recovery time."],
        "senior",
        "coding-retry-backoff-jitter",
    ],
    [
        "coding-agent-loop-guardrails",
        "Implement an autonomous agent execution loop in Python with step budgets, loop detection, and token limits.",
        "We build an autonomous agent runner with deterministic execution guardrails to prevent infinite recursion, runaway token expenditure, and repeated identical tool calls. The runner receives a task and an environment interface. At each iteration, we check whether our step budget has expired. We maintain an in-memory history of tool call signatures composed of the tool name and sorted JSON arguments. If a tool call repeats an identical signature and fails consecutively, we flag an active loop and abort. We track total token consumption across prompt and completion turns, breaking if the budget is breached. Testing covers normal single-step answers, multi-turn tool loops terminating within limits, repeated tool invocation detection, and graceful budget exhaustion returns.",
        ["How do you differentiate between legitimate iterative search queries and infinite loops in agent traces?", "What fallback strategy should the agent execute when its step budget is exhausted?"],
        ["Running a while True loop with no maximum iteration ceiling, allowing the agent to burn API credits indefinitely on ambiguous prompts.", "Checking for loops using raw output string equality instead of normalized tool arguments, causing subtle whitespace differences to bypass detection."],
        ["coding", "agents"],
        ["agentic-ai-engineer", "applied-ai-engineer"],
        ["Strict step and token budgets guarantee bounded cost and latency, but prematurely abort complex multi-step reasoning tasks.", "Signature-based loop detection prevents cycling on failing actions, but requires deterministic argument serialization."],
        "senior",
        "agent-guardrails",
    ],
    [
        "coding-idempotent-tool-wrapper",
        "Implement an idempotent tool call wrapper in Python to prevent duplicate side-effects during agent retries.",
        "When autonomous agents invoke state-mutating external tools such as charging a card or dispatching a refund, network dropouts leave the caller uncertain whether the action committed remotely. We wrap tool execution in an idempotency manager. Each tool request provides an idempotency key and argument payload. Before dispatching, we query an idempotency registry. If the key has not been seen, we execute the tool, store the normalized parameter hash and response payload, and mark it executed. If the key is seen with identical parameters, we immediately return the cached response without re-executing. If the key is reused with mismatched parameters, we raise an idempotency conflict. Testing verifies single execution, duplicate caching, parameter conflict detection, and missing key validation.",
        ["How do you manage TTL expiration for idempotency records in high-throughput distributed systems?", "Why must the parameter payload be cryptographically or deterministically hashed alongside the key?"],
        ["Retrying failed tool calls without an idempotency key, causing payment gateways to process multiple real financial transactions.", "Treating identical keys with different arguments as valid cache hits, executing the wrong action with old outputs."],
        ["coding", "agents"],
        ["agentic-ai-engineer", "platform-engineer"],
        ["Enforcing idempotency keys guarantees at-most-once side-effects across retries, but adds storage overhead for session state.", "Parameter conflict validation prevents accidental key collision bugs, but requires deterministic JSON serialization."],
        "senior",
        "coding-idempotent-tool",
    ],
    [
        "coding-agent-parse-tool",
        "Implement a tool call parser in Python that extracts function names and JSON arguments from model output.",
        "We parse tool calls from conversational model outputs supporting both structured code fences and inline JSON invocations. The parser checks if the output contains a tool invocation marker. If wrapped in markdown code fences, we extract the inner text; otherwise we slice from the first opening brace to the last closing brace. We parse the payload with json.loads, validating that it contains a tool name and arguments dictionary. If parsing fails or required fields are absent, we return None or raise structured syntax errors so the agent loop can prompt the model for immediate self-correction. Testing covers fenced JSON, unfenced JSON, conversational preamble stripping, and malformed syntax.",
        ["Why should tool schemas specify argument types and strict validation in the prompt?", "How does streaming tool call parsing differ from batch post-generation extraction?"],
        ["Using regular expressions to extract argument values with naive string splitting, failing on nested dictionaries or escaped quotes.", "Crashing the entire agent service when the model outputs invalid JSON instead of catching the error and prompting for repair."],
        ["coding", "agents"],
        ["agentic-ai-engineer", "applied-ai-engineer"],
        ["Parsing tool calls with strict JSON validation prevents malformed execution, but requires dedicated error-recovery loops.", "Allowing inline and fenced formats increases extraction resilience, but requires careful delimiter slicing."],
        "senior",
        "agent-parse-tool-call",
    ],
    [
        "coding-hybrid-retrieval-fusion",
        "Implement hybrid retrieval fusion with min-max score normalisation across dense and keyword scores.",
        "Hybrid retrieval merges keyword BM25 results with dense semantic embeddings to combine exact keyword recall with conceptual semantic understanding. Because BM25 scores can exceed 30 while cosine similarities sit between 0 and 1, naive addition allows keyword scores to override the semantic ranker. We normalize both score distributions separately to [0.0, 1.0] using min-max scaling, assigning 1.0 when all scores in a list are identical. We then blend scores using a weighting coefficient alpha: score = alpha * dense_norm + (1 - alpha) * bm25_norm. Documents missing from either retriever are assigned zero for that retriever. Testing verifies normalisation stability, alpha boundary weights, tie-breaking, and empty input handling.",
        ["How do you tune the alpha parameter between lexical and dense retrieval for technical code search?", "When does reciprocal rank fusion outperform min-max score blending in production search?"],
        ["Adding raw BM25 scores directly to dense embedding cosine similarities without normalisation.", "Dividing by zero when all candidate documents from a retriever have identical scores."],
        ["coding", "rag"],
        ["applied-ai-engineer", "ai-data-engineer"],
        ["Min-max normalisation preserves relative score distances within each retrieval method, but is sensitive to outlier scores.", "A configurable alpha weighting slider allows tuning domain-specific lexical versus semantic importance."],
        "senior",
        "rag-hybrid-fusion",
    ],
    [
        "coding-rag-assemble-context",
        "Assemble context from retrieved chunks within a token budget and merge contiguous passages in document order.",
        "Retrieved chunks arrive sorted by relevance score, but feeding them to a model in score order fractures reading continuity: chunk 3 may appear before chunk 2, and disjoint snippets confuse long-context attention. We implement a two-phase context assembler. First, we select chunks greedily by score descending until our token budget is reached, skipping any chunk that would cause an overflow. Second, we re-order the selected chunks by original document identifier and character position, merging adjacent chunks from the same source document into unified passages. Testing verifies score-ordered budget selection, source order restoration, adjacent passage joining, and token counting.",
        ["Why does presenting context in original reading order improve LLM factual recall compared to score order?", "How do you handle middle-loss context effects in large prompt windows?"],
        ["Concatenating chunks directly in retrieval score order, interleaving disconnected paragraphs and confusing the language model.", "Discarding the entire selection when a large chunk exceeds the remaining token budget instead of skipping it to fit smaller candidates."],
        ["coding", "rag"],
        ["applied-ai-engineer", "ai-data-engineer"],
        ["Restoring source order and merging neighbours improves model reasoning and reduces token overhead from repeated headers.", "Greedy score selection within token budgets maximizes prompt information density while preventing context overflow."],
        "senior",
        "rag-assemble-context",
    ],
    [
        "coding-rag-near-duplicates",
        "Drop near-duplicate chunks before indexing using word shingles and Jaccard similarity.",
        "Enterprise document stores and web crawls contain extensive duplicated boilerplate: identical copyright notices, header navigation bars, and copy-pasted setup guides. Indexing every duplicate floods retrieval top-k with redundant copies of the same text. We implement pre-index deduplication using word shingles. We convert each chunk into a set of lower-case 3-word n-grams. We walk chunks sequentially, computing Jaccard similarity against already-retained chunk shingle sets: intersection size divided by union size. We discard any candidate whose similarity exceeds our deduplication threshold. Testing verifies exact duplicate filtering, boilerplate variant detection, distinct word order preservation, and short chunk handling.",
        ["Why is word-level shingling superior to full-text hashing for identifying boilerplate variants?", "How do you scale shingle-based deduplication from thousands of chunks to billions using MinHash LSH?"],
        ["Using MD5 or SHA-256 exact hashing, which fails to detect near-duplicates that differ by a single whitespace character or date.", "Deduplicating after retrieval inside the query path instead of pruning redundant chunks during ingestion."],
        ["coding", "rag"],
        ["applied-ai-engineer", "ai-data-engineer"],
        ["Pre-index shingle deduplication frees vector index capacity and prevents top-k answer crowding, but adds ingestion CPU overhead.", "3-gram shingles preserve word order and phrase structure while ignoring superficial formatting changes."],
        "senior",
        "rag-near-duplicates",
    ],
    [
        "coding-rag-check-citations",
        "Verify citations in generated RAG responses against retrieved source passages.",
        "A retrieval-augmented generation response that displays bracketed citations like [1] or [2] implies factual grounding in specific retrieved passages. If the model hallucinates non-existent source indices or leaves claims uncited, users are misled. We implement an automated citation validator. We split the candidate response into sentences. We extract bracketed citation markers using regular expressions and parse all referenced source numbers. We verify each number against the bounds of the provided sources list (1 to N), flagging any non-existent indices as invalid. We identify all sentences lacking citations. Testing verifies valid citations, out-of-range index detection, multi-source brackets, and uncited sentence tracking.",
        ["How do you verify whether a cited source passage actually supports the claim made in the sentence?", "What user experience should you show when an answer has valid citations but partial factual hallucination?"],
        ["Trusting model-generated citation brackets without validating that the referenced document index actually exists in the prompt context.", "Stripping all citations from the UI instead of flagging unverified sentences for revision."],
        ["coding", "rag"],
        ["applied-ai-engineer", "ai-evaluation-reliability-engineer"],
        ["Automated citation index verification cheaply eliminates out-of-bounds hallucinations before rendering responses in UI.", "Flagging uncited sentences enables targeted secondary verification or model regeneration."],
        "senior",
        "rag-check-citations",
    ],
    [
        "coding-kv-cache-decode",
        "Implement single-token decoding with a key-value (KV) cache for autoregressive transformer inference.",
        "During transformer autoregressive generation, recomputing keys and values for all previous sequence tokens at every decode step results in quadratic O(N^2) compute complexity. We implement single-step KV cache decoding. For the incoming token representation, we project Query, Key, and Value matrices. We append the new key and value vectors to historical cache tensors along the sequence dimension. We compute attention between the single-step query vector and all cached keys, scale by square root of head dimension, apply softmax, and multiply across cached values. Testing verifies cache tensor concatenation shapes, single-step attention weighting, projection dimension consistency, and recurrent state accumulation.",
        ["Why does KV caching convert decode phase computation from compute-bound to memory-bandwidth-bound?", "How do PagedAttention and vLLM eliminate memory fragmentation in multi-user KV caches?"],
        ["Recomputing full sequence self-attention from scratch at every generated token, wasting over 90% of GPU compute in decode phases.", "Allocating static contiguous maximum-context memory for every request, causing severe out-of-memory errors on concurrent serving."],
        ["coding", "inference-serving"],
        ["inference-engineer", "applied-ai-engineer"],
        ["KV caching reduces generation step compute from O(N) to O(1) FLOPs, but consumes extensive GPU VRAM that bounds serving concurrency.", "Appending keys and values recurrently requires efficient memory allocation to avoid cache tensor reallocation overhead."],
        "senior",
        "attn-kv-cache-decode",
    ],
]

# Check existing IDs to avoid duplicates
existing_ids = {item[0] if isinstance(item, list) else item.get("id") for item in data["coding"]}
for new_q in NEW_CODING_QUESTIONS:
    if new_q[0] not in existing_ids:
        data["coding"].append(new_q)

path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
print(f"Updated coding topic in {path}. Total questions now: {len(data['coding'])}")
