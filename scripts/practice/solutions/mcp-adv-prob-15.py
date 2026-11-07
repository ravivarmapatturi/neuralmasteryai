def is_safe_to_retry(annotations, failure_reason):
    if annotations.get("idempotentHint", False) is True:
        return True
    return failure_reason == "timeout" and annotations.get("readOnlyHint", False) is True
