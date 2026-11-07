def semantic_chunk(sentences, max_chunk_chars):
    chunks, current = [], ""
    for sentence in sentences:
        candidate = sentence if not current else current + " " + sentence
        if len(candidate) <= max_chunk_chars or not current:
            current = candidate  # an over-long first sentence stands alone
        else:
            chunks.append(current)
            current = sentence
    if current:
        chunks.append(current)
    return chunks
