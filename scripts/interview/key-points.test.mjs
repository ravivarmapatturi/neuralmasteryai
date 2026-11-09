import { execFileSync } from 'node:child_process';
import { expect, it } from 'vitest';
it('validates optional build-time key points and rejects malformed rubrics',()=>{
  // Execute the actual validator AST without loading the source bank or writing generated data.
  const result=execFileSync('python3',['-c',`
import ast
from pathlib import Path
module=ast.parse(Path('scripts/interview/build_practice_data.py').read_text())
fn=next(n for n in module.body if isinstance(n,ast.FunctionDef) and n.name=='validate_key_points')
ns={}
exec(compile(ast.Module(body=[fn],type_ignores=[]),'<validator>','exec'),ns)
validate=ns['validate_key_points']
validate({'id':'legacy'})
validate({'id':'valid','keyPoints':['One','Two','Three']})
for points in [None,'abc',[],['One','Two'],['Same']*3,['One','Two',''],['One','Two',1],['One','Two','x'*201],list('abcdefg')]:
    try:
        validate({'id':'bad','keyPoints':points})
    except ValueError:
        continue
    raise AssertionError(points)
print('validated')
`],{encoding:'utf8'});
  expect(result.trim()).toBe('validated');
});

it('applies a durable rubric without changing the answer or replacing existing points', () => {
  const result = execFileSync('python3', ['-c', `
import ast
from pathlib import Path
module = ast.parse(Path('scripts/interview/build_practice_data.py').read_text())
functions = [n for n in module.body if isinstance(n, ast.FunctionDef) and n.name in ('validate_key_points', 'apply_key_point_override')]
ns = {}
exec(compile(ast.Module(body=functions, type_ignores=[]), '<rubrics>', 'exec'), ns)
apply = ns['apply_key_point_override']
original = {'id': 'question', 'answer': 'Exact answer.\\n  Keep whitespace.', 'level': 'senior'}
item = original.copy()
apply(item, {'question': ['First', 'Second', 'Third']})
assert {k: v for k, v in item.items() if k != 'keyPoints'} == original
try:
    apply(item, {'question': ['Replacement', 'Second', 'Third']})
except ValueError:
    pass
else:
    raise AssertionError('Existing rubric replaced')
try:
    apply(original.copy(), {'question': ['Too few']})
except ValueError:
    pass
else:
    raise AssertionError('Malformed rubric accepted')
print('validated')
`], {encoding: 'utf8'});
  expect(result.trim()).toBe('validated');
});
