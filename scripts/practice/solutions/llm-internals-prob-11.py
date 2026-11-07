def calculate_kv_cache_bytes(num_layers, num_kv_heads, head_dim, seq_len, batch_size, bytes_per_param=2):
    args = (num_layers, num_kv_heads, head_dim, seq_len, batch_size, bytes_per_param)
    if any(not isinstance(a, int) or a <= 0 for a in args):
        raise ValueError("all arguments must be positive integers")
    # 2 = one Key and one Value tensor per layer.
    return 2 * num_layers * num_kv_heads * head_dim * seq_len * batch_size * bytes_per_param
