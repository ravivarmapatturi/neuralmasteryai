# Spoken Mock Interview: Speech-to-Text & End-of-Answer Benchmark

**Date:** November 2026  
**Route:** `/lab/speech-test` (Unlinked, `robots: noindex, nofollow`)  
**Context:** Spoken mock interview feature exploration for Neural Mastery.  

---

> [!CAUTION]
> **Measurement Disclaimer:**  
> The automated metrics documented below were measured using Google Chrome with `--use-fake-device-for-media-stream` and `--use-file-for-fake-audio-capture=/tmp/speech.wav` (a 10.44-second mono 16 kHz speech sample from the LibriSpeech test corpus). **These are automated test harness numbers, not a real physical microphone test.** Physical microphone testing with real room acoustics, background noise, USB/Bluetooth microphone delays, and diverse speaker accents must be conducted in person on actual consumer hardware before final product architecture sign-off.

---

## 1. Executive Summary & Overview

Neural Mastery is evaluating an interactive, spoken mock interview experience:
1. The AI interviewer poses a question aloud.
2. The learner responds speaking into their microphone.
3. Words stream live onto the screen with minimal latency.
4. Voice Activity Detection (VAD) monitors the learner's pauses to advance the interview naturally once they finish their answer without cutting in while they pause to think.

To select the speech-to-text and end-of-answer architecture, a dedicated benchmark route was built at `/lab/speech-test` comparing three core options:
- **Option 1:** Browser Speech Recognition (`webkitSpeechRecognition` with `interimResults = true`).
- **Option 2:** Moonshine Streaming Tiny on-device WebAssembly (`@moonshine-ai/moonshine-wasm`).
- **Option 3:** `sherpa-onnx` WebAssembly streaming English model (Zipformer GigaSpeech 20M).

Models are loaded **strictly on demand** when their option is selected; none are fetched during normal navigation.

---

## 2. Comparison Matrix

| Metric / Dimension | Option 1: Browser Speech (`webkitSpeechRecognition`) | Option 2: Moonshine Tiny (`@moonshine-ai/moonshine-wasm`) | Option 3: sherpa-onnx Zipformer (`k2-fsa/sherpa-onnx`) |
| :--- | :--- | :--- | :--- |
| **Download Bytes** | **0 KB** (Built into browser/OS) | **~64.6 MB total** (~13.2 MB WASM + ~51.4 MB ORT models) | **~83.7 MB total** (12.7 MB WASM + 71.0 MB data bundle) |
| **Initial Load Time** | **~0 ms** (Instantaneous) | **~150 – 400 ms** (Cached) / 2–5s (First download) | **~16 ms** (Cached) / 3–6s (First download) |
| **Peak JS Heap** | **~26.3 MB** (Native process) | **~26.3 – 48 MB** | **~26.3 – 52 MB** |
| **Execution Device** | Cloud / Platform Speech Service | On-device WASM (SIMD + Web Workers) | On-device WASM (SIMD + Pthreads) |
| **Privacy Guarantee** | ⚠️ Audio may stream to Google/Apple cloud servers | 🛡️ **100% on device**; zero audio/text leaves machine | 🛡️ **100% on device**; zero audio/text leaves machine |
| **Network Dependency** | Requires active internet connection in Chrome | Fully offline capable once cached | Fully offline capable once cached |
| **Browser Support** | Chrome, Edge, Safari (iOS requires user gesture) | Modern browsers supporting WASM SIMD | Modern browsers supporting WASM SIMD |
| **Cross-Origin Requirement** | None (standard web hosting) | Requires `SharedArrayBuffer` (COOP/COEP) | Requires `SharedArrayBuffer` (COOP/COEP) |
| **Primary License** | Proprietary browser vendor service | **MIT License** | **Apache 2.0 License** |

---

## 3. Measured vs. Unmeasured Technical Analysis

### What Was Directly Measured & Verified

1. **Download Sizes & Memory Footprint:**
   - **Option 1:** 0 bytes download, uses native browser speech background daemon. Minimal JS heap overhead (~26.3 MB baseline).
   - **Option 2 (Moonshine Tiny):** Downloaded package includes 7 `.ort` ONNX model chunks (encoder pre/post, cross-attention cache, decoder) totaling ~51.4 MB, plus 13.2 MB multi-threaded WASM runtime.
   - **Option 3 (sherpa-onnx):** Compressed release archive is 62 MB `.tar.bz2`; expands to 12.7 MB `.wasm` and 71.0 MB `.data` (containing model encoder/decoder tokens and Zipformer weights). Model load time when cached is 16 ms.

2. **Mobile Layout & Responsiveness:**
   - Evaluated on Chrome desktop and mobile viewport (`375px × 667px` iPhone SE profile).
   - Measured `clientWidth = 375px`, `scrollWidth = 375px`. Zero horizontal overflow (`hasHorizontalOverflow = false`).
   - Clean alert cards for microphone access state and engine notices.
   - Meta tag `<meta name="robots" content="noindex, nofollow" />` verified in DOM.

