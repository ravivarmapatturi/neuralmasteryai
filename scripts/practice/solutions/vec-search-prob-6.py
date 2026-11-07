import math

def brute_force_knn(query, vectors, k):
    if k <= 0 or k > len(vectors):
        raise ValueError("k must be in 1..len(vectors)")
    dists = [(math.dist(query, v), i) for i, v in enumerate(vectors)]
    dists.sort()  # ties on distance fall back to the index
    return [i for _, i in dists[:k]]
