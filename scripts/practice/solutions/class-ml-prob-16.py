def k_fold_splits(n_samples: int, k: int) -> list:
    if k <= 1 or k > n_samples:
        raise ValueError("k must be in 2..n_samples")
    base, extra = divmod(n_samples, k)
    folds, start = [], 0
    for i in range(k):
        size = base + (1 if i < extra else 0)
        folds.append(list(range(start, start + size)))
        start += size
    splits = []
    for i, val in enumerate(folds):
        train = [idx for j, fold in enumerate(folds) if j != i for idx in fold]
        splits.append([train, val])
    return splits
