def is_anagram(s, t):
    if len(s) != len(t):
        return False
    counts = {}
    for ch in s:
        counts[ch] = counts.get(ch, 0) + 1
    for ch in t:
        counts[ch] = counts.get(ch, 0) - 1
        if counts[ch] < 0:
            return False
    return True
