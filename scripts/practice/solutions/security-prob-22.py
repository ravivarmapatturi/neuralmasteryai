import hashlib

def is_audit_chain_intact(log_entries):
    prev = ""
    for entry in log_entries:
        if entry["prev_hash"] != prev:
            return False
        expected = hashlib.sha256((entry["prev_hash"] + entry["data"]).encode()).hexdigest()
        if entry["hash"] != expected:
            return False
        prev = entry["hash"]
    return True
