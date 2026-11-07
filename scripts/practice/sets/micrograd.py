SET = {
    "title": "Build Micrograd",
    "project": True,
    "learn": {"title": "Neural network fundamentals", "route": "/docs/deep-learning/neural-network-fundamentals", "description": "Forward pass, backpropagation and the chain rule that this engine implements."},
}

HEAD = '''import math

class Value:
    """A scalar that remembers how it was computed, so it can backpropagate."""

    def __init__(self, data, _children=(), _op=""):
        self.data = data
        self.grad = 0.0
        self._backward = lambda: None
        self._prev = set(_children)
        self._op = _op

    def __repr__(self):
        return f"Value(data={self.data}, grad={self.grad})"
'''

OPS_FORWARD = '''
    def __add__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data + other.data, (self, other), "+")
        return out

    def __mul__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data * other.data, (self, other), "*")
        return out
'''

OPS_BACKWARD = '''
    def __add__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data + other.data, (self, other), "+")

        def _backward():
            # d(a + b)/da = 1: the gradient passes through unchanged.
            self.grad += out.grad
            other.grad += out.grad

        out._backward = _backward
        return out

    def __mul__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data * other.data, (self, other), "*")

        def _backward():
            # d(a * b)/da = b: each side gets the other side's value.
            self.grad += other.data * out.grad
            other.grad += self.data * out.grad

        out._backward = _backward
        return out
'''

SUGAR = '''
    def __radd__(self, other):
        return self + other

    def __rmul__(self, other):
        return self * other

    def __neg__(self):
        return self * -1

    def __sub__(self, other):
        return self + (-other)

    def __rsub__(self, other):
        return other + (-self)
'''

BACKWARD = '''
    def backward(self):
        # Order nodes so every node comes after everything it depends on.
        topo, visited = [], set()

        def build(v):
            if v not in visited:
                visited.add(v)
                for child in v._prev:
                    build(child)
                topo.append(v)

        build(self)
        self.grad = 1.0
        for v in reversed(topo):
            v._backward()
'''

ACTIVATIONS = '''
    def __pow__(self, k):
        assert isinstance(k, (int, float)), "only constant exponents"
        out = Value(self.data ** k, (self,), f"**{k}")

        def _backward():
            self.grad += k * self.data ** (k - 1) * out.grad

        out._backward = _backward
        return out

    def __truediv__(self, other):
        return self * other ** -1

    def tanh(self):
        t = math.tanh(self.data)
        out = Value(t, (self,), "tanh")

        def _backward():
            self.grad += (1 - t * t) * out.grad

        out._backward = _backward
        return out

    def relu(self):
        out = Value(self.data if self.data > 0 else 0.0, (self,), "relu")

        def _backward():
            self.grad += (1.0 if out.data > 0 else 0.0) * out.grad

        out._backward = _backward
        return out
'''

TODO = "        raise NotImplementedError\n"


def todo_methods(*names):
    return "".join(f"\n    def {n}:\n        # Your code here\n{TODO}" for n in names)


FULL = HEAD + OPS_BACKWARD + SUGAR + ACTIVATIONS + BACKWARD

S1_WRAP = '''

def forward(a, b, c):
    """Build L = a * b + c from Values and describe the result node."""
    L = Value(a) * b + c
    return {"value": L.data, "op": L._op, "children": sorted(ch.data for ch in L._prev)}
'''

S2_WRAP = '''

def grads(a, b, c):
    """L = a * b + c. Run each node's _backward by hand, output first."""
    a, b, c = Value(a), Value(b), Value(c)
    ab = a * b
    L = ab + c
    L.grad = 1.0
    L._backward()
    ab._backward()
    return [L.data, a.grad, b.grad, c.grad]
'''

S3_WRAP = '''

def grads_of(expr, x, y):
    """Build one of a few expressions, call backward(), report value and grads."""
    x, y = Value(x), Value(y)
    if expr == "reuse":
        L = x * x + x
    elif expr == "chain":
        L = (x * y + x) * y
    elif expr == "diamond":
        a = x * y
        L = (a + a) * a
    else:
        L = x * y - y * 3
    L.backward()
    return [L.data, x.grad, y.grad]
'''

