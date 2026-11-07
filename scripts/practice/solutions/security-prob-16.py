META = set(";|&$`><\n()")

def has_shell_metacharacters(arg):
    return any(ch in META for ch in arg)
