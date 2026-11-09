"""AI Engineering Coding Questions (plan B6).
Practical coding problems covering core AI engineering primitives:
text chunking, reciprocal rank fusion, reranking, JSON repair,
eval regression harness, token bucket, dynamic batching,
exponential backoff with jitter, semantic caching, and idempotent tools.
"""
import math
import random
import re
import json

SET = {
    "title": "AI Engineering Primitives",
    "learn": {"title": "AI Engineering in Production", "route": "/docs/agents/react-agent-production", "description": "Core production primitives for retrieval, caching, agents, and evaluation."},
}


def starter(sig):
    return f"def {sig}:\n    # Your code here\n    pass\n"


CHUNKER_SOL = '''
def chunk_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive")
    if overlap < 0 or overlap >= chunk_size:
        raise ValueError("overlap must satisfy 0 <= overlap < chunk_size")
    if not text:
        return []

    text_len = len(text)
    if text_len <= chunk_size:
        cleaned = text.strip()
        return [cleaned] if cleaned else []

    chunks = []
    start = 0

    while start < text_len:
        end = min(start + chunk_size, text_len)
        if end < text_len:
            last_space = text.rfind(" ", start, end)
            if last_space > start:
                end = last_space

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        if end >= text_len:
            break

        target = max(start + 1, end - overlap)
        space_after = text.find(" ", target, end)
        if space_after != -1:
            next_start = space_after + 1
        else:
            space_before = text.rfind(" ", start, target)
            if space_before != -1 and (end - (space_before + 1)) <= chunk_size:
                next_start = space_before + 1
            else:
                next_start = target

        while next_start < text_len and text[next_start].isspace():
            next_start += 1
        start = max(start + 1, next_start)

    return chunks
'''

RRF_SOL = '''
def reciprocal_rank_fusion(rankings: list[list[str]], k: int = 60) -> list[list]:
    if k < 1:
        raise ValueError("k must be >= 1")
    if not rankings:
        return []

    scores = {}
    for r in rankings:
        for rank_idx, doc_id in enumerate(r, start=1):
            scores[doc_id] = scores.get(doc_id, 0.0) + (1.0 / (k + rank_idx))

    sorted_docs = sorted(scores.items(), key=lambda kv: (-kv[1], kv[0]))
    return [[doc_id, round(score, 6)] for doc_id, score in sorted_docs]
'''

RERANK_SOL = '''
import re

def rerank_passages(query: str, passages: list[dict], top_k: int) -> list[dict]:
    if top_k <= 0:
        raise ValueError("top_k must be positive")
    if not passages:
        return []

    query_terms = set(re.findall(r"[a-z0-9]+", query.lower()))

    lexical_scores = []
    initial_scores = []
    for p in passages:
        p_terms = set(re.findall(r"[a-z0-9]+", p["text"].lower()))
        lex_score = float(len(query_terms & p_terms))
        lexical_scores.append(lex_score)
        initial_scores.append(float(p["score"]))

    def min_max(vals):
        lo, hi = min(vals), max(vals)
        if hi == lo:
            return [1.0] * len(vals)
        return [(v - lo) / (hi - lo) for v in vals]

    norm_lex = min_max(lexical_scores)
    norm_init = min_max(initial_scores)

    ranked = []
    for i, p in enumerate(passages):
        blended = round(0.5 * norm_init[i] + 0.5 * norm_lex[i], 4)
        ranked.append({"id": p["id"], "score": blended})

    ranked.sort(key=lambda x: (-x["score"], x["id"]))
    return ranked[:top_k]
'''

JSON_REPAIR_SOL = r'''
import json
import re

def parse_and_repair_json(raw: str, schema_keys: list[str]) -> dict:
    text = raw.strip()

    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence_match:
        text = fence_match.group(1).strip()
    else:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1:
            raise ValueError("No JSON object found")
        if end != -1 and end > start:
            text = text[start : end + 1].strip()
        else:
            text = text[start:].strip()

    text = re.sub(r"'([a-zA-Z0-9_\-\.\s]+)'\s*:", r'"\1":', text)
    text = re.sub(r":\s*'([^']*?)'", r': "\1"', text)
    text = re.sub(r",\s*([\}\]])", r"\1", text)

    open_braces = text.count("{") - text.count("}")
    if open_braces > 0:
        text += "}" * open_braces

    try:
        data = json.loads(text)
    except Exception as e:
        raise ValueError(f"Unrepairable JSON: {e}")

    if not isinstance(data, dict):
        raise ValueError("Parsed JSON must be an object")

    for k in schema_keys:
        if k not in data:
            data[k] = None

    return data
'''

EVAL_HARNESS_SOL = '''
def evaluate_predictions(predictions: list[dict], baseline_accuracy: float, max_allowed_drop: float = 0.02) -> dict:
    if not predictions:
        raise ValueError("predictions cannot be empty")
    if not (0.0 <= baseline_accuracy <= 1.0):
        raise ValueError("baseline_accuracy must be in [0.0, 1.0]")

    total = len(predictions)
    correct = 0
    failed_ids = []

    for item in predictions:
        pred = str(item.get("prediction", "")).strip().lower()
        label = str(item.get("label", "")).strip().lower()
        if pred == label:
            correct += 1
        else:
            failed_ids.append(item["id"])

    accuracy = round(correct / total, 4)
    delta = round(accuracy - baseline_accuracy, 4)
    regressed = (baseline_accuracy - accuracy) > (max_allowed_drop + 1e-9)
    passed = not regressed

    return {
        "accuracy": accuracy,
        "delta": delta,
        "passed": passed,
        "regressed": regressed,
        "failed_ids": failed_ids,
    }
'''

