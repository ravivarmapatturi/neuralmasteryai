# Spoken Mock Interview: Speech-to-Text & End-of-Answer Benchmark

**Date:** November 2026  
**Route:** `/lab/speech-test` (Unlinked, `robots: noindex, nofollow`)  
**Harness Script:** `scripts/verify-speech-test.mjs`  
**Audio Input:** `/tmp/speech_with_pauses.wav` (22.34s mono 16 kHz WAV, synthesized from LibriSpeech speech and silence intervals: 2.2s, 3.2s, and 6.5s)  

---

> [!CAUTION]
> **Measurement Disclaimer:**  
> The automated metrics documented below were measured using Google Chrome with `--use-fake-device-for-media-stream` and `--use-file-for-fake-audio-capture=/tmp/speech_with_pauses.wav`. **These are automated test harness numbers on synthetic/benchmark speech audio, not a live human microphone test.** Physical microphone testing with diverse accents, variable background noise, room acoustics, and real conversational timing must be conducted on hardware before final production deployment.

---

## 1. Executive Summary & Overview

Neural Mastery is evaluating an interactive, spoken mock interview experience:
1. The AI interviewer poses a technical problem aloud.
2. The learner responds verbally into their microphone.
3. Words stream live onto the screen with low lag.
4. Voice Activity Detection (VAD) monitors speech and pauses to advance the interview once the learner finishes, without cutting in while they pause to think.

To select the speech-to-text and end-of-answer architecture, a dedicated benchmark route was built at `/lab/speech-test` comparing three core options:
- **Option 1:** Browser Speech Recognition (`webkitSpeechRecognition` with `interimResults = true`).
- **Option 2:** Moonshine Streaming Tiny on-device WebAssembly (`@moonshine-ai/moonshine-wasm`).
- **Option 3:** `sherpa-onnx` WebAssembly streaming English model (Zipformer GigaSpeech / LibriSpeech).

Models are loaded **strictly on demand** when their option is selected; zero model weights are fetched during normal navigation.

---

## 2. Empirical Comparison Matrix

The table below reflects real measurements captured by running `node scripts/verify-speech-test.mjs` with Chrome feeding `/tmp/speech_with_pauses.wav` into the Web Audio graph:

| Metric / Dimension | Option 1: Browser Speech (`webkitSpeechRecognition`) | Option 2: Moonshine Tiny (`@moonshine-ai/moonshine-wasm`) | Option 3: sherpa-onnx Zipformer (`k2-fsa/sherpa-onnx`) |
| :--- | :--- | :--- | :--- |
| **Download Bytes** | **0 KB** (Native browser service) | **61.6 MB** (~13.2 MB WASM + ~51.4 MB ORT models) | **83.3 MB** (~12.7 MB WASM + ~70.6 MB data bundle) |
| **Initial Load Time** | **0 ms** (Instantaneous) | **5,953 ms** (Cold download & compile) | **2,468 ms** (WASM runtime & model init) |
| **Peak JS Heap** | **26.3 MB** | **26.3 MB** | **26.3 MB** |
| **Time to First Word** | Untestable headlessly (see §3) | **516 ms** | **739 ms** |
| **Speech Lag** | Untestable headlessly (see §3) | **450 ms** | **20,754 ms** (WASM main-thread accumulation) |
| **Word Error Rate (WER)** | Untestable headlessly (see §3) | **13.8%** | **65.5%** |
| **Transcribed Text** | *(Click Start and speak in interactive browser)* | *"He hoped there would be stew for dinner, Turnips and carrots and bruised potatoes and fat, mutton, Pieces to be ladled out in thick, peppered flower-fat and sauce, He hoped he had."* | *"AND TURNIPS AND CARROTS AND BRUISED POTATOES AND FAT MUTTON POTS OF MUTTEN PIECES TO BE LADLED OUT IN THICK PEPPERED FLOWER-FATTENED SAUCE AND HE HOPED THERE WOULD BE SOME"* |
| **Known Reference Text** | — | *"He hoped there would be stew for dinner, turnips and carrots and bruised potatoes, and fat mutton pieces to be ladled out in thick, peppered flower-fat and sauce."* | *(Same reference)* |
| **Execution Architecture** | Cloud Speech Daemon (Google / Apple) | On-device WASM (ONNX Runtime SIMD) | On-device WASM (Emscripten CPU SIMD) |
| **Privacy Guarantee** | ⚠️ Audio streams to cloud provider | 🛡️ **100% on device**; zero audio leaves client | 🛡️ **100% on device**; zero audio leaves client |
| **Offline Support** | ❌ Requires internet connection | ✅ Fully offline capable once cached | ✅ Fully offline capable once cached |
| **SharedArrayBuffer Req.** | None (Standard web hosting) | Requires `SharedArrayBuffer` (COOP/COEP) | Requires `SharedArrayBuffer` (COOP/COEP) |
| **Primary Code License** | Proprietary browser vendor service | **MIT License** | **Apache 2.0 License** |
| **Weights License** | Proprietary cloud service | **MIT License** (Useful Sensors HuggingFace) | **Apache 2.0** (LibriSpeech) / Non-commercial data (GigaSpeech) |

