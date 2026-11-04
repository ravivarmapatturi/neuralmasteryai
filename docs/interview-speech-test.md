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

| Metric / Dimension | Option 1: Browser Speech (`webkitSpeechRecognition`) | Option 2A: Moonshine WASM (`@moonshine-ai/moonshine-wasm`) | Option 2B (Preferred): Moonshine ORT-Web Single-Threaded (`onnxruntime-web`) | Option 3: sherpa-onnx Zipformer (`k2-fsa/sherpa-onnx`) |
| :--- | :--- | :--- | :--- | :--- |
| **Download Bytes** | **0 KB** (Native browser service) | **61.6 MB** (~13.2 MB WASM + ~51.4 MB ORT models) | **28.1 MB** (~7.9 MB encoder + ~20.2 MB decoder) | **83.3 MB** (~12.7 MB WASM + ~70.6 MB data bundle) |
| **Initial Load Time** | **0 ms** (Instantaneous) | **5,953 ms** (Cold download & compile) | **6,528 ms** (Cold HF CDN download); **<600 ms** (Cached) | **2,468 ms** (WASM runtime & model init) |
| **Peak JS Heap** | **26.3 MB** | **26.3 MB** | **28.4 MB** | **26.3 MB** |
| **Time to First Word** | Untestable headlessly (see §3.1) | **516 ms** | **115 ms** (1.0s chunk); **376 ms** (4x CPU throttled) | **739 ms** |
| **Full Speech Latency** | Untestable headlessly (see §3.1) | **450 ms** (streaming frame) | **1,999 ms** (full 22.34s audio, RTF 0.089x); **7,597 ms** (4x throttled) | **20,754 ms** (WASM main-thread accumulation) |
| **Word Error Rate (WER)** | Untestable headlessly (see §3.1) | **13.8%** | **6.9%** (27/29 correct words, 1 deletion, 1 substitution) | **65.5%** |
| **Transcribed Text** | *(Click Start and speak in interactive browser)* | *"He hoped there would be stew for dinner, Turnips and carrots and bruised potatoes and fat, mutton, Pieces to be ladled out in thick, peppered flower-fat and sauce, He hoped he had."* | *"He hoped there would be stew for dinner, turnips and carrots and bruised potatoes and fat mutton pieces to be ladled out in thick, peppered flower fattened sauce."* | *"AND TURNIPS AND CARROTS AND BRUISED POTATOES AND FAT MUTTON POTS OF MUTTEN PIECES TO BE LADLED OUT IN THICK PEPPERED FLOWER-FATTENED SAUCE AND HE HOPED THERE WOULD BE SOME"* |
| **Known Reference Text** | — | *"He hoped there would be stew for dinner, turnips and carrots and bruised potatoes, and fat mutton pieces to be ladled out in thick, peppered flower-fat and sauce."* | *(Same reference)* | *(Same reference)* |
| **Execution Architecture** | Cloud Speech Daemon (Google / Apple) | On-device WASM (Multi-threaded Pthreads) | On-device WASM (Single-Threaded ORT Web, `numThreads = 1`) | On-device WASM (Emscripten CPU SIMD) |
| **GitHub Pages Compatibility** | ✅ Fully compatible (Zero custom headers needed) | ❌ **Incompatible** (`SharedArrayBuffer` blocked without COOP/COEP) | 🛡️ **100% Compatible** (Zero `SharedArrayBuffer` / zero COOP/COEP needed) | ❌ **Incompatible** (Pthreads build requires COOP/COEP) |
| **Privacy Guarantee** | ⚠️ Audio streams to cloud provider | 🛡️ **100% on device**; zero audio leaves client | 🛡️ **100% on device**; zero audio leaves client | 🛡️ **100% on device**; zero audio leaves client |
| **Offline Support** | ❌ Requires internet connection | ✅ Fully offline capable once cached | ✅ Fully offline capable once cached | ✅ Fully offline capable once cached |
| **Primary Code License** | Proprietary browser vendor service | **MIT License** | **Apache 2.0 / MIT License** | **Apache 2.0 License** |
| **Weights License** | Proprietary cloud service | **MIT License** (Useful Sensors HuggingFace) | **MIT License** (`onnx-community/moonshine-tiny-ONNX`) | **Apache 2.0** (LibriSpeech) / Non-commercial data (GigaSpeech) |

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

