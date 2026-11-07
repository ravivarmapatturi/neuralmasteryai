def fit_tool_budget(tools, token_budget):
    used, chosen = 0, []
    for tool in sorted(tools, key=lambda t: -t["priority"]):
        if used + tool["tokens"] <= token_budget:
            chosen.append(tool["name"])
            used += tool["tokens"]
    return chosen
