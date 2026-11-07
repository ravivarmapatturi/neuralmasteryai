def causal_attention_mask(seq_len: int) -> list[list[int]]:
    if seq_len <= 0:
        raise ValueError("seq_len must be positive")
    return [[1 if j <= i else 0 for j in range(seq_len)] for i in range(seq_len)]
