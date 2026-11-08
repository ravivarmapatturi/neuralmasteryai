import { it, expect } from 'vitest';
import { decodeRealTimeFactor, shouldSkipRefinement, refinementBudgetMs } from './refinementPolicy';
import { questionSpeechPrompt } from '../interviewRoom/speechPrompt';
it('uses measured throughput and a bounded inference deadline, independent of RAM/GPU labels', () => {
  expect(decodeRealTimeFactor(4000, 32000)).toBe(2);
  expect(decodeRealTimeFactor(100, 100)).toBeNull();
  expect(shouldSkipRefinement([0.1, 1, 2], false)).toBe(true);
  expect(shouldSkipRefinement([0.1, 0.2, 2], false)).toBe(false);
  expect(shouldSkipRefinement([], true)).toBe(true);
  expect(refinementBudgetMs(16000)).toBe(6000);
  expect(refinementBudgetMs(16000 * 60)).toBe(12000);
});
it('builds a bounded vocabulary from question words, with no reference answer or substring injection', () => {
  expect(questionSpeechPrompt('Compare RAG, LoRA and BM25')).toBe('RAG, LoRA, BM25.');
  expect(questionSpeechPrompt('Do rags fit Laura?')).toBe('');
});
