def build_inverted_index(documents):
    index = {}
    for doc_id, tokens in enumerate(documents):
        for token in tokens:
            postings = index.setdefault(token, [])
            if not postings or postings[-1] != doc_id:
                postings.append(doc_id)  # doc ids arrive in order, so this stays sorted
    return index
