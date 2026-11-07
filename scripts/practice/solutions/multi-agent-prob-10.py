def has_deadlock(wait_for):
    WHITE, GREY, BLACK = 0, 1, 2
    color = {}
    def visit(node):
        color[node] = GREY  # on the current DFS path
        for nxt in wait_for.get(node, []):
            state = color.get(nxt, WHITE)
            if state == GREY:
                return True  # back edge: a cycle
            if state == WHITE and visit(nxt):
                return True
        color[node] = BLACK
        return False
    return any(color.get(n, WHITE) == WHITE and visit(n) for n in list(wait_for))
