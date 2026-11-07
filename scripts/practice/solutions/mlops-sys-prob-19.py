import heapq

def topological_sort(dependencies):
    nodes = set(dependencies)
    for deps in dependencies.values():
        nodes.update(deps)
    remaining = {n: len(set(dependencies.get(n, []))) for n in nodes}
    dependents = {n: [] for n in nodes}
    for stage, deps in dependencies.items():
        for d in set(deps):
            dependents[d].append(stage)
    ready = [n for n, c in remaining.items() if c == 0]
    heapq.heapify(ready)  # always take the alphabetically first ready stage
    order = []
    while ready:
        n = heapq.heappop(ready)
        order.append(n)
        for m in dependents[n]:
            remaining[m] -= 1
            if remaining[m] == 0:
                heapq.heappush(ready, m)
    return order
