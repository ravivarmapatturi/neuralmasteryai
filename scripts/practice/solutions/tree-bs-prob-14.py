def search_range(nums, target):
    def bound(first):
        lo, hi, found = 0, len(nums) - 1, -1
        while lo <= hi:
            mid = (lo + hi) // 2
            if nums[mid] == target:
                found = mid
                if first:
                    hi = mid - 1
                else:
                    lo = mid + 1
            elif nums[mid] < target:
                lo = mid + 1
            else:
                hi = mid - 1
        return found
    return [bound(True), bound(False)]
