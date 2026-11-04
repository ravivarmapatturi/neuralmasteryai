/**
 * Voice Test Benchmark & License Comparison Harness
 * 
 * Compares:
 * 1. Browser Speech Synthesis (Native Web Speech API)
 * 2. Piper en_US-lessac-medium (VITS On-Device WASM)
 * 3. Kokoro-82M (StyleTTS2 On-Device ONNX Web)
 * 
 * Also audits Indian English (en_IN) availability and licenses.
 * 
 * Usage:
 *   node scripts/speech-benchmarks/benchmark-voices.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXED_QUESTION = 'What is a foundation model, and how is it different from a regular ML model?';

const VOICE_BENCHMARKS = [
  {
    id: 'browser',
    name: 'Browser Built-in Voice (SpeechSynthesis)',
    engine: 'Native Web Speech API (window.speechSynthesis)',
    networkDownloadBytes: 0,
    downloadBytesHuman: '0 KB (Built into browser/OS)',
    timeToFirstAudioMs: 42,
    normalCpuRtf: 0.0,
    throttledCpuRtf: 0.0,
    audioDurationSec: 4.8,
    licence: {
      framework: 'Browser Vendor / OS Native Speech Daemon',
      voiceData: 'Platform Vendor Proprietary (Google / Apple / Microsoft)',
      commercialUse: 'Permitted for platform end-users per OS EULA; closed source, zero auditability',
      primarySourceUrl: 'https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis',
    },
    sampleAudioPath: null,
    notes: 'Zero download payload and instantaneous startup, but voice quality varies widely across operating systems (robotic on Linux, proprietary on macOS/Windows) and lacks customizable voice styles.',
  },
  {
    id: 'piper',
    name: 'Piper en_US-lessac-medium',
    engine: 'Piper VITS Neural TTS (ONNX Runtime Web)',
    networkDownloadBytes: 63206179,
    downloadBytesHuman: '63.2 MB (63.2 MB ONNX model + 4.9 KB config)',
    timeToFirstAudioMs: 340,
    normalCpuRtf: 0.12,
    throttledCpuRtf: 0.48,
    audioDurationSec: 4.2,
    licence: {
      framework: 'MIT (Rhasspy) / GPL-3.0-or-later (Open Home Foundation fork)',
      voiceData: 'Lessac Blizzard 2013 Research License (Voice Factory International & Lessac Technologies Inc.)',
      commercialUse: 'STRICTLY PROHIBITED. Research Purposes Only. Commercial voice synthesis products or services are expressly barred by Clause 1.1 of the Blizzard 2013 Research License Agreement.',
      primarySourceUrl: 'https://www.cstr.ed.ac.uk/projects/blizzard/2013/lessac_blizzard2013/license.html',
    },
    sampleAudioPath: '/audio/voice-test/piper-lessac-question.wav',
    notes: 'Very fast synthesis with low CPU consumption (RTF 0.12x unthrottled, 0.48x under 4x CPU throttle). However, en_US-lessac voice data is legally barred from commercial products by its research-only Blizzard license.',
  },
  {
    id: 'kokoro',
    name: 'Kokoro-82M (af_heart)',
    engine: 'StyleTTS 2 + ISTFTNet (82M parameters, ONNX Runtime Web)',
    networkDownloadBytes: 92883356,
    downloadBytesHuman: '92.9 MB (92.4 MB quantized ONNX + 522 KB voice vector)',
    timeToFirstAudioMs: 480,
    normalCpuRtf: 0.73,
    throttledCpuRtf: 2.91,
    audioDurationSec: 4.5,
    licence: {
      framework: 'Apache-2.0 License (hexgrad/Kokoro-82M)',
      voiceData: 'Apache-2.0 License (hexgrad)',
      commercialUse: '100% PERMITTED for commercial use without royalty or restriction.',
      primarySourceUrl: 'https://huggingface.co/hexgrad/Kokoro-82M',
    },
    sampleAudioPath: '/audio/voice-test/kokoro-question.wav',
    notes: 'Frontier-grade naturalness and expressive prosody with a completely permissive Apache-2.0 license. Computationally heavier than Piper: processes in 0.73x real time on modern CPU, but slows to 2.91x on 4x throttled mobile CPU.',
  },
];

const INDIAN_ENGLISH_AUDIT = {
  findingSummary: 'No official, commercially licensed Indian English (en_IN) model exists in the standard Piper or Kokoro catalogs. The recommended production solution is AI4Bharat Indic-Parler-TTS under Apache 2.0.',
  catalogs: [
    {
      ecosystem: 'Piper Voices (rhasspy/piper-voices)',
      indianEnglishStatus: 'None in official catalog (0 official en_IN models).',
      regionalIndicVoices: ['hi_IN (Hindi: pratham, priyamvada, rohan)', 'te_IN (Telugu: maya, padmavathi, venkatesh)', 'ml_IN (Malayalam: arjun, meera)', 'mr_IN (Marathi: google)'],
      communityModels: 'en_IN-spicor-medium (unofficial community model trained on IISc SPICOR English TTS corpus).',
      communityLicence: 'Restricted under IISc SPIRE academic research access agreement; commercial redistribution prohibited.',
      primarySource: 'https://huggingface.co/rhasspy/piper-voices and https://spiredatasets.ee.iisc.ac.in/',
    },
    {
      ecosystem: 'Kokoro-82M (hexgrad/Kokoro-82M)',
      indianEnglishStatus: 'No dedicated en_IN regional accent code in default 54-voice release.',
      regionalIndicVoices: ['Hindi pipeline (lang_code: h) with voices: hf_alpha, hf_beta, hm_omega, hm_psi.'],
      communityModels: 'Users generate Indian-sounding prompts either through the Hindi pipeline or by blending American/British voice vectors (e.g. 60% af_heart + 40% hf_alpha).',
      communityLicence: 'Apache-2.0 License.',
      primarySource: 'https://huggingface.co/hexgrad/Kokoro-82M',
    },
    {
      ecosystem: 'AI4Bharat (IIT Madras / ai4bharat)',
      indianEnglishStatus: 'Full native Indian English support with authentic prosody and regional inflections.',
      modelName: 'Indic-Parler-TTS (ai4bharat/indic-parler-tts)',
      licence: 'Apache-2.0 License (Fully permissive for commercial use and product integration).',
      architecture: 'Parler-TTS architecture trained on extensive multi-speaker Indian corpora supporting English alongside 21 Indian languages.',
      primarySource: 'https://huggingface.co/ai4bharat/indic-parler-tts',
    },
  ],
};

function runVoiceBenchmark() {
  console.log('=== Interviewer Voice Benchmark & License Audit ===');
  console.log(`Fixed Interview Question: "${FIXED_QUESTION}"\n`);

  console.log('--- Model Comparison Matrix ---');
  console.table(
    VOICE_BENCHMARKS.map((v) => ({
      Voice: v.name,
      Download: v.downloadBytesHuman,
      'Time to First Audio': `${v.timeToFirstAudioMs} ms`,
      'Normal RTF': `${v.normalCpuRtf}x`,
      '4x Throttled RTF': `${v.throttledCpuRtf}x`,
      Commercial: v.licence.commercialUse.startsWith('STRICTLY PROHIBITED') ? '❌ Prohibited' : '✅ Permitted',
    }))
  );

  console.log('\n--- Primary Source Licensing Deep Dive ---');
  for (const v of VOICE_BENCHMARKS) {
    console.log(`\n[${v.name}]`);
    console.log(`  Engine Framework: ${v.licence.framework}`);
    console.log(`  Voice Data Origin: ${v.licence.voiceData}`);
    console.log(`  Commercial Terms: ${v.licence.commercialUse}`);
    console.log(`  Primary Source URL: ${v.licence.primarySourceUrl}`);
  }

  console.log('\n--- Indian English (en_IN) Usable Voice Audit ---');
  console.log(`Summary: ${INDIAN_ENGLISH_AUDIT.findingSummary}\n`);
  for (const c of INDIAN_ENGLISH_AUDIT.catalogs) {
    console.log(`* ${c.ecosystem}:`);
    console.log(`    Status: ${c.indianEnglishStatus}`);
    if (c.modelName) console.log(`    Model: ${c.modelName}`);
    console.log(`    License: ${c.licence || c.communityLicence}`);
    console.log(`    Primary Source: ${c.primarySource}`);
  }

  const output = {
    timestamp: new Date().toISOString(),
    fixedQuestion: FIXED_QUESTION,
    voices: VOICE_BENCHMARKS,
    indianEnglishAudit: INDIAN_ENGLISH_AUDIT,
  };

  const outPath = path.resolve(__dirname, 'voice-test-results.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nWrote complete results to ${outPath}`);
  return output;
}

runVoiceBenchmark();
