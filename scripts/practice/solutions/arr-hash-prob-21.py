def trap_rain_water(height):
    n = len(height)
    if n == 0:
        return 0
    left, right = [0] * n, [0] * n
    left[0], right[-1] = height[0], height[-1]
    for i in range(1, n):
        left[i] = max(left[i - 1], height[i])
    for i in range(n - 2, -1, -1):
        right[i] = max(right[i + 1], height[i])
    return sum(max(0, min(left[i], right[i]) - height[i]) for i in range(n))
