def top_k_frequent(nums, k):
    counts = {}
    for x in nums:
        counts[x] = counts.get(x, 0) + 1
    # Bucket sort by frequency: O(n) instead of sorting every element.
    buckets = [[] for _ in range(len(nums) + 1)]
    for x, c in counts.items():
        buckets[c].append(x)
    result = []
    for c in range(len(buckets) - 1, 0, -1):
        for x in sorted(buckets[c]):
            result.append(x)
            if len(result) == k:
                return result
    return result