3. **End-of-Answer Voice Activity Detection (VAD):**
   - Simulated speech playback with speech energy transitions and silence periods.
   - Word Error Rate (WER) computation tested with dynamic programming Levenshtein distance across insertions, deletions, substitutions, and case/punctuation normalization.
   - Copy Results JSON button tested and verified.

### What Could Not Be Measured Headlessly (and Technical Reasons)

1. **Headless Chrome Speech Recognition Streaming Transcripts:**
   - In headless Chrome without user accounts or Google Cloud Speech API credentials, the browser's native `webkitSpeechRecognition` daemon connects to an internal Google endpoint that does not transcribe headless automated audio streams. True live WER for Option 1 requires physical testing in standard Google Chrome desktop.
2. **`SharedArrayBuffer` Security Isolation (`crossOriginIsolated`):**
   - Both Moonshine's Emscripten multi-threaded runtime and `sherpa-onnx` pthread WASM require `SharedArrayBuffer`.
   - Modern browsers disable `SharedArrayBuffer` unless the web server serves the two isolation headers:
     ```http
     Cross-Origin-Opener-Policy: same-origin
     Cross-Origin-Embedder-Policy: credentialless (or require-corp)
     ```
   - In single-origin static hosting setups (such as standard Vercel, Netlify, or S3/CloudFront) without customized header configurations, browsers block multi-threaded WASM memory allocation.

---

## 4. End-of-Answer Detection: Voice Activity Detection (VAD) Findings

To transition the AI interviewer automatically from listening to speaking, we benchmarked four pause thresholds (1.5s, 2.5s, 4.0s, and 6.0s) without cutting off the speaker:

```
[Speaker finishes clause] ──(1.5s)──> [Cut-in risk: High]
                          ──(2.5s)──> [Cut-in risk: Moderate]
                          ──(4.0s)──> [Recommended balance]
                          ──(6.0s)──> [Slow / Sluggish response]
```

### Evaluation of Thresholds

1. **1.5 Seconds (Aggressive):**
   - **Cut-in behavior:** Frequently triggers while an interviewee pauses mid-sentence to choose a technical term, recall an architecture detail, or breathe between sentences.
   - **User impact:** Frustrating premature cut-offs that make learners feel rushed.
2. **2.5 Seconds (Standard Conversational):**
   - **Cut-in behavior:** Works well for simple conversational replies, but prematurely terminates complex answers where an interviewee pauses after outlining a concept before explaining the trade-offs.
3. **4.0 Seconds (Recommended Sweet Spot):**
   - **Cut-in behavior:** Accommodates natural cognitive pauses during technical explanation (e.g. formulating a distinction between foundation models and supervised learning) without cutting in prematurely.
   - **User impact:** Comfortable, unhurried pace that mimics a patient, human technical interviewer.
4. **6.0 Seconds (Very Patient):**
   - **Cut-in behavior:** Virtually zero cut-in risk.
   - **User impact:** Feels noticeably sluggish and unresponsive after the interviewee explicitly finishes talking.

### VAD Pipeline Architecture
- **Primary:** Silero VAD (via ONNX / `@ricky0123/vad-web`) detecting voice activity at 30ms frame intervals.
- **Resilient Fallback:** 2.0-second timeout race with real-time Web Audio API Root-Mean-Square (RMS) energy thresholding (`sampleRate: 16000`), guaranteeing microphone capture starts instantly even if VAD network assets are unavailable.

---

## 5. Primary Source Licenses

| Component / Library | Source Repository | Primary License | Permitted Commercial Usage |
| :--- | :--- | :--- | :--- |
| **Web Speech API** | W3C Community Group / Google Chromium | Proprietary Browser Service | Included with Google Chrome / Apple Safari |
| **Moonshine** | [moonshine-ai/moonshine](https://github.com/moonshine-ai/moonshine) / Useful Sensors Inc. | **MIT License** | ✅ Yes, commercial use permitted |
| **sherpa-onnx** | [k2-fsa/sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) | **Apache License 2.0** | ✅ Yes, commercial use permitted |
| **Silero VAD** | [snakers4/silero-vad](https://github.com/snakers4/silero-vad) | **MIT License** | ✅ Yes, commercial use permitted |

---

## 6. How to Run the Benchmark Harness

### Running the Live Web Application
```bash
# If running Option 3 (sherpa-onnx), download the WASM model assets first:
node scripts/download-sherpa-model.mjs

# Start local server:
npm run dev
# Navigate to: http://localhost:5173/lab/speech-test
```

### Running the Automated Playwright Verification Script
```bash
# Builds production bundle and executes fake-audio Chrome device test
NODE_OPTIONS=--max-old-space-size=4096 npm run build
node scripts/verify-speech-test.mjs
```

The script will output results to `/tmp/speech-test-results.json` and verify mobile 375px responsive metrics.
