import { describe, expect, it } from 'vitest';
import { compareTokenizers, tokenizeWithRules } from './tokenizationAmbiguity';

describe('tokenization ambiguity playground computation', () => {
  it('hand-checks three boundary policies on an abbreviation and contraction', () => {
    const comparison = compareTokenizers("Dr. Smith didn't arrive.", {
      keepContractions: true,
      keepAbbreviations: true,
      lowercase: false,
    });

    expect(comparison.whitespace.map((token) => token.text)).toEqual(['Dr.', 'Smith', "didn't", 'arrive.']);
    expect(comparison.punctuation.map((token) => token.text)).toEqual(['Dr', '.', 'Smith', "didn't", 'arrive', '.']);
    expect(comparison['language-aware'].map((token) => token.text)).toEqual(['Dr.', 'Smith', "didn't", 'arrive', '.']);
    expect(comparison['language-aware'].map((token) => [token.start, token.end])).toEqual([
      [0, 3], [4, 9], [10, 16], [17, 23], [23, 24],
    ]);
  });

  it('splits apostrophes when contractions are not kept together', () => {
    const tokens = tokenizeWithRules("can't", {
      method: 'language-aware',
      keepContractions: false,
      keepAbbreviations: true,
      lowercase: true,
    });
    expect(tokens.map((token) => token.text)).toEqual(['can', "'", 't']);
  });

  it('can split abbreviations and fold case', () => {
    const tokens = tokenizeWithRules('DR. Lee', {
      method: 'language-aware',
      keepContractions: true,
      keepAbbreviations: false,
      lowercase: true,
    });
    expect(tokens.map((token) => token.text)).toEqual(['dr', '.', 'lee']);
  });
});
