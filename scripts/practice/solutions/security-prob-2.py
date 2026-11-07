import re

def redact_pii(text):
    text = re.sub(r"\S+@\S+\.\S+", "[EMAIL]", text)
    return re.sub(r"\d{3}-\d{3}-\d{4}", "[PHONE]", text)
