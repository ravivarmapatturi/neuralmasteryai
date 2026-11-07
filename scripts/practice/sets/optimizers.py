SET = {
    "title": "Optimizers",
    "learn": {"title": "Optimizers", "route": "/docs/deep-learning/optimizers", "description": "SGD, momentum, adaptive methods and schedules, and when each one helps."},
}


def starter(sig):
    return f"def {sig}:\n    # Your code here\n    pass\n"


PROBLEMS = [
    {
        "id": "opt-clip-grad-norm",
        "title": "Clip Gradients by Global Norm",
        "difficulty": "easy",
        "fn": "clip_grad_norm",
        "signature": "clip_grad_norm(grads: list[list[float]], max_norm: float) -> dict",
        "starter": starter("clip_grad_norm(grads, max_norm)"),
        "mission": "Stop one bad batch from wrecking training: if the gradient over all parameters is longer than max_norm, scale every gradient down by the same factor.",
        "task": "Implement `clip_grad_norm(grads, max_norm)`. `grads` is a list of gradient vectors, one per parameter tensor. Compute the global L2 norm over all of them together. If it exceeds `max_norm`, multiply every entry by `max_norm / total_norm`; otherwise leave them unchanged. Return `{\"total_norm\": norm before clipping, \"grads\": clipped grads}`. Raise `ValueError` if `max_norm <= 0`.",
        "constraints": ["One norm over every parameter, not one per tensor.", "The same scale factor for every entry, so the direction is unchanged.", "Report the norm measured before clipping."],
        "hints": {"small": "total_norm = sqrt(sum of g * g over every entry of every vector).", "strong": "scale = max_norm / total_norm only when total_norm > max_norm.", "concept": "Clipping by global norm keeps the update direction and only limits its length."},
        "tests": [
            {"label": "3-4-5 gets halved", "input": {"grads": [[3], [4]], "max_norm": 2.5}, "expect": {"total_norm": 5, "grads": [[1.5], [2]]}},
            {"label": "Under the limit is unchanged", "input": {"grads": [[0.1, 0.2], [0.2]], "max_norm": 1}, "expect": {"total_norm": 0.3, "grads": [[0.1, 0.2], [0.2]]}},
            {"label": "Bad max_norm", "input": {"grads": [[1]], "max_norm": 0}, "error": "ValueError"},
            {"label": "Exploding layer", "input": {"grads": [[0.5, -0.5, 0.1], [120, -80], [0.01]], "max_norm": 1}, "hidden": True},
        ],
        "solution": '''
import math

def clip_grad_norm(grads, max_norm):
    if max_norm <= 0:
        raise ValueError("max_norm must be positive")
    total = math.sqrt(sum(g * g for vec in grads for g in vec))
    scale = max_norm / total if total > max_norm else 1.0
    return {"total_norm": total, "grads": [[g * scale for g in vec] for vec in grads]}
''',
        "intuition": """
## One spike, one ruined run

Most training steps have modest gradients. Occasionally a batch with an unusual example, or a loss that briefly explodes, produces a gradient hundreds of times larger, and a single update throws the weights far from where they were. Large language model training runs report loss spikes like this as a routine problem.

**Gradient clipping by global norm** treats all parameters as one long vector. If its length exceeds `max_norm`, every entry is multiplied by `max_norm / norm`. With gradients 3 and 4 the norm is 5; at `max_norm = 2.5` both are halved. The update still points the same way; only its length is capped.

## Global, not per tensor

Clipping each tensor separately changes the direction of the update, because tensors are scaled by different factors. `torch.nn.utils.clip_grad_norm_` uses one global norm, and a `max_norm` of 1.0 is a common default in transformer training recipes.

> **Remember:** measure one norm over everything, scale everything by the same factor, and log the pre-clip norm. A rising pre-clip norm is an early warning.
""",
    },
    {
        "id": "opt-rmsprop",
        "title": "RMSProp Step",
        "difficulty": "easy",
        "fn": "rmsprop_step",
        "signature": "rmsprop_step(params: list[float], grads: list[float], sq_avg: list[float], lr: float, alpha: float = 0.99, eps: float = 1e-8) -> dict",
        "starter": starter("rmsprop_step(params, grads, sq_avg, lr, alpha=0.99, eps=1e-8)"),
        "mission": "Give every parameter its own step size by dividing by a running average of its squared gradients.",
        "task": "Implement `rmsprop_step(params, grads, sq_avg, lr, alpha=0.99, eps=1e-8)`. For each index: `sq = alpha * sq_avg + (1 - alpha) * g**2`, then `p = p - lr * g / (sqrt(sq) + eps)`. Return `{\"params\": [...], \"sq_avg\": [...]}`. Raise `ValueError` if the three lists differ in length.",
        "constraints": ["Update the squared average before using it.", "eps is added after the square root.", "Do not modify the input lists."],
        "hints": {"small": "Work element by element with zip(params, grads, sq_avg).", "strong": "On the first step from sq_avg = 0, sqrt(sq) = sqrt(1 - alpha) * |g|, so the step is about lr / sqrt(1 - alpha), 10x lr at alpha = 0.99.", "concept": "Dividing by the RMS of recent gradients equalises step sizes across parameters with very different gradient scales."},
        "tests": [
            {"label": "First step from zero state", "input": {"params": [1], "grads": [0.5], "sq_avg": [0], "lr": 0.01, "alpha": 0.9}},
            {"label": "Different scales, similar steps", "input": {"params": [0, 0], "grads": [100, 0.01], "sq_avg": [10000, 0.0001], "lr": 0.1}},
            {"label": "Length mismatch", "input": {"params": [1, 2], "grads": [1], "sq_avg": [0, 0], "lr": 0.1}, "error": "ValueError"},
            {"label": "Zero gradient decays the average", "input": {"params": [3, -1], "grads": [0, 2], "sq_avg": [4, 1], "lr": 0.05, "alpha": 0.5}, "hidden": True},
        ],
        "solution": '''
import math

def rmsprop_step(params, grads, sq_avg, lr, alpha=0.99, eps=1e-8):
    if not (len(params) == len(grads) == len(sq_avg)):
        raise ValueError("params, grads and sq_avg must have the same length")
    new_p, new_sq = [], []
    for p, g, s in zip(params, grads, sq_avg):
        s = alpha * s + (1 - alpha) * g * g
        new_p.append(p - lr * g / (math.sqrt(s) + eps))
        new_sq.append(s)
    return {"params": new_p, "sq_avg": new_sq}
''',
        "intuition": """
## One learning rate does not fit every parameter

An embedding row for a rare word gets a gradient of 0.01 when it appears; a bias in the last layer gets gradients near 100. With one global learning rate, the first barely moves and the second overshoots. **RMSProp** (Hinton, 2012 lecture notes) divides each parameter's step by the root mean square of its recent gradients. A parameter with consistently large gradients takes proportionally smaller steps.

In the second test both gradients are already at their typical size, so both parameters move by almost exactly `lr`, even though the gradients differ by a factor of 10,000.

## The first-step surprise

Starting from `sq_avg = 0`, the average after one step is only `(1 - alpha) * g^2`. With `alpha = 0.99` the denominator is `0.1 * |g|`, so the first step is 10 times `lr`. Adam's bias correction exists to fix exactly this.

> **Remember:** RMSProp keeps a decaying average of `g^2` per parameter and divides by its square root.
""",
    },
    {
        "id": "opt-nesterov",
        "title": "Nesterov Momentum",
        "difficulty": "medium",
        "fn": "nesterov_minimize",
        "signature": "nesterov_minimize(a: float, b: float, x0: list[float], lr: float, momentum: float, steps: int) -> list[float]",
        "starter": starter("nesterov_minimize(a, b, x0, lr, momentum, steps)"),
        "mission": "Run Nesterov momentum on a simple bowl and see why evaluating the gradient at the look-ahead point damps the oscillation plain momentum suffers from.",
        "task": "Minimise f(x, y) = a*x**2 + b*y**2 from `x0 = [x, y]`. Keep a velocity `v` starting at zero. Each step: evaluate the gradient at the look-ahead point `p + momentum * v`, then `v = momentum * v - lr * grad`, then `p = p + v`. After `steps` steps return `[x, y, f(x, y)]`. Raise `ValueError` if `a` or `b` is not positive.",
        "constraints": ["The gradient of a*x**2 + b*y**2 is [2*a*x, 2*b*y].", "Evaluate the gradient at the look-ahead point, not at p.", "Velocity starts at [0, 0]."],
        "hints": {"small": "look = [p[i] + momentum * v[i] for i in range(2)].", "strong": "grad = [2 * a * look[0], 2 * b * look[1]]; update v, then p.", "concept": "Plain momentum measures the slope where you are; Nesterov measures it where momentum is about to take you."},
        "tests": [
            {"label": "Zero momentum is gradient descent", "input": {"a": 1, "b": 1, "x0": [1, 1], "lr": 0.25, "momentum": 0, "steps": 1}, "expect": [0.5, 0.5, 0.5]},
            {"label": "Ill-conditioned bowl", "input": {"a": 1, "b": 25, "x0": [5, 1], "lr": 0.015, "momentum": 0.9, "steps": 60}},
            {"label": "Bad curvature", "input": {"a": 0, "b": 1, "x0": [1, 1], "lr": 0.1, "momentum": 0.9, "steps": 1}, "error": "ValueError"},
            {"label": "Long run", "input": {"a": 0.5, "b": 10, "x0": [-3, 2], "lr": 0.02, "momentum": 0.95, "steps": 200}, "hidden": True},
        ],
        "solution": '''
def nesterov_minimize(a, b, x0, lr, momentum, steps):
    if a <= 0 or b <= 0:
        raise ValueError("a and b must be positive")
    p = list(x0)
    v = [0.0, 0.0]
    for _ in range(steps):
        look = [p[0] + momentum * v[0], p[1] + momentum * v[1]]
        grad = [2 * a * look[0], 2 * b * look[1]]
        v = [momentum * v[i] - lr * grad[i] for i in range(2)]
        p = [p[i] + v[i] for i in range(2)]
    return [p[0], p[1], a * p[0] ** 2 + b * p[1] ** 2]
''',
        "intuition": """
## Narrow valleys make gradient descent zig-zag

On `f = x^2 + 25 y^2` the slope in `y` is 25 times steeper than in `x`. A learning rate small enough not to blow up in `y` crawls in `x`. **Momentum** fixes the crawl by accumulating a velocity: consistent gradients in `x` add up step after step. But in `y` the velocity overshoots the valley floor, comes back, and overshoots again.

**Nesterov momentum** (Nesterov, 1983; Sutskever et al., 2013 for deep learning) changes one thing: it computes the gradient at `p + momentum * v`, the point momentum is about to carry you to. If that point is already past the valley floor, the gradient there points back, and the velocity is corrected one step earlier than plain momentum would manage.

## Same cost, better behaviour

Nesterov needs exactly one gradient per step, like plain momentum. PyTorch exposes it as `SGD(..., momentum=0.9, nesterov=True)`. With `momentum = 0` both reduce to plain gradient descent, which the first test checks.

> **Remember:** look ahead by `momentum * v`, take the gradient there, update the velocity, then move.
""",
    },
    {
        "id": "opt-lion",
        "title": "Lion: A Sign-Based Update",
        "difficulty": "medium",
        "fn": "lion_step",
        "signature": "lion_step(params: list[float], grads: list[float], m: list[float], lr: float, beta1: float = 0.9, beta2: float = 0.99, weight_decay: float = 0.0) -> dict",
        "starter": starter("lion_step(params, grads, m, lr, beta1=0.9, beta2=0.99, weight_decay=0.0)"),
        "mission": "Implement Lion, an optimizer found by program search that keeps one moment instead of Adam's two and moves every parameter by exactly lr per step.",
        "task": "Implement `lion_step(params, grads, m, lr, beta1=0.9, beta2=0.99, weight_decay=0.0)`. For each index: `c = beta1 * m + (1 - beta1) * g`; `p = p - lr * (sign(c) + weight_decay * p)`; then `m = beta2 * m + (1 - beta2) * g`. sign(0) is 0. Return `{\"params\": [...], \"m\": [...]}`.",
        "constraints": ["The update direction uses beta1; the stored moment uses beta2.", "sign(0) = 0.", "Weight decay is decoupled: lr * weight_decay * p, as in AdamW."],
        "hints": {"small": "sign = 1 if c > 0 else -1 if c < 0 else 0.", "strong": "Compute the update from the old m, then update m.", "concept": "Every coordinate moves by lr regardless of gradient size, so Lion typically needs a 3-10x smaller learning rate than AdamW."},
        "tests": [
            {"label": "Every coordinate moves by lr", "input": {"params": [1, 1, 1], "grads": [0.001, -50, 0], "m": [0, 0, 0], "lr": 0.1}, "expect": {"params": [0.9, 1.1, 1], "m": [0.00001, -0.5, 0]}},
            {"label": "Momentum can outvote the gradient", "input": {"params": [0], "grads": [1], "m": [-20], "lr": 0.01}},
            {"label": "Decoupled weight decay", "input": {"params": [2, -2], "grads": [0.5, 0.5], "m": [0, 0], "lr": 0.1, "weight_decay": 0.5}},
            {"label": "Several coordinates", "input": {"params": [0.3, -0.7, 1.2, 0], "grads": [0.2, -0.1, 0, 3], "m": [0.1, 0.1, -0.2, 0], "lr": 0.003, "beta1": 0.95, "beta2": 0.98, "weight_decay": 0.1}, "hidden": True},
        ],
        "solution": '''
def lion_step(params, grads, m, lr, beta1=0.9, beta2=0.99, weight_decay=0.0):
    def sign(x):
        return 1.0 if x > 0 else -1.0 if x < 0 else 0.0
    new_p, new_m = [], []
    for p, g, mi in zip(params, grads, m):
        c = beta1 * mi + (1 - beta1) * g          # interpolate for the update
        new_p.append(p - lr * (sign(c) + weight_decay * p))
        new_m.append(beta2 * mi + (1 - beta2) * g)  # slower average is stored
    return {"params": new_p, "m": new_m}
''',
        "intuition": """
## Only the sign survives

Adam scales each step by gradient statistics. **Lion** (Chen et al., 2023, found by automated program search) keeps only the sign: every parameter moves by exactly `lr`, up or down. A gradient of 0.001 and a gradient of -50 produce steps of the same size in opposite directions, as the first test shows.

The direction comes from an interpolation between the stored momentum and the current gradient, using `beta1`. The momentum itself is then updated with a slower `beta2`. With momentum at -20 and a gradient of 1, the interpolation is still negative, so the parameter moves up even though this step's gradient says down: a single noisy batch cannot flip the direction.

## Practical consequences

Lion stores one moment per parameter instead of Adam's two, which saves memory on large models. Because steps never shrink with small gradients, the paper recommends a learning rate 3 to 10 times smaller than AdamW's, with weight decay scaled up to match.

> **Remember:** Lion's step size is `lr` for every coordinate. Its two betas play different roles: `beta1` for the update, `beta2` for the stored momentum.
""",
    },
    {
        "id": "opt-warmup-cosine",
        "title": "Warmup Then Cosine Decay",
        "difficulty": "medium",
        "fn": "lr_at",
        "signature": "lr_at(step: int, max_lr: float, warmup_steps: int, total_steps: int, min_lr: float) -> float",
        "starter": starter("lr_at(step, max_lr, warmup_steps, total_steps, min_lr)"),
        "mission": "Write the learning-rate schedule used by most transformer pre-training runs: a linear warmup to the peak, then a cosine decay to a floor.",
        "task": "Implement `lr_at(step, max_lr, warmup_steps, total_steps, min_lr)`. For `step < warmup_steps` return `max_lr * (step + 1) / warmup_steps`. From `warmup_steps` to `total_steps`, decay with `min_lr + 0.5 * (max_lr - min_lr) * (1 + cos(pi * progress))` where `progress = (step - warmup_steps) / (total_steps - warmup_steps)`. For `step >= total_steps` return `min_lr`. Raise `ValueError` if `warmup_steps >= total_steps` or `min_lr > max_lr`.",
        "constraints": ["Warmup uses step + 1, so step 0 already has a non-zero learning rate.", "The decay reaches exactly min_lr at total_steps.", "Steps past the end stay at min_lr."],
        "hints": {"small": "Handle the three regions in order: warmup, decay, after.", "strong": "At step = warmup_steps progress is 0, so the cosine term gives max_lr.", "concept": "Warmup lets Adam's moment estimates settle before steps get large."},
        "tests": [
            {"label": "First warmup step", "input": {"step": 0, "max_lr": 0.001, "warmup_steps": 100, "total_steps": 1000, "min_lr": 0.0001}, "expect": 0.00001},
            {"label": "Peak at end of warmup", "input": {"step": 100, "max_lr": 0.001, "warmup_steps": 100, "total_steps": 1000, "min_lr": 0.0001}, "expect": 0.001},
            {"label": "Halfway through decay", "input": {"step": 550, "max_lr": 0.001, "warmup_steps": 100, "total_steps": 1000, "min_lr": 0.0001}, "expect": 0.00055},
            {"label": "After the end", "input": {"step": 5000, "max_lr": 0.001, "warmup_steps": 100, "total_steps": 1000, "min_lr": 0.0001}, "expect": 0.0001},
            {"label": "Warmup longer than training", "input": {"step": 1, "max_lr": 0.1, "warmup_steps": 10, "total_steps": 10, "min_lr": 0}, "error": "ValueError"},
            {"label": "Three quarters through decay", "input": {"step": 775, "max_lr": 0.0003, "warmup_steps": 100, "total_steps": 1000, "min_lr": 0.00003}, "hidden": True},
        ],
        "solution": '''
import math

def lr_at(step, max_lr, warmup_steps, total_steps, min_lr):
    if warmup_steps >= total_steps or min_lr > max_lr:
        raise ValueError("need warmup_steps < total_steps and min_lr <= max_lr")
    if step < warmup_steps:
        return max_lr * (step + 1) / warmup_steps
    if step >= total_steps:
        return min_lr
    progress = (step - warmup_steps) / (total_steps - warmup_steps)
    return min_lr + 0.5 * (max_lr - min_lr) * (1 + math.cos(math.pi * progress))
''',
        "intuition": """
## Small, then large, then small again

At step 0 the weights are random and Adam's second-moment estimate is built from a single gradient, so the per-parameter step sizes are unreliable. A large learning rate here can push a transformer into a state it never recovers from. A **linear warmup** ramps the learning rate from near zero to its peak over the first few hundred or thousand steps.

After the peak, a **cosine decay** lowers the rate smoothly: slowly at first, fastest in the middle, slowly again near the end, where small steps let the model settle into a minimum. Many published pre-training recipes decay to a floor around 10% of the peak instead of zero, which is what `min_lr` is for.

## The off-by-one in warmup

`max_lr * step / warmup_steps` is exactly 0 at step 0, so the first update does nothing. Using `step + 1` makes step 0 take a small real step and makes the last warmup step reach exactly `max_lr`.

> **Remember:** three regions, checked in order. Test the boundaries: step 0, the end of warmup, the end of training and beyond.
""",
    },
    {
        "id": "opt-momentum-vs-sgd",
        "title": "Momentum Versus Plain SGD on a Ravine",
        "difficulty": "hard",
        "fn": "compare_optimizers",
        "signature": "compare_optimizers(a: float, b: float, x0: list[float], lr: float, momentum: float, steps: int) -> dict",
        "starter": starter("compare_optimizers(a, b, x0, lr, momentum, steps)"),
        "mission": "Run plain gradient descent and heavy-ball momentum side by side on the same ill-conditioned bowl, record both loss curves, and measure how many steps each needs to get the loss under a target.",
        "task": "Minimise f(x, y) = a*x**2 + b*y**2 from `x0` with both methods for `steps` steps. SGD: `p = p - lr * grad`. Momentum: `v = momentum * v - lr * grad; p = p + v` with v starting at zero. Return `{\"sgd_loss\": final SGD loss, \"momentum_loss\": final momentum loss, \"sgd_steps_to_1e-3\": first step count after which SGD's loss is below 0.001 or None, \"momentum_steps_to_1e-3\": the same for momentum, \"sgd_diverged\": True if SGD's final loss is larger than its starting loss}`.",
        "constraints": ["Both methods use the same lr and start point.", "Step counts are 1-based: after the first update is step 1.", "Use None when a method never gets below 0.001."],
        "hints": {"small": "Write one loop per method, recording f after each update.", "strong": "For a quadratic, SGD diverges in a coordinate when lr * 2 * curvature > 2, i.e. lr > 1 / curvature.", "concept": "Momentum's effective step size on consistent directions is lr / (1 - momentum), which is what lets it move along the flat axis."},
        "tests": [
            {"label": "Ravine: momentum wins", "input": {"a": 0.5, "b": 50, "x0": [10, 1], "lr": 0.015, "momentum": 0.9, "steps": 300}},
            {"label": "Round bowl: SGD is already fast", "input": {"a": 1, "b": 1, "x0": [1, 1], "lr": 0.4, "momentum": 0.5, "steps": 30}},
            {"label": "Learning rate too large for SGD", "input": {"a": 1, "b": 20, "x0": [1, 1], "lr": 0.06, "momentum": 0.5, "steps": 50}},
            {"label": "Very flat axis", "input": {"a": 0.05, "b": 10, "x0": [20, 0.5], "lr": 0.05, "momentum": 0.95, "steps": 400}, "hidden": True},
        ],
        "solution": '''
def compare_optimizers(a, b, x0, lr, momentum, steps):
    def f(p):
        return a * p[0] ** 2 + b * p[1] ** 2

    def grad(p):
        return [2 * a * p[0], 2 * b * p[1]]

    def run(use_momentum):
        p, v = list(x0), [0.0, 0.0]
        first_below = None
        for step in range(1, steps + 1):
            g = grad(p)
            if use_momentum:
                v = [momentum * v[i] - lr * g[i] for i in range(2)]
                p = [p[i] + v[i] for i in range(2)]
            else:
                p = [p[i] - lr * g[i] for i in range(2)]
            if first_below is None and f(p) < 1e-3:
                first_below = step
        return f(p), first_below

    sgd_loss, sgd_steps = run(False)
    mom_loss, mom_steps = run(True)
    return {
        "sgd_loss": sgd_loss,
        "momentum_loss": mom_loss,
        "sgd_steps_to_1e-3": sgd_steps,
        "momentum_steps_to_1e-3": mom_steps,
        "sgd_diverged": sgd_loss > f(x0),
    }
''',
        "intuition": """
## Measure, don't assume

"Momentum is faster" is true on some problems and not others. This problem measures it. On `f = 0.5 x^2 + 50 y^2` the curvature in `y` is 100 times the curvature in `x`. Plain gradient descent must keep `lr` below `1 / 50` to stay stable in `y`, and at that rate `x` shrinks by only 1.5% per step, so getting `x` from 10 to near 0 takes hundreds of steps.

Momentum accumulates velocity along `x`, where every gradient points the same way. Its effective step there approaches `lr / (1 - momentum)`, 10 times larger at `momentum = 0.9`, while oscillations in `y` partly cancel. Run the first test and compare the step counts.

## When it does not help

On a round bowl (`a = b`) there is no ravine, and plain gradient descent with a good learning rate converges in a few steps; momentum can overshoot and take longer. And with `lr = 0.06` on `b = 20`, `lr * 2b = 2.4 > 2`, so SGD diverges in `y`. Heavy-ball momentum on a quadratic stays stable up to `lr * 2b < 2 * (1 + momentum)`, here 2.4 < 3, so at the same rate it converges. The third test shows both.

> **Remember:** the condition number (largest curvature over smallest) decides how much momentum helps. Measure steps to a target loss, not just the final loss.
""",
    },
]
