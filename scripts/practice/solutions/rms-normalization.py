import math

def rms_norm(x, gamma, eps=1e-6):
    out = []
    for row in x:
        rms = math.sqrt(sum(v * v for v in row) / len(row) + eps)
        out.append([v / rms * g for v, g in zip(row, gamma)])
    return out
