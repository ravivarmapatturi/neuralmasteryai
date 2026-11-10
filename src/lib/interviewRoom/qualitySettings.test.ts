import { describe, it, expect } from 'vitest';
import {
  detectDeviceCapability,
  shouldWarnBeforeDownload,
  QUALITY_PROFILES,
  createASREngineForQuality,
} from './qualitySettings';

describe('qualitySettings', () => {
  it('uses a small live model and sequential final check only for Standard', () => {
    expect(createASREngineForQuality('fast').finalModelId).toBeUndefined();
    const engine = createASREngineForQuality('better');
    expect(engine.modelId).toBe('onnx-community/moonshine-tiny-ONNX');
    expect(engine.finalModelId).toBe('onnx-community/whisper-base.en');
    expect(engine.expectedDownloadBytes).toBe(32079632);
  });
  it('keeps Turbo opt-in and preloads the selected final model before microphone acquisition', () => {
    const standard = createASREngineForQuality('better');
    const high = createASREngineForQuality('best');
    expect(standard.finalModelId).toBe('onnx-community/whisper-base.en');
    expect(high.finalModelId).toBe('onnx-community/whisper-large-v3-turbo');
    expect(QUALITY_PROFILES.better.downloadBytes).toBeLessThan(400000000);
  });
  it('has profiles for fast, better, and hidden best', () => {
    expect(QUALITY_PROFILES.fast.label).toBe('Lightweight');
    expect(QUALITY_PROFILES.fast.downloadSizeMB).toBe('~32 MB + runtime');
    expect(QUALITY_PROFILES.fast.werPct).toBeNull();

    expect(QUALITY_PROFILES.better.label).toBe('Standard');
    expect(QUALITY_PROFILES.better.downloadSizeMB).toBe('112 to 240 MB + runtime');
    expect(QUALITY_PROFILES.better.werPct).toBeNull();

    // High accuracy is exposed only by the capability-gated control.
    expect(QUALITY_PROFILES.best.hidden).toBe(true);
  });

  it('recommends Standard on high-spec hardware (>= 8 GB RAM + WebGPU)', () => {
    const cap = detectDeviceCapability(8, true, false);
    expect(cap.recommended).toBe('better');
    expect(cap.isLowMemory).toBe(false);
    expect(shouldWarnBeforeDownload('better', cap)).toBeNull();
  });

  it('recommends Fast on low memory (< 4 GB RAM) and warns on Standard selection', () => {
    const cap = detectDeviceCapability(2, true, false);
    expect(cap.recommended).toBe('fast');
    expect(cap.isLowMemory).toBe(true);
    const warning = shouldWarnBeforeDownload('better', cap);
    expect(warning).toContain('Device memory is low (2 GB)');
  });

  it('recommends Fast on Data Saver mode and warns on large download', () => {
    const cap = detectDeviceCapability(8, true, true);
    expect(cap.recommended).toBe('fast');
    const warning = shouldWarnBeforeDownload('better', cap);
    expect(warning).toContain('Data Saver is on');
  });

  it('recommends Standard on a 4 GB WASM laptop', () => {
    const cap = detectDeviceCapability(4, false, false);
    expect(cap.recommended).toBe('better');
  });
});
