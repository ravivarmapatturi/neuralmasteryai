SET = {
    "title": "Evaluation Metrics",
    "learn": {"title": "Model evaluation metrics", "route": "/docs/machine-learning/model-evaluation-metrics", "description": "Which metric answers which question, and how each one can mislead."},
}


def starter(sig):
    return f"def {sig}:\n    # Your code here\n    pass\n"


PROBLEMS = [
    {
        "id": "met-mrr",
        "title": "Mean Reciprocal Rank",
        "difficulty": "easy",
        "fn": "mean_reciprocal_rank",
        "signature": "mean_reciprocal_rank(rankings: list[list[str]], relevant: list[list[str]]) -> float",
        "starter": starter("mean_reciprocal_rank(rankings, relevant)"),
        "mission": "Score a search or retrieval system by how high the first correct result appears, averaged over queries.",
        "task": "Implement `mean_reciprocal_rank(rankings, relevant)`. For query i, find the 1-based position of the first item in `rankings[i]` that is in `relevant[i]`; its reciprocal rank is 1 / position, or 0 if no relevant item appears. Return the mean over queries. Raise `ValueError` if there are no queries or the lists differ in length.",
        "constraints": ["Only the first relevant hit counts.", "A query with no relevant hit scores 0, and still counts in the mean.", "Positions are 1-based."],
        "hints": {"small": "enumerate(ranking, start=1) gives 1-based positions.", "strong": "Break out of the loop at the first hit.", "concept": "MRR suits tasks with one right answer, such as a question answered by one document."},
        "tests": [
            {"label": "Hits at 1, 2 and 3", "input": {"rankings": [["a", "b"], ["x", "c"], ["p", "q", "r"]], "relevant": [["a"], ["c"], ["r"]]}, "expect": 0.6111111111111112},
            {"label": "A miss counts as 0", "input": {"rankings": [["a"], ["b"]], "relevant": [["a"], ["z"]]}, "expect": 0.5},
            {"label": "Only the first hit counts", "input": {"rankings": [["x", "a", "b"]], "relevant": [["a", "b"]]}, "expect": 0.5},
            {"label": "No queries", "input": {"rankings": [], "relevant": []}, "error": "ValueError"},
            {"label": "Four queries", "input": {"rankings": [["d1", "d2", "d3", "d4"], ["d9", "d8"], ["d5", "d1"], ["d7", "d6", "d5", "d4", "d3"]], "relevant": [["d3"], ["d8", "d9"], ["d2"], ["d3"]]}, "hidden": True},
        ],
        "solution": '''
def mean_reciprocal_rank(rankings, relevant):
    if not rankings or len(rankings) != len(relevant):
        raise ValueError("need one relevant set per ranking")
    total = 0.0
    for ranking, rel in zip(rankings, relevant):
        rel = set(rel)
        for pos, item in enumerate(ranking, start=1):
            if item in rel:
                total += 1 / pos
                break
    return total / len(rankings)
''',
        "intuition": """
## How far does the user have to look?

For a question-answering retriever, what matters is where the first useful document lands. **Reciprocal rank** is `1 / position` of that first hit: 1.0 at the top, 0.5 in second place, 0.33 in third, and 0 if it never appears. **MRR** averages it over queries. Hits at positions 1, 2 and 3 give `(1 + 0.5 + 0.333) / 3 = 0.611`.

## What MRR ignores

Everything after the first hit is invisible to it. A ranking with one relevant document at the top and nine irrelevant ones scores the same as a ranking whose whole top ten is relevant. For a RAG system that stuffs the top five chunks into the prompt, recall@5 or nDCG says more. MRR is the right choice when one answer is enough.

> **Remember:** MRR measures the first relevant position. A missing answer scores 0 and still counts.
""",
    },
    {
        "id": "met-macro-micro-f1",
        "title": "Macro and Micro F1 for Many Classes",
        "difficulty": "medium",
        "fn": "macro_micro_f1",
        "signature": "macro_micro_f1(y_true: list[str], y_pred: list[str]) -> dict",
        "starter": starter("macro_micro_f1(y_true, y_pred)"),
        "mission": "Compute F1 for a multi-class classifier two ways and see how a rare class that is always wrong disappears from one of them.",
        "task": "Implement `macro_micro_f1(y_true, y_pred)`. Classes are every label in either list. Per class, count TP, FP and FN, and compute F1 = 2TP / (2TP + FP + FN), or 0 when the denominator is 0. Macro F1 is the unweighted mean of per-class F1. Micro F1 uses the summed TP, FP and FN over all classes. Return `{\"macro\": ..., \"micro\": ..., \"per_class\": {label: f1}}`.",
        "constraints": ["Classes come from both y_true and y_pred.", "F1 = 2TP / (2TP + FP + FN), with 0 for an empty denominator.", "For single-label data, micro F1 equals accuracy."],
        "hints": {"small": "One pass over the pairs: if t == p it is a TP for t; otherwise an FN for t and an FP for p.", "strong": "Micro sums TP, FP and FN across classes before computing one F1.", "concept": "Macro treats every class equally; micro treats every example equally."},
        "tests": [
            {"label": "Rare class always missed", "input": {"y_true": ["a", "a", "a", "a", "a", "a", "a", "a", "b", "b"], "y_pred": ["a", "a", "a", "a", "a", "a", "a", "a", "a", "a"]}},
            {"label": "Perfect predictions", "input": {"y_true": ["x", "y", "z"], "y_pred": ["x", "y", "z"]}, "expect": {"macro": 1, "micro": 1, "per_class": {"x": 1, "y": 1, "z": 1}}},
            {"label": "A predicted class that never occurs", "input": {"y_true": ["a", "b"], "y_pred": ["a", "c"]}},
            {"label": "Three-way confusion", "input": {"y_true": ["cat", "dog", "cat", "bird", "dog", "cat", "bird"], "y_pred": ["cat", "cat", "cat", "bird", "dog", "dog", "cat"]}, "hidden": True},
        ],
        "solution": '''
def macro_micro_f1(y_true, y_pred):
    classes = sorted(set(y_true) | set(y_pred))
    tp = {c: 0 for c in classes}
    fp = {c: 0 for c in classes}
    fn = {c: 0 for c in classes}
    for t, p in zip(y_true, y_pred):
        if t == p:
            tp[t] += 1
        else:
            fn[t] += 1
            fp[p] += 1

    def f1(tp_, fp_, fn_):
        denom = 2 * tp_ + fp_ + fn_
        return 2 * tp_ / denom if denom else 0.0

    per_class = {c: f1(tp[c], fp[c], fn[c]) for c in classes}
    micro = f1(sum(tp.values()), sum(fp.values()), sum(fn.values()))
    return {"macro": sum(per_class.values()) / len(classes), "micro": micro, "per_class": per_class}
''',
        "intuition": """
## Two averages, two different questions

A support-ticket classifier sees 80% "billing" and 20% "outage". If it predicts "billing" for everything, accuracy is 80%. **Micro F1** pools every prediction before computing F1, so for single-label data it equals accuracy: 0.8 here. **Macro F1** computes F1 per class and averages them with equal weight: billing gets 0.89, outage gets 0, and the macro score is 0.44.

The first test is exactly this case. The rare class that the business cares most about is invisible in the micro score and halves the macro score.

## Which one to report

Use macro F1 when every class matters, regardless of frequency: rare intents, rare diseases, rare failure types. Use micro F1 when every example matters equally. Report per-class F1 alongside either, because both averages hide which class is failing.

> **Remember:** micro pools counts, macro averages per-class scores. A model that ignores a minority class can still have a good micro F1.
""",
    },
    {
        "id": "met-ndcg",
        "title": "nDCG@k With Graded Relevance",
        "difficulty": "medium",
        "fn": "ndcg_at_k",
        "signature": "ndcg_at_k(ranked_relevance: list[float], k: int) -> float",
        "starter": starter("ndcg_at_k(ranked_relevance, k)"),
        "mission": "Score a ranking where some results are more relevant than others, with a discount for appearing further down.",
        "task": "Implement `ndcg_at_k(ranked_relevance, k)`. `ranked_relevance[i]` is the graded relevance of the result shown at position i + 1. DCG@k = sum over the first k positions of `(2**rel - 1) / log2(position + 1)`. IDCG@k is the DCG@k of the same relevances sorted in descending order. Return DCG / IDCG, or 0.0 when IDCG is 0. Raise `ValueError` if k < 1.",
        "constraints": ["Use the exponential gain 2**rel - 1.", "Positions are 1-based, so position 1 is divided by log2(2) = 1.", "The ideal ranking uses the same relevance values, sorted descending."],
        "hints": {"small": "Write dcg(rels) once and call it on the list and on sorted(rels, reverse=True).", "strong": "Truncate both to k after sorting, not before: the ideal top k comes from all results.", "concept": "Normalising by the ideal makes scores comparable across queries with different numbers of relevant results."},
        "tests": [
            {"label": "Already ideal", "input": {"ranked_relevance": [3, 2, 1, 0], "k": 4}, "expect": 1},
            {"label": "Best result in last place", "input": {"ranked_relevance": [0, 0, 3], "k": 3}},
            {"label": "Nothing relevant", "input": {"ranked_relevance": [0, 0], "k": 2}, "expect": 0},
            {"label": "Cut-off excludes the best result", "input": {"ranked_relevance": [1, 0, 3, 2], "k": 2}},
            {"label": "Bad k", "input": {"ranked_relevance": [1], "k": 0}, "error": "ValueError"},
            {"label": "Search results page", "input": {"ranked_relevance": [2, 3, 0, 1, 2, 0, 0, 3], "k": 5}, "hidden": True},
        ],
        "solution": '''
import math

def ndcg_at_k(ranked_relevance, k):
    if k < 1:
        raise ValueError("k must be at least 1")

    def dcg(rels):
        return sum((2 ** r - 1) / math.log2(i + 2) for i, r in enumerate(rels[:k]))

    ideal = dcg(sorted(ranked_relevance, reverse=True))
    return dcg(ranked_relevance) / ideal if ideal else 0.0
''',
        "intuition": """
## Not all hits are equal

A product search returns ten items. A perfect match is worth more than a loosely related one, and either is worth more on the first row than on the fifth. **Discounted cumulative gain** captures both. Each result earns a **gain** of `2^rel - 1` (relevance 3 earns 7, relevance 1 earns 1) and is divided by `log2(position + 1)`, so position 1 keeps its full gain, position 3 keeps half and position 7 keeps a third.

**nDCG** divides by the DCG of the ideal ordering, so a score of 1.0 means "the best possible order of these results". Putting the only relevant result last among three, as the second test does, scores 0.5.

## The cut-off trap

The ideal ranking is built from *all* the results, then cut to `k`. In the fourth test the best result sits at position 3, outside `k = 2`, so the actual top two earn little while the ideal top two contain the relevance-3 and relevance-2 items. Building the ideal from only the first `k` results would wrongly report a near-perfect score.

> **Remember:** gain `2^rel - 1`, discount `log2(position + 1)`, normalise by the ideal order of all results.
""",
    },
    {
        "id": "met-expected-calibration-error",
        "title": "Expected Calibration Error",
        "difficulty": "medium",
        "fn": "expected_calibration_error",
        "signature": "expected_calibration_error(confidences: list[float], correct: list[bool], n_bins: int) -> float",
        "starter": starter("expected_calibration_error(confidences, correct, n_bins)"),
        "mission": "Check whether a model's confidence means what it says: of the answers given with 80% confidence, are about 80% right?",
        "task": "Implement `expected_calibration_error(confidences, correct, n_bins)`. Split [0, 1] into `n_bins` equal-width bins; a confidence c goes in bin `min(int(c * n_bins), n_bins - 1)`. For each non-empty bin compute the mean confidence and the accuracy (fraction correct). ECE is the sum over bins of `(bin size / n) * |accuracy - mean confidence|`. Raise `ValueError` for empty input or n_bins < 1.",
        "constraints": ["Equal-width bins; a confidence of exactly 1.0 goes in the last bin.", "Empty bins contribute nothing.", "Weight each bin by its share of the samples."],
        "hints": {"small": "Collect (confidence, correct) pairs per bin index first.", "strong": "ece += len(bin) / n * abs(sum(correct) / len(bin) - sum(conf) / len(bin)).", "concept": "A model can be accurate and badly calibrated at the same time, and the reverse."},
        "tests": [
            {"label": "Perfectly calibrated bin", "input": {"confidences": [0.8, 0.8, 0.8, 0.8, 0.8], "correct": [True, True, True, True, False], "n_bins": 10}, "expect": 0},
            {"label": "Overconfident", "input": {"confidences": [0.95, 0.95, 0.95, 0.95], "correct": [True, False, True, False], "n_bins": 10}, "expect": 0.45},
            {"label": "Two bins", "input": {"confidences": [0.1, 0.2, 0.9, 1.0], "correct": [False, True, True, True], "n_bins": 2}},
            {"label": "Empty", "input": {"confidences": [], "correct": [], "n_bins": 5}, "error": "ValueError"},
            {"label": "Spread of confidences", "input": {"confidences": [0.55, 0.62, 0.71, 0.78, 0.83, 0.88, 0.91, 0.97, 0.99, 0.35], "correct": [True, False, True, True, False, True, True, True, False, False], "n_bins": 5}, "hidden": True},
        ],
        "solution": '''
def expected_calibration_error(confidences, correct, n_bins):
    if not confidences or n_bins < 1 or len(confidences) != len(correct):
        raise ValueError("need matching, non-empty inputs and n_bins >= 1")
    bins = {}
    for c, ok in zip(confidences, correct):
        b = min(int(c * n_bins), n_bins - 1)
        bins.setdefault(b, []).append((c, ok))
    n = len(confidences)
    ece = 0.0
    for items in bins.values():
        acc = sum(1 for _, ok in items if ok) / len(items)
        conf = sum(c for c, _ in items) / len(items)
        ece += len(items) / n * abs(acc - conf)
    return ece
''',
        "intuition": """
## Confidence is a claim you can check

A model that says "95% sure" should be right about 95% of the time it says so. Guo et al. (2017) showed that modern deep networks are often **overconfident**: a ResNet saying 95% might be right far less often. That matters whenever confidence drives a decision, such as routing low-confidence answers to a human.

**Expected calibration error** groups predictions by confidence into bins, compares each bin's average confidence with its actual accuracy, and averages the gaps weighted by bin size. Four answers at 95% confidence, two of them right, have accuracy 50% and a gap of 0.45.

## Calibration is not accuracy

The first test has an 80%-accurate model that says 80%, and its ECE is exactly 0. A 99%-accurate model that always says 100% has an ECE of 0.01. Fixes such as **temperature scaling** change confidence without changing which class is predicted, so they improve ECE and leave accuracy alone.

> **Remember:** bin by confidence, compare mean confidence with accuracy, weight by bin size. Report it next to accuracy, not instead of it.
""",
    },
    {
        "id": "met-average-precision",
        "title": "Average Precision From Scores",
        "difficulty": "medium",
        "fn": "average_precision",
        "signature": "average_precision(scores: list[float], labels: list[int]) -> float",
        "starter": starter("average_precision(scores, labels)"),
        "mission": "Summarise a precision-recall curve in one number by averaging the precision at each positive, the metric to use when positives are rare.",
        "task": "Implement `average_precision(scores, labels)`. Sort examples by score descending (ties broken by original index). Walking down the list, every time you reach a positive, record precision = positives so far / examples so far. Return the mean of the recorded precisions, i.e. the sum divided by the total number of positives. Raise `ValueError` if there are no positives.",
        "constraints": ["Sort by score descending, stable on ties.", "Divide by the number of positives, not the number of examples.", "Raise ValueError when no label is 1."],
        "hints": {"small": "order = sorted(range(n), key=lambda i: -scores[i]) is stable on ties.", "strong": "Keep a running count of positives; at each positive add hits / position.", "concept": "This is the non-interpolated area under the precision-recall curve, the same definition scikit-learn uses."},
        "tests": [
            {"label": "Positives ranked first", "input": {"scores": [0.9, 0.8, 0.2, 0.1], "labels": [1, 1, 0, 0]}, "expect": 1},
            {"label": "Positives ranked last", "input": {"scores": [0.9, 0.8, 0.2, 0.1], "labels": [0, 0, 1, 1]}, "expect": 0.41666666666666663},
            {"label": "Interleaved", "input": {"scores": [0.9, 0.7, 0.6, 0.3, 0.2], "labels": [1, 0, 1, 0, 1]}},
            {"label": "No positives", "input": {"scores": [0.5], "labels": [0]}, "error": "ValueError"},
            {"label": "Rare positives", "input": {"scores": [0.95, 0.9, 0.85, 0.8, 0.6, 0.55, 0.4, 0.3, 0.2, 0.1], "labels": [0, 1, 0, 0, 0, 1, 0, 0, 0, 0]}, "hidden": True},
        ],
        "solution": '''
def average_precision(scores, labels):
    total_pos = sum(1 for y in labels if y == 1)
    if total_pos == 0:
        raise ValueError("average precision needs at least one positive")
    order = sorted(range(len(scores)), key=lambda i: -scores[i])
    hits, ap = 0, 0.0
    for position, i in enumerate(order, start=1):
        if labels[i] == 1:
            hits += 1
            ap += hits / position
    return ap / total_pos
''',
        "intuition": """
## When ROC AUC looks too good

A fraud model sees one fraudulent transaction per thousand. ROC AUC compares the false-positive rate against the true-positive rate, and with 999 negatives per positive, ranking a few hundred legitimate transactions above the fraud barely moves the false-positive rate. AUC stays high while an analyst reviewing the top of the list sees mostly false alarms.

**Average precision** looks at the list the way that analyst does. Walk down the ranking; every time you reach a positive, write down the precision so far. Average those numbers. With both positives at the bottom of four, the precisions are 1/3 and 2/4, giving 0.417. Ranked first, they give 1.0.

## Divide by positives

Dividing by the number of examples instead of the number of positives is a common slip. It makes the metric depend on how many negatives you happened to include, which defeats the reason for using it.

> **Remember:** precision at each positive, averaged over positives. Use it instead of ROC AUC when positives are rare.
""",
    },
    {
        "id": "met-bleu",
        "title": "Sentence BLEU With Brevity Penalty",
        "difficulty": "hard",
        "fn": "sentence_bleu",
        "signature": "sentence_bleu(candidate: str, reference: str, max_n: int = 4) -> float",
        "starter": starter("sentence_bleu(candidate, reference, max_n=4)"),
        "mission": "Implement BLEU's two ideas, clipped n-gram precision and the brevity penalty, and see why a candidate that repeats one correct word cannot game it.",
        "task": "Implement `sentence_bleu(candidate, reference, max_n=4)`. Split both on whitespace. For n = 1..max_n, the clipped precision p_n is the sum over candidate n-grams of min(count in candidate, count in reference), divided by the number of candidate n-grams. If any p_n is 0 (or the candidate has fewer than n tokens), return 0.0. Otherwise BLEU = BP * exp(mean of log p_n), with BP = 1 if len(candidate) > len(reference) else exp(1 - len(reference) / len(candidate)).",
        "constraints": ["Clip each n-gram's count at its count in the reference.", "Uniform weights 1/max_n over n = 1..max_n.", "No smoothing: any zero precision gives 0.0."],
        "hints": {"small": "collections.Counter(zip(*[toks[i:] for i in range(n)])) counts n-grams.", "strong": "clipped = sum(min(c, ref_counts[g]) for g, c in cand_counts.items()).", "concept": "Precision rewards saying correct things; the brevity penalty stops a very short candidate from scoring well by saying almost nothing."},
        "tests": [
            {"label": "Identical sentences", "input": {"candidate": "the cat sat on the mat", "reference": "the cat sat on the mat"}, "expect": 1},
            {"label": "Repeating one word is clipped", "input": {"candidate": "the the the the", "reference": "the cat is here", "max_n": 1}, "expect": 0.25},
            {"label": "Short candidate pays the brevity penalty", "input": {"candidate": "the cat", "reference": "the cat sat on the mat", "max_n": 2}},
            {"label": "No shared 4-gram", "input": {"candidate": "a cat sat on a mat", "reference": "the cat sat on the mat"}, "expect": 0},
            {"label": "Close paraphrase, bigrams", "input": {"candidate": "the quick brown fox jumped over the dog", "reference": "the quick brown fox jumps over the lazy dog", "max_n": 2}, "hidden": True},
        ],
        "solution": '''
import math
from collections import Counter

def sentence_bleu(candidate, reference, max_n=4):
    cand, ref = candidate.split(), reference.split()
    if not cand:
        return 0.0

    def ngrams(toks, n):
        return Counter(tuple(toks[i:i + n]) for i in range(len(toks) - n + 1))

    log_sum = 0.0
    for n in range(1, max_n + 1):
        c, r = ngrams(cand, n), ngrams(ref, n)
        total = sum(c.values())
        clipped = sum(min(count, r[g]) for g, count in c.items())
        if total == 0 or clipped == 0:
            return 0.0
        log_sum += math.log(clipped / total)
    bp = 1.0 if len(cand) > len(ref) else math.exp(1 - len(ref) / len(cand))
    return bp * math.exp(log_sum / max_n)
''',
        "intuition": """
## Two ways to cheat a precision score

**BLEU** (Papineni et al., 2002) scores a machine translation by how many of its n-grams appear in a reference. Plain precision has two easy exploits. Repeat a common word: `the the the the` has unigram precision 4/4 against any reference containing "the". Or say almost nothing: `the cat` has perfect precision against a six-word reference.

BLEU closes both. **Clipping** caps each n-gram's credit at the number of times it appears in the reference, so the four "the"s earn credit for one, and precision is 1/4. The **brevity penalty** multiplies the score by `exp(1 - ref_len / cand_len)` when the candidate is shorter, so `the cat` against six words is scaled by `exp(-2) = 0.135`.

## Why sentence BLEU is harsh

BLEU combines precisions for n = 1 to 4 with a geometric mean, so one zero makes the score zero. Change two words in a six-word sentence and no 4-gram may survive, as the fourth test shows. BLEU was designed for whole test sets, where counts are pooled before dividing; per-sentence scores use smoothing for this reason.

> **Remember:** clipped n-gram precision, geometric mean over n, times a brevity penalty. Report corpus BLEU, not an average of sentence scores.
""",
    },
]
