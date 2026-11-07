def truncate_tool_output(output, max_chars):
    if len(output) <= max_chars:
        return output
    cut = len(output) - max_chars
    return output[:max_chars] + f"... [truncated {cut} more chars]"
