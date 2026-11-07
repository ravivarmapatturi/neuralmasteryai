def group_anagrams(words):
    groups = {}
    for w in words:
        groups.setdefault("".join(sorted(w)), []).append(w)
    return [groups[k] for k in sorted(groups)]
