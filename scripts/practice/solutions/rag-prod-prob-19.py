def retrieval_recall_at_k(retrieved_ids, relevant_ids, k):
    relevant = set(relevant_ids)
    if not relevant:
        return 0.0
    return len(set(retrieved_ids[:k]) & relevant) / len(relevant)
