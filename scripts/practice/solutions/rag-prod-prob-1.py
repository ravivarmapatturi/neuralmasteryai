def chunk_with_overlap(text, chunk_size, overlap):
    if chunk_size <= 0 or not 0 <= overlap < chunk_size:
        raise ValueError("need chunk_size > 0 and 0 <= overlap < chunk_size")
    step = chunk_size - overlap
    return [text[start:start + chunk_size] for start in range(0, len(text), step)]
