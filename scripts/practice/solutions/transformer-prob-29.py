import math

def compute_perplexity(log_probs: list[float]) -> float:
    if not log_probs:
        raise ValueError("log_probs must not be empty")
    return math.exp(-sum(log_probs) / len(log_probs))
