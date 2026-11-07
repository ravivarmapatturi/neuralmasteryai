def apply_stop_sequences(text, stop_sequences):
    best_index, best_seq = None, None
    for seq in stop_sequences:
        if not seq:
            continue
        i = text.find(seq)
        if i != -1 and (best_index is None or i < best_index):
            best_index, best_seq = i, seq
    if best_index is None:
        return {"truncated_text": text, "stopped": False, "matched_sequence": None}
    return {"truncated_text": text[:best_index], "stopped": True, "matched_sequence": best_seq}
