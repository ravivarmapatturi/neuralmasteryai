def reverse_list(head):
    prev, cur = None, head
    while cur is not None:
        nxt = cur["next"]
        cur["next"] = prev
        prev, cur = cur, nxt
    return prev