TOKEN_BUCKET_SOL = '''
def simulate_token_bucket(events: list[dict], capacity: float, refill_rate: float) -> list[bool]:
    if capacity <= 0:
        raise ValueError("capacity must be positive")
    if refill_rate <= 0:
        raise ValueError("refill_rate must be positive")
    if not events:
        return []

    tokens = float(capacity)
    last_time = float(events[0]["time"])
    results = []

    for event in events:
        current_time = float(event["time"])
        cost = float(event["tokens"])

        elapsed = max(0.0, current_time - last_time)
        tokens = min(float(capacity), tokens + elapsed * refill_rate)
        last_time = current_time

        if tokens >= cost:
            tokens -= cost
            results.append(True)
        else:
            results.append(False)

    return results
'''

BATCHER_SOL = '''
def batch_requests(requests: list[dict], max_batch_size: int, max_wait_ms: float) -> list[list[str]]:
    if max_batch_size < 1:
        raise ValueError("max_batch_size must be >= 1")
    if max_wait_ms <= 0:
        raise ValueError("max_wait_ms must be positive")
    if not requests:
        return []

    batches = []
    current_batch = []
    batch_start_time = None

    for req in requests:
        req_id = req["id"]
        arr_time = float(req["arrival_time"])

        if not current_batch:
            current_batch.append(req_id)
            batch_start_time = arr_time
        elif (arr_time - batch_start_time) > max_wait_ms:
            batches.append(current_batch)
            current_batch = [req_id]
            batch_start_time = arr_time
        else:
            current_batch.append(req_id)

        if len(current_batch) == max_batch_size:
            batches.append(current_batch)
            current_batch = []
            batch_start_time = None

    if current_batch:
        batches.append(current_batch)

    return batches
'''

BACKOFF_SOL = '''
import random

def calculate_backoff_delays(attempts: int, base_delay: float, max_delay: float, seed: int) -> list[float]:
    if attempts < 0:
        raise ValueError("attempts must be non-negative")
    if base_delay <= 0:
        raise ValueError("base_delay must be positive")
    if max_delay < base_delay:
        raise ValueError("max_delay must be >= base_delay")
    if attempts == 0:
        return []

    delays = []
    for i in range(attempts):
        ceiling = min(max_delay, base_delay * (2 ** i))
        rng = random.Random(seed + i)
        delay = rng.uniform(0.0, ceiling)
        delays.append(round(delay, 4))

    return delays
'''

SEMANTIC_CACHE_SOL = '''
import math

def semantic_cache_lookup(query_vector: list[float], cache_entries: list[dict], threshold: float, current_time: float) -> dict | None:
    if not (-1.0 <= threshold <= 1.0):
        raise ValueError("threshold must be in [-1.0, 1.0]")
    if not cache_entries:
        return None

    def norm(vec):
        return math.sqrt(sum(x * x for x in vec))

    q_norm = norm(query_vector)
    if q_norm == 0.0:
        return None

    best_match = None
    best_sim = -2.0

    for entry in cache_entries:
        created = float(entry["created_at"])
        ttl = float(entry["ttl"])
        if created + ttl <= current_time:
            continue

        e_vec = entry["vector"]
        e_norm = norm(e_vec)
        if e_norm == 0.0:
            continue

        dot = sum(q * e for q, e in zip(query_vector, e_vec))
        sim = dot / (q_norm * e_norm)

        if sim > best_sim:
            best_sim = sim
            best_match = entry

    if best_match and best_sim >= threshold:
        return {
            "id": best_match["id"],
            "response": best_match["response"],
            "similarity": round(best_sim, 4),
        }

    return None
'''

IDEMPOTENT_TOOL_SOL = '''
import json

def execute_idempotent_tool_calls(calls: list[dict]) -> list[dict]:
    registry = {}
    responses = []

    for call in calls:
        if "idempotency_key" not in call or "tool" not in call:
            raise ValueError("Call must include idempotency_key and tool")

        key = call["idempotency_key"]
        tool = call["tool"]
        params = call.get("params", {})

        serialized_params = json.dumps(params, sort_keys=True)

        if key not in registry:
            result = {"tool": tool, "result": f"{tool}_success", "call_count": 1}
            registry[key] = {"params_str": serialized_params, "result": result}
            responses.append({"status": "executed", "key": key, "result": result})
        else:
            stored = registry[key]
            if stored["params_str"] == serialized_params:
                responses.append({"status": "cached", "key": key, "result": stored["result"]})
            else:
                responses.append({
                    "status": "conflict",
                    "key": key,
                    "error": "Idempotency key reused with different parameters",
                })

    return responses
'''

