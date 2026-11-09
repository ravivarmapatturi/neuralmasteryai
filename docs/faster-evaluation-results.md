# Faster Answer Evaluation: Measured Before and After

> **Context**: Response to `docs/briefs/faster-evaluation.md`.
> **Objective**: Accelerate "Evaluating your answer" without compromising transcription accuracy or exceeding the 4 GB device memory budget.
> **Tested Engine**: Standard profile (`better`: Moonshine Tiny live ASR + Whisper Base.en q8 final ASR + Xenova/all-MiniLM-L6-v2 judge embeddings).

---

## 1. Measured Before vs. After Summary

All measurements were taken using deterministic held-out speech clips ([`scripts/speech-accuracy/eval-stage-cases.json`](file:///home/ravivarma/Documents/DREAM_PROJECT/neuralmastery/platform-vite-interview/scripts/speech-accuracy/eval-stage-cases.json)) injected into a 48 kHz Web Audio MediaStream destination and captured via the production AudioWorklet at 16 kHz. Timing begins the millisecond the user clicks **Done** and ends when the final rubric scoring completes.

### Post-Done Latency & Transcription Accuracy Table

| Duration | State | Audio Drain | Waiting Live | Model Load | Whisper Final | Judge Load | Judge Inf | **Total Post-Done** | **WER (Edits/Words)** | Speedup |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **15s** | Before | 0.00 s | 0.00 s | 2.18 s | 7.14 s | 10.04 s | 0.82 s | **20.19 s** | 26.1% (6/23) | — |
| | **After** | **0.30 s** | **0.00 s** | **0.00 s** | **5.15 s** | **0.00 s** | **0.29 s** | **6.27 s** | **26.1% (6/23)** | **3.2x faster (-68.9%)** |
| **30s** | Before | 0.00 s | 0.00 s | 1.76 s | 13.65 s | 4.41 s | 1.05 s | **20.87 s** | 20.0% (8/40) | — |
| | **After** | **0.30 s** | **0.00 s** | **0.00 s** | **8.98 s** | **0.00 s** | **0.39 s** | **9.76 s** | **17.5% (7/40)** | **2.1x faster (-53.2%)** |
| **60s** | Before | 0.00 s | 0.00 s | 1.83 s | 35.58 s | 4.35 s | 1.40 s | **43.16 s** | 17.5% (14/80) | — |
| | **After** | **0.30 s** | **0.00 s** | **0.01 s** | **6.92 s** | **0.00 s** | **0.72 s** | **8.01 s** | **17.5% (14/80)** | **5.4x faster (-81.4%)** |
| **120s** | Before | 0.00 s | 0.00 s | 1.84 s | 72.76 s | 3.20 s | 1.73 s | **79.52 s** | 20.0% (32/160) | — |
| | **After** | **0.30 s** | **0.00 s** | **1.72 s** | **3.65 s** | **0.00 s** | **1.24 s** | **7.03 s** | **20.0% (32/160)** | **11.3x faster (-91.2%)** |

Raw measurement artifacts:
- Before baseline: [`scripts/speech-accuracy/stage-baseline-before.json`](file:///home/ravivarma/Documents/DREAM_PROJECT/neuralmastery/platform-vite-interview/scripts/speech-accuracy/stage-baseline-before.json)
- After optimization: [`scripts/speech-accuracy/stage-baseline-after.json`](file:///home/ravivarma/Documents/DREAM_PROJECT/neuralmastery/platform-vite-interview/scripts/speech-accuracy/stage-baseline-after.json)

---

## 2. Key Architectural Optimizations

### (a) Background Whisper Base.en Window Decoding
- **Mechanism**: Long Whisper recognition naturally operates in 30-second windows with 5-second strides (`jump = 20s`). Instead of buffering the entire audio until the user clicks Done and executing a massive sequential batch, `src/lib/speechTest/engines.ts` streams 30-second sliding windows into `finalWorker` as audio accumulates in real-time.
- **Tail Assembly**: When the user clicks Done, `finalWorker` only has to decode the trailing window segment (`mode: 'tail'`). The worker then stitches the background chunks and tail using `tokenizer._decode_asr(chunks, { time_precision: 0.02, return_timestamps: true, force_full_sequences: true })`.
- **Result**: For 60s answers, Whisper post-Done latency dropped from **35.58s to 6.92s** (5.1x faster). For 120s answers, Whisper post-Done latency dropped from **72.76s to 3.65s** (19.9x faster).

### (b) Final Model and Judge Preloading
- **Mechanism**: When an interview question starts (`startAnswering()`), the page warm-starts the judge worker and final ASR worker in parallel in the background:
  - `engines.ts` instantiates `finalWorker` alongside the live Moonshine worker when `preloadFinal` is active.
  - `SimpleInterviewPage.tsx` triggers `warmJudgePromise = client.loadJudge()` as soon as the question is rendered.
- **Memory Safety**: Both models run within their dedicated Web Workers. Peak JS heap remained under 10 MB in the main thread and overall browser memory remained well under the 2.25 GiB cap.
- **Result**: Post-Done model load time dropped from **1.76s–2.18s to ~0.00s**, and judge load time dropped from **3.20s–10.04s to ~0.00s**.

### (c) Precomputed & Cached Model Answer Embeddings
- **Mechanism**: The model answer and rubric criteria are known as soon as the question is selected. `src/lib/answerJudge.ts` introduces `precomputeModelAnswerEmbeddings(points, modelAnswer, embed)` and a memory-capped LRU vector cache keyed by SHA-256 hash.
- **Deduplication**: When `judgeAnswer` executes after Done, all semantic embeddings for the criteria points and reference text are already resolved. Only the user's transcript needs embedding.
- **Result**: Judge inference post-Done dropped from **0.82s–1.73s to 0.29s–1.24s** (up to 2.8x faster).

---

## 3. UI Status Breakdown

In `src/components/interview/SimpleInterviewPage.tsx`, the monolithic "Evaluating your answer..." state was split to provide real-time visibility into the two distinct remaining operations:
1. **"Finishing your transcript…"**: Displayed while draining the AudioWorklet buffer and finalizing the trailing Whisper window.
2. **"Checking key points against the model answer on your device…"**: Displayed while the client-side embedding judge evaluates criteria coverage and assigns scores.

---

## 4. What Was Kept vs. Dropped

| Component | Status | Rationale |
| :--- | :--- | :--- |
| Background window decoding | **Kept** | Achieved up to 19.9x Whisper speedup on 120s answers. Exactly zero WER degradation (26.1% / 17.5% / 17.5% / 20.0%). |
| Parallel final model preloading | **Kept** | Completely eliminated 1.8s–2.2s post-Done model loading overhead with zero impact on live transcription frame rate. |
| Judge warm-start & embedding cache | **Kept** | Eliminated 3s–10s cold model loading; reduced judge inference time by 2.8x. |
| Recognition models | **Unchanged** | Kept Moonshine Tiny (live) + Whisper Base.en q8 (final), strictly adhering to brief constraints. |
| Dropped changes | **None** | No changes had to be reverted because WER did not degrade for any duration (and actually improved by 2.5% on the 30s case). |

---

## 5. What Could Not Be Measured

1. **Physical Microphone Acoustic Variance**:
   All benchmarks were executed via synthetic digital PCM injection into Web Audio contexts using held-out VCTK Indian-English speech clips. Physical room reverberation, background fan noise, and hardware microphone frequency responses could not be evaluated in headless Linux CI.
2. **Battery Life / Multi-Hour Thermal Throttling**:
   Measurements were taken in isolated benchmark runs. Sustained continuous multi-hour mobile battery drain under parallel worker execution was not measured.
3. **WebGPU Acceleration for Final Model**:
   The Linux host environment lacks hardware WebGPU support in headless Chromium; all tests were verified in WASM single-threaded worker mode.
