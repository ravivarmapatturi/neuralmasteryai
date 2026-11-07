def binary_quantize_hamming(a, b):
    if len(a) != len(b):
        raise ValueError("vectors must have the same length")
    return sum((x >= 0) != (y >= 0) for x, y in zip(a, b))
