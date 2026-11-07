SET = {
    "title": "Loss Functions",
    "learn": {"title": "Loss functions", "route": "/docs/deep-learning/loss-functions", "description": "What each loss rewards and punishes, and how its gradient shapes training."},
}


def starter(sig, numpy=False):
    head = "import numpy as np\n\n" if numpy else ""
    return f"{head}def {sig}:\n    # Your code here\n    pass\n"


PROBLEMS = [
    {
        "id": "loss-huber",
        "title": "Huber Loss and Its Gradient",
        "difficulty": "easy",
        "fn": "huber",
        "signature": "huber(preds: list[float], targets: list[float], delta: float = 1.0) -> dict",
        "starter": starter("huber(preds, targets, delta=1.0)"),
        "mission": "Write a regression loss that is squared for small errors and linear for large ones, so a few outliers cannot dominate the gradient.",
        "task": "Implement `huber(preds, targets, delta=1.0)`. With error e = pred - target: the loss is `0.5 * e**2` if `|e| <= delta`, else `delta * (|e| - 0.5 * delta)`. Return `{\"loss\": mean loss, \"grad\": [d mean loss / d pred_i]}`. The per-element gradient is `e` inside the band and `delta * sign(e)` outside, divided by n. Raise `ValueError` on empty or mismatched inputs.",
        "constraints": ["Mean over elements, and the gradient of the mean (divide by n).", "At |e| == delta use the quadratic branch.", "Raise ValueError on empty or mismatched lists."],
        "hints": {"small": "Compute e = p - t per element and branch on abs(e) <= delta.", "strong": "Outside the band the gradient is capped at +/- delta / n regardless of how large e is.", "concept": "The two branches meet with the same value and slope at |e| = delta, so the loss is smooth."},
        "tests": [
            {"label": "Small errors are half squared", "input": {"preds": [1, 2], "targets": [1.5, 2]}, "expect": {"loss": 0.0625, "grad": [-0.25, 0]}},
            {"label": "Outlier contributes linearly", "input": {"preds": [10], "targets": [0], "delta": 1}, "expect": {"loss": 9.5, "grad": [1]}},
            {"label": "Empty", "input": {"preds": [], "targets": []}, "error": "ValueError"},
            {"label": "Mixed errors with delta 2", "input": {"preds": [0, 3, -5, 1], "targets": [1, 0, 0, 1], "delta": 2}, "hidden": True},
        ],
        "solution": '''
def huber(preds, targets, delta=1.0):
    if not preds or len(preds) != len(targets):
        raise ValueError("need equal-length, non-empty inputs")
    n = len(preds)
    loss, grad = 0.0, []
    for p, t in zip(preds, targets):
        e = p - t
        if abs(e) <= delta:
            loss += 0.5 * e * e
            grad.append(e / n)
        else:
            loss += delta * (abs(e) - 0.5 * delta)
            grad.append(delta * (1 if e > 0 else -1) / n)
    return {"loss": loss / n, "grad": grad}
''',
        "intuition": """
## One bad label, a hundred times the gradient

Mean squared error has gradient `e`. A label that is off by 100 pushes 100 times harder than one that is off by 1, so a handful of mislabelled points can steer the whole fit. Mean absolute error caps the push, but its gradient never shrinks near zero, which makes the final convergence jittery.

**Huber loss** (Huber, 1964) uses each where it is good: `0.5 e^2` while `|e| <= delta`, and a straight line beyond. The two pieces join with the same value and the same slope at `|e| = delta`, so there is no kink. An outlier at `e = 10` with `delta = 1` contributes a loss of 9.5 and a gradient of exactly 1, not 10.

## Choosing delta

`delta` is in the units of the target. Errors smaller than `delta` are treated as noise to fit precisely; larger ones are treated as suspicious. Smooth L1 loss in object detection is Huber loss with `delta = 1`.

> **Remember:** Huber is MSE near zero and MAE in the tails. Its gradient is capped at `delta`.
""",
    },
    {
        "id": "loss-label-smoothing",
        "title": "Cross-Entropy With Label Smoothing",
        "difficulty": "medium",
        "fn": "smoothed_cross_entropy",
        "signature": "smoothed_cross_entropy(logits: list[list[float]], targets: list[int], smoothing: float) -> float",
        "starter": starter("smoothed_cross_entropy(logits, targets, smoothing)"),
        "mission": "Train against a softened target, 1 - smoothing on the true class and the rest spread evenly, so the model stops pushing its logits towards infinity.",
        "task": "Implement `smoothed_cross_entropy(logits, targets, smoothing)`. For each row with K classes, the target distribution puts `1 - smoothing + smoothing / K` on the true class and `smoothing / K` on every other class. The loss is the mean over rows of `-sum(q_k * log_softmax(logits)_k)`. Use a stable log-softmax. Raise `ValueError` if smoothing is outside [0, 1).",
        "constraints": ["smoothing = 0 must equal ordinary cross-entropy.", "Compute log-softmax as x - max - log(sum(exp(x - max))).", "Average over rows."],
        "hints": {"small": "Every class gets smoothing / K; the true class gets 1 - smoothing on top.", "strong": "loss_row = -(1 - smoothing) * logp[target] - (smoothing / K) * sum(logp).", "concept": "With smoothing, the loss is minimised by finite logits, so the model cannot become arbitrarily confident."},
        "tests": [
            {"label": "No smoothing is plain cross-entropy", "input": {"logits": [[2, 0, 0]], "targets": [0], "smoothing": 0}},
            {"label": "Smoothing penalises confident logits", "input": {"logits": [[20, 0, 0]], "targets": [0], "smoothing": 0.1}},
            {"label": "Batch of two", "input": {"logits": [[1, 2, 3], [0, 0, 5]], "targets": [2, 0], "smoothing": 0.2}},
            {"label": "Smoothing out of range", "input": {"logits": [[1, 2]], "targets": [0], "smoothing": 1}, "error": "ValueError"},
            {"label": "Four classes", "input": {"logits": [[0.5, -1, 2, 0], [3, 3, -2, 1], [0, 0, 0, 0]], "targets": [2, 1, 3], "smoothing": 0.1}, "hidden": True},
        ],
        "solution": '''
import math

def smoothed_cross_entropy(logits, targets, smoothing):
    if not 0 <= smoothing < 1:
        raise ValueError("smoothing must be in [0, 1)")
    total = 0.0
    for row, t in zip(logits, targets):
        k = len(row)
        m = max(row)
        log_z = m + math.log(sum(math.exp(x - m) for x in row))
        logp = [x - log_z for x in row]
        total += -(1 - smoothing) * logp[t] - (smoothing / k) * sum(logp)
    return total / len(logits)
''',
        "intuition": """
## The model chases a target it can never reach

With a one-hot target, cross-entropy keeps falling as the true-class logit grows, all the way to infinity. A classifier trained long enough learns to be 99.99% sure of everything, including its mistakes, and its probabilities stop meaning anything.

**Label smoothing** (Szegedy et al., 2016) replaces the one-hot target with `1 - smoothing` on the true class plus `smoothing / K` spread over all K classes. Now the loss has a finite minimum. Take logits of `[20, 0, 0]` for the true class 0. Without smoothing they cost about `4e-9` nats, so nothing stops the model from pushing further. With `smoothing = 0.1` the same logits cost 1.33 nats (second test), because the target says the other classes deserve some mass.

## What it trades

Label smoothing usually improves calibration and slightly improves accuracy, and the original transformer used `0.1` (Vaswani et al., 2017). It also makes the logits less informative for knowledge distillation, because the teacher's relative probabilities for wrong classes get flattened (Müller et al., 2019).

> **Remember:** smoothed loss = `(1 - s) * CE(true) + s * mean over classes of -log p`.
""",
    },
    {
        "id": "loss-focal",
        "title": "Binary Focal Loss",
        "difficulty": "medium",
        "fn": "focal_loss",
        "signature": "focal_loss(probs: list[float], labels: list[int], gamma: float = 2.0, alpha: float = 0.25) -> float",
        "starter": starter("focal_loss(probs, labels, gamma=2.0, alpha=0.25)"),
        "mission": "Down-weight the easy examples that dominate an imbalanced dataset, so training focuses on the hard ones.",
        "task": "Implement `focal_loss(probs, labels, gamma=2.0, alpha=0.25)`. `probs[i]` is the predicted probability of the positive class. Let `p_t = p` if the label is 1 else `1 - p`, and `alpha_t = alpha` for label 1 else `1 - alpha`. The per-example loss is `-alpha_t * (1 - p_t)**gamma * log(p_t)`. Clip p_t into [1e-7, 1] before the log. Return the mean.",
        "constraints": ["gamma = 0 and alpha = 0.5 give half the ordinary binary cross-entropy.", "Clip p_t at 1e-7 so log never sees 0.", "Return the mean over examples."],
        "hints": {"small": "Compute p_t and alpha_t per example first; the formula is then one line.", "strong": "An easy example with p_t = 0.99 is scaled by (0.01)**2 = 0.0001.", "concept": "The (1 - p_t)**gamma factor is what makes the loss focus on misclassified examples."},
        "tests": [
            {"label": "gamma 0, alpha 0.5 is half BCE", "input": {"probs": [0.8], "labels": [1], "gamma": 0, "alpha": 0.5}},
            {"label": "Easy example almost vanishes", "input": {"probs": [0.99], "labels": [1]}},
            {"label": "Hard negative dominates", "input": {"probs": [0.9, 0.01, 0.02], "labels": [0, 0, 0]}},
            {"label": "Perfectly wrong is clipped, not infinite", "input": {"probs": [0], "labels": [1]}, "hidden": True},
        ],
        "solution": '''
import math

def focal_loss(probs, labels, gamma=2.0, alpha=0.25):
    total = 0.0
    for p, y in zip(probs, labels):
        p_t = p if y == 1 else 1 - p
        a_t = alpha if y == 1 else 1 - alpha
        p_t = min(max(p_t, 1e-7), 1.0)
        total += -a_t * (1 - p_t) ** gamma * math.log(p_t)
    return total / len(probs)
''',
        "intuition": """
## A million easy negatives

A one-stage object detector scores around 100,000 candidate boxes per image, and almost all of them are background. Each easy background box has a small cross-entropy loss, but there are so many that together they swamp the few boxes containing objects. **Focal loss** (Lin et al., 2017) multiplies each example's loss by `(1 - p_t)^gamma`, where `p_t` is the probability the model gave the correct answer.

An easy example with `p_t = 0.99` at `gamma = 2` is scaled by `0.01^2 = 0.0001`. A hard one at `p_t = 0.1` keeps `0.81` of its loss. In the third test, two easy negatives and one confidently wrong negative: nearly all of the loss comes from the wrong one.

## alpha is a separate knob

`alpha` re-weights positives against negatives. The paper's best setting was `gamma = 2, alpha = 0.25`; the low alpha on positives looks backwards, but the focusing term has already removed most of the easy negatives' weight.

> **Remember:** focal loss = `alpha_t * (1 - p_t)^gamma * CE`. `gamma = 0` recovers weighted cross-entropy.
""",
    },
    {
        "id": "loss-infonce",
        "title": "InfoNCE Contrastive Loss",
        "difficulty": "hard",
        "numpy": True,
        "fn": "info_nce",
        "signature": "info_nce(a: list[list[float]], b: list[list[float]], temperature: float) -> float",
        "starter": starter("info_nce(a, b, temperature)", numpy=True),
        "mission": "Write the loss behind CLIP and most embedding models: each item must pick out its own partner from everything else in the batch.",
        "task": "Implement `info_nce(a, b, temperature)`. `a[i]` and `b[i]` are a positive pair; every other row of `b` is a negative for `a[i]`. L2-normalise every row, compute the (n, n) similarity matrix `a @ b.T / temperature`, and return the symmetric loss: the mean of (cross-entropy of each row against target i) and (cross-entropy of each column against target i). Raise `ValueError` if temperature <= 0 or the batch shapes differ.",
        "constraints": ["Normalise rows first, so similarities are cosines.", "Symmetric: average the a-to-b and b-to-a losses.", "Use a stable log-softmax."],
        "hints": {"small": "The targets are the diagonal: row i's correct column is i.", "strong": "loss_ab = mean(-diag(log_softmax(S, axis=1))); loss_ba uses axis=0. Return (loss_ab + loss_ba) / 2.", "concept": "Every other item in the batch is a free negative, which is why contrastive training likes large batches."},
        "tests": [
            {"label": "Perfectly aligned pairs", "input": {"a": [[1, 0], [0, 1]], "b": [[1, 0], [0, 1]], "temperature": 0.1}},
            {"label": "Swapped pairs are expensive", "input": {"a": [[1, 0], [0, 1]], "b": [[0, 1], [1, 0]], "temperature": 0.1}},
            {"label": "Higher temperature, softer loss", "input": {"a": [[1, 0], [0, 1]], "b": [[1, 0], [0, 1]], "temperature": 1}},
            {"label": "Bad temperature", "input": {"a": [[1]], "b": [[1]], "temperature": 0}, "error": "ValueError"},
            {"label": "Batch of three, unnormalised", "input": {"a": [[2, 0, 1], [0, 3, 0], [1, 1, 1]], "b": [[1, 0, 1], [0, 1, 0.5], [2, 2, 1]], "temperature": 0.07}, "hidden": True},
        ],
        "solution": '''
import numpy as np

def info_nce(a, b, temperature):
    a, b = np.asarray(a, dtype=float), np.asarray(b, dtype=float)
    if temperature <= 0 or a.shape != b.shape:
        raise ValueError("need temperature > 0 and matching shapes")
    a = a / np.linalg.norm(a, axis=1, keepdims=True)
    b = b / np.linalg.norm(b, axis=1, keepdims=True)
    s = a @ b.T / temperature                     # (n, n), positives on the diagonal

    def log_softmax(x, axis):
        m = x.max(axis=axis, keepdims=True)
        return x - m - np.log(np.exp(x - m).sum(axis=axis, keepdims=True))

    loss_ab = -np.diag(log_softmax(s, axis=1)).mean()
    loss_ba = -np.diag(log_softmax(s, axis=0)).mean()
    return float((loss_ab + loss_ba) / 2)
''',
        "intuition": """
## Classification where the classes are the batch

An image encoder and a text encoder should put a photo and its caption close together. **InfoNCE** turns that into a classification problem: for image `i`, the "classes" are all `n` captions in the batch, and the correct class is caption `i`. The similarity matrix's diagonal holds the positives; everything off the diagonal is a negative. CLIP (Radford et al., 2021) trained on batches of 32,768 pairs, so every image was compared against 32,767 wrong captions at no extra labelling cost.

## Two details that matter

**Normalise first.** Without it, the model can lower the loss by making vectors longer, which says nothing about direction. **Temperature** divides the cosines; at `0.1` a cosine gap of 1 becomes a logit gap of 10, sharp enough for the softmax to separate pairs. Compare the aligned pairs at temperature 0.1 and 1.0: same embeddings, very different loss. CLIP learns the temperature as a parameter.

The loss is symmetric: images pick captions (rows) and captions pick images (columns), averaged.

> **Remember:** normalise, similarity matrix over temperature, cross-entropy with the diagonal as targets, both directions.
""",
    },
    {
        "id": "loss-distillation-kl",
        "title": "Distillation Loss With Temperature",
        "difficulty": "medium",
        "fn": "distillation_loss",
        "signature": "distillation_loss(student_logits: list[float], teacher_logits: list[float], temperature: float) -> float",
        "starter": starter("distillation_loss(student_logits, teacher_logits, temperature)"),
        "mission": "Train a small model to match a large model's whole output distribution, softened by a temperature so the small probabilities carry signal.",
        "task": "Implement `distillation_loss(student_logits, teacher_logits, temperature)`. Soften both with `softmax(logits / T)`, compute `KL(teacher || student) = sum(p_t * (log p_t - log p_s))`, and multiply by `T**2`. Raise `ValueError` if T <= 0 or the lengths differ.",
        "constraints": ["KL direction: the teacher's distribution is the target.", "Multiply by T squared.", "Use stable log-softmax for both."],
        "hints": {"small": "log_softmax(x / T) for teacher and student, then exp the teacher's to get p_t.", "strong": "Terms where p_t is 0 contribute 0; with finite logits p_t is never exactly 0.", "concept": "Gradients of the softened loss scale as 1 / T^2, and multiplying by T^2 keeps them comparable across temperatures."},
        "tests": [
            {"label": "Identical logits cost nothing", "input": {"student_logits": [1, 2, 3], "teacher_logits": [1, 2, 3], "temperature": 2}, "expect": 0},
            {"label": "Temperature 1", "input": {"student_logits": [0, 0, 0], "teacher_logits": [3, 1, 0], "temperature": 1}},
            {"label": "Temperature 4 reveals the dark knowledge", "input": {"student_logits": [5, 0, 0], "teacher_logits": [5, 2, -2], "temperature": 4}},
            {"label": "Bad temperature", "input": {"student_logits": [1], "teacher_logits": [1], "temperature": 0}, "error": "ValueError"},
            {"label": "Five classes", "input": {"student_logits": [0.2, 1.5, -0.3, 2.2, 0], "teacher_logits": [0.1, 2.5, -1, 1.8, 0.4], "temperature": 3}, "hidden": True},
        ],
        "solution": '''
import math

def distillation_loss(student_logits, teacher_logits, temperature):
    if temperature <= 0 or len(student_logits) != len(teacher_logits):
        raise ValueError("need temperature > 0 and equal lengths")

    def log_softmax(xs):
        xs = [x / temperature for x in xs]
        m = max(xs)
        log_z = m + math.log(sum(math.exp(x - m) for x in xs))
        return [x - log_z for x in xs]

    lt, ls = log_softmax(teacher_logits), log_softmax(student_logits)
    kl = sum(math.exp(t) * (t - s) for t, s in zip(lt, ls))
    return kl * temperature ** 2
''',
        "intuition": """
## The teacher's wrong answers are informative

A large classifier that sees a photo of a cat might give "cat" 0.95, "dog" 0.04 and "car" 0.0001. The hard label only says "cat". The teacher's full distribution also says a cat looks much more like a dog than like a car, which Hinton et al. (2015) called **dark knowledge**. A student trained to match the whole distribution learns that structure.

At temperature 1 those small probabilities are almost invisible to the loss. Dividing logits by `T > 1` before the softmax flattens both distributions, so the 0.04 and the 0.0001 become meaningfully different targets. In the third test the student already agrees with the teacher's top class, but at `T = 4` the loss still sees that it ranks the other two classes the same while the teacher does not.

## Why multiply by T squared

Softening divides the logits by `T`, and the gradient of the softened KL with respect to the student's logits shrinks by roughly `1 / T^2`. Multiplying by `T^2` keeps the distillation term on a comparable scale when you change `T` or mix it with an ordinary cross-entropy term.

> **Remember:** KL from teacher to student, both softened by `T`, scaled by `T^2`.
""",
    },
    {
        "id": "loss-triplet",
        "title": "Triplet Margin Loss",
        "difficulty": "easy",
        "fn": "triplet_loss",
        "signature": "triplet_loss(anchors: list[list[float]], positives: list[list[float]], negatives: list[list[float]], margin: float) -> dict",
        "starter": starter("triplet_loss(anchors, positives, negatives, margin)"),
        "mission": "Pull an anchor towards a matching example and push it away from a non-matching one until they are separated by a margin, the loss used for face and speaker verification.",
        "task": "Implement `triplet_loss(anchors, positives, negatives, margin)`. For each triplet, with Euclidean distances `d_ap` and `d_an`, the loss is `max(0, d_ap - d_an + margin)`. Return `{\"loss\": mean loss, \"active\": number of triplets with loss > 0}`. Raise `ValueError` if the three lists differ in length or are empty.",
        "constraints": ["Euclidean (L2) distance, not squared.", "A triplet that already satisfies the margin contributes 0.", "Count active triplets: they are the only ones producing gradient."],
        "hints": {"small": "math.dist(a, p) gives the Euclidean distance.", "strong": "per = max(0.0, d_ap - d_an + margin); active counts per > 0.", "concept": "Once most triplets are inactive, training stalls; that is why mining hard negatives matters."},
        "tests": [
            {"label": "Already separated", "input": {"anchors": [[0, 0]], "positives": [[1, 0]], "negatives": [[5, 0]], "margin": 1}, "expect": {"loss": 0, "active": 0}},
            {"label": "Negative too close", "input": {"anchors": [[0, 0]], "positives": [[1, 0]], "negatives": [[1.5, 0]], "margin": 1}, "expect": {"loss": 0.5, "active": 1}},
            {"label": "Empty", "input": {"anchors": [], "positives": [], "negatives": [], "margin": 1}, "error": "ValueError"},
            {"label": "Mixed batch", "input": {"anchors": [[0, 0], [1, 1], [2, 0]], "positives": [[0, 1], [1, 2], [2, 3]], "negatives": [[0, 3], [1, 1.5], [3, 0]], "margin": 0.5}, "hidden": True},
        ],
        "solution": '''
import math

def triplet_loss(anchors, positives, negatives, margin):
    if not anchors or not (len(anchors) == len(positives) == len(negatives)):
        raise ValueError("need three equal-length, non-empty lists")
    losses = []
    for a, p, n in zip(anchors, positives, negatives):
        losses.append(max(0.0, math.dist(a, p) - math.dist(a, n) + margin))
    return {"loss": sum(losses) / len(losses), "active": sum(1 for l in losses if l > 0)}
''',
        "intuition": """
## Distances instead of classes

A face-verification system cannot have one class per person: new people appear every day. Instead it learns an embedding where photos of the same person are close and photos of different people are far apart. **Triplet loss** (Schroff et al., 2015, FaceNet) trains this with three examples at a time: an anchor, a positive of the same identity, and a negative of a different one.

The loss is `max(0, d_ap - d_an + margin)`. It is zero once the negative is at least `margin` further from the anchor than the positive. With the positive at distance 1 and the negative at 1.5, the gap is only 0.5, short of a margin of 1, so the loss is 0.5.

## Most triplets teach nothing

Random triplets are usually already separated, so their loss and gradient are exactly zero. That is why this function reports how many are **active**. If the active count falls towards zero, training stalls even though the model is far from good. FaceNet selects **semi-hard negatives**: negatives that are further than the positive but still inside the margin.

> **Remember:** triplet loss only learns from triplets inside the margin. Watch the active count, and mine harder negatives when it drops.
""",
    },
]

# Easiest first, the order the catalogue lists them.
_ORDER = ["loss-huber", "loss-triplet", "loss-label-smoothing", "loss-focal", "loss-distillation-kl", "loss-infonce"]
PROBLEMS.sort(key=lambda p: _ORDER.index(p["id"]))
