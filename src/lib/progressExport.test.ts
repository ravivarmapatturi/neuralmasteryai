import { beforeEach, describe, expect, it } from 'vitest';
import { collectProgress, restoreProgress } from './progressExport';

describe('progress export', () => {
  beforeEach(() => localStorage.clear());
  it('collects only this site’s keys and restores them', () => {
    localStorage.setItem('neural-mastery-progress', '{"a":1}');
    localStorage.setItem('nm_practice_code_x', 'print(1)');
    localStorage.setItem('someone-else', 'no');
    const backup = collectProgress(localStorage, 0);
    expect(Object.keys(backup.data).sort()).toEqual(['neural-mastery-progress', 'nm_practice_code_x']);
    localStorage.clear();
    expect(restoreProgress(JSON.stringify(backup))).toBe(2);
    expect(localStorage.getItem('nm_practice_code_x')).toBe('print(1)');
  });
  it('rejects files that are not a backup and ignores foreign keys', () => {
    expect(() => restoreProgress('{"hello":1}')).toThrow(/not a Neural Mastery/);
    expect(restoreProgress(JSON.stringify({ app: 'neural-mastery', version: 1, exportedAt: '', data: { evil: 'x' } }))).toBe(0);
    expect(localStorage.getItem('evil')).toBeNull();
  });
});
