def has_cyclic_tool_chain(call_chain):
    n = len(call_chain)
    for size in range(1, n // 2 + 1):
        for start in range(n - 2 * size + 1):
            if call_chain[start:start + size] == call_chain[start + size:start + 2 * size]:
                return True
    return False
