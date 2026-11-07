def max_path_sum(root):
    best = float("-inf")
    def gain(node):
        nonlocal best
        if node is None:
            return 0
        left = max(gain(node.get("left")), 0)
        right = max(gain(node.get("right")), 0)
        best = max(best, node["val"] + left + right)  # path bending through node
        return node["val"] + max(left, right)          # only one branch can go up
    gain(root)
    return best
