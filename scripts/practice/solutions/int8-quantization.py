def quantize_int8(W):
    max_abs = max(abs(v) for row in W for v in row)
    scale = max_abs / 127.0 if max_abs > 0 else 1.0
    q = [[max(-127, min(127, int(round(v / scale)))) for v in row] for row in W]
    return [q, scale]
