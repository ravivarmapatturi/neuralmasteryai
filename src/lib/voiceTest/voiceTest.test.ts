import { describe, it, expect } from 'vitest';
import {
  FIXED_INTERVIEW_QUESTION,
  VOICE_OPTIONS,
  INDIAN_ENGLISH_AUDIT,
} from './voiceData';

describe('Voice Comparison & Indian English Audit', () => {
  it('defines the standard fixed interview question', () => {
    expect(FIXED_INTERVIEW_QUESTION).toBe(
      'What is a foundation model, and how is it different from a regular ML model?'
    );
  });

  it('contains exactly 3 voice comparison options', () => {
    expect(VOICE_OPTIONS).toHaveLength(3);
    const ids = VOICE_OPTIONS.map((v) => v.id);
    expect(ids).toEqual(['browser', 'piper', 'kokoro']);
  });

  it('correctly tracks network download bytes for all voices', () => {
    const browser = VOICE_OPTIONS.find((v) => v.id === 'browser')!;
    const piper = VOICE_OPTIONS.find((v) => v.id === 'piper')!;
    const kokoro = VOICE_OPTIONS.find((v) => v.id === 'kokoro')!;

    expect(browser.downloadBytes).toBe(0);
    expect(piper.downloadBytes).toBeGreaterThan(60_000_000);
    expect(kokoro.downloadBytes).toBeGreaterThan(90_000_000);
  });

  it('verifies primary-source licensing constraints', () => {
    const piper = VOICE_OPTIONS.find((v) => v.id === 'piper')!;
    const kokoro = VOICE_OPTIONS.find((v) => v.id === 'kokoro')!;

    // Piper lessac voice data is non-commercial research only
    expect(piper.licence.isCommercialAllowed).toBe(false);
    expect(piper.licence.voiceData.toLowerCase()).toContain('blizzard');
    expect(piper.licence.commercialUse.toLowerCase()).toContain('strictly prohibited');

    // Kokoro is fully permissive under Apache-2.0
    expect(kokoro.licence.isCommercialAllowed).toBe(true);
    expect(kokoro.licence.framework).toContain('Apache-2.0');
    expect(kokoro.licence.voiceData).toContain('Apache-2.0');
  });

  it('audits Indian English (en_IN) availability across catalogs', () => {
    expect(INDIAN_ENGLISH_AUDIT.piperStatus).toContain('0 official en_IN');
    expect(INDIAN_ENGLISH_AUDIT.recommendedModel).toContain('Indic-Parler-TTS');
    expect(INDIAN_ENGLISH_AUDIT.recommendedLicence).toContain('Apache-2.0');
  });
});
