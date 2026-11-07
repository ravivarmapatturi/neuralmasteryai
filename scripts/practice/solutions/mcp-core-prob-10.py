def parse_stdio_frame(raw_bytes):
    header, _, rest = raw_bytes.partition("\r\n\r\n")
    length = None
    for line in header.split("\r\n"):
        name, _, value = line.partition(":")
        if name.strip().lower() == "content-length":
            length = int(value.strip())
    if length is None:
        raise ValueError("missing Content-Length header")
    return rest[:length], rest[length:]
