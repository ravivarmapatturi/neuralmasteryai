def has_cycle(values, pos):
    if not values:
        return False
    nodes = [{"val": v, "next": None} for v in values]
    for a, b in zip(nodes, nodes[1:]):
        a["next"] = b
    if pos != -1:
        nodes[-1]["next"] = nodes[pos]
    slow = fast = nodes[0]
    while fast is not None and fast["next"] is not None:
        slow, fast = slow["next"], fast["next"]["next"]
        if slow is fast:  # same node object, not just equal values
            return True
    return False
