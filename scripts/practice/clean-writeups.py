"""Clean the practice-problem write-ups (src/content/docs/practice-problems).

Most were generated from an early template: a rank/XP line, the title
again as an H1, an Overview and Task that repeat the Description tab (or,
for some, describe a different placeholder function entirely), and an
embedded second playground. The Worked Intuition tab rendered all of it.

This keeps only what's specific and correct: hand-written sections, and a
reference solution when it implements the problem's real function. Run
scripts/practice/verify-solutions.py afterwards to test the solutions.

  python3 scripts/practice/clean-writeups.py
"""
import glob, os, re

PROBLEMS = open('src/lib/practiceProblem.ts', encoding='utf-8').read()
FN = {m.group(1): m.group(2) for m in re.finditer(
    r"\n  ['\"]([\w-]+)['\"]: \{\n\s+id: [^\n]+\n.*?functionName: ['\"]([\w.]+)['\"]", PROBLEMS, re.S)}

PLACEHOLDER = re.compile(r'fundamental in building robust AI systems|return the sum of the list elements', re.I)

def clean(pid, text):
    fm_end = text.index('---', 3) + 3
    fm, body = text[:fm_end], text[fm_end:]
    fn = FN.get(pid)
    body = re.sub(r"^import PracticePlayground from [^\n]+\n", '', body, flags=re.M)
    body = re.sub(r"^<PracticePlayground [^>]*/>\s*$", '', body, flags=re.M)
    body = re.sub(r"^# [^\n]+\n", '', body, count=1, flags=re.M)            # title again as H1
    body = re.sub(r"^\*\*(Track|Rank)\b[^\n]*\n", '', body, flags=re.M)      # rank / XP line
    # Overview + Task: they repeat the Description tab, or are placeholders.
    body = re.sub(r"^## Overview\n.*?(?=^## (?!Overview)|^<Solution>|\Z)", '', body, flags=re.S | re.M)
    body = re.sub(r"^## Task\n.*?(?=^## |^<Solution>|\Z)", '', body, flags=re.S | re.M)
    # A solution for a different function than the problem asks for is wrong here.
    def keep_solution(m):
        block = m.group(0)
        if fn and re.search(r'def\s+' + re.escape(fn.split('.')[-1]) + r'\s*\(', block):
            return block
        return ''
    body = re.sub(r"<Solution>.*?</Solution>\n?", keep_solution, body, flags=re.S)
    if PLACEHOLDER.search(body):
        body = PLACEHOLDER.sub('', body)
    if '<Solution>' not in body:
        body = re.sub(r"^import \{ Solution \} from [^\n]+\n", '', body, flags=re.M)
    body = re.sub(r'\n{3,}', '\n\n', body).strip()
    return fm + ('\n\n' + body + '\n' if body else '\n')

changed = 0
for f in sorted(glob.glob('src/content/docs/practice-problems/*.mdx')):
    pid = os.path.basename(f)[:-4]
    text = open(f, encoding='utf-8').read()
    new = clean(pid, text)
    if new != text:
        open(f, 'w', encoding='utf-8').write(new)
        changed += 1
print('changed', changed)
