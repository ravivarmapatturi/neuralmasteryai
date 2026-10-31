import { afterEach, expect, it, vi } from 'vitest';
import { requestInterviewReview } from './interviewReview';
afterEach(() => vi.unstubAllGlobals());
it('rejects invalid probabilities rather than displaying misleading feedback', async () => {
  vi.stubGlobal('fetch',vi.fn(async () => ({ok:true,json:async () => ({model:'test',criteria:[{criterion:'Evidence',probability:1.4}]})})));
  await expect(requestInterviewReview('/review','Question','Answer',['Evidence'])).rejects.toThrow('invalid result');
});
it('preserves the rubric order and accepts a valid model response', async () => {
  const result={model:'Jeva',criteria:[{criterion:'Evidence',probability:.6}]};
  vi.stubGlobal('fetch',vi.fn(async () => ({ok:true,json:async () => result})));
  expect(await requestInterviewReview('/review','Question','Answer',['Evidence'])).toEqual(result);
});
