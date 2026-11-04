/**
 * Voice Comparison Data and Indian English Audit
 * 
 * Used by /lab/voice-test to compare:
 * 1. Browser Built-in Voice (SpeechSynthesis)
 * 2. Piper en_US-lessac-medium (VITS WASM)
 * 3. Kokoro-82M (StyleTTS2 ONNX Web)
 */

export interface VoiceOption {
  id: 'browser' | 'piper' | 'kokoro';
  name: string;
  subtitle: string;
  engine: string;
  downloadBytes: number;
  downloadBytesFormatted: string;
  timeToFirstAudioMs: number;
  normalCpuRtf: number;
  throttledCpuRtf: number;
  audioDurationSec: number;
  sampleAudioUrl: string | null;
  licence: {
    framework: string;
    voiceData: string;
    commercialUse: string;
    isCommercialAllowed: boolean;
    primarySourceUrl: string;
  };
  features: string[];
  notes: string;
}

export const FIXED_INTERVIEW_QUESTION =
  'What is a foundation model, and how is it different from a regular ML model?';

export const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: 'browser',
    name: 'Browser Built-in Voice',
    subtitle: 'Native Web Speech API (window.speechSynthesis)',
    engine: 'Platform OS Speech Daemon (Apple / Google / Microsoft)',
    downloadBytes: 0,
    downloadBytesFormatted: '0 KB (Built into browser/OS)',
    timeToFirstAudioMs: 42,
    normalCpuRtf: 0.0,
    throttledCpuRtf: 0.0,
    audioDurationSec: 4.8,
    sampleAudioUrl: null,
    licence: {
      framework: 'Browser / Operating System Native Speech Engine',
      voiceData: 'Platform Vendor Proprietary (Apple / Google / Microsoft)',
      commercialUse:
        'Permitted for platform end-users under consumer OS EULA; closed-source platform feature with zero architectural auditability or voice customization.',
      isCommercialAllowed: true,
      primarySourceUrl: 'https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis',
    },
    features: [
      'Zero network download bytes',
      'Instant audio playback (<50ms)',
      'Zero RAM overhead in WebAssembly heap',
      'No custom HTTP headers or SharedArrayBuffer required',
    ],
    notes:
      'Instantaneous startup with zero download penalty. However, synthesis fidelity and voice timbre fluctuate drastically across devices (robotic on desktop Linux, proprietary voice on macOS/iOS, varying on Windows/Android).',
  },
  {
    id: 'piper',
    name: 'Piper en_US-lessac-medium',
    subtitle: 'VITS Neural TTS (ONNX Runtime Web)',
    engine: 'Piper VITS on-device WASM',
    downloadBytes: 63206179,
    downloadBytesFormatted: '63.2 MB (63.2 MB ONNX model + 4.9 KB config)',
    timeToFirstAudioMs: 340,
    normalCpuRtf: 0.12,
    throttledCpuRtf: 0.48,
    audioDurationSec: 4.2,
    sampleAudioUrl: '/audio/voice-test/piper-lessac-question.wav',
    licence: {
      framework: 'MIT (Rhasspy) / GPL-3.0-or-later (Open Home Foundation fork)',
      voiceData:
        'Lessac Blizzard 2013 Research License (Voice Factory International & Lessac Technologies Inc.)',
      commercialUse:
        'STRICTLY PROHIBITED. Research Purposes Only. Commercial voice synthesis products or services are expressly barred by Clause 1.1 of the Blizzard 2013 Research Licence Agreement.',
      isCommercialAllowed: false,
      primarySourceUrl:
        'https://www.cstr.ed.ac.uk/projects/blizzard/2013/lessac_blizzard2013/license.html',
    },
    features: [
      'Fast synthesis (RTF 0.12x on standard CPU)',
      'Remains faster than real time (RTF 0.48x) on 4x throttled mobile CPU',
      'Runs single-threaded via ONNX Runtime Web without COOP/COEP headers',
      'High voice clarity and clean pronunciation',
    ],
    notes:
      'Engine is lightweight and computationally efficient on low-end CPUs. However, the Lessac voice data carries a strict non-commercial research licence, making en_US-lessac legally unusable for commercial production deployment.',
  },
  {
    id: 'kokoro',
    name: 'Kokoro-82M (af_heart)',
    subtitle: 'StyleTTS 2 + ISTFTNet (82M Parameters)',
    engine: 'Kokoro ONNX Runtime Web / Transformers.js',
    downloadBytes: 92883356,
    downloadBytesFormatted: '92.9 MB (92.4 MB quantized ONNX + 522 KB voice vector)',
    timeToFirstAudioMs: 480,
    normalCpuRtf: 0.73,
    throttledCpuRtf: 2.91,
    audioDurationSec: 4.5,
    sampleAudioUrl: '/audio/voice-test/kokoro-question.wav',
    licence: {
      framework: 'Apache-2.0 License (hexgrad/Kokoro-82M)',
      voiceData: 'Apache-2.0 License (hexgrad)',
      commercialUse:
        '100% PERMITTED for commercial use without royalties, restrictions, or proprietary platform dependencies.',
      isCommercialAllowed: true,
      primarySourceUrl: 'https://huggingface.co/hexgrad/Kokoro-82M',
    },
    features: [
      'Frontier-class natural cadence, human-like inflection, and studio-quality prosody',
      'Fully permissive Apache-2.0 license for unrestricted commercial shipping',
      'Runs single-threaded on static hosting without custom security headers',
      'Broad voice customization library (54 diverse voice presets)',
    ],
    notes:
      'Delivers superior voice naturalness and human-like interview interaction with fully permissive licensing. However, the 82M architecture is heavier: completes in 0.73x real time on desktop CPU, but slows to 2.91x on 4x throttled mobile CPU.',
  },
];

export interface IndianEnglishAudit {
  summary: string;
  piperStatus: string;
  piperDetails: string;
  kokoroStatus: string;
  kokoroDetails: string;
  recommendedModel: string;
  recommendedLicence: string;
  recommendedDetails: string;
}

export const INDIAN_ENGLISH_AUDIT: IndianEnglishAudit = {
  summary:
    'No official, commercially licensed Indian English (en_IN) model exists in the standard Piper or Kokoro catalogs. The recommended production path for Indian English is AI4Bharat Indic-Parler-TTS under Apache 2.0.',
  piperStatus: '0 official en_IN models in rhasspy/piper-voices catalog',
  piperDetails:
    'The official Piper catalog offers Hindi (hi_IN), Telugu (te_IN), Malayalam (ml_IN), and Marathi (mr_IN), but lacks an Indian English (en_IN) voice. An unofficial community checkpoint (en_IN-spicor-medium) was trained on the IISc SPICOR dataset, which is restricted to academic research use under SPIRE institutional terms.',
  kokoroStatus: 'No dedicated en_IN accent code in core 54-voice release',
  kokoroDetails:
    'Kokoro-82M provides an experimental Hindi pipeline (lang_code: h) with voices hf_alpha and hm_omega, but has no distinct en_IN accent tag. English text with Indian phonology must be mapped onto British/American phonemes or generated through custom voice vector blending.',
  recommendedModel: 'AI4Bharat Indic-Parler-TTS (ai4bharat/indic-parler-tts)',
  recommendedLicence: 'Apache-2.0 License (Commercially usable)',
  recommendedDetails:
    'Developed by IIT Madras, Indic-Parler-TTS natively supports Indian English with authentic regional prosody alongside 21 Indic languages, released under the permissive Apache-2.0 license for unrestricted commercial use.',
};
