MARKERS = ["ignore previous instructions", "ignore all previous", "new instructions", "system prompt", "you are now"]

def detect_injection_markers(tool_output):
    text = tool_output.lower()
    return sorted({m for m in MARKERS if m in text})
