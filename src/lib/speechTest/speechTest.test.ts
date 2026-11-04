import { describe, it, expect, beforeEach } from 'vitest';
import { computeWER, normalizeText } from './wer';
import { PauseTracker } from './pauseTracker';
import {
  MoonshineSingleThreadEngine,
  MoonshineBaseEngine,
  WhisperTinyEngine,
  WhisperBaseEngine,
  alignAndAppendPhrases,
  normalizeASRText,
  trimAudioSilence,
} from './engines';

describe('Word Error Rate (WER)', () => {
  it('normalizes punctuation, case, and whitespace', () => {
    const raw = '  What IS a foundation model, and how is it different?!! ';
    const normalized = normalizeText(raw);
    expect(normalized).toEqual([
      'what',
      'is',
      'a',
      'foundation',
      'model',
      'and',
      'how',
      'is',
      'it',
      'different',
    ]);
  });

  it('computes 0% WER for identical sentences', () => {
    const ref = 'A foundation model is trained on broad data at scale';
    const hyp = 'a foundation model is trained on broad data at scale';
    const result = computeWER(ref, hyp);
    expect(result.wer).toBe(0);
    expect(result.werPercent).toBe(0);
    expect(result.substitutions).toBe(0);
    expect(result.deletions).toBe(0);
    expect(result.insertions).toBe(0);
    expect(result.correct).toBe(10);
    expect(result.referenceWordCount).toBe(10);
  });

  it('computes correct WER for substitutions', () => {
    const ref = 'a foundation model is large';
    const hyp = 'a foundation model is small'; // 1 substitution ('small' for 'large')
    const result = computeWER(ref, hyp);
    expect(result.wer).toBe(0.2); // 1 / 5 = 0.2
    expect(result.werPercent).toBe(20);
    expect(result.substitutions).toBe(1);
    expect(result.deletions).toBe(0);
    expect(result.insertions).toBe(0);
  });

  it('computes correct WER for deletions', () => {
    const ref = 'a foundation model is large';
    const hyp = 'a foundation is large'; // 1 deletion ('model')
    const result = computeWER(ref, hyp);
    expect(result.wer).toBe(0.2); // 1 / 5 = 0.2
    expect(result.deletions).toBe(1);
    expect(result.substitutions).toBe(0);
    expect(result.insertions).toBe(0);
  });

  it('computes correct WER for insertions', () => {
    const ref = 'a foundation model is large';
    const hyp = 'a very big foundation model is large'; // 2 insertions ('very', 'big')
    const result = computeWER(ref, hyp);
    expect(result.wer).toBe(0.4); // 2 / 5 = 0.4
    expect(result.insertions).toBe(2);
    expect(result.deletions).toBe(0);
    expect(result.substitutions).toBe(0);
  });

  it('handles empty reference and empty hypothesis gracefully', () => {
    expect(computeWER('', '').wer).toBe(0);
    expect(computeWER('hello world', '').wer).toBe(1);
    expect(computeWER('', 'hello world').wer).toBe(1);
  });
});

