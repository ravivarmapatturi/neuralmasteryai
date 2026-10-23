/**
 * Show practice test-case values the way a Python programmer would write
 * them, instead of raw JSON.stringify output: `None`/`True`/`False`, spaces
 * after commas, quoted strings, and matrices one row per line. An input
 * object (the function's keyword arguments) becomes one `name = value`
 * line per argument.
 */

function isNumberRow(v: unknown): v is unknown[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'number' || x === null);
}

function isMatrix(v: unknown): v is unknown[][] {
  return Array.isArray(v) && v.length > 1 && v.every(isNumberRow) && (v as unknown[][]).some((row) => row.length > 0);
}

export function formatPy(value: unknown, indent = 0): string {
  if (value === null || value === undefined) return 'None';
  if (value === true) return 'True';
  if (value === false) return 'False';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : value > 0 ? "float('inf')" : value < 0 ? "float('-inf')" : "float('nan')";
  if (typeof value === 'string') return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
  if (Array.isArray(value)) {
    const single = `[${value.map((v) => formatPy(v)).join(', ')}]`;
    if (isMatrix(value) && single.length + indent > 48) {
      const pad = ' '.repeat(indent + 1);
      return `[${value.map((row, i) => (i === 0 ? '' : pad) + formatPy(row)).join(',\n')}]`;
    }
    return single;
  }
  if (typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).map(([k, v]) => `'${k}': ${formatPy(v)}`).join(', ')}}`;
  }
  return String(value);
}

/** A test case's input: `name = value` per argument for a keyword-argument
 * object, otherwise the value itself. */
export function formatPyArgs(input: unknown): string {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    return Object.entries(input as Record<string, unknown>)
      .map(([name, v]) => `${name} = ${formatPy(v, name.length + 3)}`)
      .join('\n');
  }
  return formatPy(input);
}
