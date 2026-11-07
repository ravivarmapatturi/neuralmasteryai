def decompose_question(question):
    if " and " not in question:
        return [question]
    return [part.strip() for part in question.split(" and ") if part.strip()]