---

## 3. Technical Explanations & Deep Dives

### 3.1 Option 1 (Web Speech API) Headless Testing Limitation
- **The Issue:** Option 1 returns `firstWordLag: '—'` and empty live transcripts in headless test runners.
- **Root Cause:** In Chromium, `webkitSpeechRecognition` is not an in-browser local engine; it is a thin client wrapper that streams compressed audio frames via a proprietary gRPC/WebSocket channel to Google's speech recognition cloud servers (`https://www.google.com/speech-api/...`). In headless Chrome running in automated test harnesses (without user profile login, authenticated speech tokens, or standard GUI interaction), Chromium's network speech service systematically rejects or times out fake-audio capture streams.
- **Implication:** Option 1 can only be evaluated interactively on localhost using a standard physical browser window and microphone.

### 3.2 Moonshine Download Size: The 30.5 MB Checkpoint vs. 61.6 MB Full Bundle
- **The Confusion:** Earlier notes referenced Moonshine as 30.5 MB in some places and 61.6 MB (64.6 MB decimal) in others.
- **Root Cause:** The 30.5 MB figure (`32,000,000 bytes`) was a hardcoded progress checkpoint in `engines.ts` before the transcriber completed.
- **Actual Measurement:** Moonshine Tiny downloads **64,597,708 bytes** (~61.6 MiB / 64.6 MB decimal) across two components:
  1. Seven ONNX model chunks (`encoder_model.ort`, `decoder_model.ort`, `decoder_with_past_model.ort`, etc.) downloaded from `@moonshine-ai/moonshine-wasm`: **51,441,771 bytes** (~49.06 MiB / 51.4 MB decimal).
  2. The multi-threaded WASM binary (`moonshine.wasm`): **13,155,937 bytes** (~12.55 MiB / 13.2 MB decimal).

### 3.3 The SharedArrayBuffer / GitHub Pages Conflict & Workarounds
Both Moonshine WASM and `sherpa-onnx` use Emscripten multi-threading (`-pthread`), which depends on `SharedArrayBuffer`.

By default, all modern browsers require **Cross-Origin Isolation** before enabling `SharedArrayBuffer` to prevent Spectre timing attacks:
```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless (or require-corp)
```

#### What Happens on GitHub Pages Today?
Neural Mastery deploys to GitHub Pages via `.github/workflows/deploy.yml`. GitHub Pages **does not allow custom HTTP response headers**. Therefore, on `neuralmasteryai.com` today, `window.crossOriginIsolated` is `false`, and multi-threaded WebAssembly fails immediately with:
`SharedArrayBuffer is not defined`.

#### Workaround Options and Associated Costs:

1. **Workaround A: `coi-serviceworker` (Client-side Service Worker)**
   - *Mechanism:* A small script registers a Service Worker that intercepts navigation requests and injects the COOP/COEP headers into document responses on the client side without backend support.
   - *Cost & Risks:* High risk of breaking cross-origin resources. With `COEP: require-corp`, the browser will refuse to load any cross-origin script, style, image, or Pyodide WASM wheel (e.g. from jsDelivr, CDN fonts, Google AdSense, YouTube embeds) unless the third-party origin explicitly serves `Cross-Origin-Resource-Policy: cross-origin`. `credentialless` mitigates images/iframes, but Safari only supported `credentialless` starting in iOS 17.4.
2. **Workaround B: Cloudflare Proxy with Transform Rules**
   - *Mechanism:* Route `neuralmasteryai.com` through Cloudflare DNS and use Cloudflare Rules to inject COOP/COEP headers at the edge.
   - *Cost & Risks:* Free on Cloudflare, but imposes the exact same third-party CORP isolation breakages as Workaround A for external embeds.
