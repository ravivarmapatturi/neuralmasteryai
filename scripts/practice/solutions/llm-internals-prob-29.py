import math

def cross_entropy_loss(logits: list[float], target_idx: int) -> float:
    if not logits:
        raise ValueError("logits must not be empty")
    if not 0 <= target_idx < len(logits):
        raise IndexError("target_idx out of range")
    m = max(logits)
    log_sum = m + math.log(sum(math.exp(x - m) for x in logits))
    return round(log_sum - logits[target_idx], 4)
