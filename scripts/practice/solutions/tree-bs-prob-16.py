def diameter_of_binary_tree(root):
    best = 0
    def height(node):
        nonlocal best
        if node is None:
            return 0
        left, right = height(node.get("left")), height(node.get("right"))
        best = max(best, left + right)  # edges on the longest path through node
        return 1 + max(left, right)
    height(root)
    return best
