import { describe, it, expect } from 'vitest';
import {
  detectDeviceCapability,
  shouldWarnBeforeDownload,
  QUALITY_PROFILES,
} from './qualitySettings';

describe('qualitySettings', () => {
  it('has profiles for fast, better, and hidden best', () => {
    expect(QUALITY_PROFILES.fast.label).toBe('Fast (default)');
    expect(QUALITY_PROFILES.fast.downloadSizeMB).toBe('~28 MB');
    expect(QUALITY_PROFILES.fast.werPct).toBeLessThan(5.0);

    expect(QUALITY_PROFILES.better.label).toBe('Better accuracy');
    expect(QUALITY_PROFILES.better.downloadSizeMB).toBe('~62 MB');
    expect(QUALITY_PROFILES.better.werPct).toBe(2.9);

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
