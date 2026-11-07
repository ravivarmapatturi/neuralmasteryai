def update_kv_cache(cached_keys, cached_values, new_key, new_value, window_size=None):
    if window_size is not None and window_size <= 0:
        raise ValueError("window_size must be positive")
    if len(new_key) != len(new_value):
        raise ValueError("key and value dimensions differ")
    if cached_keys and len(cached_keys[0]) != len(new_key):
        raise ValueError("key dimension does not match the cache")
    if cached_values and len(cached_values[0]) != len(new_value):
        raise ValueError("value dimension does not match the cache")
    keys = list(cached_keys) + [new_key]
    values = list(cached_values) + [new_value]
    evicted = 0
    if window_size is not None and len(keys) > window_size:
        evicted = len(keys) - window_size
        keys, values = keys[evicted:], values[evicted:]
    return {"keys": keys, "values": values, "seq_len": len(keys), "evicted_count": evicted}
