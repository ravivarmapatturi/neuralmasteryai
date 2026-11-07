def paginate_tools(tools, page_size, cursor):
    if page_size <= 0:
        raise ValueError("page_size must be positive")
    if cursor is None:
        start = 0
    else:
        try:
            start = int(cursor)
        except (TypeError, ValueError):
            raise ValueError("cursor is not a position")
        if start < 0 or start >= len(tools):
            raise ValueError("cursor is out of range")
    end = start + page_size
    return tools[start:end], (str(end) if end < len(tools) else None)
