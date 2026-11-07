import numpy as np

def linear_regression_normal_equation(X: list[list[float]], y: list[float]) -> list[float]:
    X = np.asarray(X, dtype=float)
    y = np.asarray(y, dtype=float)
    X_aug = np.hstack([np.ones((X.shape[0], 1)), X])
    # solve() is more stable than forming the inverse explicitly.
    w = np.linalg.solve(X_aug.T @ X_aug, X_aug.T @ y)
    return w.tolist()