### 3.3 Empirical Investigation of GitHub Pages Isolation & Workarounds

Per `docs/briefs/interview-isolation.md`, we conducted direct experiments to determine what actually works on static hosting environments like GitHub Pages where custom HTTP response headers cannot be set.

#### 1. What Happens Today to Moonshine on a Static Server with NO COOP/COEP Headers?
We served the production static build (`dist/`) on a local static server configured with zero COOP/COEP headers, replicating GitHub Pages' exact HTTP response profile:
- **`window.crossOriginIsolated`:** Evaluated strictly to `false`.
- **`typeof window.SharedArrayBuffer`:** Evaluated to `'undefined'`.
- **In-App Guard:** In `engines.ts`, the environment guard detects `!window.crossOriginIsolated` and throws:
  `Cross-Origin Isolation not enabled: Moonshine streaming WASM requires SharedArrayBuffer (COOP/COEP headers). In standard single-origin hosting without COOP/COEP headers, browsers disable WebAssembly multi-threading for security.`
- **Underlying Emscripten Engine Failure:** When this guard was removed and `@moonshine-ai/moonshine-wasm`'s `Transcriber.load()` was executed directly in headless Chromium, the Emscripten multi-threaded runtime (`moonshine.mjs`) attempted to spawn Web Workers and transfer its shared memory pool (`wasmMemory = new WebAssembly.Memory({ ..., shared: true })`). Chromium immediately aborted with a fatal browser DOMException:
  ```
  DOMException: Failed to execute 'postMessage' on 'Worker': SharedArrayBuffer transfer requires self.crossOriginIsolated.
  ```
- **Conclusion:** On `neuralmasteryai.com` today, the official `@moonshine-ai/moonshine-wasm` package **cannot initialize or run** on GitHub Pages without modifying browser security or injecting headers.

---

#### 2. The Preferred Solution: Single-Threaded ONNX Runtime Web (`onnxruntime-web` / `transformers.js`)
We evaluated whether Moonshine can run single-threaded without `SharedArrayBuffer` (`numThreads = 1`) using ONNX Runtime Web via `@huggingface/transformers` (`onnx-community/moonshine-tiny-ONNX`, q8 quantized):
- **Compatibility:** **100% functional without COOP/COEP headers.** In standard headless Chrome on a server with zero custom headers, `window.crossOriginIsolated` was `false`, and the pipeline executed to completion with zero errors.
- **Model Download Size:**
  - Encoder (`encoder_model_quantized.onnx`): **7,937,661 bytes** (~7.9 MB).
  - Decoder (`decoder_model_merged_quantized.onnx`): **20,243,286 bytes** (~20.2 MB).
  - Total weights: **28,180,947 bytes (~28.18 MB)** — a **54% reduction** compared to `@moonshine-ai/moonshine-wasm` (61.6 MB) and 66% smaller than `sherpa-onnx` (83.3 MB).
- **Cold Download & Initialization:** **6,528 ms** (downloading model weights from Hugging Face CloudFront CDN + WASM initialization). Cached loads initialized in **<600 ms**.
- **Inference Latency on Full Benchmark Audio (`/tmp/speech_with_pauses.wav`, 22.34s):**
  - Full transcription latency: **1,999 ms** (~2.0 seconds).
  - Real-Time Factor (RTF): **0.089x** (computes **~11.2x faster than real-time playback**).
- **Chunked Latency Progression:**
  - 1.0s audio chunk: **115 ms** (RTF: 0.115)
  - 2.0s audio chunk: **93 ms** (RTF: 0.046)
  - 3.0s audio chunk: **116 ms** (RTF: 0.039)
  - 5.0s audio chunk: **189 ms** (RTF: 0.038)
  - 10.0s audio chunk: **330 ms** (RTF: 0.033)
- **Transcription Fidelity & Accuracy:**
  - *Reference:* `"He hoped there would be stew for dinner, turnips and carrots and bruised potatoes, and fat mutton pieces to be ladled out in thick, peppered flower-fat and sauce."`
  - *Transcribed:* `"He hoped there would be stew for dinner, turnips and carrots and bruised potatoes and fat mutton pieces to be ladled out in thick, peppered flower fattened sauce."`
  - *Word Accuracy:* 27 / 29 words correct (1 deletion, 1 substitution: `"flower-fat and"` vs `"flower fattened"`).
  - *Word Error Rate (WER):* **6.9%** (superior to `@moonshine-ai/moonshine-wasm`'s 13.8% and `sherpa-onnx`'s 65.5%).
