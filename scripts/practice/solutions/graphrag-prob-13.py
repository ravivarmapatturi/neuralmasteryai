def pagerank_step(graph, scores, damping):
    n = len(graph)
    new = {}
    for node in graph:
        incoming = sum(scores[m] / len(out) for m, out in graph.items() if out and node in out)
        new[node] = (1 - damping) / n + damping * incoming
    return new
