def wordpiece_tokenize(word, vocab, unk_token):
    vocab = set(vocab)
    pieces, start = [], 0
    while start < len(word):
        end, piece = len(word), None
        while end > start:  # longest match first
            candidate = word[start:end] if start == 0 else "##" + word[start:end]
            if candidate in vocab:
                piece = candidate
                break
            end -= 1
        if piece is None:
            return [unk_token]  # the whole word, not partial pieces
        pieces.append(piece)
        start = end
    return pieces
