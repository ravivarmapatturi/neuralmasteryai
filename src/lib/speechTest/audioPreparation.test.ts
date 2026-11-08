import { describe, expect, it } from 'vitest';
import { normalizeQuietAudio, appendPhrase, chooseFinalTranscript } from './audioPreparation';

describe('quiet audio preparation', () => {
  it('amplifies quiet speech without mutating the saved recording', () => {
    const raw = new Float32Array([0.002, -0.02, 0.005]);
    const amplified = normalizeQuietAudio(raw);
    expect(amplified[1]).toBeCloseTo(-0.1);
    expect(raw[1]).toBeCloseTo(-0.02);
  });
  it('keeps silence silent, caps gain, and leaves audible audio alone', () => {
    expect([...normalizeQuietAudio(new Float32Array(100))]).toEqual(Array(100).fill(0));
    expect(normalizeQuietAudio(new Float32Array([0.001]))[0]).toBeCloseTo(0.008);
    expect(normalizeQuietAudio(new Float32Array([-0.9, 0.3]))[0]).toBeCloseTo(-0.9);
  });
  it('preserves deliberate repetitions across non-overlapping pauses', () => {
    expect(appendPhrase('It is very', 'very important')).toBe('It is very very important');
    expect(appendPhrase('RAG', 'RAG retrieves documents')).toBe('RAG RAG retrieves documents');
  });
});


describe('final transcript completeness', () => {
  it('rejects empty decoding and substantial word loss without reference text', () => {
    const live = Array.from({length: 30}, (_, i) => `word${i}`).join(' ');
    expect(chooseFinalTranscript(live, 'a truncated answer').accepted).toBe(false);
    expect(chooseFinalTranscript(live, '').text).toBe(live);
  });
  it('accepts spelling and punctuation changes without requiring identical text', () => {
    expect(chooseFinalTranscript('low rah freezes weights', 'LoRA freezes weights.')).toEqual({text: 'LoRA freezes weights.', accepted: true});
  });
});
