def detect_feature_skew(train_stats, serving_stats, threshold_pct):
    skewed = []
    for name in train_stats.keys() & serving_stats.keys():
        train = train_stats[name]
        if train == 0:
            continue
        if abs(serving_stats[name] - train) / abs(train) * 100 > threshold_pct:
            skewed.append(name)
    return sorted(skewed)
