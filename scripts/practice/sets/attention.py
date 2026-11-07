SET = {
    "title": "Attention From Scratch",
    "learn": {"title": "Attention and transformers", "route": "/docs/deep-learning/attention-transformers", "description": "Queries, keys, values, masking and multi-head attention, derived step by step."},
}


def starter(sig):
    return f"import numpy as np\n\ndef {sig}:\n    # Your code here\n    pass\n"


SOFTMAX = '''
def softmax(x, axis=-1):
    x = x - x.max(axis=axis, keepdims=True)   # subtract the max: exp never overflows
    e = np.exp(x)
    return e / e.sum(axis=axis, keepdims=True)
'''

PROBLEMS = [
    {
        "id": "attn-scaled-dot-product",
        "title": "Scaled Dot-Product Attention",
        "difficulty": "easy",
        "numpy": True,
        "fn": "attention",
        "signature": "attention(Q: list[list[float]], K: list[list[float]], V: list[list[float]]) -> list[list[float]]",
        "starter": starter("attention(Q, K, V)"),
        "mission": "Write the formula at the centre of every transformer, softmax(Q K^T / sqrt(d)) V, for one head and no mask.",
        "task": "Implement `attention(Q, K, V)`. Q is (n, d), K is (m, d), V is (m, d_v). Compute scores `Q @ K.T / sqrt(d)`, apply a numerically stable softmax over each row, and return `weights @ V` as an (n, d_v) list.",
        "constraints": ["Divide by sqrt(d), where d is the key dimension.", "Softmax over the key axis (each row of scores sums to 1).", "Subtract the row max before exp."],
        "hints": {"small": "Scores have shape (n, m): one score per query-key pair.", "strong": "w = softmax(Q @ K.T / np.sqrt(d)); return (w @ V).tolist().", "concept": "Without the sqrt(d) scale, dot products grow with d and the softmax saturates to one-hot."},
        "tests": [
            {"label": "One query matches one key", "input": {"Q": [[10, 0]], "K": [[10, 0], [0, 10]], "V": [[1, 0], [0, 1]]}},
            {"label": "Equal scores average the values", "input": {"Q": [[0, 0]], "K": [[1, 2], [3, 4]], "V": [[2, 4], [6, 8]]}, "expect": [[4, 6]]},
            {"label": "Two queries, three keys", "input": {"Q": [[1, 0], [0, 1]], "K": [[1, 0], [0, 1], [1, 1]], "V": [[1], [2], [3]]}},
            {"label": "Large scores stay finite", "input": {"Q": [[100, 100]], "K": [[100, 100], [-100, 100]], "V": [[1, 1], [5, 5]]}, "hidden": True},
        ],
        "solution": "import numpy as np\n" + SOFTMAX + '''
def attention(Q, K, V):
    Q, K, V = (np.asarray(m, dtype=float) for m in (Q, K, V))
    d = K.shape[1]
    weights = softmax(Q @ K.T / np.sqrt(d))   # (n, m), rows sum to 1
    return (weights @ V).tolist()
''',
        "intuition": """
## A soft lookup table

Attention is a lookup where every key matches a little. Each **query** is compared with every **key** by a dot product, the scores are turned into weights with softmax, and the output is the weighted average of the **values**. With `Q = [[0, 0]]` every score is 0, the weights are equal, and the output is the plain mean of the values.

## Why divide by sqrt(d)

If query and key entries have variance 1, their dot product over `d` dimensions has variance `d`. At `d = 128` scores of size 30 are common, and softmax of such scores is almost exactly one-hot: gradients through the other keys vanish. Dividing by `sqrt(d)` brings the variance back to 1 (Vaswani et al., 2017).

## Why subtract the max

`exp(100 * 100 / sqrt(2))` overflows to infinity, and `inf / inf` is NaN. Softmax is unchanged when you subtract the same number from every score, so subtracting the row maximum keeps every exponent at or below 0.

> **Remember:** scores, scale, stable softmax, weighted sum of values.
""",
    },
    {
        "id": "attn-masked",
        "title": "Masked Attention Without NaNs",
        "difficulty": "medium",
        "numpy": True,
        "fn": "masked_attention",
        "signature": "masked_attention(Q: list[list[float]], K: list[list[float]], V: list[list[float]], mask: list[list[bool]]) -> list[list[float]]",
        "starter": starter("masked_attention(Q, K, V, mask)"),
        "mission": "Add a mask so queries can only attend to allowed keys, and handle the row where nothing is allowed without producing NaN.",
        "task": "Implement `masked_attention(Q, K, V, mask)`. `mask` is (n, m) with `True` where query i may attend to key j. Disallowed scores must get zero weight. A query row whose mask is all `False` returns a row of zeros. Otherwise behave like scaled dot-product attention.",
        "constraints": ["Masked keys get exactly zero weight.", "An all-False row returns zeros, never NaN.", "Do not mutate the inputs."],
        "hints": {"small": "Set masked scores to -inf with np.where(mask, scores, -np.inf) before softmax.", "strong": "A row of all -inf gives max = -inf and exp(nan). Find those rows first and handle them separately.", "concept": "Padding masks and causal masks are both just boolean matrices applied here."},
        "tests": [
            {"label": "Causal mask on two tokens", "input": {"Q": [[1, 0], [0, 1]], "K": [[1, 0], [0, 1]], "V": [[1, 1], [3, 5]], "mask": [[True, False], [True, True]]}},
            {"label": "Masked key gets no weight", "input": {"Q": [[0, 0]], "K": [[1, 1], [2, 2], [3, 3]], "V": [[1], [100], [3]], "mask": [[True, False, True]]}, "expect": [[2]]},
            {"label": "Fully masked row is zeros", "input": {"Q": [[1, 1], [1, 1]], "K": [[1, 0]], "V": [[7, 7]], "mask": [[False], [True]]}, "expect": [[0, 0], [7, 7]]},
            {"label": "Padding mask on a batch row", "input": {"Q": [[1, 2], [2, 1], [0, 1]], "K": [[1, 0], [0, 1], [5, 5]], "V": [[1, 0], [0, 1], [9, 9]], "mask": [[True, True, False], [True, True, False], [True, True, False]]}, "hidden": True},
        ],
        "solution": "import numpy as np\n" + '''
def masked_attention(Q, K, V, mask):
    Q, K, V = (np.asarray(m, dtype=float) for m in (Q, K, V))
    mask = np.asarray(mask, dtype=bool)
    scores = np.where(mask, Q @ K.T / np.sqrt(K.shape[1]), -np.inf)
    empty = ~mask.any(axis=1)                 # rows with nothing to attend to
    scores[empty] = 0.0                       # any finite value; zeroed below
    scores = scores - scores.max(axis=1, keepdims=True)
    weights = np.exp(scores) * mask           # exp(-inf) = 0, mask keeps it exact
    weights = weights / np.where(empty, 1.0, weights.sum(axis=1))[:, None]
    return (weights @ V).tolist()
''',
        "intuition": """
## Two masks, one mechanism

A **causal mask** stops token 3 from attending to token 4, so a language model cannot read the answer it is predicting. A **padding mask** stops real tokens from attending to the filler that makes a batch rectangular. Both are a boolean matrix: `True` where attention is allowed.

The standard trick sets disallowed scores to `-inf`. After softmax, `exp(-inf) = 0`, so those keys get exactly zero weight and the remaining weights still sum to 1.

## The row that becomes NaN

You might expect a fully masked row to give zero weights. It gives NaN: the max of a row of `-inf` is `-inf`, `-inf - (-inf)` is NaN, and NaN spreads through the matrix multiply into every later layer. This happens in practice with left-padded batches and with cross-attention over an empty context. Detecting empty rows and returning zeros keeps the batch usable.

> **Remember:** mask with `-inf` before softmax, and decide explicitly what an empty row means.
""",
    },
    {
        "id": "attn-multi-head",
        "title": "Multi-Head Attention Forward Pass",
        "difficulty": "medium",
        "numpy": True,
        "fn": "multi_head_attention",
        "signature": "multi_head_attention(X: list[list[float]], Wq: list[list[float]], Wk: list[list[float]], Wv: list[list[float]], Wo: list[list[float]], num_heads: int) -> list[list[float]]",
        "starter": starter("multi_head_attention(X, Wq, Wk, Wv, Wo, num_heads)"),
        "mission": "Project the input into queries, keys and values, split them into heads that attend independently, then concatenate and project back.",
        "task": "Implement `multi_head_attention(X, Wq, Wk, Wv, Wo, num_heads)`. X is (n, d) and every W is (d, d). Compute Q = X Wq, K = X Wk, V = X Wv; split the last axis into `num_heads` heads of size d / num_heads; run scaled dot-product attention per head (scale by sqrt of the head size); concatenate the heads in order and return `concat @ Wo`. Raise `ValueError` if d is not divisible by `num_heads`.",
        "constraints": ["Scale by sqrt(d / num_heads), the head dimension, not sqrt(d).", "Head h uses columns h*dh to (h+1)*dh.", "No mask (self-attention over all tokens)."],
        "hints": {"small": "Reshape Q from (n, d) to (n, H, dh), then transpose to (H, n, dh).", "strong": "scores = Qh @ Kh.transpose(0, 2, 1) gives (H, n, n) in one batched matmul.", "concept": "Each head can attend to a different pattern because it sees a different slice of the projection."},
        "tests": [
            {"label": "One head equals plain attention", "input": {"X": [[1, 0], [0, 1]], "Wq": [[1, 0], [0, 1]], "Wk": [[1, 0], [0, 1]], "Wv": [[1, 0], [0, 1]], "Wo": [[1, 0], [0, 1]], "num_heads": 1}},
            {"label": "Two heads", "input": {"X": [[1, 0, 1, 0], [0, 2, 0, 1], [1, 1, 0, 0]], "Wq": [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]], "Wk": [[0, 1, 0, 0], [1, 0, 0, 0], [0, 0, 0, 1], [0, 0, 1, 0]], "Wv": [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]], "Wo": [[0.5, 0, 0, 0], [0, 0.5, 0, 0], [0, 0, 2, 0], [0, 0, 0, 2]], "num_heads": 2}},
            {"label": "Heads must divide d", "input": {"X": [[1, 2, 3]], "Wq": [[1, 0, 0], [0, 1, 0], [0, 0, 1]], "Wk": [[1, 0, 0], [0, 1, 0], [0, 0, 1]], "Wv": [[1, 0, 0], [0, 1, 0], [0, 0, 1]], "Wo": [[1, 0, 0], [0, 1, 0], [0, 0, 1]], "num_heads": 2}, "error": "ValueError"},
            {"label": "Four heads of size 1", "input": {"X": [[0.5, -1, 2, 0], [1, 1, -1, 0.5]], "Wq": [[1, 0, 0, 1], [0, 1, 1, 0], [1, 1, 0, 0], [0, 0, 1, 1]], "Wk": [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]], "Wv": [[0, 1, 0, 0], [1, 0, 0, 0], [0, 0, 0, 1], [0, 0, 1, 0]], "Wo": [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]], "num_heads": 4}, "hidden": True},
        ],
        "solution": "import numpy as np\n" + SOFTMAX + '''
def multi_head_attention(X, Wq, Wk, Wv, Wo, num_heads):
    X, Wq, Wk, Wv, Wo = (np.asarray(m, dtype=float) for m in (X, Wq, Wk, Wv, Wo))
    n, d = X.shape
    if d % num_heads:
        raise ValueError("d must be divisible by num_heads")
    dh = d // num_heads

    def heads(M):                      # (n, d) -> (H, n, dh)
        return M.reshape(n, num_heads, dh).transpose(1, 0, 2)

    Q, K, V = heads(X @ Wq), heads(X @ Wk), heads(X @ Wv)
    weights = softmax(Q @ K.transpose(0, 2, 1) / np.sqrt(dh))   # (H, n, n)
    out = (weights @ V).transpose(1, 0, 2).reshape(n, d)        # concat heads
    return (out @ Wo).tolist()
''',
        "intuition": """
## Several smaller attentions side by side

One attention head computes one weighted average per token, so it can follow one relationship at a time. **Multi-head attention** splits the `d` projected dimensions into `H` heads of size `d / H`, lets each head attend on its own, and concatenates the results. A model with `d = 768` and 12 heads runs 12 attentions of size 64 for about the same cost as one of size 768.

The work is all reshaping. `(n, d)` becomes `(n, H, dh)`, then `(H, n, dh)` so the head axis leads. One batched matmul gives every head's `(n, n)` score matrix at once. After the weighted sum, reverse the transpose and reshape back to `(n, d)` to concatenate.

## The scale uses the head size

Each head's dot products run over `dh` dimensions, not `d`, so the scale is `sqrt(dh)`. Using `sqrt(d)` makes every head's softmax too flat by a factor of `sqrt(H)` in the exponent.

> **Remember:** project, split into heads, attend per head with `sqrt(dh)`, concatenate, project with `Wo`.
""",
    },
    {
        "id": "attn-kv-cache-decode",
        "title": "Decode One Token With a KV Cache",
        "difficulty": "medium",
        "numpy": True,
        "fn": "decode_step",
        "signature": "decode_step(k_cache: list[list[float]], v_cache: list[list[float]], q: list[float], k: list[float], v: list[float]) -> dict",
        "starter": starter("decode_step(k_cache, v_cache, q, k, v)"),
        "mission": "Generate the next token's attention output by appending its key and value to a cache and attending over the cache, instead of recomputing attention for the whole sequence.",
        "task": "Implement `decode_step(k_cache, v_cache, q, k, v)`. The caches hold one key and one value per earlier token (they may be empty). Append `k` and `v`, then compute single-query attention of `q` over the whole updated cache. Return `{\"output\": [...], \"k_cache\": [...], \"v_cache\": [...]}` with the updated caches. Raise `ValueError` if `k` does not match the cached key size.",
        "constraints": ["The new token attends to itself and every cached token (causal by construction).", "Return the caches with the new entries appended.", "Work with an empty cache on the first step."],
        "hints": {"small": "Stack the cache and the new key into a (t, d) matrix; the query is a single (d,) vector.", "strong": "scores = K @ q / sqrt(d) has shape (t,). Softmax it and return weights @ V.", "concept": "With a cache, each step costs O(t) instead of O(t^2): the earlier keys and values are never recomputed."},
        "tests": [
            {"label": "First token attends only to itself", "input": {"k_cache": [], "v_cache": [], "q": [1, 0], "k": [1, 0], "v": [3, 4]}, "expect": {"output": [3, 4], "k_cache": [[1, 0]], "v_cache": [[3, 4]]}},
            {"label": "Third token", "input": {"k_cache": [[1, 0], [0, 1]], "v_cache": [[1, 0], [0, 1]], "q": [0, 2], "k": [1, 1], "v": [5, 5]}},
            {"label": "Key size mismatch", "input": {"k_cache": [[1, 0]], "v_cache": [[1, 1]], "q": [1, 0], "k": [1, 0, 0], "v": [1, 1]}, "error": "ValueError"},
            {"label": "Long cache", "input": {"k_cache": [[0.1, 0.2, 0.3], [1, 0, -1], [0, 0, 1], [2, 1, 0]], "v_cache": [[1], [2], [3], [4]], "q": [1, -1, 0.5], "k": [0, 1, 0], "v": [10]}, "hidden": True},
        ],
        "solution": "import numpy as np\n" + '''
def decode_step(k_cache, v_cache, q, k, v):
    if k_cache and len(k) != len(k_cache[0]):
        raise ValueError("new key size does not match the cache")
    k_cache = [list(row) for row in k_cache] + [list(k)]
    v_cache = [list(row) for row in v_cache] + [list(v)]
    K, V, q = np.asarray(k_cache, float), np.asarray(v_cache, float), np.asarray(q, float)
    scores = K @ q / np.sqrt(K.shape[1])          # (t,)
    w = np.exp(scores - scores.max())
    w /= w.sum()
    return {"output": (w @ V).tolist(), "k_cache": k_cache, "v_cache": v_cache}
''',
        "intuition": """
## Generation repeats almost all of its work

A language model generates one token at a time. At step `t` the new token must attend to all `t` tokens so far. Recomputing every key and value from scratch makes step `t` cost `O(t^2)` attention work and repeats all the projections. But token 5's key never changes once computed.

A **KV cache** stores each token's key and value the first time they are computed. Each decode step only projects the new token, appends its `k` and `v`, and runs one query against the cache: `t` dot products instead of `t^2`.

## The cost moves to memory

The cache is why long-context serving is memory-bound. For a 32-layer model with 8 KV heads of size 128 in 16-bit floats, every token costs `2 * 32 * 8 * 128 * 2 = 131,072` bytes, so a 32,000-token context holds about 4 GB of cache per sequence (computed here). That number drives batch size limits, paged attention and grouped-query attention.

> **Remember:** the cache trades memory for compute. Each step appends one key and one value and attends once.
""",
    },
    {
        "id": "attn-grouped-query",
        "title": "Grouped-Query Attention",
        "difficulty": "hard",
        "numpy": True,
        "fn": "grouped_query_attention",
        "signature": "grouped_query_attention(Q: list[list[list[float]]], K: list[list[list[float]]], V: list[list[list[float]]]) -> list[list[list[float]]]",
        "starter": starter("grouped_query_attention(Q, K, V)"),
        "mission": "Let several query heads share one key/value head, the change that cuts the KV cache of models such as Llama 2 70B by 8x.",
        "task": "Implement `grouped_query_attention(Q, K, V)`. Q is (Hq, n, d), K and V are (Hkv, n, d). Hq must be a multiple of Hkv; query head h uses KV head `h // (Hq // Hkv)`. Apply causal scaled dot-product attention per query head (token i attends to tokens 0..i) and return the (Hq, n, d) output. Raise `ValueError` if Hq is not a multiple of Hkv.",
        "constraints": ["Consecutive query heads share a KV head: heads 0 and 1 use KV head 0 when Hq = 4 and Hkv = 2.", "Causal mask on every head.", "Hkv = Hq is ordinary multi-head attention; Hkv = 1 is multi-query attention."],
        "hints": {"small": "group = Hq // Hkv. np.repeat(K, group, axis=0) expands K to Hq heads in the right order.", "strong": "np.repeat repeats each head in place (0, 0, 1, 1); np.tile would interleave (0, 1, 0, 1), which is wrong.", "concept": "Only the cache shrinks: the attention compute per query head is unchanged."},
        "tests": [
            {"label": "Two query heads share one KV head", "input": {"Q": [[[1, 0], [0, 1]], [[0, 1], [1, 0]]], "K": [[[1, 0], [0, 1]]], "V": [[[1, 2], [3, 4]]]}},
            {"label": "Hq = Hkv is plain multi-head", "input": {"Q": [[[1, 1]], [[2, 0]]], "K": [[[1, 0]], [[0, 1]]], "V": [[[5, 6]], [[7, 8]]]}, "expect": [[[5, 6]], [[7, 8]]]},
            {"label": "Hq not a multiple of Hkv", "input": {"Q": [[[1]], [[1]], [[1]]], "K": [[[1]], [[1]]], "V": [[[1]], [[1]]]}, "error": "ValueError"},
            {"label": "Four query heads, two KV heads", "input": {"Q": [[[1, 0], [0, 1], [1, 1]], [[0, 1], [1, 0], [1, -1]], [[2, 0], [0, 2], [1, 1]], [[1, 2], [2, 1], [0, 0]]], "K": [[[1, 0], [0, 1], [1, 1]], [[0, 1], [1, 1], [1, 0]]], "V": [[[1, 0], [0, 1], [2, 2]], [[3, 0], [0, 3], [1, 1]]]}, "hidden": True},
        ],
        "solution": "import numpy as np\n" + SOFTMAX + '''
def grouped_query_attention(Q, K, V):
    Q, K, V = (np.asarray(m, dtype=float) for m in (Q, K, V))
    hq, n, d = Q.shape
    hkv = K.shape[0]
    if hq % hkv:
        raise ValueError("query heads must be a multiple of KV heads")
    group = hq // hkv
    K = np.repeat(K, group, axis=0)    # (Hq, n, d): head h -> KV head h // group
    V = np.repeat(V, group, axis=0)
    scores = Q @ K.transpose(0, 2, 1) / np.sqrt(d)
    causal = np.tril(np.ones((n, n), dtype=bool))
    scores = np.where(causal, scores, -np.inf)
    return (softmax(scores) @ V).tolist()
''',
        "intuition": """
## The cache is the bottleneck, so shrink it

During generation, the KV cache stores one key and one value per head per token per layer. With 64 query heads, that is 64 keys and 64 values for every token. **Multi-query attention** (Shazeer, 2019) keeps one shared KV head and cuts the cache 64x, but quality drops. **Grouped-query attention** (Ainslie et al., 2023) sits between: Llama 2 70B uses 64 query heads and 8 KV heads, so each KV head serves a group of 8 query heads and the cache is 8x smaller.

## Getting the grouping right

Query head `h` uses KV head `h // group`. With 4 query heads and 2 KV heads, heads 0 and 1 share KV head 0, heads 2 and 3 share KV head 1. `np.repeat(K, 2, axis=0)` produces exactly that order. `np.tile` produces KV heads in the order 0, 1, 0, 1: the shapes are identical, nothing crashes, and every other query head reads the wrong keys. Converting a checkpoint with the wrong expansion is a classic silent bug.

> **Remember:** GQA changes only which keys and values each query head reads. The attention maths per head is unchanged.
""",
    },
    {
        "id": "attn-alibi",
        "title": "ALiBi Position Bias",
        "difficulty": "medium",
        "numpy": True,
        "fn": "alibi_attention_weights",
        "signature": "alibi_attention_weights(scores: list[list[float]], slope: float) -> list[list[float]]",
        "starter": starter("alibi_attention_weights(scores, slope)"),
        "mission": "Encode position by penalising attention to distant tokens, with no position embeddings at all, and return the causal attention weights.",
        "task": "Implement `alibi_attention_weights(scores, slope)`. `scores` is an (n, n) matrix of raw query-key scores. For query i and key j with j <= i, subtract `slope * (i - j)`; keys with j > i are masked out. Return the row-wise softmax weights as an (n, n) list. Raise `ValueError` if scores is not square or slope is negative.",
        "constraints": ["The bias is linear in distance: slope * (i - j).", "Causal: future keys get weight 0.", "Each row of the result sums to 1."],
        "hints": {"small": "Build a distance matrix with np.arange(n)[:, None] - np.arange(n)[None, :].", "strong": "biased = scores - slope * dist, then set entries with dist < 0 to -inf before softmax.", "concept": "Because the penalty depends only on distance, the model sees the same pattern at length 2,000 as at 200."},
        "tests": [
            {"label": "Zero slope is plain causal attention", "input": {"scores": [[0, 0], [0, 0]], "slope": 0}, "expect": [[1, 0], [0.5, 0.5]]},
            {"label": "Slope favours nearby tokens", "input": {"scores": [[0, 0, 0], [0, 0, 0], [0, 0, 0]], "slope": 1}},
            {"label": "Negative slope", "input": {"scores": [[1]], "slope": -0.5}, "error": "ValueError"},
            {"label": "Bias against real scores", "input": {"scores": [[2, 0, 0, 0], [3, 1, 0, 0], [0, 4, 0.5, 0], [1, 1, 1, 1]], "slope": 0.5}, "hidden": True},
        ],
        "solution": "import numpy as np\n" + SOFTMAX + '''
def alibi_attention_weights(scores, slope):
    s = np.asarray(scores, dtype=float)
    if s.ndim != 2 or s.shape[0] != s.shape[1]:
        raise ValueError("scores must be square")
    if slope < 0:
        raise ValueError("slope must be non-negative")
    n = s.shape[0]
    dist = np.arange(n)[:, None] - np.arange(n)[None, :]   # i - j
    biased = np.where(dist >= 0, s - slope * dist, -np.inf)
    return softmax(biased).tolist()
''',
        "intuition": """
## Position as a penalty

A transformer without positional information sees a set of tokens, not a sequence. The original transformer added sinusoidal vectors to the embeddings; RoPE rotates queries and keys. **ALiBi** (Press et al., 2022) does something simpler: subtract `slope * distance` from each attention score. A key 10 tokens back pays a penalty of `10 * slope` before the softmax.

With all raw scores equal and `slope = 1`, the last query gives its own token weight `e^0`, the one before `e^-1` and the one before that `e^-2`, about 67%, 24% and 9% after normalising. Recent tokens dominate unless the content scores argue otherwise.

## Why it extrapolates

Learned position embeddings stop at the longest position seen in training. ALiBi's bias is a formula of distance, so it is defined at any length, and Press et al. report that a model trained on 1,024 tokens and evaluated on 2,048 matches the perplexity of a sinusoidal model trained on 2,048. Each head gets a different slope, so some heads look far back and others stay local.

> **Remember:** ALiBi adds `-slope * (i - j)` to causal scores. No embedding table, no extra parameters.
""",
    },
]
