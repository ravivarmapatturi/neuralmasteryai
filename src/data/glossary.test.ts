import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { glossaryTerms } from './glossary';

describe('glossary data contract', () => {
  it('contains exactly 100 terms with unique slugs and diagram ids', () => {
    expect(glossaryTerms).toHaveLength(100);
    expect(new Set(glossaryTerms.map((entry) => entry.slug)).size).toBe(100);
    expect(new Set(glossaryTerms.map((entry) => entry.diagram)).size).toBe(100);
  });

  it('points every term at an existing Learn page', () => {
    for (const entry of glossaryTerms) {
      const relative = entry.learnPath.replace('/docs/', '');
      expect(existsSync(resolve(process.cwd(), 'src/content/docs', `${relative}.mdx`)), `${entry.term}: ${entry.learnPath}`).toBe(true);
    }
  });
});
