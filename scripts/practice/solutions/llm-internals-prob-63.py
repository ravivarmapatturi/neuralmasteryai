def gqa_kv_cache_size_mb(num_layers, num_kv_heads, head_dim, seq_len, batch_size, bytes_per_value):
    elements = 2 * num_layers * num_kv_heads * head_dim * seq_len * batch_size
    return elements * bytes_per_value / (1024 * 1024)