S4_WRAP = '''

def activation_grads(op, x):
    """Apply one operation to Value(x), backpropagate, return [output, d output / dx]."""
    v = Value(x)
    if op == "tanh":
        out = v.tanh()
    elif op == "relu":
        out = v.relu()
    elif op == "cube":
        out = v ** 3
    elif op == "inverse":
        out = v ** -1
    else:  # "squash": tanh(2x + 1) / 2
        out = (v * 2 + 1).tanh() / 2
    out.backward()
    return [out.data, v.grad]
'''



PROBLEMS = [
    {
        "id": "micrograd-value-ops",
        "title": "Micrograd 1: A Value That Remembers Its Parents",
        "difficulty": "easy",
        "fn": "forward",
        "signature": "forward(a: float, b: float, c: float) -> dict",
        "starter": HEAD + todo_methods("__add__(self, other)", "__mul__(self, other)") + S1_WRAP,
        "mission": "Every autograd engine starts with a number that records which numbers and which operation produced it. Write addition and multiplication for Value so expressions build that graph as they compute.",
        "task": "Implement `Value.__add__` and `Value.__mul__`. Each returns a new `Value` whose `data` is the result, whose `_prev` holds the two inputs and whose `_op` is `\"+\"` or `\"*\"`. A plain number on the right (`Value(2) * 3`) must be wrapped in a Value first. The provided `forward(a, b, c)` builds `a * b + c` and reports the final node.",
        "constraints": ["Wrap plain numbers: `other = other if isinstance(other, Value) else Value(other)`.", "Pass the inputs as `_children` so `_prev` records them.", "Leave gradients alone in this stage."],
        "hints": {"small": "The result is Value(self.data + other.data, (self, other), \"+\").", "strong": "In forward, `b` and `c` arrive as plain numbers, so Value(a) * b only works if __mul__ wraps them.", "concept": "The graph is built as a side effect of ordinary arithmetic. That is what PyTorch calls define-by-run."},
        "tests": [
            {"label": "2 * 3 + 4", "input": {"a": 2, "b": 3, "c": 4}, "expect": {"value": 10, "op": "+", "children": [4, 6]}},
            {"label": "Negative numbers", "input": {"a": -1.5, "b": 2, "c": 0.5}, "expect": {"value": -2.5, "op": "+", "children": [-3, 0.5]}},
            {"label": "Zero product", "input": {"a": 0, "b": 7, "c": -2}, "hidden": True},
        ],
        "solution": HEAD + OPS_FORWARD + S1_WRAP,
        "intuition": """
## A number with a history

Backpropagation needs to know, for every intermediate result, which values and which operation produced it. In this series we build **micrograd**, a scalar autograd engine in about 100 lines, the same idea PyTorch implements for tensors.

The `Value` class wraps one float. When you write `Value(2) * 3`, `__mul__` returns a new `Value(6)` and stores two facts: its parents (`_prev`) and the operation (`_op = "*"`). Write `a * b + c` and you have built a three-level graph without calling anything special.

## Plain numbers on the right

`Value(2) * 3` calls `Value.__mul__` with `other = 3`, an int. Without wrapping it, `other.data` fails. Wrapping means constants become leaf nodes too, which is what lets stage 2 compute gradients through expressions like `2 * x + 1`.

> **Remember:** the graph is recorded during the forward pass, one node per operation. Stage 2 walks it backwards.
""",
    },
    {
        "id": "micrograd-local-backward",
        "title": "Micrograd 2: Local Gradients for + and *",
        "difficulty": "easy",
        "fn": "grads",
        "signature": "grads(a: float, b: float, c: float) -> list[float]",
        "starter": HEAD + OPS_FORWARD.replace("        return out", "        # Attach out._backward here.\n        return out") + S2_WRAP,
        "mission": "Teach each operation its piece of the chain rule: a closure that takes the output's gradient and adds the right amount to each input's gradient.",
        "task": "Give `__add__` and `__mul__` a `_backward` closure stored on the output node. For `out = a + b`, both inputs receive `out.grad`. For `out = a * b`, `a` receives `b.data * out.grad` and `b` receives `a.data * out.grad`. Use `+=`. The provided `grads(a, b, c)` calls the closures by hand for `L = a * b + c` and returns `[L, dL/da, dL/db, dL/dc]`.",
        "constraints": ["Accumulate with `+=`, never `=`: stage 3 reuses nodes, and `=` would drop gradient.", "Each closure only uses its own inputs and `out.grad`.", "Keep the forward results from stage 1 unchanged."],
        "hints": {"small": "Define def _backward(): ... inside __mul__, then set out._backward = _backward before returning.", "strong": "The closure captures self, other and out, so it can read out.grad after the forward pass has finished.", "concept": "The chain rule is local: each node only needs its inputs' values and its output's gradient."},
        "tests": [
            {"label": "2 * 3 + 4", "input": {"a": 2, "b": 3, "c": 4}, "expect": [10, 3, 2, 1]},
            {"label": "Negative inputs", "input": {"a": -2, "b": 5, "c": 1}, "expect": [-9, 5, -2, 1]},
            {"label": "Fractions", "input": {"a": 0.5, "b": -4, "c": 10}, "hidden": True},
        ],
        "solution": HEAD + OPS_BACKWARD + S2_WRAP,
        "intuition": """
## Each operation knows one rule

Take `L = a * b + c` with `a = 2, b = 3, c = 4`, so `L = 10`. Nudge `c` by 0.001 and `L` moves by 0.001: `dL/dc = 1`. Nudge `a` and `L` moves by three times as much, because `a` is multiplied by `b = 3`: `dL/da = 3`.

Those are the only two rules we need here. Addition passes the gradient through unchanged. Multiplication sends each input the *other* input's value times the output's gradient. Each rule lives in a small **closure**, a function defined inside `__add__` or `__mul__` that remembers `self`, `other` and `out`.

## Why += and not =

You might expect each node to receive its gradient once. A node used twice, like `x` in `x * x`, receives a contribution along each path, and the true gradient is the sum. With `=`, the second path overwrites the first. The tests in this stage pass either way; stage 3's do not.

> **Remember:** a backward rule takes `out.grad` and adds `local derivative * out.grad` into each input.
""",
    },
    {
        "id": "micrograd-topological-backward",
        "title": "Micrograd 3: backward() in Topological Order",
        "difficulty": "medium",
        "fn": "grads_of",
        "signature": "grads_of(expr: str, x: float, y: float) -> list[float]",
        "starter": HEAD + OPS_BACKWARD + SUGAR + todo_methods("backward(self)") + S3_WRAP,
        "mission": "Write the one method that turns local rules into full backpropagation: order the graph so every node's gradient is complete before it passes gradient on, then run each closure once.",
        "task": "Implement `Value.backward()`. Build a list of every node reachable from `self` in **topological order** (each node after all of its inputs), set `self.grad = 1.0`, then call `_backward()` on each node in reverse order. The provided `grads_of(expr, x, y)` builds expressions that reuse nodes and returns `[L, dL/dx, dL/dy]`.",
        "constraints": ["Visit each node once, even if it is reachable along several paths.", "Call every `_backward` exactly once, outputs before inputs.", "The seed gradient of the output is 1.0."],
        "hints": {"small": "A depth-first search that appends a node after visiting all its children produces a topological order.", "strong": "Keep a visited set. Then self.grad = 1.0 and for v in reversed(topo): v._backward().", "concept": "Reverse topological order guarantees a node has received all of its gradient before it distributes any."},
        "tests": [
            {"label": "x * x + x reuses x", "input": {"expr": "reuse", "x": 3, "y": 0}, "expect": [12, 7, 0]},
            {"label": "(x*y + x) * y", "input": {"expr": "chain", "x": 2, "y": 3}, "expect": [24, 12, 14]},
            {"label": "Diamond: a = x*y, (a + a) * a", "input": {"expr": "diamond", "x": 1, "y": 2}, "expect": [8, 16, 8]},
            {"label": "Subtraction", "input": {"expr": "minus", "x": 4, "y": -1}, "hidden": True},
            {"label": "Diamond with negatives", "input": {"expr": "diamond", "x": -1.5, "y": 2}, "hidden": True},
        ],
        "solution": HEAD + OPS_BACKWARD + SUGAR + BACKWARD + S3_WRAP,
        "intuition": """
## The order is the whole algorithm

With `L = x * x + x` and `x = 3`, the answer is `dL/dx = 2x + 1 = 7`. Three gradient contributions reach `x`: 3 and 3 from the two sides of `x * x`, and 1 from `+ x`. A node may only pass its gradient on once all of those have arrived.

A **topological order** lists every node after all of the nodes it was computed from. Depth-first search gives one: visit a node's inputs first, then append the node. Walking that list in reverse visits the output first and each input only after everything that uses it.

## Visit once, not once per path

In the diamond `a = x * y; L = (a + a) * a`, `a` is reachable along two paths. Without the visited set, DFS appends `a` twice, its closure runs twice, and its full gradient is pushed into `x` and `y` twice. The test result comes out wrong even though every local rule is right.

> **Remember:** topological sort, seed the output with 1.0, call every `_backward` once in reverse. That is backpropagation.
""",
    },
    {
        "id": "micrograd-activations",
        "title": "Micrograd 4: Powers, tanh and ReLU",
        "difficulty": "medium",
        "fn": "activation_grads",
        "signature": "activation_grads(op: str, x: float) -> list[float]",
        "starter": HEAD + OPS_BACKWARD + SUGAR + todo_methods("__pow__(self, k)", "tanh(self)", "relu(self)") + "\n    def __truediv__(self, other):\n        return self * other ** -1\n" + BACKWARD + S4_WRAP,
        "mission": "Add the non-linear operations a neural network needs, each with its derivative: x ** k, tanh and ReLU. Division comes for free from the power rule.",
        "task": "Implement `__pow__(k)` for a constant exponent `k`, `tanh()` and `relu()`, each returning a new Value with a `_backward` closure. Derivatives: `k * x**(k-1)`, `1 - tanh(x)**2`, and 1 where the ReLU output is positive (else 0). The provided `activation_grads(op, x)` returns `[output, d output / dx]`.",
        "constraints": ["`k` is an int or float, not a Value.", "Reuse the tanh output `t` in its derivative instead of recomputing tanh.", "ReLU's gradient at exactly 0 is 0."],
        "hints": {"small": "Same shape as __mul__: compute out, define _backward with +=, attach it, return out.", "strong": "tanh: t = math.tanh(self.data); self.grad += (1 - t * t) * out.grad.", "concept": "Division is x * y ** -1, so the power rule gives its gradient without a separate rule."},
        "tests": [
            {"label": "tanh(0.5)", "input": {"op": "tanh", "x": 0.5}, "expect": [0.46211715726000974, 0.7864477329659274]},
            {"label": "ReLU of a negative", "input": {"op": "relu", "x": -2}, "expect": [0, 0]},
            {"label": "x cubed", "input": {"op": "cube", "x": 2}, "expect": [8, 12]},
            {"label": "1 / x via x ** -1", "input": {"op": "inverse", "x": 4}, "expect": [0.25, -0.0625]},
            {"label": "tanh(2x + 1) / 2", "input": {"op": "squash", "x": 0.25}, "hidden": True},
            {"label": "ReLU of a positive", "input": {"op": "relu", "x": 1.5}, "hidden": True},
        ],
        "solution": HEAD + OPS_BACKWARD + SUGAR + ACTIVATIONS + BACKWARD + S4_WRAP,
        "intuition": """
## Non-linearity, one derivative each

A network made only of `+` and `*` is a polynomial in its inputs. Neural networks need a **non-linearity** between layers. We add three operations, and each brings its own local derivative.

`x ** k` for a constant `k` has derivative `k * x ** (k - 1)`. That one rule also gives division: `a / b` is `a * b ** -1`. `tanh` squashes to (-1, 1), and its derivative is `1 - tanh(x) ** 2`; we already computed `tanh(x)` for the forward pass, so reuse it. ReLU passes positive values and zeroes the rest; its gradient is 1 where it passed the value and 0 where it did not.

## Where gradients vanish

At `x = 3`, `tanh` is 0.995 and its derivative is 0.0099. A deep stack of saturated tanh units multiplies many such small numbers together, and the gradient reaching the first layer is close to zero. ReLU's derivative is exactly 1 on the positive side, which is a large part of why it replaced tanh in deep networks.

> **Remember:** every new operation is a forward formula plus a local derivative. `backward()` does not change.
""",
    },
    {
        "id": "micrograd-neuron",
        "title": "Micrograd 5: A Neuron and Its Gradients",
        "difficulty": "medium",
        "fn": "neuron_grads",
        "signature": "neuron_grads(x: list[float], w: list[float], b: float) -> dict",
        "starter": FULL + '''

def neuron_grads(x, w, b):
    """out = tanh(sum(w_i * x_i) + b). Return out and the gradients of out
    with respect to every weight and the bias."""
    # Your code here
    pass
''',
        "mission": "Use the finished engine to build one tanh neuron and read off the gradient of its output with respect to every weight. This is the quantity a training step uses.",
        "task": "Implement `neuron_grads(x, w, b)`. Wrap the weights and bias as Values, compute `out = tanh(sum(w_i * x_i) + b)`, call `out.backward()`, and return `{\"out\": out.data, \"dw\": [gradient of each weight], \"db\": gradient of b}`. Raise `ValueError` if `x` and `w` have different lengths.",
        "constraints": ["Use the Value engine above: no hand-derived formulas.", "Start the sum from the bias Value so every term is part of the graph.", "Raise ValueError when len(x) != len(w)."],
        "hints": {"small": "ws = [Value(wi) for wi in w]; bv = Value(b). Inputs x can stay plain numbers.", "strong": "act = bv; for wi, xi in zip(ws, x): act = act + wi * xi; out = act.tanh(); out.backward().", "concept": "dout/dw_i = (1 - out**2) * x_i: each weight's gradient is its input scaled by the tanh slope."},
        "tests": [
            {"label": "Two inputs", "input": {"x": [2, -1], "w": [0.5, 1], "b": 0}, "expect": {"out": 0, "dw": [2, -1], "db": 1}},
            {"label": "Saturated neuron", "input": {"x": [1, 1, 1], "w": [1, 1, 1], "b": 1}},
            {"label": "Length mismatch", "input": {"x": [1, 2], "w": [1], "b": 0}, "error": "ValueError"},
            {"label": "Mixed signs", "input": {"x": [0.5, -1.5, 2], "w": [-0.3, 0.8, 0.1], "b": 0.2}, "hidden": True},
        ],
        "solution": FULL + '''

def neuron_grads(x, w, b):
    if len(x) != len(w):
        raise ValueError("x and w must have the same length")
    ws = [Value(wi) for wi in w]
    bv = Value(b)
    act = bv
    for wi, xi in zip(ws, x):
        act = act + wi * xi
    out = act.tanh()
    out.backward()
    return {"out": out.data, "dw": [wi.grad for wi in ws], "db": bv.grad}
''',
        "intuition": """
## The unit everything is made of

A **neuron** computes a weighted sum of its inputs plus a bias, then applies a non-linearity: `out = tanh(w . x + b)`. Training asks one question per weight: if I nudge this weight, how does the output move? That is `dout/dw_i`, and the engine from stages 1 to 4 answers it for every weight in one `backward()` call.

With `x = [2, -1]`, `w = [0.5, 1]`, `b = 0`, the sum is 0, `tanh(0) = 0` and the tanh slope there is 1. Each weight's gradient is then just its input: `[2, -1]`. The bias gradient is 1.

## The saturated case

With every input, weight and the bias at 1, the sum is 4 and `tanh(4) = 0.9993`. The slope `1 - 0.9993 ** 2` is 0.0013, so every gradient is tiny. A neuron stuck here barely learns, which is why initialisation scales weights to keep pre-activations small.

> **Remember:** one `backward()` fills `.grad` on every Value that fed the output. The weights' gradients are what the optimiser reads.
""",
    },
    {
        "id": "micrograd-train-step",
        "title": "Micrograd 6: Train a Model With SGD",
        "difficulty": "hard",
        "fn": "train_linear",
        "signature": "train_linear(xs: list[float], ys: list[float], w: float, b: float, lr: float, steps: int) -> list[float]",
        "starter": FULL + '''

def train_linear(xs, ys, w, b, lr, steps):
    """Fit y = w * x + b by gradient descent on mean squared error.
    Return [w, b, loss] after `steps` updates, where loss is the MSE at
    the final w and b."""
    # Your code here
    pass
''',
        "mission": "Close the loop: forward pass, loss, backward, update, repeat. Get the one easily missed step right, resetting gradients before every backward pass.",
        "task": "Implement `train_linear(xs, ys, w, b, lr, steps)`. Keep `w` and `b` as Values. Each step: set both `.grad` to 0, compute the mean squared error `sum((w*x + b - y)**2) / n` as a Value, call `backward()`, then update `w.data -= lr * w.grad` and the same for `b`. After `steps` updates return `[w, b, final_loss]` as floats, where `final_loss` is the MSE at the final parameters. Raise `ValueError` if `xs` is empty or `xs` and `ys` differ in length.",
        "constraints": ["Zero both gradients at the start of every step: `+=` in the closures accumulates across calls.", "Update `.data`, not the Value objects, so the same leaf nodes carry through every step.", "`steps = 0` returns the starting parameters and their loss."],
        "hints": {"small": "Build a fresh loss graph every step from the same w and b Values.", "strong": "Forgetting w.grad = 0 makes step 2 use the sum of step 1 and step 2 gradients, and the fit drifts or diverges.", "concept": "This is the whole training loop of every framework: zero_grad, forward, loss, backward, step."},
        "tests": [
            {"label": "Already perfect", "input": {"xs": [1, 2, 3], "ys": [2, 4, 6], "w": 2, "b": 0, "lr": 0.1, "steps": 5}, "expect": [2, 0, 0]},
            {"label": "One step from zero", "input": {"xs": [1, 2], "ys": [3, 5], "w": 0, "b": 0, "lr": 0.1, "steps": 1}, "expect": [1.3, 0.8, 1.685]},
            {"label": "Several steps need zeroed grads", "input": {"xs": [0, 1, 2, 3], "ys": [1, 3, 5, 7], "w": 0, "b": 0, "lr": 0.05, "steps": 20}},
            {"label": "No steps", "input": {"xs": [1], "ys": [2], "w": 0.5, "b": 0.5, "lr": 0.1, "steps": 0}, "expect": [0.5, 0.5, 1]},
            {"label": "Empty data", "input": {"xs": [], "ys": [], "w": 0, "b": 0, "lr": 0.1, "steps": 1}, "error": "ValueError"},
            {"label": "Long run converges", "input": {"xs": [-1, 0, 1, 2], "ys": [-2.5, -0.5, 1.5, 3.5], "w": 0.1, "b": 0.1, "lr": 0.1, "steps": 200}, "hidden": True},
        ],
        "solution": FULL + '''

def train_linear(xs, ys, w, b, lr, steps):
    if not xs or len(xs) != len(ys):
        raise ValueError("need equal-length, non-empty xs and ys")
    w, b = Value(w), Value(b)

    def mse():
        total = Value(0.0)
        for x, y in zip(xs, ys):
            total = total + (w * x + b - y) ** 2
        return total / len(xs)

    for _ in range(steps):
        w.grad = 0.0           # zero_grad: closures accumulate with +=
        b.grad = 0.0
        loss = mse()
        loss.backward()
        w.data -= lr * w.grad  # step: move against the gradient
        b.data -= lr * b.grad
    return [w.data, b.data, mse().data]
''',
        "intuition": """
## Five lines that train every model

Gradient descent repeats one cycle: **zero** the gradients, run the **forward** pass, compute the **loss**, call **backward**, then **step** each parameter against its gradient. PyTorch spells it `optimizer.zero_grad(); loss = ...; loss.backward(); optimizer.step()`. Our version does the same with two Values.

Fitting `y = 2x + 1` from `w = b = 0`, the first step's gradients point straight towards larger `w` and `b`. After a few hundred steps at a learning rate of 0.1 the fit is close to exact.

## The bug every framework user hits once

Our closures accumulate with `+=`, which stage 3 needed for reused nodes. It also means a second `backward()` adds to whatever is already in `.grad`. Skip the reset and step 2 uses the sum of two steps' gradients, step 3 the sum of three, and the updates grow until training diverges. PyTorch behaves exactly the same way, which is why `zero_grad()` exists.

> **Remember:** zero, forward, backward, step. You have now built the engine and the loop that every deep learning framework wraps.
""",
    },
]
