import { describe, expect, it } from 'vitest'
import { toPythonLiteral } from './pyodideWorker'

// toPythonLiteral is the real thing that replaces the old, fragile
// "split tests on newlines, keep only lines starting with 'assert '"
// parsing (see the 'run-cases' message's own comment in this file) --
// structured test-case data (real numbers/strings/lists/objects) becomes
// real Python source, not free text to be parsed back out.
describe('toPythonLiteral', () => {
  it('keeps infinities and NaN instead of turning them into None', () => {
    expect(toPythonLiteral([4, -Infinity, Infinity, NaN])).toBe("[4, float('-inf'), float('inf'), float('nan')]")
  })

  it('converts numbers and strings the same way JSON does -- both are already valid Python literals', () => {
    expect(toPythonLiteral(32)).toBe('32')
    expect(toPythonLiteral(-11)).toBe('-11')
    expect(toPythonLiteral(3.5)).toBe('3.5')
    expect(toPythonLiteral('hello')).toBe('"hello"')
  })

  it('spells booleans and null the Python way, not the JS way', () => {
    expect(toPythonLiteral(true)).toBe('True')
    expect(toPythonLiteral(false)).toBe('False')
    expect(toPythonLiteral(null)).toBe('None')
    expect(toPythonLiteral(undefined)).toBe('None')
  })

  it('converts arrays recursively, including nested arrays', () => {
    expect(toPythonLiteral([1, 2, 3])).toBe('[1, 2, 3]')
    expect(toPythonLiteral([[1, 2], [3, 4]])).toBe('[[1, 2], [3, 4]]')
    expect(toPythonLiteral([])).toBe('[]')
  })

  it('converts a plain object into a real Python dict literal with string keys', () => {
    expect(toPythonLiteral({ a: [1, 2, 3], b: [4, 5, 6] })).toBe('{"a": [1, 2, 3], "b": [4, 5, 6]}')
  })

  it('the exact real use case: dot_product test-case input becomes a valid **kwargs dict', () => {
    const input = { a: [1, 2, 3], b: [4, 5, 6] }
    const literal = toPythonLiteral(input)
    // Real, minimal sanity check that this is syntactically a Python dict
    // literal a real `**{...}` call could use -- not executing Python
    // here (that's pyodideExecutor's own real-Pyodide-backed concern),
    // just confirming the string shape is right.
    expect(literal.startsWith('{')).toBe(true)
    expect(literal.endsWith('}')).toBe(true)
    expect(literal).toContain('"a": [1, 2, 3]')
  })
})
