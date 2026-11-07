import math

def greedy_decoding_step(logits: list[float]) -> dict:
    if not logits:
        raise ValueError("logits must not be empty")
    m = max(logits)
    chosen = logits.index(m)  # index() returns the first, i.e. lowest, tie
    total = sum(math.exp(x - m) for x in logits)
    return {"chosen_token": chosen, "is_deterministic": True, "confidence": round(1 / total, 4)}
