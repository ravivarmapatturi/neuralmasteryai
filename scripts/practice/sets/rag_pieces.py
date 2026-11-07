SET = {
    "title": "RAG Pieces",
    "learn": {"title": "Retrieval-augmented generation", "route": "/docs/llms-genai/rag", "description": "Indexing, retrieval, ranking and grounding, and where each stage fails."},
}


def starter(sig):
    return f"def {sig}:\n    # Your code here\n    pass\n"


TERMS = '''
import re

STOPWORDS = {"a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "is", "it", "of", "on", "or", "the", "to", "was", "with"}

def terms(text):
    words = re.findall(r"[a-z0-9]+", text.lower())
    return [w for w in words if w not in STOPWORDS]
'''

PROBLEMS = [
    {
        "id": "rag-normalize-terms",
        "title": "Normalise Text Into Search Terms",
        "difficulty": "easy",
        "fn": "terms",
        "signature": "terms(text: str) -> list[str]",
        "starter": "STOPWORDS = {\"a\", \"an\", \"and\", \"are\", \"as\", \"at\", \"be\", \"by\", \"for\", \"from\", \"in\", \"is\", \"it\", \"of\", \"on\", \"or\", \"the\", \"to\", \"was\", \"with\"}\n\n" + starter("terms(text)"),
        "mission": "Turn raw text into the terms a keyword index stores, so that 'Refund', 'refund,' and 'REFUND' all match the same query.",
        "task": "Implement `terms(text)`. Lower-case the text, extract runs of ASCII letters and digits (everything else separates terms), and drop any term in the provided `STOPWORDS` set. Return the remaining terms in order, keeping duplicates.",
        "constraints": ["Lower-case before matching.", "Only [a-z0-9] runs are terms: punctuation, hyphens and spaces split them.", "Keep duplicates and order: term frequency matters for scoring."],
        "hints": {"small": "re.findall(r\"[a-z0-9]+\", text.lower()) does the splitting.", "strong": "Filter with a list comprehension against STOPWORDS.", "concept": "The same function must run on documents at index time and on queries at search time."},
        "tests": [
            {"label": "Case and punctuation", "input": {"text": "Refund POLICY: refunds, refund!"}, "expect": ["refund", "policy", "refunds", "refund"]},
            {"label": "Stopwords removed", "input": {"text": "What is the status of the order?"}, "expect": ["what", "status", "order"]},
            {"label": "Hyphens and digits", "input": {"text": "GPT-4o and v2.1 release"}, "expect": ["gpt", "4o", "v2", "1", "release"]},
            {"label": "Only stopwords", "input": {"text": "and the of"}, "expect": []},
            {"label": "Support ticket", "input": {"text": "Can't log in: error 401 on the /login page (Chrome 120)"}, "hidden": True},
        ],
        "solution": TERMS,
        "intuition": """
## Matching starts before search

A keyword index can only match strings that are identical. "Refund", "refund," and "REFUND" are three different strings until something normalises them. So every keyword pipeline runs the same small function over each document when it is indexed and over each query when it is searched.

This one lower-cases, splits on anything that is not a letter or digit, and drops **stopwords**, very common words like "the" and "of" that appear in nearly every document and so tell you nothing about which document is relevant.

## Index and query must agree

If documents are indexed with this function and queries are not, "Refund?" never matches. The function also makes choices that cost recall: "refunds" and "refund" stay different terms, and "GPT-4o" becomes `gpt` and `4o`. Production systems add stemming or a domain-specific tokenizer; whatever they choose, both sides run the same code.

> **Remember:** one normalisation function, applied identically to documents and queries.
""",
    },
    {
        "id": "rag-bm25",
        "title": "BM25 Scoring",
        "difficulty": "medium",
        "fn": "bm25_scores",
        "signature": "bm25_scores(query: list[str], docs: list[list[str]], k1: float = 1.5, b: float = 0.75) -> list[float]",
        "starter": starter("bm25_scores(query, docs, k1=1.5, b=0.75)"),
        "mission": "Score documents against a keyword query with BM25, the ranking function that is still the baseline every dense retriever is compared against.",
        "task": "Implement `bm25_scores(query, docs, k1=1.5, b=0.75)`. Both query and docs are already lists of terms. With N docs, average length avgdl, and df(t) = number of docs containing t: idf(t) = ln((N - df + 0.5) / (df + 0.5) + 1). A document's score is the sum over query terms t of `idf(t) * f * (k1 + 1) / (f + k1 * (1 - b + b * len(doc) / avgdl))`, where f is t's count in the doc. Return one score per doc. Raise `ValueError` if docs is empty.",
        "constraints": ["Use the +1 inside the log so idf is never negative.", "A repeated query term counts once per occurrence in the query.", "Documents with none of the terms score 0."],
        "hints": {"small": "Precompute df for each query term and avgdl once.", "strong": "Counter(doc) gives term frequencies for one document.", "concept": "k1 caps how much repeating a term helps; b controls how much long documents are penalised."},
        "tests": [
            {"label": "Rare term outweighs common term", "input": {"query": ["refund", "order"], "docs": [["order", "shipped"], ["refund", "issued", "order"], ["order", "order", "status"]]}},
            {"label": "No matching terms", "input": {"query": ["xyz"], "docs": [["a", "b"], ["c"]]}, "expect": [0, 0]},
            {"label": "Saturation: ten repeats are not ten times better", "input": {"query": ["gpu"], "docs": [["gpu", "x", "x", "x", "x", "x", "x", "x", "x", "x"], ["gpu", "gpu", "gpu", "gpu", "gpu", "gpu", "gpu", "gpu", "gpu", "gpu"], ["cpu"]]}},
            {"label": "Empty corpus", "input": {"query": ["a"], "docs": []}, "error": "ValueError"},
            {"label": "Length normalisation", "input": {"query": ["kv", "cache"], "docs": [["kv", "cache"], ["kv", "cache", "paged", "attention", "memory", "blocks", "eviction", "policy"], ["attention", "heads"], ["cache", "hit", "rate"]]}, "hidden": True},
        ],
        "solution": '''
import math
from collections import Counter

def bm25_scores(query, docs, k1=1.5, b=0.75):
    if not docs:
        raise ValueError("need at least one document")
    n = len(docs)
    avgdl = sum(len(d) for d in docs) / n
    df = {t: sum(1 for d in docs if t in d) for t in set(query)}
    idf = {t: math.log((n - df[t] + 0.5) / (df[t] + 0.5) + 1) for t in df}
    scores = []
    for doc in docs:
        tf = Counter(doc)
        norm = k1 * (1 - b + b * len(doc) / avgdl)
        scores.append(sum(idf[t] * tf[t] * (k1 + 1) / (tf[t] + norm) for t in query if tf[t]))
    return scores
''',
        "intuition": """
## Three ideas in one formula

**BM25** (Robertson and Zaragoza, 2009) ranks documents for a keyword query and still beats many neural retrievers on out-of-domain search (Thakur et al., 2021, BEIR). It combines three intuitions.

**Rare terms matter more.** `order` appears in all three documents of the first test, so it says little; `refund` appears in one, so it says a lot. The **inverse document frequency** `idf` encodes this.

**Repetition helps, with diminishing returns.** A document that says "gpu" ten times is more about GPUs than one that says it once, but not ten times more. The `f * (k1 + 1) / (f + k1 * ...)` term rises quickly and then flattens towards `k1 + 1`. Compare the two GPU documents in the third test.

**Long documents are not automatically better.** A long document contains more terms by chance, so `b` scales the saturation by document length relative to the average.

## Why RAG systems still use it

Dense embeddings blur exact identifiers: an error code, a product SKU, a function name. BM25 matches them exactly. That is why hybrid retrieval, BM25 plus embeddings, is the default in many production RAG systems.

> **Remember:** BM25 = idf times saturated, length-normalised term frequency, summed over query terms.
""",
    },
    {
        "id": "rag-near-duplicates",
        "title": "Drop Near-Duplicate Chunks",
        "difficulty": "medium",
        "fn": "dedupe_chunks",
        "signature": "dedupe_chunks(chunks: list[str], threshold: float, shingle: int = 3) -> list[int]",
        "starter": starter("dedupe_chunks(chunks, threshold, shingle=3)"),
        "mission": "Remove chunks that are nearly identical to an earlier chunk before indexing, so the same paragraph copied across ten pages does not fill all ten retrieval slots.",
        "task": "Implement `dedupe_chunks(chunks, threshold, shingle=3)`. Represent each chunk by its set of word shingles: every run of `shingle` consecutive lower-cased words (a chunk with fewer words is one shingle of all its words). Walk the chunks in order and keep a chunk only if its Jaccard similarity with every already kept chunk is below `threshold`. Return the indices of the kept chunks.",
        "constraints": ["Jaccard = |A intersect B| / |A union B|.", "Earlier chunks win: a duplicate of a kept chunk is dropped.", "Compare only against kept chunks."],
        "hints": {"small": "words = text.lower().split(); shingles = {tuple(words[i:i + k]) for i in range(len(words) - k + 1)}.", "strong": "Handle short chunks: if len(words) < k, use {tuple(words)}.", "concept": "Shingles capture word order, so two chunks with the same words in a different order are not duplicates."},
        "tests": [
            {"label": "Exact copy dropped", "input": {"chunks": ["reset your password from the login page", "reset your password from the login page", "contact support for billing"], "threshold": 0.8}, "expect": [0, 2]},
            {"label": "Boilerplate footer variant", "input": {"chunks": ["the api returns json with a status field and a data field", "the api returns json with a status field and a data field today", "rate limits apply per api key"], "threshold": 0.7}, "expect": [0, 2]},
            {"label": "Same words, different order are kept", "input": {"chunks": ["a b c d e", "e d c b a"], "threshold": 0.5}, "expect": [0, 1]},
            {"label": "Short chunks", "input": {"chunks": ["hi", "hi", "hello there"], "threshold": 0.9}, "hidden": True},
        ],
        "solution": '''
def dedupe_chunks(chunks, threshold, shingle=3):
    def shingles(text):
        words = text.lower().split()
        if len(words) < shingle:
            return {tuple(words)}
        return {tuple(words[i:i + shingle]) for i in range(len(words) - shingle + 1)}

    kept, kept_sets = [], []
    for i, text in enumerate(chunks):
        s = shingles(text)
        if all(len(s & k) / len(s | k) < threshold for k in kept_sets):
            kept.append(i)
            kept_sets.append(s)
    return kept
''',
        "intuition": """
## Duplicates crowd out answers

Company wikis, docs sites and ticket exports repeat themselves: the same disclaimer on every page, the same setup steps copied into five guides. Index them all and a query about setup returns five copies of the same paragraph in its top five, and the one chunk with the actual answer falls to sixth.

**Shingling** turns a chunk into the set of its consecutive 3-word runs. Two chunks that share most of their shingles share most of their wording, in order. **Jaccard similarity** (shared shingles over total distinct shingles) gives a score from 0 to 1. The second test's two API sentences differ by one trailing word: they share 10 of 11 distinct shingles, a Jaccard score of 0.91, above the 0.7 threshold.

## Scaling up

Comparing every chunk with every kept chunk is quadratic, fine for thousands of chunks and too slow for millions. **MinHash** with locality-sensitive hashing estimates Jaccard from short signatures and finds candidate pairs without comparing everything; deduplication of large training corpora uses this approach.

> **Remember:** shingle, compare with Jaccard, keep the first copy. Deduplicate before indexing, not after retrieval.
""",
    },
    {
        "id": "rag-hybrid-fusion",
        "title": "Hybrid Retrieval With Score Normalisation",
        "difficulty": "hard",
        "fn": "hybrid_top_k",
        "signature": "hybrid_top_k(bm25: dict[str, float], dense: dict[str, float], alpha: float, k: int) -> list[list]",
        "starter": starter("hybrid_top_k(bm25, dense, alpha, k)"),
        "mission": "Combine keyword and embedding scores that live on different scales: normalise each to [0, 1], blend them, and return the top k.",
        "task": "Implement `hybrid_top_k(bm25, dense, alpha, k)`. Each dict maps chunk id to a score from one retriever (a chunk may be missing from either). Min-max normalise each dict separately to [0, 1]; if all of a dict's scores are equal, they all normalise to 1.0. A chunk missing from a retriever gets 0 for it. The fused score is `alpha * dense_norm + (1 - alpha) * bm25_norm`. Return the top k as `[id, fused]` pairs sorted by fused score descending, ties by id ascending. Raise `ValueError` if alpha is outside [0, 1].",
        "constraints": ["Normalise each retriever separately, before blending.", "Equal scores normalise to 1.0, not 0/0.", "Missing from a retriever means 0 for that retriever."],
        "hints": {"small": "norm(d) = {k: (v - lo) / (hi - lo)} with lo, hi = min and max of d's values.", "strong": "Union the ids from both dicts, then fuse with .get(id, 0.0).", "concept": "BM25 scores can be 0 to 30 while cosine scores sit in 0.2 to 0.9; blending raw values lets BM25 decide everything."},
        "tests": [
            {"label": "Raw scales would let BM25 win", "input": {"bm25": {"a": 25, "b": 20, "c": 1}, "dense": {"a": 0.21, "b": 0.6, "c": 0.9}, "alpha": 0.5, "k": 3}},
            {"label": "alpha 1 is dense only", "input": {"bm25": {"a": 9}, "dense": {"a": 0.1, "b": 0.5}, "alpha": 1, "k": 2}, "expect": [["b", 1], ["a", 0]]},
            {"label": "Equal scores normalise to 1", "input": {"bm25": {"x": 3, "y": 3}, "dense": {}, "alpha": 0.3, "k": 2}, "expect": [["x", 0.7], ["y", 0.7]]},
            {"label": "Bad alpha", "input": {"bm25": {}, "dense": {}, "alpha": 1.5, "k": 1}, "error": "ValueError"},
            {"label": "Partial overlap", "input": {"bm25": {"c1": 12.4, "c2": 3.1, "c4": 7.7}, "dense": {"c2": 0.82, "c3": 0.79, "c4": 0.41, "c5": 0.4}, "alpha": 0.6, "k": 4}, "hidden": True},
        ],
        "solution": '''
def hybrid_top_k(bm25, dense, alpha, k):
    if not 0 <= alpha <= 1:
        raise ValueError("alpha must be in [0, 1]")

    def norm(scores):
        if not scores:
            return {}
        lo, hi = min(scores.values()), max(scores.values())
        if hi == lo:
            return {key: 1.0 for key in scores}
        return {key: (v - lo) / (hi - lo) for key, v in scores.items()}

    b, d = norm(bm25), norm(dense)
    fused = {i: alpha * d.get(i, 0.0) + (1 - alpha) * b.get(i, 0.0) for i in set(b) | set(d)}
    ranked = sorted(fused.items(), key=lambda kv: (-kv[1], kv[0]))
    return [[i, s] for i, s in ranked[:k]]
''',
        "intuition": """
## Two retrievers, two rulers

Hybrid retrieval runs BM25 and a dense retriever and merges their lists. The obvious merge, adding the scores, fails quietly: BM25 scores here run from 1 to 25 while cosine similarities sit between 0.2 and 0.9. Added raw, the dense score barely changes the order, and you have built an expensive BM25.

**Min-max normalisation** maps each retriever's scores onto [0, 1] before blending: the best chunk from each retriever becomes 1.0 and the worst becomes 0. `alpha` then means what it says, the weight on dense retrieval.

## Edge cases that reach production

A retriever that returns one result, or several with identical scores, has `max == min` and a division by zero. Treating them all as 1.0 keeps them. A chunk returned by only one retriever gets 0 from the other, which is a choice: it rewards agreement. **Reciprocal rank fusion** sidesteps score scales by using ranks instead; it is in the RAG and Retrieval track.

> **Remember:** never add raw scores from different retrievers. Normalise each one, then blend.
""",
    },
    {
        "id": "rag-assemble-context",
        "title": "Assemble Context From Retrieved Chunks",
        "difficulty": "medium",
        "fn": "assemble_context",
        "signature": "assemble_context(chunks: list[dict], max_tokens: int) -> list[dict]",
        "starter": starter("assemble_context(chunks, max_tokens)"),
        "mission": "Turn a ranked list of chunks into a prompt-ready context: keep the best within a token budget, then restore document order and merge neighbouring chunks so the model reads whole passages.",
        "task": "Implement `assemble_context(chunks, max_tokens)`. Each chunk is `{\"doc\": str, \"pos\": int, \"text\": str, \"tokens\": int, \"score\": float}`. Select greedily by score descending (ties by doc, then pos), skipping any chunk that would push the token total over `max_tokens`. Then sort the selected chunks by (doc, pos) and merge chunks of the same doc with consecutive positions into one passage: texts joined with a single space, tokens summed. Return passages as `{\"doc\", \"start\", \"end\", \"text\", \"tokens\"}` in that order.",
        "constraints": ["Selection is by score; output order is by document position.", "Skip a chunk that does not fit and keep trying smaller ones.", "Only merge the same doc with pos exactly one apart."],
        "hints": {"small": "Two phases: choose, then order and merge.", "strong": "When merging, extend the last passage if doc matches and pos == last['end'] + 1.", "concept": "Models answer better from contiguous text than from fragments in score order."},
        "tests": [
            {"label": "Neighbours merge in reading order", "input": {"chunks": [{"doc": "a", "pos": 2, "text": "C", "tokens": 10, "score": 0.9}, {"doc": "a", "pos": 1, "text": "B", "tokens": 10, "score": 0.8}, {"doc": "b", "pos": 0, "text": "X", "tokens": 10, "score": 0.7}], "max_tokens": 100}, "expect": [{"doc": "a", "start": 1, "end": 2, "text": "B C", "tokens": 20}, {"doc": "b", "start": 0, "end": 0, "text": "X", "tokens": 10}]},
            {"label": "Budget skips a big chunk", "input": {"chunks": [{"doc": "a", "pos": 0, "text": "big", "tokens": 90, "score": 0.6}, {"doc": "a", "pos": 5, "text": "s1", "tokens": 30, "score": 0.8}, {"doc": "c", "pos": 1, "text": "s2", "tokens": 30, "score": 0.5}], "max_tokens": 100}},
            {"label": "Gap prevents merging", "input": {"chunks": [{"doc": "a", "pos": 1, "text": "one", "tokens": 5, "score": 0.5}, {"doc": "a", "pos": 3, "text": "three", "tokens": 5, "score": 0.6}], "max_tokens": 50}},
            {"label": "Mixed documents", "input": {"chunks": [{"doc": "faq", "pos": 4, "text": "Refunds take 5 days.", "tokens": 6, "score": 0.91}, {"doc": "policy", "pos": 0, "text": "Policy v2.", "tokens": 4, "score": 0.42}, {"doc": "faq", "pos": 3, "text": "Request a refund in Settings.", "tokens": 8, "score": 0.88}, {"doc": "faq", "pos": 5, "text": "Contact support if late.", "tokens": 6, "score": 0.6}, {"doc": "blog", "pos": 9, "text": "Long unrelated post.", "tokens": 40, "score": 0.3}], "max_tokens": 25}, "hidden": True},
        ],
        "solution": '''
def assemble_context(chunks, max_tokens):
    chosen, used = [], 0
    for c in sorted(chunks, key=lambda c: (-c["score"], c["doc"], c["pos"])):
        if used + c["tokens"] <= max_tokens:
            chosen.append(c)
            used += c["tokens"]
    passages = []
    for c in sorted(chosen, key=lambda c: (c["doc"], c["pos"])):
        last = passages[-1] if passages else None
        if last and last["doc"] == c["doc"] and c["pos"] == last["end"] + 1:
            last["end"] = c["pos"]
            last["text"] += " " + c["text"]
            last["tokens"] += c["tokens"]
        else:
            passages.append({"doc": c["doc"], "start": c["pos"], "end": c["pos"], "text": c["text"], "tokens": c["tokens"]})
    return passages
''',
        "intuition": """
## Score order is not reading order

A retriever returns chunks by score. Chunk 2 of the FAQ might score highest and chunk 1, the sentence that sets it up, second. Pasted into the prompt in that order, the model reads the answer before its premise, and possibly with an unrelated chunk in between.

Context assembly runs in two phases. **Select** by score until the token budget is spent, skipping any chunk that does not fit (a smaller, lower-scored chunk might). Then **order** the selection by document and position, and **merge** chunks that were adjacent in the source back into one passage.

## Why merging helps

Chunk boundaries are arbitrary: a 300-token splitter cuts mid-paragraph. Merging adjacent chunks restores the passage the author wrote, so a sentence like "This applies only to annual plans" stays attached to the policy it qualifies. Liu et al. (2023) also found that models use information at the start and end of a long context more reliably than information in the middle, which is one more reason to keep the context short and coherent.

> **Remember:** select by score within the budget, then present in source order with neighbours merged.
""",
    },
    {
        "id": "rag-check-citations",
        "title": "Check an Answer's Citations",
        "difficulty": "medium",
        "fn": "check_citations",
        "signature": "check_citations(answer: str, sources: list[str]) -> dict",
        "starter": starter("check_citations(answer, sources)"),
        "mission": "Before showing a RAG answer, verify that every citation marker points at a real source and that every sentence carries one.",
        "task": "Implement `check_citations(answer, sources)`. Sources are numbered from 1, in order. Citation markers look like `[2]` or `[1, 3]`. Split the answer into sentences at `.`, `!` or `?` followed by whitespace or the end. Return `{\"cited\": sorted list of valid source numbers used, \"invalid\": sorted list of cited numbers with no source, \"uncited_sentences\": 0-based indices of sentences with no marker}`.",
        "constraints": ["Markers may hold several comma-separated numbers.", "A number is valid if 1 <= n <= len(sources).", "Empty fragments after splitting are not sentences."],
        "hints": {"small": "re.findall(r\"\\[(\\d+(?:\\s*,\\s*\\d+)*)\\]\", sentence) finds the marker contents.", "strong": "Split sentences with re.split(r\"(?<=[.!?])\\s+\", answer.strip()).", "concept": "An invalid citation is a sign the model invented a source; an uncited sentence may be unsupported."},
        "tests": [
            {"label": "All good", "input": {"answer": "Refunds take 5 days [1]. Annual plans are excluded [2].", "sources": ["faq", "terms"]}, "expect": {"cited": [1, 2], "invalid": [], "uncited_sentences": []}},
            {"label": "Invented source", "input": {"answer": "Refunds are instant [3].", "sources": ["faq", "terms"]}, "expect": {"cited": [], "invalid": [3], "uncited_sentences": []}},
            {"label": "Uncited claim and a multi-citation", "input": {"answer": "Plans renew yearly [1, 2]. Support is open 24/7. Is that all? Yes [2].", "sources": ["a", "b"]}, "expect": {"cited": [1, 2], "invalid": [], "uncited_sentences": [1, 2]}},
            {"label": "Mixed problems", "input": {"answer": "GPUs are rented hourly [2, 5]. Spot prices change [1]! Reserved discounts reach 60%. Ask sales [0].", "sources": ["pricing", "faq", "blog"]}, "hidden": True},
        ],
        "solution": '''
import re

def check_citations(answer, sources):
    sentences = [s for s in re.split(r"(?<=[.!?])\\s+", answer.strip()) if s.strip()]
    cited, invalid, uncited = set(), set(), []
    for i, sentence in enumerate(sentences):
        markers = re.findall(r"\\[(\\d+(?:\\s*,\\s*\\d+)*)\\]", sentence)
        if not markers:
            uncited.append(i)
        for group in markers:
            for num in (int(x) for x in group.split(",")):
                (cited if 1 <= num <= len(sources) else invalid).add(num)
    return {"cited": sorted(cited), "invalid": sorted(invalid), "uncited_sentences": uncited}
''',
        "intuition": """
## Citations are claims too

A RAG system that shows `[3]` next to a sentence is telling the user "source 3 says this". If only two sources were retrieved, the model invented that reference, and a reader who trusts the bracket has been misled. Checking citations mechanically before display is cheap and catches this every time.

This check answers two questions. **Is every citation real?** Any number outside 1 to the number of sources is invalid. **Is every sentence cited?** A sentence with no marker is either common knowledge, a transition ("Is that all?"), or an unsupported claim. The check cannot tell which, but it can point a reviewer, or a stricter second pass, at exactly those sentences.

## What it does not check

A valid number does not mean the source supports the sentence. That needs a grounding check, comparing the sentence with the cited text, which is in the RAG and Retrieval track. The two checks together catch the most common RAG failures before a user sees them.

> **Remember:** parse markers, validate numbers against the source list, and flag uncited sentences.
""",
    },
]
