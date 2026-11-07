import hashlib

def hash_split(record_id, test_pct):
    digest = hashlib.md5(record_id.encode()).digest()
    bucket = (int.from_bytes(digest[:4], "big") % 10000) / 100.0
    return "test" if bucket < test_pct else "train"
