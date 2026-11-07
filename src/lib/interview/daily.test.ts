import { describe, expect, it } from 'vitest';
import { pickDaily } from './daily';

const qs = [1, 2, 3].map((n) => ({ id: `q${n}`, title: `Q${n}`, topic: 't' }));

describe('pickDaily', () => {
  it('is stable within a day and changes the next day', () => {
    const morning = pickDaily(qs, new Date('2026-11-07T01:00:00Z'));
    expect(pickDaily(qs, new Date('2026-11-07T23:00:00Z'))).toBe(morning);
    expect(pickDaily(qs, new Date('2026-11-08T01:00:00Z'))).not.toBe(morning);
  });
});
