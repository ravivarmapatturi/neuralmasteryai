import math

def psi(expected_pct, actual_pct):
    total = 0.0
    for e, a in zip(expected_pct, actual_pct):
        if e == 0 or a == 0:
            continue  # log(0) is undefined; skip empty bins
        total += (a - e) * math.log(a / e)
    return total
