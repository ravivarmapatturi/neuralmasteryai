import hashlib

def canary_route(request_id, canary_pct):
    # A stable hash, so the same request id always lands on the same side.
    digest = hashlib.md5(request_id.encode()).digest()
    bucket = (int.from_bytes(digest[:4], "big") % 10000) / 100.0
    return "canary" if bucket < canary_pct else "stable"
