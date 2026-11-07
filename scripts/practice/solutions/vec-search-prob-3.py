import math

def cosine_similarity(a, b):
    if len(a) != len(b):
        raise ValueError("vectors must have the same length")
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    if na == 0 or nb == 0:
        raise ValueError("zero vector has no direction")
    return sum(x * y for x, y in zip(a, b)) / (na * nb)
