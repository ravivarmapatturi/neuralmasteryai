import { it, expect } from 'vitest';
import { decodeRealTimeFactor, shouldSkipRefinement, refinementBudgetMs } from './refinementPolicy';
import { questionSpeechPrompt } from '../interviewRoom/speechPrompt';
it('allows final decoding despite slow live text and gives long answers proportional time', () => {
  expect(decodeRealTimeFactor(4000, 32000)).toBe(2);
  expect(decodeRealTimeFactor(100, 100)).toBeNull();
  expect(shouldSkipRefinement([0.1, 1, 2], false)).toBe(false);
  expect(shouldSkipRefinement([0.1, 0.2, 2], false)).toBe(false);
  expect(shouldSkipRefinement([], true)).toBe(false);
  expect(refinementBudgetMs(16000)).toBe(30000);
  expect(refinementBudgetMs(16000 * 60)).toBe(480000);
});
it('builds a bounded vocabulary from question words, with no reference answer or substring injection', () => {
  expect(questionSpeechPrompt('Compare RAG, LoRA and BM25')).toBe('RAG, LoRA, BM25.');
  expect(questionSpeechPrompt('Do rags fit Laura?')).toBe('');
});
