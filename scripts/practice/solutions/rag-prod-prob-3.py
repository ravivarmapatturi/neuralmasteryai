def fit_context_budget(chunks, token_budget):
    used, chosen = 0, []
    for chunk in sorted(chunks, key=lambda c: -c["score"]):
        if used + chunk["tokens"] <= token_budget:
            chosen.append(chunk["id"])
            used += chunk["tokens"]
    return chosen
