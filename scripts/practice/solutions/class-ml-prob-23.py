import numpy as np

def pca_explained_variance_ratio(X, k):
    X = np.asarray(X, dtype=float)
    Xc = X - X.mean(axis=0)
    cov = Xc.T @ Xc / (X.shape[0] - 1)
    eigvals = np.linalg.eigh(cov)[0][::-1]  # eigh returns ascending order
    eigvals = np.clip(eigvals, 0, None)     # tiny negative round-off -> 0
    return (eigvals[:k] / eigvals.sum()).tolist()
