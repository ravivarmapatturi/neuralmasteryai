#!/usr/bin/env python3
"""Execute every track snippet directly and under the Pyodide worker indentation contract."""
import argparse
import json
import re
import subprocess
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', default='/tmp/system-python-results.json')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
results = []
for page in sorted((root / 'src/content/docs/software-system-design').glob('*.mdx')):
    snippets = re.findall(r'<RunnableCode code=\{`([\s\S]*?)`\}', page.read_text())
    expected = 0 if page.stem == 'roadmap' else 2
    if len(snippets) != expected:
        raise SystemExit(f'{page.name}: expected {expected} snippets, found {len(snippets)}')
    for index, code in enumerate(snippets, 1):
        wrapped = 'try:\n' + ''.join('    ' + line + '\n' for line in code.splitlines()) + 'except Exception:\n    raise\n'
        direct = subprocess.run(['python3', '-c', code], capture_output=True, text=True, timeout=20)
        worker = subprocess.run(['python3', '-c', wrapped], capture_output=True, text=True, timeout=20)
        result = {'page': page.stem, 'snippet': index, 'exit': direct.returncode,
                  'worker_wrapper_exit': worker.returncode, 'output': direct.stdout,
                  'error': direct.stderr + worker.stderr}
        results.append(result)
        if direct.returncode or worker.returncode or direct.stdout != worker.stdout:
            raise SystemExit(json.dumps(result, indent=2))
if len(results) != 32:
    raise SystemExit(f'Expected 32 snippets, found {len(results)}')
Path(args.output).write_text(json.dumps(results, indent=2) + '\n')
print('32 snippets passed directly and under worker indentation; outputs match.')
