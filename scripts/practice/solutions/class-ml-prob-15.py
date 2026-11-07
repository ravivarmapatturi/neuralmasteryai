def svm_hinge_loss(X, y, weights, bias, C=1.0):
    reg = 0.5 * sum(w * w for w in weights)
    hinge = 0.0
    for row, label in zip(X, y):
        margin = label * (sum(w * x for w, x in zip(weights, row)) + bias)
        hinge += max(0.0, 1 - margin)
    return reg + C * hinge / len(X)
