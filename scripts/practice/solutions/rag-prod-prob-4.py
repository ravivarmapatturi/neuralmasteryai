def fuse_scores(dense_scores, sparse_scores, alpha):
    ids = list(dense_scores) + [i for i in sparse_scores if i not in dense_scores]
    return {i: alpha * dense_scores.get(i, 0) + (1 - alpha) * sparse_scores.get(i, 0) for i in ids}
