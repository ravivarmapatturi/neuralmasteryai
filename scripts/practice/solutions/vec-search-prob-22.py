import math

def filtered_topk(query, items, k, category):
    def cosine(a, b):
        return sum(x * y for x, y in zip(a, b)) / (math.hypot(*a) * math.hypot(*b))
    # Filter first, then rank: the filter can never be starved by the top-k cut.
    matches = [it for it in items if it["category"] == category]
    matches.sort(key=lambda it: (-cosine(query, it["vector"]), it["id"]))
    return [it["id"] for it in matches[:k]]
