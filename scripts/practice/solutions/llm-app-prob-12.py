def execute_fallback_cascade(providers, request):
    if not providers:
        raise ValueError("no providers configured")
    attempts, total = [], 0
    for p in providers:
        latency = p.get("latency_ms", 0)
        total += latency  # a failed call still costs its latency
        if p.get("fail_rate_limit") or p.get("fail_server_error"):
            error = "rate_limit_exceeded" if p.get("fail_rate_limit") else "500_internal_error"
            attempts.append({"provider": p["name"], "status": "failed", "error": error, "latency_ms": latency})
            continue
        attempts.append({"provider": p["name"], "status": "success", "latency_ms": latency})
        return {
            "successful_provider": p["name"],
            "response": p.get("response_text", ""),
            "attempts": attempts,
            "total_latency_ms": total,
        }
    raise RuntimeError("All providers in fallback cascade failed")
