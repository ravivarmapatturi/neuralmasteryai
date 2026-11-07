def is_valid_jsonrpc_request(message):
    if message.get("jsonrpc") != "2.0":
        return False
    method = message.get("method")
    if not isinstance(method, str) or not method:
        return False
    if "params" in message and not isinstance(message["params"], (dict, list)):
        return False
    if "id" in message:
        mid = message["id"]
        # bool is a subclass of int in Python, but true/false is not a valid id.
        if isinstance(mid, bool) or not (mid is None or isinstance(mid, (str, int))):
            return False
    return True
