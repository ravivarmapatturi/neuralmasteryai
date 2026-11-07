def sample_mean_and_variance(data: list[float]) -> tuple[float, float]:
    if not data:
        raise ValueError("data must not be empty")
    n = len(data)
    mean = sum(data) / n
    # Population variance: divide by n, not n - 1.
    variance = sum((x - mean) ** 2 for x in data) / n
    return [round(mean, 6), round(variance, 6)]
