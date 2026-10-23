"""Run every reference solution in the practice write-ups against its
problem's real test cases (visible and hidden), the way the in-browser
judge does: call fn(**input), compare with the same tolerance rules as
_safe_eq in src/workers/pyodideWorker.ts.

  python3 scripts/practice/verify-solutions.py problems.json [--remove-failing]

problems.json is PRACTICE_PROBLEMS dumped to JSON. A failing solution is
reported, and with --remove-failing its <Solution> block is deleted: a
wrong reference answer is worse than none.
"""
import glob, json, os, re, subprocess, sys

HARNESS = r'''
import json, sys, math
def _safe_eq(actual, expected):
    if actual is expected: return True
    if hasattr(actual, 'tolist'): actual = actual.tolist()
    if hasattr(expected, 'tolist'): expected = expected.tolist()
    if isinstance(actual, bool) or isinstance(expected, bool):
        return actual == expected
    if isinstance(actual, (int, float)) and isinstance(expected, (int, float)):
        return abs(float(actual) - float(expected)) < 1e-5
    if isinstance(actual, (list, tuple)) and isinstance(expected, (list, tuple)):
        return len(actual) == len(expected) and all(_safe_eq(a, e) for a, e in zip(actual, expected))
    if isinstance(actual, dict) and isinstance(expected, dict):
        a = {str(k): v for k, v in actual.items()}; e = {str(k): v for k, v in expected.items()}
        return a.keys() == e.keys() and all(_safe_eq(a[k], e[k]) for k in a)
    return actual == expected
spec = json.load(sys.stdin)
ns = {}
exec(spec['code'], ns)
fn = ns
for part in spec['fn'].split('.'):
    fn = fn[part] if isinstance(fn, dict) else getattr(fn, part)
fails = []
for tc in spec['cases']:
    try:
        out = fn(**tc['input'])
        if tc.get('expectError'):
            fails.append((tc['id'], 'expected ' + tc['expectError'] + ', returned'))
        elif not _safe_eq(out, tc.get('expectedOutput')):
            fails.append((tc['id'], 'got ' + repr(out)[:120] + ' want ' + repr(tc.get('expectedOutput'))[:120]))
    except Exception as e:
        if tc.get('expectError') and type(e).__name__ == tc['expectError']:
            continue
        fails.append((tc['id'], type(e).__name__ + ': ' + str(e)[:120]))
print(json.dumps(fails))
'''

def main():
    problems = json.load(open(sys.argv[1]))
    remove = '--remove-failing' in sys.argv
    ok = bad = skipped = 0
    report = []
    for f in sorted(glob.glob('src/content/docs/practice-problems/*.mdx')):
        pid = os.path.basename(f)[:-4]
        text = open(f, encoding='utf-8').read()
        m = re.search(r'<Solution>\s*```python\n(.*?)```', text, re.S)
        if not m:
            continue
        p = problems.get(pid)
        if not p or not p.get('testCases') or p.get('runtime', {}).get('language', 'python') != 'python':
            skipped += 1
            continue
        spec = {'code': m.group(1), 'fn': p['functionName'], 'cases': p['testCases']}
        try:
            r = subprocess.run([sys.executable, '-I', '-c', HARNESS], input=json.dumps(spec), capture_output=True, text=True, timeout=20)
            fails = json.loads(r.stdout) if r.returncode == 0 and r.stdout.strip() else [('setup', (r.stderr.strip().splitlines() or ['no output'])[-1][:160])]
        except subprocess.TimeoutExpired:
            fails = [('all', 'timed out after 20s')]
        if fails:
            bad += 1
            report.append(f'{pid}: {len(fails)} failing, e.g. {fails[0]}')
            if remove:
                new = re.sub(r'<Solution>.*?</Solution>\n?', '', text, count=1, flags=re.S)
                if '<Solution>' not in new:
                    new = re.sub(r"^import \{ Solution \} from [^\n]+\n", '', new, flags=re.M)
                open(f, 'w', encoding='utf-8').write(re.sub(r'\n{3,}', '\n\n', new))
        else:
            ok += 1
    print('\n'.join(report))
    print(f'passed {ok}  failed {bad}  skipped {skipped}')

main()
