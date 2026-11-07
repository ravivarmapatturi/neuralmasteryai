from collections import OrderedDict

def simulate_prompt_cache(operations, capacity=100, default_ttl_sec=3600):
    if capacity <= 0 or default_ttl_sec <= 0:
        raise ValueError("capacity and TTL must be positive")
    cache = OrderedDict()  # key -> (response, expire_at); order = least to most recent
    stats = {"hits": 0, "misses": 0, "evictions": 0, "expired": 0}
    for op in operations:
        key = " ".join(op["prompt"].split()).lower()
        now = op["timestamp"]
        if op["op"] == "get":
            if key not in cache:
                stats["misses"] += 1
            elif now > cache[key][1]:
                del cache[key]
                stats["expired"] += 1
                stats["misses"] += 1
            else:
                cache.move_to_end(key)
                stats["hits"] += 1
        elif op["op"] == "set":
            cache[key] = (op["response"], now + op.get("ttl_sec", default_ttl_sec))
            cache.move_to_end(key)
            if len(cache) > capacity:
                cache.popitem(last=False)
                stats["evictions"] += 1
    return {**stats, "final_keys": list(cache)}
