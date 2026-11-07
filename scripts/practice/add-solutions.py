"""Check hand-written reference solutions against each problem's real test
cases (visible and hidden) and add the passing ones to the problem's page
as a closed <Solution> block.

  python3 -I scripts/practice/add-solutions.py problems.json [--write]

problems.json: the curated problems dumped to JSON, with non-finite
numbers encoded as {"__num__": "Infinity"}. Solutions live in
scripts/practice/solutions/<problem-id>.py. A solution is only written to
a page if every test case passes, using the same comparison as the
browser judge (_safe_eq in src/workers/pyodideWorker.ts).
"""
import json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
SOL_DIR = os.path.join(HERE, 'solutions')
DOCS = os.path.join(HERE, '..', '..', 'src', 'content', 'docs', 'practice-problems')

def load_harness():
    src = open(os.path.join(HERE, 'verify-solutions.py'), encoding='utf-8').read()
    return re.search(r"HARNESS = r'''(.*?)'''", src, re.S).group(1)

def decode(v):
    if isinstance(v, dict):
        if set(v) == {'__num__'}: return float(v['__num__'].replace('Infinity', 'inf'))
        return {k: decode(x) for k, x in v.items()}
    if isinstance(v, list): return [decode(x) for x in v]
    return v

def main():
    problems = {p['id']: p for p in json.load(open(sys.argv[1]))}
    write = '--write' in sys.argv
    harness = load_harness().replace("spec = json.load(sys.stdin)", "import pickle\nspec = pickle.load(sys.stdin.buffer)")
    ok = bad = 0
    for name in sorted(os.listdir(SOL_DIR)):
        if not name.endswith('.py'): continue
        pid = name[:-3]
        p = problems.get(pid)
        if not p: print('UNKNOWN', pid); bad += 1; continue
        code = open(os.path.join(SOL_DIR, name), encoding='utf-8').read()
        import pickle
        spec = {'code': code, 'fn': p['fn'], 'cases': decode(p['tests'])}
        r = subprocess.run([sys.executable, '-I', '-c', harness], input=pickle.dumps(spec), capture_output=True, timeout=60)
        try:
            fails = json.loads(r.stdout.decode().strip().splitlines()[-1])
        except Exception:
            fails = [('crash', r.stderr.decode()[-300:])]
        if fails:
            bad += 1; print('FAIL', pid, fails[:3]); continue
        ok += 1
        if write: add_to_page(pid, code)
    print(f'{ok} pass, {bad} fail')

def add_to_page(pid, code):
    path = os.path.join(DOCS, pid + '.mdx')
    text = open(path, encoding='utf-8').read()
    if '<Solution' in text: return
    m = re.match(r'(---\n.*?\n---\n)(.*)', text, re.S)
    head, body = m.group(1), m.group(2)
    imp = "import { Solution } from '../../../components/content/ExpandableDepth';\n"
    if 'import { Solution }' not in body: body = '\n' + imp + body
    block = f"\n## Reference solution\n\nTry the problem first. The solution stays hidden until you open it.\n\n<Solution title=\"Show the reference solution\">\n\n```python\n{code.strip()}\n```\n\n</Solution>\n"
    open(path, 'w', encoding='utf-8').write(head + body.rstrip('\n') + '\n' + block)

if __name__ == '__main__':
    main()
