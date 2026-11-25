import { describe, expect, it } from 'vitest';
import {
  cosineSimilarity,
  embed,
  explainAttentionStep,
  makeHead,
  runAttention,
  softmax,
  tokenize,
} from './attention';

describe('attention pure engine', () => {
  it('tokenizes words and punctuation up to 12 tokens', () => {
    expect(tokenize('the cat sat, by the kitten!')).toEqual([
      'the',
      'cat',
      'sat',
      ',',
      'by',
      'the',
      'kitten',
      '!',
    ]);
    expect(tokenize('one two three four five six seven eight nine ten eleven twelve thirteen')).toHaveLength(12);
    expect(tokenize('')).toEqual([]);
  });

  it('gives cat and kitten high semantic cosine similarity (~0.94) while separating cat and mat', () => {
    const cat = embed('cat');
    const kitten = embed('kitten');
    const mat = embed('mat');

    const cosCatKitten = cosineSimilarity(cat, kitten);
    const cosCatMat = cosineSimilarity(cat, mat);

    expect(cosCatKitten).toBeCloseTo(0.9365, 2);
    expect(cosCatKitten).toBeGreaterThan(0.9);
    expect(cosCatMat).toBeLessThan(0.35);
    // Deterministic for unknown arbitrary words too
    expect(embed('xylophone')).toEqual(embed('xylophone'));
    expect(Math.hypot(...embed('xylophone'))).toBeGreaterThan(0.1);
  });

  it('computes exact hand-checked QKV dot products, √d_k scaling, softmax, and weighted V blend', () => {
    const tokens = ['cat', 'kitten', 'mat'];
    const head = makeHead(1);
    const res = runAttention(tokens, head, { useScale: true, causalMask: false, temperature: 1 });

    expect(res.scaleFactor).toBe(2); // sqrt(4)
    expect(res.rawScores).toHaveLength(3);
    expect(res.weights).toHaveLength(3);

    // Every softmax row sums to 1 and matches manual exp/sum formula
    for (let i = 0; i < tokens.length; i++) {
      const sum = res.weights[i].reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 10);
      for (let j = 0; j < tokens.length; j++) {
        expect(res.scores[i][j]).toBeCloseTo(res.rawScores[i][j] / 2, 10);
      }
    }

    // Output row i equals sum_j weights[i][j] * V[j]
    for (let i = 0; i < tokens.length; i++) {
      for (let d = 0; d < 4; d++) {
        const manual = res.weights[i].reduce((acc, w, j) => acc + w * res.V[j][d], 0);
        expect(res.output[i][d]).toBeCloseTo(manual, 10);
      }
    }

    // Under Head 1 (meaning), 'cat' attends much more to 'kitten' than 'mat'
    expect(res.weights[0][1]).toBeGreaterThan(res.weights[0][2]);
  });

  it('makes different heads attend to genuinely different roles on the same sentence', () => {
    const tokens = tokenize('the cat sat on the mat');
    const h1 = runAttention(tokens, makeHead(1));
    const h2 = runAttention(tokens, makeHead(2));
    const h3 = runAttention(tokens, makeHead(3));

    // In Head 2 (Who <-> Action), query 'cat' (idx 1) puts highest weight on 'sat' (idx 2)
    const h2CatWeights = h2.weights[1];
    const h2Best = h2CatWeights.indexOf(Math.max(...h2CatWeights));
    expect(tokens[h2Best]).toBe('sat');

    // In Head 3 (Where / Context), query 'cat' puts highest weight on 'mat' (idx 5)
    const h3CatWeights = h3.weights[1];
    const h3Best = h3CatWeights.indexOf(Math.max(...h3CatWeights));
    expect(tokens[h3Best]).toBe('mat');

    // Head 1 (Meaning) differs from Head 2
    expect(h1.weights[1]).not.toEqual(h2.weights[1]);
  });

  it('enforces causal mask (-Infinity -> exact 0 weight) and scaling/temperature sharpness', () => {
    const tokens = tokenize('the cat sat by the kitten');
    const head = makeHead(1);

    const masked = runAttention(tokens, head, { causalMask: true });
    for (let i = 0; i < tokens.length; i++) {
      for (let j = i + 1; j < tokens.length; j++) {
        expect(masked.scores[i][j]).toBe(-Infinity);
        expect(masked.weights[i][j]).toBe(0);
      }
      expect(masked.weights[i].reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    }

    const scaled = runAttention(tokens, head, { useScale: true, temperature: 1 });
    const unscaled = runAttention(tokens, head, { useScale: false, temperature: 1 });
    const cool = runAttention(tokens, head, { useScale: true, temperature: 0.4 });

    // Turning off /sqrt(d_k) or lowering temperature sharpens the peak weight (lower entropy)
    expect(Math.max(...unscaled.weights[1])).toBeGreaterThan(Math.max(...scaled.weights[1]));
    expect(cool.entropy[1]).toBeLessThan(scaled.entropy[1]);
  });

  it('produces plain-English explanations containing real numbers for every stage', () => {
    const tokens = tokenize('the cat sat by the kitten');
    const result = runAttention(tokens, makeHead(1));

    const s0 = explainAttentionStep(tokens, result, 1, 0);
    const s1 = explainAttentionStep(tokens, result, 1, 1);
    const s2 = explainAttentionStep(tokens, result, 1, 2);
    const s3 = explainAttentionStep(tokens, result, 1, 3);

    expect(s0).toContain("'cat'");
    expect(s0).toContain("'kitten'");
    // Step 1 is the real dot product Q·Kᵀ (not cosine), with its number.
    expect(s0).toContain('Q·Kᵀ');
    expect(s0).toContain(`scores ${result.rawScores[1][5].toFixed(2)}`);
    expect(s1).toContain('√dₖ = 2');
    expect(s2).toContain('%');
    expect(s3).toContain('Output for');
  });

  it('handles softmax edge cases cleanly', () => {
    expect(softmax([0, -Infinity])).toEqual([1, 0]);
    expect(softmax([-Infinity, -Infinity])).toEqual([0, 0]);
  });
});
