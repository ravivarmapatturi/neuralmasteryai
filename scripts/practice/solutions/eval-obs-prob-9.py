def build_span_tree(spans):
    children = {}
    root = None
    for span in spans:
        if span["parent_id"] is None:
            root = span
        else:
            children.setdefault(span["parent_id"], []).append(span)
    def build(span):
        kids = sorted(children.get(span["id"], []), key=lambda s: s["id"])
        return {"name": span["name"], "children": [build(k) for k in kids]}
    return build(root)