3. **Workaround C: Single-Threaded WASM Builds (Zero SharedArrayBuffer Requirements)**
   - *Sherpa-ONNX:* Can be compiled with `-DSHERPA_ONNX_ENABLE_WASM_PTHREADS=OFF` to produce a single-threaded WASM runtime that executes in any browser context without COOP/COEP or `SharedArrayBuffer`. It runs in a standard Web Worker to prevent UI blocking.
   - *Moonshine:* `@moonshine-ai/moonshine-wasm` currently only distributes the pthread build in version 0.1.5. A single-threaded build would require upstream PR or custom compilation.
4. **Workaround D: Standard Browser Web Speech API (Option 1)**
   - Zero headers, zero service workers, zero bundle size, and 100% compatible with GitHub Pages out of the box.

### 3.4 Model Licensing: Primary Source Verification
- **Moonshine Tiny:**
  - *Code License:* [UsefulSensors/moonshine](https://github.com/usefulsensors/moonshine) is licensed under the **MIT License**.
  - *Weights License:* Model weights on [UsefulSensors/moonshine-tiny](https://huggingface.co/UsefulSensors/moonshine-tiny) are licensed under **MIT License**. Fully permissive for commercial use.
- **sherpa-onnx (Zipformer Models):**
  - *Code License:* [k2-fsa/sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) is licensed under **Apache-2.0**.
  - *GigaSpeech Model:* The weights in `sherpa-onnx-streaming-zipformer-gigaspeech-20M` are Apache-2.0, but the upstream **GigaSpeech dataset** license explicitly restricts raw audio to non-commercial research use. SpeechColab disclaims liability for commercial use under "fair use", posing legal ambiguity.
  - *LibriSpeech Model:* `sherpa-onnx-streaming-zipformer-en-20M-2023-02-17` is trained strictly on LibriSpeech (public domain audio / CC-BY 4.0). Both model weights and code are **Apache-2.0**, offering complete commercial freedom.

### 3.5 Hosting Strategy for Large 83 MB Sherpa Assets
Shipping 83 MB of binary model weights (`.data` and `.wasm`) in the git repository and static build causes:
1. Bloated git clone times and GitHub 100 MB per-file limits.
2. Excessive GitHub Pages deployment artifacts (approaching the 1 GB site quota).
3. Slow initial deployments.

**Proposed Solution:**
1. **Exclude from Static Build:** As implemented in `vite.config.ts`, Vite automatically prunes `public/sherpa-onnx/*.data` and `*.wasm` from the `dist/` production folder during build.
2. **External Object Storage / CDN:** Store the two large binary files on external CDN storage:
   - Option A: Hugging Face Hub (free Git LFS hosting with global CDN: `https://huggingface.co/k2-fsa/sherpa-onnx-wasm-zipformer/raw/main/...`).
   - Option B: Cloudflare R2 bucket with custom domain and CORS headers (`Access-Control-Allow-Origin: *`).
3. **Client-Side Cache API:** When the user clicks "Start Test" on Option 3, the browser downloads the model files through the Web Cache API (`caches.open('sherpa-onnx-v1')`). The files are stored in browser persistent storage, downloaded only once per user, and streamed into WASM via `locateFile`.

---

## 4. End-of-Answer Voice Activity Detection: Real Pause Test Results

We tested `/tmp/speech_with_pauses.wav` (22.34 seconds), which contains real speech punctuated by three distinct silent thinking pauses:
- **Pause 1:** 2.2 seconds between phrase 1 and phrase 2
- **Pause 2:** 3.2 seconds between phrase 2 and phrase 3
- **Pause 3:** 6.5 seconds between phrase 3 and phrase 4

The benchmark route tracked how four candidate VAD pause thresholds (1.5s, 2.5s, 4.0s, and 6.0s) behaved across these speech pauses:

| VAD Pause Threshold | Times Triggered | Mid-Answer Cut-Ins (Interrupted Speaker) | Clean End-of-Answer Finalizations | Resulting Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **1.5s Pause** | 3 | **3 times!** | 0 | Cut in prematurely during all 3 pauses (2.2s, 3.2s, 6.5s). 100% cut-in rate. |
| **2.5s Pause** | 2 | **2 times!** | 0 | Cut in during 3.2s and 6.5s pauses. Tolerated the 2.2s pause. |
| **4.0s Pause** | 1 | **1 time!** | 0 | Tolerated the 2.2s and 3.2s pauses; cut in only during the 6.5s pause. |
| **6.0s Pause** | 1 | **1 time!** | 0 | Tolerated the 2.2s and 3.2s pauses; cut in only during the 6.5s pause. |

### Objective Engineering Conclusions from Pause Data:
1. **Fixed thresholds below 3.0s cut in frequently:** Speakers who pause for 2–3 seconds to formulate a sentence are repeatedly cut off if the threshold is under 3.0s.
2. **Fixed thresholds alone cannot solve end-of-answer detection:** A speaker pausing for 6.5 seconds triggered every single threshold from 1.5s to 6.0s.
3. **Recommended Technical Direction:**
   - Production interview engines should combine **VAD silence detection** with an **LLM completion check** (e.g. asking a fast 8B model or regex heuristic whether the accumulated transcript constitutes a grammatically complete thought, or if it ended on a conjunction/preposition like *"because...", "and...", "whereas..."*).
   - Alternatively, provide an explicit, visible **"Finished Speaking"** UI button alongside a patient 3.5s–4.0s fallback timer.

---

## 5. Raw Verification Harness Output (`/tmp/speech-test-results.json`)

The following is the verbatim output produced by `node scripts/verify-speech-test.mjs`:

```json
{
  "runTimestamp": "2026-11-03T20:40:04.422Z",
  "audioCaptureWav": "/tmp/speech_with_pauses.wav",
  "knownReferenceText": "He hoped there would be stew for dinner, turnips and carrots and bruised potatoes, and fat mutton pieces to be ladled out in thick, peppered flower-fat and sauce.",
  "notes": "Measurements conducted with headless Chrome --use-fake-device-for-media-stream and --use-file-for-fake-audio-capture=/tmp/speech_with_pauses.wav (22.34s speech with 2.2s, 3.2s, and 6.5s pauses). Real audio evaluated against reference LibriSpeech sentence.",
  "mobileOverflowCheck375px": {
    "clientWidth": 375,
    "scrollWidth": 375,
    "hasHorizontalOverflow": false,
    "pass": true
  },
  "noIndexCheck": {
    "robotsMeta": "noindex, nofollow",
    "pass": true
  },
  "options": {
    "option_1_browser_speech": {
      "firstWordLag": "—",
      "speechLag": "—",
      "downloadBytes": "0 KB",
      "loadTime": "0 ms",
      "peakHeap": "26.3 MB",
      "wer": "—",
      "transcript": "Click “Start Microphone Test” and speak to benchmark live transcription.",
      "alertNotice": null,
      "note": "Option 1 (Web Speech API) cannot connect to Google speech cloud servers in headless Chrome; testable only on localhost with interactive browser & microphone."
    },
    "option_2_moonshine_tiny": {
      "firstWordLag": "516 ms",
      "speechLag": "450 ms",
      "downloadBytes": "61.6 MB",
      "loadTime": "5953 ms",
      "peakHeap": "26.3 MB",
      "wer": "13.8%",
      "transcript": "He hoped there would be stew for dinner, Turnips and carrots and bruised potatoes and fat, mutton, Pieces to be ladled out in thick, peppered flower-fat and sauce, He hoped he had.",
      "alertNotice": null
    },
    "option_3_sherpa_onnx": {
      "firstWordLag": "739 ms",
      "speechLag": "20754 ms",
      "downloadBytes": "83.3 MB",
      "loadTime": "2468 ms",
      "peakHeap": "26.3 MB",
      "wer": "65.5%",
      "transcript": "AND TURNIPS AND CARROTS AND BRUISED POTATOES AND FAT MUTTON POTS OF MUTTEN PIECES TO BE LADLED OUT IN THICK PEPPERED FLOWER-FATTENED SAUCE AND HE HOPED THERE WOULD BE SOME",
      "alertNotice": null
    }
  },
  "pauseAnalysis": {
    "pauseSummary": "Pause Analysis: 1.5s cut in 3 times; 2.5s cut in 2 times; 4s cut in 1 time; 6s cut in 1 time",
    "thresholdBoxes": [
      "1.5s PauseTriggered: 3Cut in: 3 times!Clean ends: 0",
      "2.5s PauseTriggered: 2Cut in: 2 times!Clean ends: 0",
      "4s PauseTriggered: 1Cut in: 1 time!Clean ends: 0",
      "6s PauseTriggered: 1Cut in: 1 time!Clean ends: 0"
    ]
  },
  "copyResultsButtonWorks": true,
  "freeAnswerPrompt": "What is a foundation model, and how is it different from a regular ML model?"
}
```
