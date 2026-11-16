import { test, expect } from '@playwright/test';
import { transformMdx } from '../scripts/fix-display-math.mjs';
import { findSingleLineMath } from '../scripts/check-math.mjs';

test.describe('scripts/fix-display-math.mjs and scripts/check-math.mjs', () => {
  test('rewrites standalone single-line $$ formula into 3-line format', () => {
    const input = '$$E = mc^2$$';
    const { content, count } = transformMdx(input);
    expect(count).toBe(1);
    expect(content).toBe('$$\nE = mc^2\n$$');
  });

  test('preserves indentation for list items', () => {
    const input = [
      '- First item:',
      '   $$\\text{Score} = \\frac{A}{B}$$',
      '- Second item',
    ].join('\n');

    const { content, count } = transformMdx(input);
    expect(count).toBe(1);
    expect(content).toBe([
      '- First item:',
      '   $$',
      '   \\text{Score} = \\frac{A}{B}',
      '   $$',
      '- Second item',
    ].join('\n'));
  });

  test('is idempotent on multi-line math', () => {
    const input = '$$\nE = mc^2\n$$';
    const firstPass = transformMdx(input);
    expect(firstPass.count).toBe(0);
    expect(firstPass.content).toBe(input);

    const singleLine = '$$E = mc^2$$';
    const transformed = transformMdx(singleLine).content;
    const secondPass = transformMdx(transformed);
    expect(secondPass.count).toBe(0);
    expect(secondPass.content).toBe(transformed);
  });

  test('ignores fenced code blocks', () => {
    const input = [
      '```python',
      '$$not_math$$',
      '```',
      '~~~ts',
      '$$also_not_math$$',
      '~~~',
    ].join('\n');

    const { content, count } = transformMdx(input);
    expect(count).toBe(0);
    expect(content).toBe(input);

    const violations = findSingleLineMath(input);
    expect(violations).toHaveLength(0);
  });

  test('ignores RunnableCode snippets', () => {
    const input = [
      '<RunnableCode',
      '  code={`',
      '$$py_math$$',
      '  `}',
      '/>',
    ].join('\n');

    const { content, count } = transformMdx(input);
    expect(count).toBe(0);
    expect(content).toBe(input);

    const violations = findSingleLineMath(input);
    expect(violations).toHaveLength(0);
  });

  test('ignores inline math within sentences', () => {
    const input = 'Here is an inline math formula $$x = 1$$ within a normal sentence.';
    const { content, count } = transformMdx(input);
    expect(count).toBe(0);
    expect(content).toBe(input);

    const violations = findSingleLineMath(input);
    expect(violations).toHaveLength(0);
  });

  test('detects violations and reports file/line/column in check-math', () => {
    const input = [
      '# Heading',
      '',
      '$$A = B + C$$',
      '',
      '   $$\\text{Indented} = 1$$',
    ].join('\n');

    const violations = findSingleLineMath(input, 'test.mdx');
    expect(violations).toHaveLength(2);
    expect(violations[0]).toMatchObject({
      file: 'test.mdx',
      line: 3,
      column: 1,
      body: 'A = B + C',
    });
    expect(violations[1]).toMatchObject({
      file: 'test.mdx',
      line: 5,
      column: 4,
      body: '\\text{Indented} = 1',
    });
  });
});
