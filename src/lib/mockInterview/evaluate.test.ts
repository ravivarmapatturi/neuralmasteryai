import { describe, expect, it } from 'vitest';
import { cosine, deliveryMetrics, evaluateAnswer, sessionSummary, splitSentences } from './evaluate';

// Fake embedder: a bag-of-keywords vector, so tests are deterministic and model-free.
const VOCAB = ['variance', 'overfit', 'depth', 'prune', 'forest', 'leakage', 'noise'];
const fakeEmbed = async (texts: string[]) => texts.map(t => VOCAB.map(w => (t.toLowerCase().includes(w) ? 1 : 0)));
const q = { id: 'q1', title: 'Tree overfits', criteria: ['Names high variance overfit', 'Limit depth or prune', 'Average trees in a forest', 'Check leakage or label noise'], sourceRoute: '/docs/x' };

describe('mock interview evaluation', () => {
  it('cosine handles identical, orthogonal and zero vectors', () => {
    expect(cosine([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosine([1, 0], [0, 1])).toBe(0);
    expect(cosine([0, 0], [1, 1])).toBe(0);
  });
  it('splits unpunctuated speech into windows', () => {
    const words = Array.from({ length: 40 }, (_, i) => `w${i}`).join(' ');
    expect(splitSentences(words).length).toBeGreaterThan(1);
  });
  it('counts fillers, words per minute and length', () => {
    const d = deliveryMetrics('um so basically I would um limit the depth', 30);
    expect(d.fillers.um).toBe(2);
    expect(d.fillers.basically).toBe(1);
    expect(d.wpm).toBe(18);
    expect(d.lengthVerdict).toBe('too short');
  });
  it('marks criteria covered with evidence and lists missed points as improvements', async () => {
    const answer = 'This is high variance, the tree overfit the data. First, I would clarify the data size. My approach would be to limit the depth and prune it. The trade-off is some bias.';
    const r = await evaluateAnswer(q, answer, 90, fakeEmbed);
    expect(r.criteria[0].coverage).toBe('covered');
    expect(r.criteria[0].evidence).toMatch(/variance/);
    expect(r.criteria[3].coverage).toBe('missed');
    expect(r.criteria[2].coverage).toBe('missed');
    expect(r.improvements.join(' ')).toMatch(/forest/);
    expect(r.improvements.join(' ')).toMatch(/leakage/);
    expect(r.moves.find(m => m.label === 'Verify')!.used).toBe(false);
    expect(r.overall).toBeGreaterThan(0);
  });
  it('an empty answer scores zero content and every criterion missed', async () => {
    const r = await evaluateAnswer(q, '', 0, fakeEmbed);
    expect(r.contentScore).toBe(0);
    expect(r.criteria.every(c => c.coverage === 'missed')).toBe(true);
  });
  it('summarises a session', async () => {
    const r1 = await evaluateAnswer(q, 'It is high variance and the tree overfit. I would limit the depth here. A random forest averages many trees. Check for leakage and label noise too. I would verify with a metric and the trade-off is cost.', 100, fakeEmbed);
    const s = sessionSummary([r1]);
    expect(s.content).toBe(100);
    expect(s.missed).toHaveLength(0);
  });
});
describe('answer structure detection', () => {
  it('does not count "testing on" inside an approach as the Verify move', async () => {
    const { movesUsed } = await import('../../components/interview/AnswerShape');
    expect(movesUsed('My approach would be to train before a cut-off and testing on the weeks after it.')[3]).toBe(false);
    expect(movesUsed('I would verify it with a held-out month.')[3]).toBe(true);
    expect(movesUsed('I would check that precision holds on new data.')[3]).toBe(true);
  });
});
