import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Static checks from the diagram quality audit (roadmap 75-80).
const dir = join(__dirname, 'diagrams');
const files = readdirSync(dir).filter((f) => f.endsWith('.tsx') && !f.endsWith('.test.tsx'));
const source = (f: string) => readFileSync(join(dir, f), 'utf8');

describe('diagram audit', () => {
  it('fixed-size SVGs carry a viewBox so they can shrink to 375px', () => {
    const bad = files.filter((f) => /<svg[^>]*\swidth=\{\s*[A-Z0-9]/.test(source(f)) && !source(f).includes('viewBox'));
    expect(bad).toEqual([]);
  });
  it('text on an accent fill uses a theme token, not black or white', () => {
    const bad = files.filter((f) => /\?\s*'#(000|fff|ffffff)'\s*:/i.test(source(f)));
    expect(bad).toEqual([]);
  });
  it('the danger colour comes from the theme', () => {
    expect(files.filter((f) => /#d9534f/i.test(source(f).replace(/^const RUN_COLORS.*$/m, '')))).toEqual([]);
  });
});
