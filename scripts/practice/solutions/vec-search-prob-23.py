def hnsw_greedy_hop(current_dist, neighbor_dists, visited):
    seen = set(visited)
    candidates = [(d, n) for n, d in neighbor_dists.items() if n not in seen]
    if not candidates:
        return None
    best_dist, best = min(candidates)  # ties fall back to the id
    return best if best_dist < current_dist else None
