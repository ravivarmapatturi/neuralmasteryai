def split_heads(x: list[float], num_heads: int) -> list[list[float]]:
    if num_heads <= 0 or len(x) % num_heads:
        raise ValueError("len(x) must be divisible by num_heads")
    d = len(x) // num_heads
    return [x[h * d:(h + 1) * d] for h in range(num_heads)]
