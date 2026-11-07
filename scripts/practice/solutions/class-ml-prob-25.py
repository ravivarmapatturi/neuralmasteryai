import math

def silhouette_score(X, labels):
    clusters = sorted(set(labels))
    if len(clusters) < 2:
        raise ValueError("need at least 2 clusters")
    def dist(a, b):
        return math.sqrt(sum((p - q) ** 2 for p, q in zip(a, b)))
    scores = []
    for i, x in enumerate(X):
        own = [j for j, l in enumerate(labels) if l == labels[i] and j != i]
        if not own:
            scores.append(0.0)
            continue
        a = sum(dist(x, X[j]) for j in own) / len(own)
        b = min(
            sum(dist(x, X[j]) for j, l in enumerate(labels) if l == c) / labels.count(c)
            for c in clusters if c != labels[i]
        )
        scores.append((b - a) / max(a, b) if max(a, b) > 0 else 0.0)
    return sum(scores) / len(scores)
