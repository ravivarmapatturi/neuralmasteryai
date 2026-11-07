def estimate_batch_memory_gb(num_params, batch_size, seq_len, hidden_dim, bytes_per_param=4.0):
    weights = num_params * bytes_per_param * 3  # weights + Adam's two moment buffers
    activations = batch_size * seq_len * hidden_dim * bytes_per_param * 2  # forward + backward
    return (weights + activations) / 1024 ** 3
