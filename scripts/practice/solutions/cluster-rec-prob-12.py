def average_precision_at_k(ranked_items, relevant_items, k):
    relevant = set(relevant_items)
    hits, precisions = 0, []
    for position, item in enumerate(ranked_items[:k], start=1):
        if item in relevant:
            hits += 1
            precisions.append(hits / position)
    return sum(precisions) / len(precisions) if precisions else 0.0
