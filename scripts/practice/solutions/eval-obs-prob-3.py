from collections import Counter

def cohens_kappa(rater_a, rater_b):
    n = len(rater_a)
    p_o = sum(a == b for a, b in zip(rater_a, rater_b)) / n
    freq_a, freq_b = Counter(rater_a), Counter(rater_b)
    p_e = sum(freq_a[c] / n * freq_b[c] / n for c in set(rater_a) | set(rater_b))
    if p_e == 1:
        return 1.0
    return (p_o - p_e) / (1 - p_e)
