def scalar_quantize(vector, num_bits):
    if num_bits <= 0:
        raise ValueError("num_bits must be positive")
    lo, hi = min(vector), max(vector)
    if lo == hi:
        return [0] * len(vector)
    levels = 2 ** num_bits - 1
    return [int(round((v - lo) / (hi - lo) * levels)) for v in vector]
