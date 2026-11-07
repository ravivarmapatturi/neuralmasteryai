def correlate_response(pending_requests, response_id):
    return pending_requests.get(response_id, "unknown")
