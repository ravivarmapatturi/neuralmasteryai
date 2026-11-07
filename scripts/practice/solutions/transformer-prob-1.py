import math

def attention_score(q: list[float], k: list[float]) -> float:
    if len(q) != len(k):
        raise ValueError("q and k must have the same length")
    return sum(a * b for a, b in zip(q, k)) / math.sqrt(len(k))
