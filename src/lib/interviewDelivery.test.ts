import { describe, expect, it } from 'vitest';
import { DeliveryClock, FILLERS, measureDelivery, normalizeDelivery } from './interviewDelivery';

const timing = { durationSeconds: 120, speakingSeconds: 100, longPauses: 2 };
describe('transcript delivery measurements', () => {
  it('counts all requested fillers in unpunctuated speech with repeats and mixed case', () => {
    const d = measureDelivery('UM uh like you know basically actually um you know', timing);
    expect(d.fillers).toEqual({um: 2, uh: 1, like: 1, 'you know': 2, basically: 1, actually: 1});
    expect(d.wordCount).toBe(10);
    expect(d.wordsPerMinute).toBe(5);
  });
  it('matches whole words and adjacent tokens, including punctuation', () => {
    const d = measureDelivery('album umbrella unlike alike actual basic you really know um, uh. YOU KNOW', timing);
    expect(d.fillers).toEqual({um: 1, uh: 1, like: 0, 'you know': 1, basically: 0, actually: 0});
    expect(measureDelivery('', {...timing,durationSeconds:0,speakingSeconds:0}).wordsPerMinute).toBe(0);
    expect(measureDelivery("we're testing rerankers", timing).wordCount).toBe(3);
  });
  it('measures punctuation-free fixtures against hand-labelled filler uses', () => {
    const cases = [
      { text:'um I would uh cache the result you know basically to reduce latency actually like um that helps', truth:7, matches:7 },
      { text:'I like Python and I like to test failures', truth:0, matches:2 },
      { text:'do you know the limit it actually dropped from ten to five this is basically a queue', truth:0, matches:3 },
      { text:'album umbrella unlike likely basic actual knowledge', truth:0, matches:0 },
    ];
    let predicted = 0, trueFillers = 0;
    for (const c of cases) {
      const count = Object.values(measureDelivery(c.text, timing).fillers).reduce((a,b)=>a+b,0);
      expect(count).toBe(c.matches);
      predicted += count; trueFillers += c.truth;
    }
    expect({predicted,trueFillers,falsePositives:predicted-trueFillers}).toEqual({predicted:12,trueFillers:7,falsePositives:5});
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
