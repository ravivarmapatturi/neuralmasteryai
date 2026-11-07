def circuit_breaker_state(current_state, consecutive_failures, failure_threshold, cooldown_elapsed):
    if current_state == "closed":
        return "open" if consecutive_failures >= failure_threshold else "closed"
    if current_state == "open":
        return "half_open" if cooldown_elapsed else "open"
    if current_state == "half_open":
        # One trial call: success closes the breaker, any failure reopens it.
        return "closed" if consecutive_failures == 0 else "open"
    raise ValueError(f"unknown state {current_state!r}")
