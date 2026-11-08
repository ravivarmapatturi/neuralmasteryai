import { describe, it, expect } from 'vitest';
import {
  detectDeviceCapability,
  shouldWarnBeforeDownload,
  QUALITY_PROFILES,
  createASREngineForQuality,
} from './qualitySettings';

describe('qualitySettings', () => {
  it('uses a small live model and sequential final check only for Better accuracy', () => {
    expect(createASREngineForQuality('fast').finalModelId).toBeUndefined();
    const engine = createASREngineForQuality('better');
    expect(engine.modelId).toBe('onnx-community/moonshine-tiny-ONNX');
    expect(engine.finalModelId).toBe('onnx-community/whisper-base.en');
    expect(engine.expectedDownloadBytes).toBe(32079632);
  });
  it('has profiles for fast, better, and hidden best', () => {
    expect(QUALITY_PROFILES.fast.label).toBe('Fast (default)');
    expect(QUALITY_PROFILES.fast.downloadSizeMB).toBe('~32 MB + runtime');
    expect(QUALITY_PROFILES.fast.werPct).toBeNull();

    expect(QUALITY_PROFILES.better.label).toBe('Better accuracy');
    expect(QUALITY_PROFILES.better.downloadSizeMB).toBe('~112 MB total + runtime');
    expect(QUALITY_PROFILES.better.werPct).toBeNull();

    // Best feedback MUST remain hidden until item 9 verification passes
    expect(QUALITY_PROFILES.best.hidden).toBe(true);
  });

  it('recommends Better accuracy on high-spec hardware (>= 8 GB RAM + WebGPU)', () => {
    const cap = detectDeviceCapability(8, true, false);
    expect(cap.recommended).toBe('better');
    expect(cap.isLowMemory).toBe(false);
    expect(shouldWarnBeforeDownload('better', cap)).toBeNull();
  });

  it('recommends Fast on low memory (< 4 GB RAM) and warns on Better accuracy selection', () => {
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

  it('recommends Fast when WebGPU is absent or specs are mid-tier', () => {
    const cap = detectDeviceCapability(4, false, false);
    expect(cap.recommended).toBe('fast');
  });
});
