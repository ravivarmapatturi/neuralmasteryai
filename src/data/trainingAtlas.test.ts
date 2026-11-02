import { describe, expect, it } from 'vitest';
import { trainingAtlas } from './trainingAtlas';

describe('trainingAtlas data', () => {
  it('has complete, unique, source-backed entries', () => {
    expect(new Set(trainingAtlas.map((entry) => entry.id)).size).toBe(trainingAtlas.length);
    for (const entry of trainingAtlas) {
      expect(entry.name).toBeTruthy();
      expect(entry.year).toBeGreaterThan(1900);
      expect(entry.whatItIs.split(/(?<=[.!?])\s+/).length).toBeGreaterThanOrEqual(2);
      expect(entry.previousLimit).toBeTruthy();
      expect(entry.dataPreparation).toMatch(/example/i);
      expect(entry.example).toBeTruthy();
      expect(entry.metrics).toBeTruthy();
      expect(entry.whenNotToUse).toBeTruthy();
      expect(entry.replacedBy).toBeTruthy();
      expect(entry.cameBefore).toBeTruthy();
      expect(entry.ledTo).toBeTruthy();
      expect(entry.learnPath).toMatch(/^\/docs\//);
      expect(() => new URL(entry.source.url)).not.toThrow();
    }
  });
});
