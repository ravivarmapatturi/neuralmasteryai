import math

def temperature_scaled_softmax(logits: list[float], temperature: float) -> list[float]:
    if temperature <= 0.0:
        raise ValueError("temperature must be positive")
    if not logits:
        return []
    scaled = [x / temperature for x in logits]
    m = max(scaled)
    exps = [math.exp(x - m) for x in scaled]
    total = sum(exps)
    return [round(e / total, 4) for e in exps]
