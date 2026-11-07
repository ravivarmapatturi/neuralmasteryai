def faithfulness_score(answer_sentences, grounded_flags):
    if len(answer_sentences) != len(grounded_flags):
        raise ValueError("one flag per sentence")
    if not answer_sentences:
        return 1.0
    return sum(grounded_flags) / len(answer_sentences)
