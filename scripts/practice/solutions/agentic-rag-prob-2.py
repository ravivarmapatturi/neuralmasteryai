def grade_relevance_action(relevance_scores, relevant_threshold, irrelevant_threshold):
    best = max(relevance_scores)
    if best >= relevant_threshold:
        return "use_retrieved"
    if best < irrelevant_threshold:
        return "web_search"
    return "blend"
