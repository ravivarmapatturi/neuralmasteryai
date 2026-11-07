def merge_lora(base_weight, lora_a, lora_b, alpha, rank):
    if rank <= 0:
        raise ValueError("rank must be positive")
    return base_weight + (alpha / rank) * lora_a * lora_b
