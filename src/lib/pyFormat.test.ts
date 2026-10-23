import { describe, expect, it } from 'vitest';
import { formatPy, formatPyArgs } from './pyFormat';

describe('formatPy', () => {
  it('writes Python literals', () => {
    expect(formatPy([1, 2.5, null, true, false])).toBe('[1, 2.5, None, True, False]');
    expect(formatPy("it's")).toBe("'it\\'s'");
    expect(formatPy({ a: 1 })).toBe("{'a': 1}");
  });

  it('keeps short matrices on one line and breaks long ones by row', () => {
    expect(formatPy([[1, 2], [3, 4]])).toBe('[[1, 2], [3, 4]]');
    expect(formatPy([[0.5, -0.5, 0.25, 1.75], [1, 1.5, 2.25, -3.5], [7, 8, 9, 10]])).toBe(
      '[[0.5, -0.5, 0.25, 1.75],\n [1, 1.5, 2.25, -3.5],\n [7, 8, 9, 10]]',
    );
  });
});

describe('formatPyArgs', () => {
  it('writes one name = value line per argument, aligning matrix rows', () => {
    expect(formatPyArgs({ x: [[1, 2]], b: [0.1, -0.2] })).toBe('x = [[1, 2]]\nb = [0.1, -0.2]');
    expect(formatPyArgs({ w: [[0.5, -0.5, 0.25, 1.75, 2], [1, 1.5, 2.25, -3.5, 4]] })).toBe(
      'w = [[0.5, -0.5, 0.25, 1.75, 2],\n     [1, 1.5, 2.25, -3.5, 4]]',
    );
  });

  it('passes a non-object input through formatPy', () => {
    expect(formatPyArgs([1, 2])).toBe('[1, 2]');
  });
});