describe('PauseTracker (End-of-Answer Voice Activity Detection)', () => {
  let tracker: PauseTracker;

  beforeEach(() => {
    // Thresholds: 1.5s, 2.5s, 4.0s, 6.0s
    tracker = new PauseTracker([1.5, 2.5, 4.0, 6.0]);
  });

  it('initializes with zero silence and no cut-ins', () => {
    const report = tracker.getReport();
    expect(report.isSpeaking).toBe(false);
    expect(report.currentSilenceSeconds).toBe(0);
    expect(report.thresholds[1.5].cutInCount).toBe(0);
    expect(report.thresholds[2.5].cutInCount).toBe(0);
    expect(report.thresholds[4.0].cutInCount).toBe(0);
    expect(report.thresholds[6.0].cutInCount).toBe(0);
  });

  it('does not trigger thresholds during short pauses under 1.5s', () => {
    // User speaks from t=1000 to t=5000
    tracker.onSpeechStart(1000);
    tracker.onSpeechEnd(5000);

    // Pauses for 1.0s (up to t=6000)
    tracker.tick(6000);
    let report = tracker.getReport();
    expect(report.currentSilenceSeconds).toBe(1.0);
    expect(report.thresholds[1.5].triggerCount).toBe(0);

    // Resumes speech at t=6000
    tracker.onSpeechStart(6000);
    report = tracker.getReport();
    expect(report.isSpeaking).toBe(true);
    expect(report.thresholds[1.5].cutInCount).toBe(0);
  });

  it('detects a cut-in when speaker pauses for 2.0s and resumes (1.5s cuts in, others do not)', () => {
    // 1. Speak from t=0 to t=3000
    tracker.onSpeechStart(0);
    tracker.onSpeechEnd(3000);

    // 2. Pause advances to 1.6s (t=4600)
    tracker.tick(4600);
    let report = tracker.getReport();
    expect(report.thresholds[1.5].triggerCount).toBe(1);
    expect(report.thresholds[2.5].triggerCount).toBe(0);

    // 3. Speaker resumes at 2.0s (t=5000) while thinking
    tracker.onSpeechStart(5000);
    report = tracker.getReport();

    // 1.5s should be recorded as a cut-in!
    expect(report.thresholds[1.5].cutInCount).toBe(1);
    // 2.5s, 4.0s, 6.0s were not reached and did not cut in
    expect(report.thresholds[2.5].cutInCount).toBe(0);
    expect(report.thresholds[4.0].cutInCount).toBe(0);
    expect(report.thresholds[6.0].cutInCount).toBe(0);
  });

  it('detects cut-ins for 1.5s and 2.5s when speaker pauses for 3.0s and resumes', () => {
    tracker.onSpeechStart(0);
    tracker.onSpeechEnd(2000);

    // At 2.8s pause (t=4800): 1.5s and 2.5s both reached
    tracker.tick(4800);
    let report = tracker.getReport();
    expect(report.thresholds[1.5].triggerCount).toBe(1);
    expect(report.thresholds[2.5].triggerCount).toBe(1);
    expect(report.thresholds[4.0].triggerCount).toBe(0);

    // Speaker resumes speech at t=5000
    tracker.onSpeechStart(5000);
    report = tracker.getReport();

    expect(report.thresholds[1.5].cutInCount).toBe(1);
    expect(report.thresholds[2.5].cutInCount).toBe(1);
    expect(report.thresholds[4.0].cutInCount).toBe(0);
    expect(report.thresholds[6.0].cutInCount).toBe(0);
  });

  it('marks clean ends when session is finalized without speech resuming', () => {
    tracker.onSpeechStart(0);
    tracker.onSpeechEnd(3000);

    // Pause reaches 4.2s (t=7200)
    tracker.tick(7200);

    // Finalize answer at t=7200
    tracker.finalize(7200);
    const report = tracker.getReport();

    expect(report.thresholds[1.5].cleanEndCount).toBe(1);
    expect(report.thresholds[2.5].cleanEndCount).toBe(1);
    expect(report.thresholds[4.0].cleanEndCount).toBe(1);
    expect(report.thresholds[6.0].cleanEndCount).toBe(0); // 6.0s not reached yet
    expect(report.thresholds[1.5].cutInCount).toBe(0); // Not a cut-in because speech never resumed
  });

  it('resets all state correctly', () => {
    tracker.onSpeechStart(0);
    tracker.onSpeechEnd(2000);
    tracker.tick(4000);
    tracker.onSpeechStart(4100);

    expect(tracker.getReport().thresholds[1.5].cutInCount).toBe(1);

    tracker.reset();
    const clean = tracker.getReport();
    expect(clean.isSpeaking).toBe(false);
    expect(clean.currentSilenceSeconds).toBe(0);
    expect(clean.thresholds[1.5].cutInCount).toBe(0);
    expect(clean.thresholds[1.5].triggerCount).toBe(0);
    expect(clean.recentEvents).toEqual([]);
  });
});

