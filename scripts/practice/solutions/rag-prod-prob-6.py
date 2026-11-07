import string

def is_grounded(answer_sentence, source_chunks, min_overlap):
    def words(text):
        return [w.strip(string.punctuation) for w in text.lower().split()]
    sentence = words(answer_sentence)
    for chunk in source_chunks:
        vocab = set(words(chunk))
        if sum(w in vocab for w in sentence) / len(sentence) >= min_overlap:
            return True
    return False
