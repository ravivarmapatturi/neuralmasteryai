def two_sum(nums, target):
    seen = {}  # value -> index
    for j, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], j]
        seen[x] = j
    raise ValueError("no pair sums to target")
