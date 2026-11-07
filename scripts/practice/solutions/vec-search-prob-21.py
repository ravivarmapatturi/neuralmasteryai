def merge_shard_topk(shard_results, k):
    merged = [tuple(item) for shard in shard_results for item in shard]
    merged.sort(key=lambda item: (-item[1], item[0]))
    return merged[:k]