PROBLEMS = [
    {
        "id": "coding-text-chunker",
        "title": "Text Chunker With Overlap",
        "difficulty": "medium",
        "fn": "chunk_text",
        "signature": "chunk_text(text: str, chunk_size: int, overlap: int) -> list[str]",
        "starter": starter("chunk_text(text: str, chunk_size: int, overlap: int) -> list[str]"),
        "mission": "Split raw text into fixed-size chunks with overlapping context, preserving words so clauses stay readable.",
        "task": "Implement `chunk_text(text, chunk_size, overlap)`. Split `text` into chunks of at most `chunk_size` characters with approximately `overlap` characters of overlap between consecutive chunks. Break chunks on word boundaries (whitespace) when possible. If a word exceeds `chunk_size`, cut hard at `chunk_size`. Advance the next chunk's start to `max(start + 1, end - overlap)`, skipping leading whitespace. Strip leading and trailing whitespace from each emitted chunk and omit empty chunks. Raise `ValueError` if `chunk_size <= 0` or `overlap < 0` or `overlap >= chunk_size`.",
        "constraints": ["0 <= overlap < chunk_size", "Strip whitespace from each chunk", "Break on whitespace unless word is longer than chunk_size", "Raise ValueError on invalid chunk_size or overlap"],
        "hints": {"small": "Find the last whitespace character with text.rfind(' ', start, end).", "strong": "When end reaches text length, break out of the loop.", "concept": "Word boundary preservation prevents truncating search tokens across chunk borders."},
        "tests": [
            {"label": "Short text fits in single chunk", "input": {"text": "Hello world", "chunk_size": 20, "overlap": 5}, "expect": ["Hello world"]},
            {"label": "Two chunks with word boundary split", "input": {"text": "The quick brown fox jumps over the lazy dog", "chunk_size": 20, "overlap": 5}, "expect": ["The quick brown fox", "fox jumps over the", "the lazy dog"]},
            {"label": "Empty text returns empty list", "input": {"text": "", "chunk_size": 10, "overlap": 2}, "expect": []},
            {"label": "Invalid overlap raises ValueError", "input": {"text": "abc", "chunk_size": 10, "overlap": 10}, "error": "ValueError"},
            {"label": "Single word exceeding chunk size", "input": {"text": "supercalifragilisticexpialidocious text", "chunk_size": 10, "overlap": 2}, "expect": ["supercalif", "ifragilist", "sticexpial", "alidocious", "us text"], "hidden": True},
        ],
        "solution": CHUNKER_SOL,
        "intuition": """
## Why chunking needs overlap

Naive character slicing cuts words in half: "refund policy" becomes "ref" and "und policy". A vector search query for "refund" fails to retrieve either chunk cleanly because the token was mutilated.

**Word-boundary chunking with overlap** ensures that complete sentences and key entities remain intact in at least one chunk. The overlap window guarantees that transitions between paragraphs do not lose the surrounding context required by the embedding model.
""",
    },
    {
        "id": "coding-reciprocal-rank-fusion",
        "title": "Reciprocal Rank Fusion",
        "difficulty": "medium",
        "fn": "reciprocal_rank_fusion",
        "signature": "reciprocal_rank_fusion(rankings: list[list[str]], k: int = 60) -> list[list]",
        "starter": starter("reciprocal_rank_fusion(rankings: list[list[str]], k: int = 60) -> list[list]"),
        "mission": "Combine rankings from multiple search systems using reciprocal ranks, giving robust hybrid search without score calibration.",
        "task": "Implement `reciprocal_rank_fusion(rankings, k=60)`. Each list in `rankings` contains document IDs in ranked order (rank 1 at index 0). For each document, sum `1.0 / (k + rank)` across all rankings where it appears. Return `[doc_id, score]` pairs sorted by score descending, ties by doc_id ascending. Round scores to 6 decimal places. Raise `ValueError` if `k < 1`.",
        "constraints": ["1-based rank indexing (first doc has rank 1)", "Score formula: sum(1 / (k + rank))", "Round score to 6 decimals", "Ties broken by doc_id ascending", "Raise ValueError if k < 1"],
        "hints": {"small": "Enumerate each ranking list with enumerate(r, start=1).", "strong": "Sort with key=lambda kv: (-kv[1], kv[0]) for descending score and ascending id.", "concept": "RRF depends only on positions, making it immune to incompatible score scales between BM25 and vector search."},
        "tests": [
            {"label": "Two retrievers in agreement", "input": {"rankings": [["docA", "docB", "docC"], ["docA", "docC", "docB"]], "k": 60}, "expect": [["docA", 0.032787], ["docB", 0.032002], ["docC", 0.032002]]},
            {"label": "Disjoint rankings merged", "input": {"rankings": [["docA", "docB"], ["docC", "docD"]], "k": 60}, "expect": [["docA", 0.016393], ["docC", 0.016393], ["docB", 0.016129], ["docD", 0.016129]]},
            {"label": "Empty rankings list", "input": {"rankings": [], "k": 60}, "expect": []},
            {"label": "Invalid k raises ValueError", "input": {"rankings": [["a"]], "k": 0}, "error": "ValueError"},
            {"label": "Three rankings with tie-breaking", "input": {"rankings": [["a", "b", "c"], ["b", "c", "d"], ["c", "a", "d"]], "k": 60}, "expect": [["c", 0.048395], ["a", 0.032522], ["b", 0.032522], ["d", 0.031746]], "hidden": True},
        ],
        "solution": RRF_SOL,
        "intuition": """
## Why RRF beats score blending

BM25 scores range from 0 to 40+, while dense embedding cosine similarities sit between 0.3 and 0.85. Direct addition lets BM25 completely dominate, while min-max normalization is sensitive to outlier scores.

**Reciprocal Rank Fusion (Cormack et al., 2009)** discards raw scores entirely and uses only ranks. Adding a constant `k = 60` dampens the influence of top-ranked items and rewards documents that consistently place well across multiple independent retrieval algorithms.
""",
    },
    {
        "id": "coding-simple-reranker",
        "title": "Two-Stage Passage Reranker",
        "difficulty": "medium",
        "fn": "rerank_passages",
        "signature": "rerank_passages(query: str, passages: list[dict], top_k: int) -> list[dict]",
        "starter": starter("rerank_passages(query: str, passages: list[dict], top_k: int) -> list[dict]"),
        "mission": "Re-score retrieval candidates by combining their initial retriever score with lexical term overlap.",
        "task": "Implement `rerank_passages(query, passages, top_k)`. Each passage is `{\"id\": str, \"text\": str, \"score\": float}`. Extract lower-case alphanumeric query words. Compute lexical overlap count per passage. Min-max normalize both the initial score and lexical overlap to [0.0, 1.0] (constant arrays normalize to 1.0). Compute blended score `0.5 * norm_initial + 0.5 * norm_lexical` rounded to 4 decimals. Return top `top_k` passages as `[{\"id\": str, \"score\": float}]` sorted by score descending, ties by id ascending. Raise `ValueError` if `top_k <= 0`.",
        "constraints": ["Min-max normalize both scores separately before blending", "Identical min and max normalizes to 1.0", "Round blended score to 4 decimal places", "Return at most top_k entries", "Raise ValueError if top_k <= 0"],
        "hints": {"small": "Extract query words with re.findall(r'[a-z0-9]+', query.lower()).", "strong": "Handle hi == lo edge cases during normalization by assigning 1.0.", "concept": "Two-stage retrieval pairs fast candidate generation with precise cross-encoder reranking."},
        "tests": [
            {"label": "Lexical match boosts candidate passage", "input": {"query": "vector database", "passages": [{"id": "p1", "text": "relational database system", "score": 0.9}, {"id": "p2", "text": "vector database index", "score": 0.5}], "top_k": 2}, "expect": [{"id": "p1", "score": 0.5}, {"id": "p2", "score": 0.5}]},
            {"label": "Single passage normalization", "input": {"query": "test", "passages": [{"id": "p1", "text": "test passage", "score": 0.8}], "top_k": 1}, "expect": [{"id": "p1", "score": 1.0}]},
            {"label": "Empty passages returns empty list", "input": {"query": "test", "passages": [], "top_k": 3}, "expect": []},
            {"label": "Invalid top_k raises ValueError", "input": {"query": "test", "passages": [{"id": "p1", "text": "a", "score": 0.1}], "top_k": 0}, "error": "ValueError"},
            {"label": "Three passages with truncation", "input": {"query": "prompt injection guardrails", "passages": [{"id": "doc1", "text": "prompt injection attacks and defense", "score": 0.2}, {"id": "doc2", "text": "guardrails prevent prompt injection", "score": 0.9}, {"id": "doc3", "text": "unrelated weather report", "score": 0.8}], "top_k": 2}, "expect": [{"id": "doc2", "score": 1.0}, {"id": "doc3", "score": 0.4286}], "hidden": True},
        ],
        "solution": RERANK_SOL,
        "intuition": """
## Two-stage retrieval in production

First-stage retrievers (bi-encoders and BM25) search millions of documents in sub-10ms by comparing vectors independently. However, they lack joint cross-attention between query and document tokens.

A **reranker** acts as the second stage: it inspects the top-50 candidates with deep cross-attention or term verification, filtering out false positives before feeding context to the LLM.
""",
    },
    {
        "id": "coding-json-output-repair",
        "title": "Structured JSON Parser With Repair",
        "difficulty": "medium",
        "fn": "parse_and_repair_json",
        "signature": "parse_and_repair_json(raw: str, schema_keys: list[str]) -> dict",
        "starter": starter("parse_and_repair_json(raw: str, schema_keys: list[str]) -> dict"),
        "mission": "Extract structured data from messy LLM responses, repairing markdown fences, trailing commas, single quotes, and missing keys.",
        "task": "Implement `parse_and_repair_json(raw, schema_keys)`. Strip markdown fences (` ```json ... ``` `) if present, or find content between the first `{` and last `}`. Repair single quotes on keys and values, strip trailing commas before `}` or `]`, and append missing closing braces. Parse with `json.loads`. Backfill any missing `schema_keys` with `None`. Raise `ValueError` if no JSON object exists or if parsing fails.",
        "constraints": ["Strip markdown fences cleanly", "Remove trailing commas before closing braces/brackets", "Convert single quotes to double quotes", "Backfill missing schema_keys with None", "Raise ValueError on unrepairable input"],
        "hints": {"small": "Check for code fences with regex r'```(?:json)?\\s*([\\s\\S]*?)```'.", "strong": "Count opening vs closing braces to append missing '}'.", "concept": "LLMs often produce valid JSON except for trailing commas or markdown framing."},
        "tests": [
            {"label": "Markdown fence with trailing comma", "input": {"raw": "```json\n{\"name\": \"Alice\", \"age\": 30,}\n```", "schema_keys": ["name", "age", "role"]}, "expect": {"name": "Alice", "age": 30, "role": None}},
            {"label": "Single quotes and missing key", "input": {"raw": "{'status': 'active', 'code': 200}", "schema_keys": ["status", "code", "message"]}, "expect": {"status": "active", "code": 200, "message": None}},
            {"label": "Unclosed trailing brace", "input": {"raw": "{\"query\": \"search text\", \"limit\": 10", "schema_keys": ["query", "limit"]}, "expect": {"query": "search text", "limit": 10}},
            {"label": "Unrepairable garbage raises ValueError", "input": {"raw": "I cannot fulfill this request as an AI.", "schema_keys": ["result"]}, "error": "ValueError"},
            {"label": "Array trailing comma and conversational preamble", "input": {"raw": "Here is your JSON:\n```\n{\"items\": [1, 2, 3,], \"valid\": true}\n```\nHope this helps!", "schema_keys": ["items", "valid"]}, "expect": {"items": [1, 2, 3], "valid": True}, "hidden": True},
        ],
        "solution": JSON_REPAIR_SOL,
        "intuition": """
## The reality of LLM structured output

Even with structured output schemas or system prompts, models occasionally wrap JSON in markdown blocks (` ```json `), insert trailing commas (valid in JavaScript, fatal in standard Python `json.loads`), or get cut off by max token limits leaving unclosed brackets.

A robust **JSON repair filter** saves expensive API retries by fixing syntactic trivialities deterministically in milliseconds before escalating to a model retry.
""",
    },
    {
        "id": "coding-eval-regression-harness",
        "title": "Evaluation Harness With Regression Gate",
        "difficulty": "medium",
        "fn": "evaluate_predictions",
        "signature": "evaluate_predictions(predictions: list[dict], baseline_accuracy: float, max_allowed_drop: float = 0.02) -> dict",
        "starter": starter("evaluate_predictions(predictions: list[dict], baseline_accuracy: float, max_allowed_drop: float = 0.02) -> dict"),
        "mission": "Gate LLM prompt or model changes by measuring accuracy against ground truth and blocking regressions.",
        "task": "Implement `evaluate_predictions(predictions, baseline_accuracy, max_allowed_drop=0.02)`. Each item in `predictions` has `{\"id\": str, \"prediction\": str, \"label\": str}`. Match predictions case-insensitively with stripped whitespace. Compute accuracy and delta against baseline_accuracy, rounded to 4 decimals. Regressed is True if `(baseline_accuracy - accuracy) > max_allowed_drop`. Return `{\"accuracy\": float, \"delta\": float, \"passed\": bool, \"regressed\": bool, \"failed_ids\": list[str]}`. Raise `ValueError` if predictions is empty or baseline_accuracy not in [0.0, 1.0].",
        "constraints": ["Case-insensitive stripped string comparison", "Round accuracy and delta to 4 decimal places", "Regressed when drop exceeds max_allowed_drop", "passed is not regressed", "Raise ValueError on empty predictions or invalid baseline"],
        "hints": {"small": "Strip and lowercase both prediction and label before comparing.", "strong": "Keep failed IDs in their original order.", "concept": "Eval regression gates prevent prompt drift from breaking edge cases in production."},
        "tests": [
            {"label": "Improvement over baseline passes", "input": {"predictions": [{"id": "q1", "prediction": "yes", "label": "yes"}, {"id": "q2", "prediction": "no", "label": "no"}], "baseline_accuracy": 0.8}, "expect": {"accuracy": 1.0, "delta": 0.2, "passed": True, "regressed": False, "failed_ids": []}},
            {"label": "Minor drop within allowed tolerance passes", "input": {"predictions": [{"id": "q1", "prediction": "yes", "label": "yes"}, {"id": "q2", "prediction": "wrong", "label": "no"}], "baseline_accuracy": 0.51, "max_allowed_drop": 0.02}, "expect": {"accuracy": 0.5, "delta": -0.01, "passed": True, "regressed": False, "failed_ids": ["q2"]}},
            {"label": "Regression exceeding threshold fails", "input": {"predictions": [{"id": "q1", "prediction": "a", "label": "a"}, {"id": "q2", "prediction": "b", "label": "c"}], "baseline_accuracy": 0.9, "max_allowed_drop": 0.05}, "expect": {"accuracy": 0.5, "delta": -0.4, "passed": False, "regressed": True, "failed_ids": ["q2"]}},
            {"label": "Empty predictions raises ValueError", "input": {"predictions": [], "baseline_accuracy": 0.8}, "error": "ValueError"},
            {"label": "All fail test case with edge baseline", "input": {"predictions": [{"id": "t1", "prediction": "no", "label": "yes"}, {"id": "t2", "prediction": "false", "label": "true"}], "baseline_accuracy": 0.0, "max_allowed_drop": 0.01}, "expect": {"accuracy": 0.0, "delta": 0.0, "passed": True, "regressed": False, "failed_ids": ["t1", "t2"]}, "hidden": True},
        ],
        "solution": EVAL_HARNESS_SOL,
        "intuition": """
## Automated regression gates in CI/CD

Prompt engineering without evals is guessing. When modifying system prompts, adding few-shot examples, or switching model providers, developers often verify only the one query they care about while silently degrading five other edge cases.

An **automated eval regression gate** enforces an empirical baseline in CI: unless accuracy on the benchmark suite meets or exceeds the threshold, the pull request cannot merge.
""",
    },
    {
        "id": "coding-token-bucket",
        "title": "Token Bucket Rate Limiter",
        "difficulty": "medium",
        "fn": "simulate_token_bucket",
        "signature": "simulate_token_bucket(events: list[dict], capacity: float, refill_rate: float) -> list[bool]",
        "starter": starter("simulate_token_bucket(events: list[dict], capacity: float, refill_rate: float) -> list[bool]"),
        "mission": "Simulate a token bucket rate limiter to protect model APIs from bursts while allowing steady-state throughput.",
        "task": "Implement `simulate_token_bucket(events, capacity, refill_rate)`. The bucket starts full at `capacity` tokens. Each event is `{\"time\": float, \"tokens\": float}` with non-decreasing times. At each event, refill the bucket by `(current_time - last_time) * refill_rate`, capped at `capacity`. If available tokens >= requested tokens, deduct and record `True`; otherwise record `False` without deducting tokens. Return list of booleans. Raise `ValueError` if capacity or refill_rate <= 0.",
        "constraints": ["Bucket starts completely full at capacity", "Tokens refill continuously based on elapsed time", "Denied requests consume zero tokens", "Return list of booleans matching events", "Raise ValueError if capacity <= 0 or refill_rate <= 0"],
        "hints": {"small": "Update available tokens: min(capacity, tokens + elapsed * refill_rate).", "strong": "Do not deduct tokens when a request is rejected.", "concept": "Token bucket permits brief bursts up to capacity while bounding sustained traffic to refill_rate."},
        "tests": [
            {"label": "Burst consumed then rejected", "input": {"events": [{"time": 0.0, "tokens": 5.0}, {"time": 0.0, "tokens": 6.0}], "capacity": 10.0, "refill_rate": 1.0}, "expect": [True, False]},
            {"label": "Refill allows subsequent request", "input": {"events": [{"time": 0.0, "tokens": 10.0}, {"time": 2.0, "tokens": 2.0}], "capacity": 10.0, "refill_rate": 1.0}, "expect": [True, True]},
            {"label": "Empty events returns empty list", "input": {"events": [], "capacity": 10.0, "refill_rate": 2.0}, "expect": []},
            {"label": "Invalid capacity raises ValueError", "input": {"events": [{"time": 0.0, "tokens": 1.0}], "capacity": -1.0, "refill_rate": 1.0}, "error": "ValueError"},
            {"label": "Fractional token consumption and idle cap", "input": {"events": [{"time": 0.0, "tokens": 4.5}, {"time": 1.0, "tokens": 6.5}, {"time": 20.0, "tokens": 10.0}], "capacity": 10.0, "refill_rate": 0.5}, "expect": [True, False, True], "hidden": True},
        ],
        "solution": TOKEN_BUCKET_SOL,
        "intuition": """
## Why token bucket is the industry standard

Simple fixed-window counters allow 2x bursts across window boundaries (e.g. 100 requests at 00:59 and 100 requests at 01:00). Leaky bucket queues smooth out traffic but delay every request.

The **token bucket** algorithm combines the best of both: it permits legitimate short bursts (up to bucket capacity) for rapid multi-turn interactions, while strictly constraining long-term consumption to the token refill rate.
""",
    },
    {
        "id": "coding-request-batcher",
        "title": "Dynamic Request Batcher",
        "difficulty": "medium",
        "fn": "batch_requests",
        "signature": "batch_requests(requests: list[dict], max_batch_size: int, max_wait_ms: float) -> list[list[str]]",
        "starter": starter("batch_requests(requests: list[dict], max_batch_size: int, max_wait_ms: float) -> list[list[str]]"),
        "mission": "Group concurrent inference requests by batch size and latency budget to maximize GPU utilization.",
        "task": "Implement `batch_requests(requests, max_batch_size, max_wait_ms)`. Each request is `{\"id\": str, \"arrival_time\": float}` (arrival_time in ms, non-decreasing). Group into batches in arrival order. A batch closes when it reaches `max_batch_size`, or when an incoming request arrives with `arrival_time - batch_start_time > max_wait_ms` (closing the current batch before adding the incoming request to a new batch). Return list of batches (lists of request IDs). Raise `ValueError` if `max_batch_size < 1` or `max_wait_ms <= 0`.",
        "constraints": ["Batch closes at max_batch_size or when wait time exceeds max_wait_ms", "Requests grouped strictly in arrival order", "Empty requests returns []", "Raise ValueError if max_batch_size < 1 or max_wait_ms <= 0"],
        "hints": {"small": "Keep track of batch_start_time from the first request in the open batch.", "strong": "When wait time exceeds max_wait_ms, append current batch and start new batch with the current request.", "concept": "Dynamic batching trades bounded latency for massive GPU tensor parallel efficiency."},
        "tests": [
            {"label": "Immediate arrivals grouped by max_batch_size", "input": {"requests": [{"id": "r1", "arrival_time": 0.0}, {"id": "r2", "arrival_time": 1.0}, {"id": "r3", "arrival_time": 2.0}], "max_batch_size": 2, "max_wait_ms": 10.0}, "expect": [["r1", "r2"], ["r3"]]},
            {"label": "Slow arrivals split by timeout", "input": {"requests": [{"id": "r1", "arrival_time": 0.0}, {"id": "r2", "arrival_time": 15.0}], "max_batch_size": 4, "max_wait_ms": 10.0}, "expect": [["r1"], ["r2"]]},
            {"label": "Empty input returns empty list", "input": {"requests": [], "max_batch_size": 4, "max_wait_ms": 5.0}, "expect": []},
            {"label": "Invalid max_batch_size raises ValueError", "input": {"requests": [{"id": "r1", "arrival_time": 0.0}], "max_batch_size": 0, "max_wait_ms": 5.0}, "error": "ValueError"},
            {"label": "Mixed arrivals with timeout and size triggers", "input": {"requests": [{"id": "a", "arrival_time": 10.0}, {"id": "b", "arrival_time": 12.0}, {"id": "c", "arrival_time": 14.0}, {"id": "d", "arrival_time": 30.0}], "max_batch_size": 3, "max_wait_ms": 15.0}, "expect": [["a", "b", "c"], ["d"]], "hidden": True},
        ],
        "solution": BATCHER_SOL,
        "intuition": """
## GPU memory bandwidth vs batch size

LLM token decoding is memory-bandwidth bound: streaming billions of weights from VRAM to compute cores for a single token wastes over 95% of peak GPU FLOPS.

A **dynamic request batcher** accumulates incoming requests into a micro-batch. Processing 8 sequences together reuses the exact same weight reads across 8 tokens, increasing throughput by up to 6x while bounding user latency to `max_wait_ms`.
""",
    },
    {
        "id": "coding-retry-backoff-jitter",
        "title": "Exponential Backoff With Full Jitter",
        "difficulty": "medium",
        "fn": "calculate_backoff_delays",
        "signature": "calculate_backoff_delays(attempts: int, base_delay: float, max_delay: float, seed: int) -> list[float]",
        "starter": starter("calculate_backoff_delays(attempts: int, base_delay: float, max_delay: float, seed: int) -> list[float]"),
        "mission": "Calculate retry delays with exponential backoff and jitter to prevent thundering herds on rate-limited model endpoints.",
        "task": "Implement `calculate_backoff_delays(attempts, base_delay, max_delay, seed)`. For attempt i in [0, attempts - 1], ceiling is min(max_delay, base_delay * 2^i). Draw uniform random delay in [0.0, ceiling] using random.Random(seed + i).uniform(0.0, ceiling). Round each delay to 4 decimal places. Return list of delays. Raise ValueError if attempts < 0, base_delay <= 0, or max_delay < base_delay.",
        "constraints": ["Exponential growth: base_delay * 2^i capped at max_delay", "Full jitter: uniform(0, ceiling) with seed + i", "Round each delay to 4 decimals", "Raise ValueError on invalid arguments"],
        "hints": {"small": "Compute ceiling = min(max_delay, base_delay * (2 ** i)).", "strong": "Instantiate random.Random(seed + i) per attempt for reproducibility.", "concept": "Full jitter spreads retries evenly across time, preventing retry spikes from re-saturating services."},
        "tests": [
            {"label": "Three attempts with seed 42", "input": {"attempts": 3, "base_delay": 1.0, "max_delay": 10.0, "seed": 42}, "expect": [0.6394, 0.0771, 1.6341]},
            {"label": "Max delay capping enforced", "input": {"attempts": 4, "base_delay": 2.0, "max_delay": 5.0, "seed": 100}, "expect": [0.2913, 2.3246, 0.7409, 4.8953]},
            {"label": "Zero attempts returns empty list", "input": {"attempts": 0, "base_delay": 1.0, "max_delay": 5.0, "seed": 1}, "expect": []},
            {"label": "Invalid max_delay raises ValueError", "input": {"attempts": 2, "base_delay": 5.0, "max_delay": 2.0, "seed": 1}, "error": "ValueError"},
            {"label": "Long retry sequence reaches ceiling", "input": {"attempts": 5, "base_delay": 0.5, "max_delay": 4.0, "seed": 77}, "expect": [0.3996, 0.8145, 0.2907, 1.086, 2.0238], "hidden": True},
        ],
        "solution": BACKOFF_SOL,
        "intuition": """
## Thundering herds and why backoff alone fails

When an LLM endpoint returns HTTP 429 Too Many Requests, naive exponential backoff causes all clients to wait exactly 1s, then all retry simultaneously, causing another spike.

**Full Jitter (Amazon Architecture Blog, 2015)** replaces the deterministic delay with a uniform draw between 0 and the exponential ceiling. This completely desynchronizes clients and minimizes total completion time.
""",
    },
    {
        "id": "coding-semantic-cache",
        "title": "Semantic Vector Cache",
        "difficulty": "medium",
        "fn": "semantic_cache_lookup",
        "signature": "semantic_cache_lookup(query_vector: list[float], cache_entries: list[dict], threshold: float, current_time: float) -> dict | None",
        "starter": starter("semantic_cache_lookup(query_vector: list[float], cache_entries: list[dict], threshold: float, current_time: float) -> dict | None"),
        "mission": "Look up cached LLM responses by embedding similarity to eliminate duplicate API calls and cut latency.",
        "task": "Implement `semantic_cache_lookup(query_vector, cache_entries, threshold, current_time)`. Each entry has `{\"id\": str, \"vector\": list[float], \"response\": str, \"created_at\": float, \"ttl\": float}`. Ignore expired entries where `created_at + ttl <= current_time`. For non-expired entries, compute cosine similarity with `query_vector`. Return the match with highest similarity if it meets or exceeds `threshold` as `{\"id\": str, \"response\": str, \"similarity\": round(sim, 4)}`. If no valid entry meets the threshold, return `None`. Raise `ValueError` if `threshold` not in [-1.0, 1.0].",
        "constraints": ["Ignore expired entries (created_at + ttl <= current_time)", "Cosine similarity: dot(u, v) / (|u| * |v|)", "Return highest similarity match meeting threshold or None", "Round similarity to 4 decimal places", "Raise ValueError if threshold not in [-1.0, 1.0]"],
        "hints": {"small": "Compute vector norm with math.sqrt(sum(x * x for x in vec)).", "strong": "Skip entries with norm == 0 or expired TTL.", "concept": "Semantic caching serves semantically equivalent queries instantly with zero model inference cost."},
        "tests": [
            {"label": "Cache hit above threshold", "input": {"query_vector": [1.0, 0.0], "cache_entries": [{"id": "c1", "vector": [0.99, 0.01], "response": "Refund policy is 30 days.", "created_at": 100.0, "ttl": 300.0}], "threshold": 0.95, "current_time": 200.0}, "expect": {"id": "c1", "response": "Refund policy is 30 days.", "similarity": 0.9999}},
            {"label": "Expired entry is ignored", "input": {"query_vector": [1.0, 0.0], "cache_entries": [{"id": "c1", "vector": [1.0, 0.0], "response": "Old answer", "created_at": 10.0, "ttl": 50.0}], "threshold": 0.9, "current_time": 100.0}, "expect": None},
            {"label": "Below threshold returns None", "input": {"query_vector": [1.0, 0.0], "cache_entries": [{"id": "c1", "vector": [0.0, 1.0], "response": "Unrelated answer", "created_at": 10.0, "ttl": 500.0}], "threshold": 0.8, "current_time": 20.0}, "expect": None},
            {"label": "Invalid threshold raises ValueError", "input": {"query_vector": [1.0], "cache_entries": [], "threshold": 1.5, "current_time": 0.0}, "error": "ValueError"},
            {"label": "Multiple entries selects highest similarity", "input": {"query_vector": [1.0, 1.0], "cache_entries": [{"id": "e1", "vector": [1.0, 0.0], "response": "Partial match", "created_at": 0.0, "ttl": 100.0}, {"id": "e2", "vector": [0.9, 0.9], "response": "Best match", "created_at": 0.0, "ttl": 100.0}], "threshold": 0.7, "current_time": 10.0}, "expect": {"id": "e2", "response": "Best match", "similarity": 1.0}, "hidden": True},
        ],
        "solution": SEMANTIC_CACHE_SOL,
        "intuition": """
## Semantic vs exact string caching

Exact string caching fails on LLM prompts because minor variations (\"How do I cancel?\" vs \"How to cancel subscription\") have different MD5 hashes.

A **semantic cache** stores the query embedding alongside the generated response. Incoming queries compute cosine similarity against non-expired entries in VRAM, returning sub-5ms responses for repeated intent without making an LLM API call.
""",
    },
    {
        "id": "coding-idempotent-tool",
        "title": "Idempotent Tool Call Wrapper",
        "difficulty": "medium",
        "fn": "execute_idempotent_tool_calls",
        "signature": "execute_idempotent_tool_calls(calls: list[dict]) -> list[dict]",
        "starter": starter("execute_idempotent_tool_calls(calls: list[dict]) -> list[dict]"),
        "mission": "Wrap state-mutating agent actions with idempotency keys to prevent duplicate execution during retries.",
        "task": "Implement `execute_idempotent_tool_calls(calls)`. Each call has `{\"idempotency_key\": str, \"tool\": str, \"params\": dict}`. For new keys, execute call (`{\"tool\": tool, \"result\": f\"{tool}_success\", \"call_count\": 1}`) and record `{\"status\": \"executed\", \"key\": key, \"result\": result}`. For previously seen keys with matching params, return `{\"status\": \"cached\", \"key\": key, \"result\": stored_result}` without re-executing. If params differ from original call, return `{\"status\": \"conflict\", \"key\": key, \"error\": \"Idempotency key reused with different parameters\"}`. Raise `ValueError` if idempotency_key or tool is missing.",
        "constraints": ["New key executes once and caches result", "Same key and same params returns cached result", "Same key with different params returns conflict status", "Raise ValueError if idempotency_key or tool is missing"],
        "hints": {"small": "Serialize params deterministically with json.dumps(params, sort_keys=True).", "strong": "Store both the serialized params and the executed result in a registry dict.", "concept": "Idempotency keys prevent double charges and duplicate tickets when agent loops retry transient failures."},
        "tests": [
            {"label": "Single tool execution", "input": {"calls": [{"idempotency_key": "k1", "tool": "refund", "params": {"order_id": 101}}]}, "expect": [{"status": "executed", "key": "k1", "result": {"tool": "refund", "result": "refund_success", "call_count": 1}}]},
            {"label": "Retry with same key returns cached", "input": {"calls": [{"idempotency_key": "k1", "tool": "charge", "params": {"amount": 50}}, {"idempotency_key": "k1", "tool": "charge", "params": {"amount": 50}}]}, "expect": [{"status": "executed", "key": "k1", "result": {"tool": "charge", "result": "charge_success", "call_count": 1}}, {"status": "cached", "key": "k1", "result": {"tool": "charge", "result": "charge_success", "call_count": 1}}]},
            {"label": "Parameter conflict on reused key", "input": {"calls": [{"idempotency_key": "k1", "tool": "charge", "params": {"amount": 50}}, {"idempotency_key": "k1", "tool": "charge", "params": {"amount": 999}}]}, "expect": [{"status": "executed", "key": "k1", "result": {"tool": "charge", "result": "charge_success", "call_count": 1}}, {"status": "conflict", "key": "k1", "error": "Idempotency key reused with different parameters"}]},
            {"label": "Missing tool raises ValueError", "input": {"calls": [{"idempotency_key": "k1"}]}, "error": "ValueError"},
            {"label": "Interleaved calls across multiple keys", "input": {"calls": [{"idempotency_key": "k1", "tool": "book_hotel", "params": {"room": 10}}, {"idempotency_key": "k2", "tool": "book_flight", "params": {"seat": "1A"}}, {"idempotency_key": "k1", "tool": "book_hotel", "params": {"room": 10}}]}, "expect": [{"status": "executed", "key": "k1", "result": {"tool": "book_hotel", "result": "book_hotel_success", "call_count": 1}}, {"status": "executed", "key": "k2", "result": {"tool": "book_flight", "result": "book_flight_success", "call_count": 1}}, {"status": "cached", "key": "k1", "result": {"tool": "book_hotel", "result": "book_hotel_success", "call_count": 1}}], "hidden": True},
        ],
        "solution": IDEMPOTENT_TOOL_SOL,
        "intuition": """
## Preventing the duplicate refund nightmare

When an autonomous agent calls an external API (Stripe, Zendesk, Salesforce) and experiences a 504 Gateway Timeout, the agent cannot know whether the action succeeded before the network dropped.

If the agent simply retries, a customer might be refunded twice. **Idempotency keys** (RFC 9440) guarantee that repeated dispatches with the same key execute exactly once, returning the cached response safely.
""",
    },
]
