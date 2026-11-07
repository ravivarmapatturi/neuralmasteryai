def parallel_sum_reduction(arr):
    if not arr:
        return 0.0
    values = list(arr)
    stride = 1
    while stride < len(values):
        # Each "thread" i adds its partner i + stride; strides double each stage.
        for i in range(0, len(values), 2 * stride):
            if i + stride < len(values):
                values[i] += values[i + stride]
        stride *= 2
    return round(float(values[0]), 6)
