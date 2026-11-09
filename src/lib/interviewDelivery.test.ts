import fixtures from './interviewDelivery.fixtures.json';
import { describe, expect, it } from 'vitest';
import { DeliveryClock, FILLERS, measureDelivery, normalizeDelivery } from './interviewDelivery';

const timing = { durationSeconds: 120, speakingSeconds: 100, longPauses: 2 };
describe('transcript delivery measurements', () => {
  it('counts conservative fillers and sentence starts', () => {
    expect(measureDelivery('UM uh erm like basically actually you know. I mean, cache it! You know, yes', timing).fillers)
      .toEqual({um:1, uh:1, erm:1, 'you know':1, 'i mean':1});
    expect(measureDelivery('do you know what I mean', timing).fillers['you know']).toBe(0);
  });
  it('keeps whole-word boundaries, punctuation, word counts and pace', () => {
    expect(measureDelivery('album umbrella unlike alike actual basic you really know um, uh. YOU KNOW', timing).fillers)
      .toEqual({um:1, uh:1, erm:0, 'you know':1, 'i mean':0});
    expect(measureDelivery('', {...timing,durationSeconds:0,speakingSeconds:0}).wordsPerMinute).toBe(0);
    expect(measureDelivery("we're testing rerankers", timing).wordCount).toBe(3);
    const d = measureDelivery('UM uh like you know basically actually um you know', timing);
    expect(d.wordCount).toBe(10);
    expect(d.wordsPerMinute).toBe(5);
  });
  it('counts each silence once strictly after 3s, excludes leading silence and resets between answers', () => {
    const clock = new DeliveryClock();
    clock.observe(false, 80000); // Leading 5s is not a pause.
    clock.observe(true, 32000);
    clock.observe(false, 48000);
    expect(clock.snapshot().longPauses).toBe(0);
    clock.observe(false, 16000);
    clock.observe(false, 80000);
    expect(clock.snapshot().longPauses).toBe(1);
    clock.observe(true, 16000);
    clock.observe(false, 64000); // Trailing silence counts once.
    expect(clock.snapshot()).toEqual({durationSeconds:21,speakingSeconds:3,longPauses:2});
    expect(new DeliveryClock().snapshot()).toEqual({durationSeconds:0,speakingSeconds:0,longPauses:0});
  });
  it('drops malformed saved feedback without changing historical attempts', () => {
    const d = measureDelivery('um test', timing);
    expect(normalizeDelivery(d)).toEqual(d);
    for (const bad of [undefined, {}, {...d, durationSeconds:NaN}, {...d, speakingSeconds:121}, {...d, longPauses:-1}, {...d, fillers:{}}]) {
      expect(normalizeDelivery(bad)).toBeUndefined();
    }
    expect(Object.keys(normalizeDelivery(d)!.fillers)).toEqual([...FILLERS]);
  });
});

it('replays the original four fixtures and twenty new punctuation-free fixtures', () => {
  for (const fixture of fixtures) {
    const count = Object.values(measureDelivery(fixture.text, timing).fillers).reduce((a,b)=>a+b,0);
    expect(count, fixture.text).toBe(fixture.after);
    const old = (fixture.text.toLowerCase().match(/\b(?:um|uh|like|you know|basically|actually)\b/g) ?? []).length;
    expect(old).toBe(fixture.before);
  }
});

it('reports before/after precision and omissions for both fixture groups', () => {
  const totals = (group: typeof fixtures, key: 'before' | 'after') => group.reduce((s, f) => ({
    matches:s.matches+f[key], truePositives:s.truePositives+Math.min(f[key],f.truth),
    falsePositives:s.falsePositives+Math.max(0,f[key]-f.truth), missed:s.missed+Math.max(0,f.truth-f[key]),
  }),{matches:0,truePositives:0,falsePositives:0,missed:0});
  expect(totals(fixtures.slice(0,4),'before')).toEqual({matches:12,truePositives:7,falsePositives:5,missed:0});
  expect(totals(fixtures.slice(0,4),'after')).toEqual({matches:3,truePositives:3,falsePositives:0,missed:4});
  expect(totals(fixtures.slice(4),'before')).toEqual({matches:17,truePositives:9,falsePositives:8,missed:5});
  expect(totals(fixtures.slice(4),'after')).toEqual({matches:14,truePositives:14,falsePositives:0,missed:0});
});