- **Engineering Verdict:** Single-threaded `onnxruntime-web` is the **optimal production path**. It achieves higher accuracy, lower download footprint, and zero header/service-worker complexity.

---

#### 3. Prototyping Scoped `coi-serviceworker` with `COEP: credentialless`
We prototyped and empirically verified a route-scoped Service Worker (`coi-sw.js`) configured with `scope: '/interview'` and `Cross-Origin-Embedder-Policy: credentialless`:

- **Route Isolation Verification:**
  - On first visit to `/interview`: `window.crossOriginIsolated` was `false`.
  - Service Worker registered and claimed the client.
  - **The Mandatory Reload:** Because a Service Worker cannot retroactively modify the response headers of the document that spawned it, the page was forced to trigger a full document reload (`location.reload()`).
  - After reload on `/interview`: `window.crossOriginIsolated` successfully transitioned to **`true`** in Chromium.
  - External assets within `/interview`: Google Fonts (`fonts.gstatic.com`) and GitHub raw images loaded cleanly with HTTP 200 under `credentialless`.
  - Non-interview routes (e.g., `/practice`, `/`, `/docs`): Visited `/practice` immediately afterward; `window.crossOriginIsolated` remained strictly **`false`** (unaffected by the worker).
  - Pyodide on `/practice`: Cross-origin script fetch `https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js` returned HTTP 200 with zero CORP errors.

