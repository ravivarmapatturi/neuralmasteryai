import { describe, it, expect, vi } from 'vitest';
import { SileroVADDetector } from './sileroVad';

describe('SileroVADDetector', () => {
  it('detects speech onset after consecutive speech frames', () => {
    const onStart = vi.fn();
    const detector = new SileroVADDetector({ onSpeechStart: onStart, speechThreshold: 0.5 });

    detector.processFrame(0.1, 1000);
    expect(onStart).not.toHaveBeenCalled();

    detector.processFrame(0.8, 1032);
    expect(onStart).not.toHaveBeenCalled();

    detector.processFrame(0.85, 1064);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(detector.getStatus().isSpeaking).toBe(true);
    expect(detector.getStatus().hasSpoken).toBe(true);
  });

  it('triggers end-of-speech segment when silence follows speech', () => {
    const onSpeechEnd = vi.fn();
    const detector = new SileroVADDetector({
      onSpeechEnd,
      speechThreshold: 0.5,
      exitThreshold: 0.2,
    });

    // 2 speech frames
    detector.processFrame(0.8, 1000);
    detector.processFrame(0.8, 1032);

    // 5 silence frames
    for (let i = 1; i <= 5; i++) {
      detector.processFrame(0.05, 1032 + i * 32);
    }

    expect(onSpeechEnd).toHaveBeenCalledTimes(1);
    expect(detector.getStatus().isSpeaking).toBe(false);
  });

  it('triggers onEndOfAnswer after configured pause duration', () => {
    const onEndOfAnswer = vi.fn();
    const detector = new SileroVADDetector({
      onEndOfAnswer,
      endOfSpeechPauseSeconds: 2.0,
    });

    // Start speaking
    detector.processFrame(0.9, 1000);
    detector.processFrame(0.9, 1032);

    // Stop speaking at 1064ms
    for (let i = 1; i <= 10; i++) {
      detector.processFrame(0.02, 1064 + i * 32);
    }
    expect(onEndOfAnswer).not.toHaveBeenCalled();

    // Advance time beyond 2.0s pause threshold (1064 + 2100 = 3164)
    detector.processFrame(0.01, 3200);
    expect(onEndOfAnswer).toHaveBeenCalledTimes(1);
  });

  it('calculates RMS probability properly from float32 audio samples', () => {
    const silence = new Float32Array(512).fill(0);
    expect(SileroVADDetector.calculateRMSProbability(silence)).toBe(0);

    const speech = new Float32Array(512);
    for (let i = 0; i < 512; i++) {
      speech[i] = Math.sin(i * 0.1) * 0.2;
    }
    const prob = SileroVADDetector.calculateRMSProbability(speech);
    expect(prob).toBeGreaterThan(0.5);
  });
});
