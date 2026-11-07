def length_of_longest_substring(s):
    last_seen, start, best = {}, 0, 0
    for i, ch in enumerate(s):
        if last_seen.get(ch, -1) >= start:
            start = last_seen[ch] + 1  # jump past the earlier copy
        last_seen[ch] = i
        best = max(best, i - start + 1)
    return best
