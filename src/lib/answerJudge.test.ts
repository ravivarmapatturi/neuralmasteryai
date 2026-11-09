import { describe, expect, it } from 'vitest';
import { judgeAnswer, splitAnswer, toClaim, precomputeModelAnswerEmbeddings, clearModelAnswerEmbeddingsCache } from './answerJudge';

// Each text gets a vector by the topic word it contains, so similarity is exact.
const topics = ['alpha', 'beta', 'gamma', 'delta'];
const embed = async (texts: string[]) => texts.map(t => { const v = topics.map(w => (t.toLowerCase().includes(w) ? 1 : 0)); const n = Math.hypot(...v) || 1; return v.map(x => x / n); });
const nli = async (pairs: [string, string][]) => pairs.map(([a, b]) => ((a + b).includes('false') ? { entails: 0.05, conflicts: 0.95 } : { entails: 0.9, conflicts: 0.02 }));
const models = { embed, nli };

describe('judgeAnswer', () => {
  it('marks covered, conflicting and missed points, and tells the learner what to fix', async () => {
    const result = await judgeAnswer('Alpha is a thing we use. Beta is false in practice. Delta is something extra here.', ['Explains that alpha is used', 'States that beta holds', 'Names gamma too'], 'Alpha is used. Beta holds. Gamma too.', models);
    expect(result.points.map(p => p.verdict)).toEqual(['covered', 'conflict', 'missed']);
    expect(result.score).toBe(33);
    expect(result.sentences.map(s => s.verdict)).toEqual(['supported', 'conflict', 'unchecked']);
    expect(result.improvements[0]).toContain('Beta is false');
    expect(result.improvements[1]).toContain('Gamma too');
  });
  it('scores an empty answer as all missed without calling the models', async () => {
    const result = await judgeAnswer('  ', ['Names alpha'], 'Alpha.', { embed: async () => { throw new Error('no'); }, nli: async () => { throw new Error('no'); } });
    expect(result.score).toBe(0);
    expect(result.points[0].verdict).toBe('missed');
  });
  it('reuses precomputed model answer embeddings to avoid re-embedding criteria and reference', async () => {
    clearModelAnswerEmbeddingsCache();
    let embeddedTexts: string[][] = [];
    const trackingEmbed = async (texts: string[]) => {
      embeddedTexts.push(texts);
      return embed(texts);
    };
    const criteria = ['Explains that alpha is used', 'States that beta holds'];
    const reference = 'Alpha is used. Beta still holds.';

    // Precompute model answer embeddings
    await precomputeModelAnswerEmbeddings(criteria, reference, trackingEmbed);
    expect(embeddedTexts.length).toBe(1);
    // Target claims + reference sentences were embedded
    expect(embeddedTexts[0]).toEqual(['Alpha is used', 'Beta holds', 'Alpha is used.', 'Beta still holds.']);

    // Now judge an answer: trackingEmbed should only be called for candidate sentences!
    const result = await judgeAnswer('Alpha is a thing we use.', criteria, reference, { embed: trackingEmbed, nli });
    expect(embeddedTexts.length).toBe(2);
    expect(embeddedTexts[1]).toEqual(['Alpha is a thing we use.']);
    expect(result.points[0].verdict).toBe('covered');
  });
});
it('turns a criterion into a plain claim', () => { expect(toClaim('Explains that one model adapts')).toBe('One model adapts'); });
it('splits unpunctuated speech into windows', () => { expect(splitAnswer(Array(40).fill('word').join(' ')).length).toBeGreaterThan(1); });
