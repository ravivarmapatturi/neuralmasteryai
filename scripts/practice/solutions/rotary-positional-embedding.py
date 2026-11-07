import math

def rope(x: list[float], position: int, base: float = 10000.0) -> list[float]:
    d = len(x)
    out = []
    for i in range(d // 2):
        theta = position * base ** (-2 * i / d)
        a, b = x[2 * i], x[2 * i + 1]
        c, s = math.cos(theta), math.sin(theta)
        # 2D rotation of the pair (a, b) by theta.
        out += [round(a * c - b * s, 6), round(a * s + b * c, 6)]
    return out