- **Primary Source Analysis of Safari / WebKit Behavior:**
  - *The Primary Bug:* [WebKit Bug 240409 - Support COEP: credentialless](https://bugs.webkit.org/show_bug.cgi?id=240409) confirms that `Cross-Origin-Embedder-Policy: credentialless` is **not implemented** in WebKit/Safari.
  - *The Impact on Safari:* When Safari encounters `COEP: credentialless`, it treats it as an invalid value and ignores it. Consequently, `window.crossOriginIsolated` remains `false`, and `SharedArrayBuffer` remains unavailable.
  - *The Fallback Trap (`COEP: require-corp`):* If one falls back to `COEP: require-corp` on Safari, Safari enforces strict CORP blocking. Any third-party resource (CDNs, fonts, Pyodide scripts, analytics, avatars) that does not serve an explicit `Cross-Origin-Resource-Policy: cross-origin` header is blocked.
  - *Private Browsing Mode:* In Safari Private Browsing mode, WebKit disables or severely partitions Service Workers, causing `coi-serviceworker` registration to fail or trigger infinite reload loops.
  - *Conclusion on `coi-serviceworker`:* While functional in Chromium, its lack of Safari support and disruptive hard document reload make single-threaded ONNX Web far superior.

---

#### 4. Low-End Mobile Phone Simulation (Chrome 4x CPU Throttling)
To simulate performance on lower-tier mobile hardware (such as entry-level Android devices with ARM Cortex-A55 cores), we ran the single-threaded Moonshine pipeline in Chromium with Chrome DevTools Protocol CPU throttling set to `Emulation.setCPUThrottlingRate: 4`:

- **Simulation Label:** Automated Headless Chromium with 4x CPU Throttling Simulation.
- **Cold Model Load Time:** **9,550 ms** (~9.5 s) compared to 6,528 ms unthrottled.
- **Full 22.34s Speech Transcription Latency:** **7,597 ms** (~7.6 s) compared to 1,999 ms unthrottled.
- **Real-Time Factor (RTF):** **0.340x** (still **~2.9x faster than real-time speech playback**!).
- **4x Throttled Chunk Latencies:**
  - 1.0s audio chunk: **376 ms** (RTF: 0.376)
  - 2.0s audio chunk: **294 ms** (RTF: 0.147)
  - 3.0s audio chunk: **378 ms** (RTF: 0.126)
  - 5.0s audio chunk: **612 ms** (RTF: 0.122)
- **Transcription Text:** Identical to unthrottled (`"He hoped there would be stew for dinner, turnips and carrots and bruised potatoes and fat mutton pieces to be ladled out in thick, peppered flower fattened sauce."`).
- **Word Error Rate:** **6.9%**.
- **Takeaway:** Even on hardware throttled by a factor of 4x, single-threaded Moonshine processes incoming voice frames significantly faster than real-time speech, ensuring zero perceptual speech accumulation lag.

---

### 3.4 Model Hosting & CDN Strategy: Where Assets Load From

#### Where Does Moonshine Load From Today?
In `@moonshine-ai/moonshine-wasm` v0.1.5:
1. `moonshine.wasm` (13.2 MB): Bundled in the npm package and copied into `dist/assets` by Vite.
2. The 7 model weights (51.4 MB): Loaded at runtime via `AssetDownloader` from Moonshine's official cloud CDN:
   `https://download.moonshine.ai/model/tiny-streaming-en/quantized_26_07_30/` (`frontend.ort`, `encoder.ort`, `decoder_kv.ort`, `cross_kv.ort`, `adapter.ort`, `decoder_kv_with_attention.ort`, `tokenizer.bin`).
   - *CORS Verification:* `curl -sI -H "Origin: https://neuralmasteryai.com" https://download.moonshine.ai/...` returns:
     ```http
     access-control-allow-origin: *
     access-control-expose-headers: content-length, content-range, accept-ranges, etag
     ```
   - *Zero bytes in git or deploy artifacts:* None of the 51.4 MB of `.ort` model weights are stored in the git repository or `dist/` deploy package.

#### Hugging Face CDN Hosting (for Single-Threaded ONNX Models)
For single-threaded `onnxruntime-web` / `@huggingface/transformers`:
- **Repository:** `onnx-community/moonshine-tiny-ONNX` (q8 quantized).
- **Files:** `onnx/encoder_model_quantized.onnx` (7.9 MB) and `onnx/decoder_model_merged_quantized.onnx` (20.2 MB).
- **CDN Behavior:** Direct requests to `https://huggingface.co/onnx-community/moonshine-tiny-ONNX/resolve/main/...` issue an HTTP 302 redirect to Hugging Face's global AWS CloudFront edge (`*.cdn.hf.co`).
- **CORS Verification:** Both the redirect and CloudFront edge return `access-control-allow-origin: *` with full `Accept-Ranges: bytes` support.
- **Client Caching:** `@huggingface/transformers` automatically stores fetched model files in browser Cache API / IndexedDB storage, eliminating repeated network downloads on subsequent visits.
- **Zero Static Deployment Cost:** Zero model files reside in `public/` or `dist/`.

#### Sherpa-ONNX 83 MB Asset Strategy
Currently, `public/sherpa-onnx/` contains 83 MB of binary model weights (`.data` and `.wasm`). Vite's build plugin in `vite.config.ts` prunes them from `dist/` before deployment.
To eliminate git repository bloat, these assets should be hosted on a dedicated Hugging Face Hub dataset repository or Cloudflare R2 bucket with `Access-Control-Allow-Origin: *` and fetched via `fetch()` + Cache API.

---

### 3.5 Model Licensing: Primary Source Verification
- **Moonshine Tiny:**
  - *Code License:* [UsefulSensors/moonshine](https://github.com/usefulsensors/moonshine) is licensed under the **MIT License**.
  - *Weights License:* Model weights on [UsefulSensors/moonshine-tiny](https://huggingface.co/UsefulSensors/moonshine-tiny) and [onnx-community/moonshine-tiny-ONNX](https://huggingface.co/onnx-community/moonshine-tiny-ONNX) are licensed under the **MIT License**. Fully permissive for commercial use.
- **sherpa-onnx (Zipformer Models):**
  - *Code License:* [k2-fsa/sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) is licensed under **Apache-2.0**.
  - *GigaSpeech Model:* The weights in `sherpa-onnx-streaming-zipformer-gigaspeech-20M` are Apache-2.0, but the upstream **GigaSpeech dataset** license explicitly restricts raw audio to non-commercial research use. SpeechColab disclaims liability for commercial use under "fair use", posing legal ambiguity.
  - *LibriSpeech Model:* `sherpa-onnx-streaming-zipformer-en-20M-2023-02-17` is trained strictly on LibriSpeech (public domain audio / CC-BY 4.0). Both model weights and code are **Apache-2.0**, offering complete commercial freedom.

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

---

## 7. Single-Threaded Moonshine in Web Worker (Option 4)

To make on-device ASR work reliably on static web servers (such as GitHub Pages) without custom COOP/COEP HTTP headers, Option 4 implements single-threaded Moonshine Tiny (`onnx-community/moonshine-tiny-ONNX` via `@huggingface/transformers` in a dedicated Web Worker).

### 7.1 Architecture & Invariants
- **Runtime:** `src/workers/moonshineSingleThreadWorker.ts` with `env.backends.onnx.wasm.numThreads = 1`.
- **Zero SharedArrayBuffer:** Executes entirely in standard WebAssembly memory without multi-threading primitives.
- **Growing Audio Windows:** Flattens accumulated microphone audio chunks every 250ms and streams them to the worker without main-thread UI stuttering.
- **Settled Prefix Stabilization:** Locks text prior to the trailing volatile window to prevent earlier transcribed words from jittering.
- **Empirical Streaming Metrics:** Tracks real update interval (~449–492 ms) and earlier word revisions (0 revisions on clean phrase progression).

### 7.2 Benchmark Reproducibility
The benchmark scripts and ground truth audio have been committed to:
- `scripts/speech-benchmarks/benchmark-moonshine-single-thread.mjs`
- `scripts/speech-benchmarks/audio/speech.wav` (10.44s mono 16 kHz LibriSpeech test sample)
- `scripts/speech-benchmarks/audio/speech_with_pauses.wav` (22.34s audio with 2.2s, 3.2s, and 6.5s pauses)
- `scripts/speech-benchmarks/audio/reference.txt`
- `scripts/speech-benchmarks/moonshine-single-thread-results.json`

Run command:
```bash
node scripts/speech-benchmarks/benchmark-moonshine-single-thread.mjs
```

---

## 8. Interviewer Voice Evaluation (`/lab/voice-test`) & Indian English Audit

A dedicated benchmark route has been added at `/lab/voice-test` (`noindex, nofollow`, responsive at 375px with 0 overflow) comparing text-to-speech candidates for the AI interviewer using the fixed question:
> *“What is a foundation model, and how is it different from a regular ML model?”*

### 8.1 Empirical Voice Comparison Matrix

| Candidate Voice | Network Download | Time to First Audio | Normal CPU RTF | 4x Throttled CPU RTF | Commercial License Status | Primary Source License URL |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Browser Built-in (`speechSynthesis`)** | **0 KB** (Native OS daemon) | **42 ms** | **0.0x** (Hardware native) | **0.0x** | ✅ Permitted for end-users per OS EULA | [MDN Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis) |
| **Piper `en_US-lessac-medium`** | **63.2 MB** (ONNX + config) | **340 ms** | **0.12x** (Fast) | **0.48x** (Faster than real-time) | ❌ **STRICTLY PROHIBITED** (Research Only) | [Blizzard 2013 Research License](https://www.cstr.ed.ac.uk/projects/blizzard/2013/lessac_blizzard2013/license.html) |
| **Kokoro-82M (`af_heart`)** | **92.9 MB** (Quantized ONNX + vectors) | **480 ms** | **0.73x** (Real-time) | **2.91x** (Slower than real-time) | ✅ **100% Permitted** (Apache-2.0) | [Kokoro-82M HuggingFace](https://huggingface.co/hexgrad/Kokoro-82M) |

### 8.2 Piper Voice Data License Deep Dive
While the Piper software engine is licensed under MIT/GPL-3.0, the `en_US-lessac` voice model is derived from the Blizzard Challenge 2013 Lessac corpus. Clause 1.1 of the Lessac Blizzard 2013 Research License Agreement explicitly prohibits commercial use:
> *“The speech database was created for research purposes only... Any commercial use of the Database or voice models derived therefrom is strictly prohibited.”*

Consequently, Piper `en_US-lessac` cannot be deployed in commercial production without violating intellectual property terms.

### 8.3 Indian English (`en_IN`) Usable Voice Audit
An audit was conducted across the major on-device TTS catalogs:
1. **Piper Voices Catalog:** 0 official Indian English (`en_IN`) models exist in the official repository. Regional Indic languages (Hindi, Telugu, Malayalam, Marathi) exist, but the community-trained `en_IN-spicor-medium` model is locked under IISc SPIRE academic research access terms.
2. **Kokoro-82M:** No dedicated `en_IN` accent code in the standard 54-voice release. Accent approximation requires vector blending with the Hindi model (`hf_alpha`).
3. **Recommended Production Solution:** **AI4Bharat Indic-Parler-TTS** (`ai4bharat/indic-parler-tts`), which natively supports Indian English alongside 21 Indian languages under a fully permissive **Apache-2.0 License**.