describe('MoonshineSingleThreadEngine', () => {
  it('initializes with single-threaded WASM device and zero revisions', () => {
    const engine = new MoonshineSingleThreadEngine();
    const metrics = engine.getMetrics();
    expect(engine.id).toBe('moonshine-single');
    expect(metrics.device).toContain('Single-Threaded');
    expect(metrics.device).toContain('No COOP/COEP needed');
    expect(metrics.downloadBytes).toBe(28180947);
    expect(metrics.earlierWordRevisions).toBe(0);
    expect(metrics.updateIntervalMs).toBeUndefined();
  });

  it('resets streaming metrics cleanly', () => {
    const engine = new MoonshineSingleThreadEngine();
    engine.reset();
    const metrics = engine.getMetrics();
    expect(metrics.partialText).toBe('');
    expect(metrics.finalText).toBe('');
    expect(metrics.timeToFirstWordMs).toBeNull();
    expect(metrics.earlierWordRevisions).toBe(0);
    expect(metrics.updateIntervalMs).toBeNull();
  });

  it('configures MoonshineBaseEngine with 62MB size and correct model id', () => {
    const engine = new MoonshineBaseEngine();
    const metrics = engine.getMetrics();
    expect(engine.id).toBe('moonshine-base');
    expect(engine.modelId).toBe('onnx-community/moonshine-base-ONNX');
    expect(metrics.downloadBytes).toBe(62000000);
  });

  it('configures WhisperTinyEngine with 40MB size and correct model id', () => {
    const engine = new WhisperTinyEngine();
    const metrics = engine.getMetrics();
    expect(engine.id).toBe('whisper-tiny');
    expect(engine.modelId).toBe('onnx-community/whisper-tiny.en');
    expect(metrics.downloadBytes).toBe(39800000);
  });

  it('configures WhisperBaseEngine with 77MB size and correct model id', () => {
    const engine = new WhisperBaseEngine();
    const metrics = engine.getMetrics();
    expect(engine.id).toBe('whisper-base');
    expect(engine.modelId).toBe('onnx-community/whisper-base.en');
    expect(metrics.downloadBytes).toBe(77000000);
  });
});

describe('alignAndAppendPhrases & normalizeASRText', () => {
  it('concatenates non-overlapping phrases across silence pauses', () => {
    const p1 = 'He hoped there would be stew for dinner.';
    const p2 = 'Turnips and carrots and bruised potatoes and fat mutton.';
    const combined = alignAndAppendPhrases(p1, p2);
    expect(combined).toBe('He hoped there would be stew for dinner. Turnips and carrots and bruised potatoes and fat mutton.');
  });

  it('aligns and deduplicates boundary words when audio windows overlap', () => {
    const p1 = 'He hoped there would be stew for dinner turnips and carrots and bruised potatoes';
    const p2 = 'bruised potatoes and fat mutton pieces to be ladled out in thick';
    const combined = alignAndAppendPhrases(p1, p2);
    expect(combined).toBe(
      'He hoped there would be stew for dinner turnips and carrots and bruised potatoes and fat mutton pieces to be ladled out in thick'
    );
  });

  it('handles empty committed or empty nextText gracefully', () => {
    expect(alignAndAppendPhrases('', 'hello world')).toBe('hello world');
    expect(alignAndAppendPhrases('hello world', '')).toBe('hello world');
    expect(alignAndAppendPhrases('', '')).toBe('');
  });

  it('normalizes ASR text correctly for identical comparison', () => {
    const t1 = 'He hoped there would be stew for dinner.';
    const t2 = 'he hoped there would be stew for dinner';
    expect(normalizeASRText(t1)).toBe(normalizeASRText(t2));
  });

  it('trims leading and trailing silence while preserving speech and padding', () => {
    const sampleRate = 16000;
    const totalSamples = sampleRate * 3; // 3 seconds
    const audio = new Float32Array(totalSamples);
    // Add artificial sine wave speech from 1.0s to 2.0s
    for (let i = sampleRate; i < sampleRate * 2; i++) {
      audio[i] = 0.2 * Math.sin((2 * Math.PI * 440 * i) / sampleRate);
    }
    const trimmed = trimAudioSilence(audio);
    // Original was 48,000 samples. Trimmed should be ~16,000 + 2*3,200 padding = ~22,400 samples
    expect(trimmed.length).toBeLessThan(audio.length);
    expect(trimmed.length).toBeGreaterThan(16000);
  });
});
