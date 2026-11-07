SET = {
    "title": "NumPy Sheet",
    "learn": {"title": "Linear algebra for AI", "route": "/docs/mathematics-for-ai/linear-algebra", "description": "Vectors, matrices and the shapes every NumPy operation works on."},
}


def starter(sig):
    return f"import numpy as np\n\ndef {sig}:\n    # Your code here\n    pass\n"


PROBLEMS = [
    {
        "id": "np-row-normalize",
        "title": "Row-Normalise a Count Matrix",
        "difficulty": "easy",
        "numpy": True,
        "fn": "row_normalize",
        "signature": "row_normalize(counts: list[list[float]]) -> list[list[float]]",
        "starter": starter("row_normalize(counts)"),
        "mission": "Turn each row of counts into a probability distribution with one broadcast division. A row of all zeros stays all zeros instead of becoming NaN.",
        "task": "Implement `row_normalize(counts)`. Divide every row by its own sum so each row sums to 1. A row whose sum is 0 must come back as all zeros. Return a list of lists.",
        "constraints": ["No Python loop over rows: use `sum(axis=1, keepdims=True)` and broadcasting.", "A zero row returns zeros, never NaN.", "Return `.tolist()`, not an array."],
        "hints": {"small": "Row sums have shape (n, 1) when you pass keepdims=True, and (n, 1) broadcasts against (n, d).", "strong": "Replace zero sums with 1 before dividing: the zero row divided by 1 is still zeros.", "concept": "Broadcasting stretches a size-1 axis to match the other array without copying data."},
        "tests": [
            {"label": "Two rows", "input": {"counts": [[1, 3], [2, 2]]}, "expect": [[0.25, 0.75], [0.5, 0.5]]},
            {"label": "A zero row stays zero", "input": {"counts": [[0, 0, 0], [1, 1, 2]]}, "expect": [[0, 0, 0], [0.25, 0.25, 0.5]]},
            {"label": "Single row", "input": {"counts": [[5]]}, "expect": [[1]]},
            {"label": "Bigram counts", "input": {"counts": [[10, 0, 30], [0, 4, 4], [7, 7, 0]]}, "hidden": True},
        ],
        "solution": """
import numpy as np

def row_normalize(counts):
    c = np.asarray(counts, dtype=float)
    sums = c.sum(axis=1, keepdims=True)   # shape (n, 1)
    sums[sums == 0] = 1.0                 # zero rows divide by 1 and stay zero
    return (c / sums).tolist()
""",
        "intuition": """
## From counts to probabilities

A bigram language model starts as a table of counts: row `i` says how often each token followed token `i`. To sample from it you need each row to be a probability distribution, so every row is divided by its own total.

The loop version divides row by row. NumPy does it in one expression: `c.sum(axis=1, keepdims=True)` has shape `(n, 1)`, and dividing an `(n, d)` array by an `(n, 1)` array **broadcasts**: NumPy repeats the single column across all `d` columns without copying it.

## The zero row

A token that never appears has a row sum of 0, and `0 / 0` is NaN. One NaN in a probability table spreads into every computation that touches it. Setting those sums to 1 first keeps the row at zeros, which is the honest answer: no evidence, no probability mass.

> **Remember:** `keepdims=True` keeps the reduced axis as size 1, which is exactly what broadcasting needs.
""",
    },
    {
        "id": "np-gather-embeddings",
        "title": "Gather Embeddings With Padding",
        "difficulty": "easy",
        "numpy": True,
        "fn": "gather_embeddings",
        "signature": "gather_embeddings(table: list[list[float]], ids: list[list[int]], pad_id: int) -> list[list[list[float]]]",
        "starter": starter("gather_embeddings(table, ids, pad_id)"),
        "mission": "Look up an embedding vector for every token id in a padded batch with one fancy-indexing step, and zero out the padding positions.",
        "task": "Implement `gather_embeddings(table, ids, pad_id)`. `table` has shape (vocab, d) and `ids` has shape (batch, seq). Return the (batch, seq, d) array of rows `table[ids]`, except positions where the id equals `pad_id`, which must be all zeros.",
        "constraints": ["Use integer-array indexing (`table[ids]`), not a loop.", "Padding positions are zero vectors even though `table[pad_id]` may be non-zero.", "Return `.tolist()`."],
        "hints": {"small": "Indexing a (vocab, d) array with a (batch, seq) integer array returns shape (batch, seq, d).", "strong": "Build a mask `ids != pad_id` of shape (batch, seq), then multiply by `mask[..., None]` to broadcast over d.", "concept": "This is exactly what nn.Embedding does on the forward pass, plus the padding_idx behaviour."},
        "tests": [
            {"label": "No padding", "input": {"table": [[1, 1], [2, 2], [3, 3]], "ids": [[2, 0]], "pad_id": -1}, "expect": [[[3, 3], [1, 1]]]},
            {"label": "Padding becomes zeros", "input": {"table": [[9, 9], [1, 0], [0, 1]], "ids": [[1, 2, 0], [2, 0, 0]], "pad_id": 0}, "expect": [[[1, 0], [0, 1], [0, 0]], [[0, 1], [0, 0], [0, 0]]]},
            {"label": "Repeated ids", "input": {"table": [[0.5, -0.5, 1], [2, 0, 0]], "ids": [[1, 1, 1]], "pad_id": 0}, "hidden": True},
        ],
        "solution": """
import numpy as np

def gather_embeddings(table, ids, pad_id):
    table = np.asarray(table, dtype=float)
    ids = np.asarray(ids)
    out = table[ids]                       # (batch, seq, d)
    mask = (ids != pad_id)[..., None]      # (batch, seq, 1)
    return (out * mask).tolist()
""",
        "intuition": """
## An embedding layer is an index

An **embedding table** is a matrix with one row per token id. Turning token ids into vectors is not a matrix multiply: it is a lookup. `table[ids]` with a `(batch, seq)` integer array returns a `(batch, seq, d)` array in one call, because NumPy's integer-array indexing replaces each id with the row it names.

## Why padding needs a mask

Batches are rectangular, so shorter sequences are filled with a **padding id**. The table still has a row for that id, and it is usually not zero. If those vectors leak into a mean-pool or an attention sum, sentence length silently changes the result. Multiplying by `(ids != pad_id)[..., None]` zeroes them; the trailing `None` adds the size-1 axis that broadcasts across `d`.

> **Remember:** gather with `table[ids]`, then mask with a broadcast boolean. Both are single NumPy operations.
""",
    },
    {
        "id": "np-clip-outliers",
        "title": "Replace Outliers With the Column Mean",
        "difficulty": "medium",
        "numpy": True,
        "fn": "replace_outliers",
        "signature": "replace_outliers(X: list[list[float]], k: float) -> list[list[float]]",
        "starter": starter("replace_outliers(X, k)"),
        "mission": "Use a boolean mask and np.where to replace values more than k standard deviations from their column mean, the kind of cleaning step that runs before training on sensor data.",
        "task": "Implement `replace_outliers(X, k)`. For each column compute its mean and population standard deviation (ddof=0). Any value with `abs(x - mean) > k * std` is replaced by that column's mean. Means and stds come from the original data. Return a list of lists.",
        "constraints": ["Use column statistics computed once, before any replacement.", "A column with std 0 has no outliers.", "Strictly greater than k * std counts as an outlier; equal does not."],
        "hints": {"small": "mean and std with axis=0 give one value per column, shape (d,).", "strong": "mask = np.abs(X - mean) > k * std; then np.where(mask, mean, X). Broadcasting lines the (d,) vectors up with each row.", "concept": "A z-score threshold is the simplest outlier rule; it assumes roughly normal columns."},
        "tests": [
            {"label": "One spike", "input": {"X": [[1], [1], [1], [1], [100]], "k": 1.5}, "expect": [[1], [1], [1], [1], [20.8]]},
            {"label": "Nothing to replace", "input": {"X": [[1, 10], [2, 20], [3, 30]], "k": 2}, "expect": [[1, 10], [2, 20], [3, 30]]},
            {"label": "Constant column has no outliers", "input": {"X": [[5, 0], [5, 0], [5, 0], [5, 9]], "k": 1}, "hidden": True},
            {"label": "Two columns, different spikes", "input": {"X": [[0, 1], [0, 1], [0, 1], [0, 1], [8, 1], [0, -7]], "k": 2}, "hidden": True},
        ],
        "solution": """
import numpy as np

def replace_outliers(X, k):
    X = np.asarray(X, dtype=float)
    mean = X.mean(axis=0)            # (d,)
    std = X.std(axis=0)              # population std, ddof=0
    mask = np.abs(X - mean) > k * std
    return np.where(mask, mean, X).tolist()
""",
        "intuition": """
## Cleaning without a loop

A temperature sensor that reports 1, 1, 1, 1, 100 has one bad reading. A simple rule flags any value more than `k` standard deviations from its column mean and replaces it with the mean.

Three NumPy ideas do the whole job. `X.mean(axis=0)` collapses the rows and leaves one mean per column. `np.abs(X - mean) > k * std` broadcasts those column statistics against every row and returns a **boolean mask** of the same shape as `X`. `np.where(mask, mean, X)` picks the mean where the mask is true and the original value elsewhere.

## A subtle trap

You might expect the spike to stand far from the mean. It also drags the mean and inflates the standard deviation: with 1, 1, 1, 1, 100 the mean is 20.8 and the std is 39.6, so the spike is only 2 standard deviations out. With `k = 3` it would survive. Robust pipelines use the median and the median absolute deviation for this reason.

> **Remember:** compute statistics once, build a mask, then `np.where`. Never edit `X` while you are still measuring it.
""",
    },
    {
        "id": "np-topk-per-row",
        "title": "Top-k Indices per Row",
        "difficulty": "medium",
        "numpy": True,
        "fn": "topk_per_row",
        "signature": "topk_per_row(scores: list[list[float]], k: int) -> list[list[int]]",
        "starter": starter("topk_per_row(scores, k)"),
        "mission": "Return the indices of the k largest scores in each row, highest first, the core of retrieval and of top-k sampling.",
        "task": "Implement `topk_per_row(scores, k)`. For every row return the column indices of its `k` largest values, ordered from largest to smallest. Break ties by the smaller index. Raise `ValueError` if `k` is less than 1 or larger than the number of columns.",
        "constraints": ["Work on the whole matrix with argsort along axis=1.", "Ties go to the lower index.", "Raise ValueError for k < 1 or k > number of columns."],
        "hints": {"small": "np.argsort sorts ascending. Sorting the negated scores gives descending order.", "strong": "Use kind='stable' so equal scores keep their original (index) order, then take [:, :k].", "concept": "argpartition is O(n) per row when you do not need the k results in order."},
        "tests": [
            {"label": "Simple rows", "input": {"scores": [[0.1, 0.9, 0.5], [3, 1, 2]], "k": 2}, "expect": [[1, 2], [0, 2]]},
            {"label": "Ties go to the lower index", "input": {"scores": [[1, 5, 5, 0]], "k": 2}, "expect": [[1, 2]]},
            {"label": "k equals the width", "input": {"scores": [[2, 1]], "k": 2}, "expect": [[0, 1]]},
            {"label": "k too large", "input": {"scores": [[1, 2]], "k": 3}, "error": "ValueError"},
            {"label": "Negative scores", "input": {"scores": [[-3, -1, -2, -1], [0, 0, 0, 1]], "k": 3}, "hidden": True},
        ],
        "solution": """
import numpy as np

def topk_per_row(scores, k):
    s = np.asarray(scores, dtype=float)
    if k < 1 or k > s.shape[1]:
        raise ValueError("k must be between 1 and the number of columns")
    order = np.argsort(-s, axis=1, kind="stable")  # stable: ties keep index order
    return order[:, :k].tolist()
""",
        "intuition": """
## Ranking a whole batch at once

A retriever scores every query against every document and needs the best few per query. With a `(queries, docs)` score matrix, `np.argsort(-scores, axis=1)` sorts each row independently and returns column indices, largest score first. Slicing `[:, :k]` keeps the top `k`.

## Ties are a correctness issue

You might expect the order of tied scores not to matter. It does, as soon as a test, a cache key or an A/B comparison depends on the result being the same twice. NumPy's default quicksort is not stable, so equal scores can come back in either order. `kind="stable"` guarantees that equal values keep their original order, which here means the lower index wins.

> **Remember:** argsort the negated scores with `kind="stable"` for a deterministic descending top-k.
""",
    },
    {
        "id": "np-cosine-matrix",
        "title": "Pairwise Cosine Similarity Matrix",
        "difficulty": "medium",
        "numpy": True,
        "fn": "cosine_matrix",
        "signature": "cosine_matrix(A: list[list[float]], B: list[list[float]]) -> list[list[float]]",
        "starter": starter("cosine_matrix(A, B)"),
        "mission": "Compute the cosine similarity between every row of A and every row of B with one matrix multiply, the same step a vector search runs per query batch.",
        "task": "Implement `cosine_matrix(A, B)`. A is (m, d), B is (n, d). Return the (m, n) matrix where entry (i, j) is the cosine similarity of `A[i]` and `B[j]`. Raise `ValueError` if any row of A or B has zero length.",
        "constraints": ["One matrix multiply, no Python loops over pairs.", "Normalise rows first: unit vectors make the dot product equal the cosine.", "Raise ValueError for a zero row."],
        "hints": {"small": "np.linalg.norm(A, axis=1, keepdims=True) gives each row's length as an (m, 1) column.", "strong": "A_unit @ B_unit.T is (m, d) @ (d, n) = (m, n).", "concept": "Normalising once and multiplying is m + n normalisations instead of m * n."},
        "tests": [
            {"label": "Orthogonal and parallel", "input": {"A": [[1, 0], [0, 2]], "B": [[3, 0], [0, 1], [1, 1]]}, "expect": [[1, 0, 0.7071067811865475], [0, 1, 0.7071067811865475]]},
            {"label": "Opposite directions", "input": {"A": [[1, 2, 3]], "B": [[-1, -2, -3]]}, "expect": [[-1]]},
            {"label": "Zero row", "input": {"A": [[0, 0]], "B": [[1, 0]]}, "error": "ValueError"},
            {"label": "Three by two", "input": {"A": [[1, 2], [2, 1], [-1, 1]], "B": [[1, 1], [0, -3]]}, "hidden": True},
        ],
        "solution": """
import numpy as np

def cosine_matrix(A, B):
    A = np.asarray(A, dtype=float)
    B = np.asarray(B, dtype=float)
    na = np.linalg.norm(A, axis=1, keepdims=True)
    nb = np.linalg.norm(B, axis=1, keepdims=True)
    if (na == 0).any() or (nb == 0).any():
        raise ValueError("zero-length row")
    return ((A / na) @ (B / nb).T).tolist()
""",
        "intuition": """
## One multiply instead of m times n loops

Cosine similarity is the dot product of two vectors divided by both lengths. Computed pair by pair, 1,000 queries against 100,000 documents is 100 million small loops in Python.

Divide every row by its own length first. Each row becomes a **unit vector**, and the dot product of two unit vectors is exactly their cosine. Then `A_unit @ B_unit.T` computes every pair in one call, which NumPy hands to an optimised BLAS routine.

## Zero vectors have no direction

An all-zero embedding (an empty document, a failed encode) has length 0, and dividing by it gives NaN. A NaN score then sorts unpredictably and can silently top a ranking. Raising early is better than ranking garbage.

> **Remember:** normalise rows, then multiply. That is what every vector database does for cosine search.
""",
    },
    {
        "id": "np-moving-average",
        "title": "Moving Average With cumsum",
        "difficulty": "medium",
        "numpy": True,
        "fn": "moving_average",
        "signature": "moving_average(x: list[float], window: int) -> list[float]",
        "starter": starter("moving_average(x, window)"),
        "mission": "Smooth a training-loss curve with a moving average in O(n) using a cumulative sum, instead of re-summing every window.",
        "task": "Implement `moving_average(x, window)`. Return the mean of every full window of `window` consecutive values, so the output has `len(x) - window + 1` entries. Raise `ValueError` if `window` is less than 1 or longer than `x`.",
        "constraints": ["O(n): use np.cumsum, not a sum per window.", "Only full windows: no padding at the edges.", "Raise ValueError for an invalid window."],
        "hints": {"small": "The sum of x[i:i+w] is cumsum[i+w] - cumsum[i] if cumsum starts with a 0.", "strong": "c = np.concatenate([[0.0], np.cumsum(x)]); then (c[w:] - c[:-w]) / w.", "concept": "Prefix sums turn any range-sum query into one subtraction."},
        "tests": [
            {"label": "Window of 2", "input": {"x": [1, 3, 5, 7], "window": 2}, "expect": [2, 4, 6]},
            {"label": "Window equals length", "input": {"x": [2, 4, 9], "window": 3}, "expect": [5]},
            {"label": "Window of 1 is the input", "input": {"x": [0.5, -1, 2], "window": 1}, "expect": [0.5, -1, 2]},
            {"label": "Window too long", "input": {"x": [1, 2], "window": 3}, "error": "ValueError"},
            {"label": "Noisy loss curve", "input": {"x": [2.3, 2.1, 2.4, 1.9, 1.7, 1.8, 1.4, 1.5], "window": 4}, "hidden": True},
        ],
        "solution": """
import numpy as np

def moving_average(x, window):
    x = np.asarray(x, dtype=float)
    if window < 1 or window > len(x):
        raise ValueError("window must be between 1 and len(x)")
    c = np.concatenate([[0.0], np.cumsum(x)])   # c[i] = sum of x[:i]
    return ((c[window:] - c[:-window]) / window).tolist()
""",
        "intuition": """
## Every window is one subtraction

A loss curve logged every step is noisy, so training dashboards plot a moving average. The direct version sums each window again: `n` windows of `w` values is `n * w` additions.

A **prefix sum** stores the running total: `c[i]` is the sum of the first `i` values. The sum of any window `x[i:i+w]` is then `c[i+w] - c[i]`. With a leading 0 in `c`, all windows at once are `c[w:] - c[:-w]`, two slices and one subtraction, `O(n)` regardless of the window size.

## Watch the off-by-one

Without the leading 0, the first window has nothing to subtract and you lose an entry. Prepending 0 makes `c[i]` mean exactly "sum of the first i values", and the slices line up.

> **Remember:** prefix sums turn range sums into differences. The same trick computes integral images in vision.
""",
    },
    {
        "id": "np-einsum-bilinear",
        "title": "Batched Bilinear Scores With einsum",
        "difficulty": "medium",
        "numpy": True,
        "fn": "bilinear_scores",
        "signature": "bilinear_scores(X: list[list[float]], W: list[list[float]], Y: list[list[float]]) -> list[float]",
        "starter": starter("bilinear_scores(X, W, Y)"),
        "mission": "Score n pairs (x_i, y_i) with x_i^T W y_i in one einsum call, the scoring function behind bilinear attention and many recommenders.",
        "task": "Implement `bilinear_scores(X, W, Y)`. X is (n, a), W is (a, b), Y is (n, b). Return a list of n scores where score i is `X[i] @ W @ Y[i]`. Raise `ValueError` if the shapes do not line up.",
        "constraints": ["Do not build the full (n, n) matrix `X @ W @ Y.T` and take its diagonal: that is n times more work.", "Use np.einsum or an equivalent row-wise product.", "Raise ValueError on mismatched shapes."],
        "hints": {"small": "Write the index form first: score[i] = sum over j, k of X[i, j] * W[j, k] * Y[i, k].", "strong": "np.einsum('ij,jk,ik->i', X, W, Y). Indices that appear in the inputs but not after -> are summed.", "concept": "einsum names every axis, so the shapes are documented in the call itself."},
        "tests": [
            {"label": "Identity W is a row-wise dot product", "input": {"X": [[1, 2], [3, 4]], "W": [[1, 0], [0, 1]], "Y": [[5, 6], [7, 8]]}, "expect": [17, 53]},
            {"label": "Rectangular W", "input": {"X": [[1, 0, 2]], "W": [[1, 2], [0, 1], [3, 0]], "Y": [[1, 1]]}, "expect": [9]},
            {"label": "Shape mismatch", "input": {"X": [[1, 2]], "W": [[1, 0, 0]], "Y": [[1]]}, "error": "ValueError"},
            {"label": "Three pairs", "input": {"X": [[1, -1], [0, 2], [0.5, 0.5]], "W": [[2, 1], [1, 3]], "Y": [[1, 0], [1, 1], [-2, 4]]}, "hidden": True},
        ],
        "solution": """
import numpy as np

def bilinear_scores(X, W, Y):
    X, W, Y = (np.asarray(m, dtype=float) for m in (X, W, Y))
    if X.shape[1] != W.shape[0] or W.shape[1] != Y.shape[1] or X.shape[0] != Y.shape[0]:
        raise ValueError("shapes do not line up")
    # i: pair, j: x feature, k: y feature. j and k are summed away.
    return np.einsum("ij,jk,ik->i", X, W, Y).tolist()
""",
        "intuition": """
## Write the indices, get the code

A **bilinear score** `x^T W y` measures how well two vectors match through a learned matrix `W`. For `n` pairs, the tempting version is `np.diag(X @ W @ Y.T)`: it builds an `n` by `n` matrix of every query against every item and throws away all but the diagonal. At `n = 10,000` that is 100 million scores to keep 10,000.

`np.einsum("ij,jk,ik->i", X, W, Y)` states the computation directly: for each pair `i`, multiply and sum over the feature axes `j` and `k`. Any index that appears in the inputs but not after `->` is summed. Only `n` scores are ever computed.

## Shapes are the specification

When shapes do not line up, einsum raises its own error, but the message names subscripts, not your variables. Checking shapes yourself and raising `ValueError` gives the caller an error they can act on.

> **Remember:** if you can write the sum with indices, you can write it as einsum, and the call documents its own shapes.
""",
    },
    {
        "id": "np-segment-sum",
        "title": "Segment Sum With Scatter-Add",
        "difficulty": "hard",
        "numpy": True,
        "fn": "segment_mean",
        "signature": "segment_mean(values: list[list[float]], segment_ids: list[int], num_segments: int) -> list[list[float]]",
        "starter": starter("segment_mean(values, segment_ids, num_segments)"),
        "mission": "Average rows that share a segment id, such as all chunk embeddings of one document, with np.add.at instead of a Python dict of lists.",
        "task": "Implement `segment_mean(values, segment_ids, num_segments)`. `values` is (n, d) and `segment_ids[i]` says which segment row i belongs to (0 to num_segments - 1). Return a (num_segments, d) list where row s is the mean of the rows in segment s, or all zeros if segment s is empty. Raise `ValueError` if any id is outside the range.",
        "constraints": ["Use np.add.at (unbuffered scatter-add); `out[ids] += values` drops repeated ids.", "Empty segments return zeros, not NaN.", "Raise ValueError for ids outside 0..num_segments-1."],
        "hints": {"small": "Sum first, then divide by the count per segment. np.bincount gives the counts.", "strong": "np.add.at(sums, ids, values) adds every row, even when ids repeat. counts = np.bincount(ids, minlength=num_segments).", "concept": "Scatter-add is how graph neural networks aggregate messages from neighbours."},
        "tests": [
            {"label": "Two documents", "input": {"values": [[1, 1], [3, 3], [10, 0]], "segment_ids": [0, 0, 1], "num_segments": 2}, "expect": [[2, 2], [10, 0]]},
            {"label": "Empty segment is zeros", "input": {"values": [[4, 2]], "segment_ids": [2], "num_segments": 3}, "expect": [[0, 0], [0, 0], [4, 2]]},
            {"label": "Repeated ids all count", "input": {"values": [[1], [2], [3], [4]], "segment_ids": [1, 1, 1, 0], "num_segments": 2}, "expect": [[4], [2]]},
            {"label": "Id out of range", "input": {"values": [[1]], "segment_ids": [5], "num_segments": 2}, "error": "ValueError"},
            {"label": "Interleaved segments", "input": {"values": [[1, 0, 2], [0, 4, 0], [3, 0, -2], [2, 2, 2], [0, 0, 6]], "segment_ids": [0, 1, 0, 1, 2], "num_segments": 4}, "hidden": True},
        ],
        "solution": """
import numpy as np

def segment_mean(values, segment_ids, num_segments):
    v = np.asarray(values, dtype=float)
    ids = np.asarray(segment_ids)
    if ((ids < 0) | (ids >= num_segments)).any():
        raise ValueError("segment id out of range")
    sums = np.zeros((num_segments, v.shape[1]))
    np.add.at(sums, ids, v)                       # unbuffered: repeated ids all add
    counts = np.bincount(ids, minlength=num_segments).astype(float)
    counts[counts == 0] = 1.0                     # empty segments stay zero
    return (sums / counts[:, None]).tolist()
""",
        "intuition": """
## Many rows into fewer buckets

A RAG index often stores one embedding per chunk, but you want one vector per document. Each chunk carries a **segment id** (its document), and the document vector is the mean of its chunks.

The obvious NumPy line is `sums[ids] += values`. It runs without error and gives the wrong answer. With `ids = [1, 1, 1]`, NumPy computes `sums[ids] + values` into a temporary and writes it back three times to the same row, so only the last addition survives. This is called a **buffered** update.

## np.add.at does it unbuffered

`np.add.at(sums, ids, values)` applies every addition, repeated ids included. `np.bincount(ids, minlength=num_segments)` counts rows per segment, and dividing by the counts gives the means. Setting zero counts to 1 keeps empty segments at zero rather than NaN.

> **Remember:** fancy-index assignment with repeated indices keeps only one write. Use `np.add.at` for scatter-add.
""",
    },
]
