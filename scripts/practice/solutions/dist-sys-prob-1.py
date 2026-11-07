import bisect
import hashlib

def consistent_hash_lookup(key, ring):
    if not ring:
        raise ValueError("the ring has no nodes")
    position = int(hashlib.md5(key.encode()).hexdigest(), 16) % 360
    positions = [p for p, _ in ring]
    i = bisect.bisect_left(positions, position)  # first node at or after the key
    return ring[i % len(ring)][1]                # past the last node: wrap to the first
