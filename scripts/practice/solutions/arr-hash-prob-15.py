def subarray_sum(nums, k):
    seen = {0: 1}  # prefix sum -> how many times it has occurred
    prefix = count = 0
    for x in nums:
        prefix += x
        count += seen.get(prefix - k, 0)
        seen[prefix] = seen.get(prefix, 0) + 1
    return count
