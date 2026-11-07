import math

def logistic_regression_loss(X, y, weights, bias):
    total = 0.0
    for row, label in zip(X, y):
        z = sum(w * x for w, x in zip(weights, row)) + bias
        p = 1 / (1 + math.exp(-z))
        p = min(max(p, 1e-15), 1 - 1e-15)
        total += -(label * math.log(p) + (1 - label) * math.log(1 - p))
    return total / len(X)
