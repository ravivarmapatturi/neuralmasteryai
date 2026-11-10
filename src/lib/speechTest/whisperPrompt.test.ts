import { expect, it } from 'vitest';
import { promptedTranscriptLooksWrong, speechSeconds } from './whisperPrompt';

const tone = (seconds: number, amp = 0.2) => Float32Array.from({ length: seconds * 16000 }, (_, i) => amp * Math.sin(i / 5));
const join = (...parts: Float32Array[]) => { const out = new Float32Array(parts.reduce((s, p) => s + p.length, 0)); let at = 0; for (const p of parts) { out.set(p, at); at += p.length; } return out; };

it('measures speech, not silence', () => {
  const audio = join(tone(4), new Float32Array(16000 * 6), tone(4));
  expect(speechSeconds(audio)).toBeGreaterThan(7.5);
  expect(speechSeconds(audio)).toBeLessThan(8.5);
});

it('flags a transcript that stops after a pause', () => {
  const audio = join(tone(5), new Float32Array(16000), tone(10));
  expect(promptedTranscriptLooksWrong('we use retrieval augmented generation here', audio)).toBe(true);
});

it('flags a transcript stuck repeating a phrase', () => {
  const words = Array(8).fill('we have a lot of data').join(' ');
  expect(promptedTranscriptLooksWrong(words, tone(12))).toBe(true);
});

it('accepts a normal answer and silence', () => {
  const text = 'first we chunk the documents then embed each chunk with a sentence model store the vectors in an index and at query time retrieve the closest chunks rerank them with a cross encoder and pass the best few to the model with the question so the answer cites real passages';
  expect(promptedTranscriptLooksWrong(text, tone(18))).toBe(false);
  expect(promptedTranscriptLooksWrong('', new Float32Array(16000 * 5))).toBe(false);
});
