import math

def gaussian_naive_bayes_predict(X_train, y_train, x_test):
    n = len(y_train)
    best_label, best_score = None, -math.inf
    for label in sorted(set(y_train)):
        rows = [x for x, c in zip(X_train, y_train) if c == label]
        score = math.log(len(rows) / n)
        for j, value in enumerate(x_test):
            col = [r[j] for r in rows]
            mean = sum(col) / len(col)
            var = sum((v - mean) ** 2 for v in col) / len(col) + 1e-9
            score += -0.5 * math.log(2 * math.pi * var) - (value - mean) ** 2 / (2 * var)
        # Strict > keeps the smaller label on a tie (labels visited in order).
        if score > best_score:
            best_label, best_score = label, score
    return best_label
