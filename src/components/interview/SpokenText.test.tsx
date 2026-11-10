import { expect, it } from 'vitest';
import { wordAt, wordEnds } from './SpokenText';

it('moves through the words in order and gives longer words and sentence ends more time', () => {
  const { words, ends } = wordEnds('Hi. Retrieval augmented generation');
  expect(words[wordAt(ends, 0)]).toBe('Hi.');
  expect(words[wordAt(ends, 0.99)]).toBe('generation');
  const order = [0.1, 0.3, 0.5, 0.7, 0.9].map(f => wordAt(ends, f));
  expect(order).toEqual([...order].sort((a, b) => a - b));
});
