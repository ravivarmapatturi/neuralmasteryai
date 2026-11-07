def max_depth(root):
    if root is None:
        return 0
    return 1 + max(max_depth(root.get("left")), max_depth(root.get("right")))
