# Browser speech recognition: the 4 GB Standard profile

Standard uses Moonshine Tiny for live text and Whisper Base.en q8 for final recognition. It works through single-thread WASM and requests WebGPU when a usable adapter is available. We selected it for Indian-English and long-answer accuracy within the download and memory limits. The candidate table below includes the short-clip result where Moonshine Base does better; Base does not win every metric.

High accuracy is an explicit switch to Whisper Large v3 Turbo q4. The control appears when reported memory is at least 8 GB **or** a WebGPU adapter is available. It shows **794 MB + runtime**, derived from pinned model-file inventory, and remembers the choice. Opening the page alone does not download it. Switching back cancels a pending download; model-load failure returns to Standard. Turbo inference, peak memory and accuracy remain **unmeasured** here: Chromium returned no WebGPU adapter, and we did not attempt a high-memory WASM run on this busy laptop.

## Measured before and after: answers longer than 30 seconds

Both diagnostics use a 64.2705-second composite of the held-out Indian-English recordings, including a six-second hesitation. They reuse the existing speaker and references; they are not new independent subjects. The second diagnostic attenuates audio after 35 seconds to 3% of its original amplitude. Audio enters a real Web Audio MediaStream at 48 kHz and is captured at 16 kHz; these are digital-injection tests, **not physical microphone recordings**.

| Diagnostic | Before WER | After WER | Before finish | After finish | Final decoder behavior |
| :--- | ---: | ---: | ---: | ---: | :--- |
| 64-second answer | 22.5% (18/80) | 17.5% (14/80) | 22.10 s | 23.95 s | Before aborted Whisper; after accepted Whisper |
| 64-second answer with quiet tail | 38.8% (31/80) | 16.3% (13/80) | 0.73 s | 28.43 s | Before skipped Whisper; after accepted Whisper |

Finish measures time after source playback ends, including drain, queued live work, model preparation and final inference. Background preparation is separate: the after run loaded both models before microphone capture; its first preparation took 18.90 seconds. The old profile initially loaded only Tiny and could download Base during finalization. These are observed wall times, not a controlled network-speed comparison.

The old quiet-tail case followed the timed-out answer in the same engine, reproducing the permanent-disable bug. The after quiet-tail case ran separately because the host-memory guard interrupted the larger run during that last case. It uses the current policy and capture implementation. These results test the combined policy and capture fixes; they do not isolate gain, trimming, resampling and timeout effects individually. Raw results: [before diagnostics](../scripts/speech-accuracy/tier-capture-before-long.json), [after main run](../scripts/speech-accuracy/tier-capture-after-budgeted.json), and [completed after quiet-tail run](../scripts/speech-accuracy/tier-capture-after-quiet-tail.json).

### Memory proof for Standard

The after runs executed inside a kernel-enforced **2.25 GiB scope** covering Node, the HTTP fixture server, Chromium and its workers, with **swap disabled**. The largest recorded kernel `memory.peak` was **1,300,307,968 bytes (1.21 GiB)**. This demonstrates operation inside that process budget and reserves the rest of a 4 GB machine for the operating system and other browser work; the physical laptop has about 7.2 GiB usable RAM, so this is not a claim of testing on separate 4 GB hardware. A second guard stops the job whenever host available RAM drops below 2 GiB.

The main after run completed all 18 VCTK clips, five term cases, the original composite, and the 64-second normal answer before that guard stopped its last case. The isolated quiet-tail run then completed. The complete short set measured **6.7% WER (8/120)**, the Indian-English subset **15.0% (6/40)**, and question-conditioned technical-term accuracy **4/5**. Completed cohorts are retained even when a later diagnostic was interrupted; an interrupted run is never marked completed.

## Capture-path audit

The current acceptance limits are under 400 MB for the complete Standard speech download and operation within a 4 GB laptop budget.

Two final-pass policy defects were confirmed in code: a median live-model real-time factor above 0.75 skipped Whisper and disabled it for the engine's remaining lifetime, and a 12-second maximum decode budget could abort a normal laptop's long answer. The page would then use Moonshine's live transcript as its final answer. Final decoding now runs independently of live throughput, with a duration-scaled background deadline. Empty or severely truncated final results still preserve the live transcript, and cancellation still invalidates late results.

Capture previously used main-thread ScriptProcessor callbacks. React work, layout, or other main-thread stalls can delay those callbacks; audio capture now prefers an AudioWorklet on the audio rendering thread. The fallback remains for browsers without AudioWorklet. Capture packets contain 2,048 samples at 16 kHz; pause detection counts samples rather than callbacks. The 300 ms drain exceeds both the new 128 ms packet interval and the fallback's 256 ms interval. The worklet sends PCM to the main thread without running recognition there.

The input requests mono, echo cancellation, noise suppression and automatic gain control. We retain these browser requests because acoustic effects cannot be measured through injected digital WAVs. The browser may ignore ideal constraints. Track settings, actual input rate, context rate, capture backend and captured sample count are now available in engine diagnostics. A 16 kHz AudioContext performs the browser's sample-rate conversion; the implementation never relabels or drops 48 kHz samples to pretend they are 16 kHz. An unexpected context rate fails explicitly.

The former fixed RMS threshold of 0.012 operated before bounded quiet-audio gain. Quiet speech could fail to count as speech and miss pause commits. Pause detection now uses the same bounded gain and a lower threshold. This remains an energy detector, which cannot reliably distinguish fan noise from speech. The complete session is retained independently of live chunk boundaries. Final Whisper input is no longer edge-trimmed using a fixed loudness threshold, which could discard a soft trailing phrase. Long Whisper answers still use timestamp-based 30-second windows with five-second strides.

These observations explain plausible real-use failures and identify reproducible policy bugs; they do not establish the owner's physical microphone's acoustic quality. Physical microphone, Bluetooth, room echo and browser noise-suppression effects remain unmeasured.

### Default selection under the revised download and memory limits

This repeats evaluation on previously used held-out files; it is not a new untouched validation set. We compared q8 Whisper Small.en, Whisper Base.en, Distil Small.en and Moonshine Base using the same held-out VCTK recordings, including six Indian-English clips. Five licensed human FOSDEM excerpts test XGBoost, RAG, LoRA, embeddings and BM25. We scored those excerpts for term presence only: their conference captions are not audited gold WER references. The existing 29.14-second Indian-English composite is reported separately. It reuses the six Indian-English clips and is not another independent subject.

| Candidate, q8 WASM | Held-out WER (18 clips) | Indian-English WER (6 clips) | AI terms, no question hints | Mean decode after complete audio | Model download, observed payload | Peak sampled Chromium RSS | Loads here |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | :--- |
| Whisper Base.en | 6.7% (8/120) | 15.0% (6/40) | 3/5 | 4.45 s | 79.59 MB | 1.25 GiB | Yes |
| Whisper Small.en | 6.7% (8/120) | 15.0% (6/40) | 3/5 | 12.28 s | 251.77 MB | 1.92 GiB | Yes |
| Moonshine Base, bounded windows | 5.8% (7/120) | 17.5% (7/40) | 3/5 | 0.73 s | 66.91 MB | 1.11 GiB | Yes |
| Distil Small.en | Not evaluated completely | Not evaluated completely | Not measured | Not reported | 174.77 MB | 3.86 GiB | Loaded; rejected for memory |
| Whisper Large v3 Turbo, WebGPU | Not measured | Not measured | Not measured | Not measured | Inventory only; not downloaded | Not measured | No adapter available |

MB denotes decimal download bytes; GiB denotes binary memory units. RSS was sampled every 500 ms across all Chromium processes and includes shared pages more than once. It excludes Node and other applications; the separately capped production run below measures the entire benchmark scope. Candidate timing is whole-buffer decode wall time after loading, not microphone-to-word latency or a claim about other laptops. CPU contention and download conditions are uncontrolled; accuracy, timing and memory artifacts retain each run independently.

Standard uses Tiny for live text and Whisper Base.en q8 for the complete final answer. Its observed combined model payload is **111,666,188 bytes**. The WASM runtime used here is a 26,861,777-byte uncompressed artifact; its observed CDN response Content-Length was 5,547,312 bytes. The compiled benchmark worker is about 1.3 MB. These artifacts fit below 400 MB with substantial headroom; model payload and compressed HTTP transfer are different measurements.

This is a trade-off, not a claim that Base wins every column. Moonshine Base makes one fewer edit on the short set, but its bounded-window composite WER was **57.5% (23/40)**, versus Base's **15.0% (6/40)** and Small's **17.5% (7/40)**. Base ties Small's short and Indian-English WER and unprompted term score, while using less memory and finishing sooner here. Distil Small's third completed clip still left Chromium at a sampled 3.86 GiB peak, which leaves no room for the operating system on a 4 GB laptop. That run was stopped, not scored as a complete evaluation. An earlier unbounded Moonshine long pass also hit the host-memory floor; the bounded-window result is retained separately.

The model revisions and file sizes are in [tier model metadata](../scripts/speech-accuracy/tier-model-metadata.json); the measured runs and per-condition aggregates are in [tier summary](../scripts/speech-accuracy/tier-summary.json). Early run artifacts contain worker-request IDs in the `id` field because of an object-spread collision in the harness. Their `sourceSHA256`, corpus and order identify the recordings unambiguously; later runs write the corpus ID last. No reference or hypothesis was changed to repair that bookkeeping bug.

### Reproduce the current measurements

Each command below starts one model at a time, uses a fresh browser, closes its HTTP server and browser, and refuses to overwrite an existing output. The kernel scope caps the entire job and disables swap. The host-memory guard remains active inside it. Run commands sequentially, using new output names for another measurement.

```bash
python scripts/speech-accuracy/prepare-capture-cases.py
systemd-run --user --scope -p MemoryMax=2304M -p MemorySwapMax=0 \
  node scripts/speech-accuracy/evaluate-tiers.mjs \
  --only=whisper-base-wasm --name=local-whisper-base
systemd-run --user --scope -p MemoryMax=2304M -p MemorySwapMax=0 \
  node scripts/speech-accuracy/evaluate-tiers.mjs \
  --capture=after --name=local-capture-after --cpuBrowser=true
node scripts/speech-accuracy/summarize-tiers.mjs
```

The normal before recapture was interrupted after seven clips; a new engine instance completed two more before another host-memory interruption. Those partial attempts remain in `tier-capture-before-budgeted.json` and `tier-capture-before-remainder.json`. We do not label their nine completed clips as a full baseline or report a new 18-clip before WER from them. The complete older baseline remains in the historical section. The current before/after diagnostic table uses the two completed long cases instead.

### Licenses checked for this comparison

[Whisper Small.en](https://huggingface.co/openai/whisper-small.en) and [Whisper Base.en](https://huggingface.co/openai/whisper-base.en) publish Apache-2.0 metadata; [Whisper Large v3 Turbo](https://huggingface.co/openai/whisper-large-v3-turbo), [Distil Small.en](https://huggingface.co/distil-whisper/distil-small.en), and [Moonshine Base](https://huggingface.co/onnx-community/moonshine-base-ONNX) publish MIT metadata. The ONNX Whisper exports point to their upstream models; their ONNX cards do not independently declare a license. We retained upstream license metadata rather than inferring a new license from the export namespace. VCTK's publisher specifies CC BY 4.0. FOSDEM's source-directory footers specify CC BY 2.0 Belgium. Attribution and exact source times remain in the corpus manifests. The [fresh license evidence](../scripts/speech-accuracy/tier-license-evidence.json) retains source URLs, revisions and footer excerpts. No gated or ambiguously licensed audio was added.


## Historical experiments retained for comparison

The following report describes earlier implementations and their original measurements. Its slow-refinement policy has been replaced by the capture fixes above.

### Earlier report

The browser recognizer now uses measured decoding speed to skip or abort slow Whisper refinement and can condition Whisper on the current question’s vocabulary. The follow-up below reports normal and 25% CPU results, technical-term gains, and negative controls. Earlier frozen results remain for comparison. The owner’s physical microphone remains untested.

## Follow-up after merging main

Implementation commit: `1471c65b`. Requested follow-up: prior work was committed in `00f62fcc`, then `origin/main` was merged in `af424b18`. Main’s design and immediate model-answer view remain. The transcript finishes in the background; answer audio waits for the 300 ms capture drain and microphone release. The fine-print source paragraph and keyboard-instruction line were removed; button shortcut hints remain. No explanatory footnote was added to the page.

These are measurements on the **previously evaluated held-out recordings**, as requested after reviewing their earlier results. They are not an untouched validation set. The follow-up policy, source hashes and five planned runs were [registered before these runs](../scripts/speech-accuracy/followup-protocol.json); recognition settings were not adjusted between them. All inputs are human recordings.

### Measured slow-device cutoff

The engine measures inference milliseconds divided by audio milliseconds (real-time factor). It skips Whisper when the upper median of up to five most recent usable live decodes exceeds 0.75 (each contains at least 0.5 seconds of audio). Independently, Whisper inference has a budget of 2.5 times the audio duration, bounded to 6–12 seconds, starting at `model_ready` so model download does not consume that budget. Exceeding it terminates the worker and retains the entire committed/interim live transcript. Either slow decision disables refinement for that engine’s lifetime; the next capture can reload the smaller live model. RAM and `navigator.gpu` presence do not decide this cutoff. These thresholds are explicit product budgets, not measured universal device boundaries. The 12-second ceiling can also retain Tiny on a long answer on a normal CPU; this follow-up does not revalidate long spontaneous answers.

| Condition | Final WER | Mean first live output; coverage | Mean finish | Refinement decisions |
| :--- | :--- | :--- | :--- | :--- |
| Normal CPU | 6.7% (8/120) | 1.51 s; 18/18 | 6.11 s | accepted: 18 |
| 25% renderer CPU budget | 29.2% (35/120) | 1.48 s; 16/18 | 1.03 s | skipped-slow: 18 |

The earlier unguarded 25% run measured **73.3% WER**; this follow-up measured **29.2%**, with 0 transcript/completeness warnings. The renderer limiter still duty-cycles capture as well as inference, so this is a capture-starvation stress test, not a phone benchmark. Worker calibration loops measured 1.03 s normally and 3.57 s at the 25% budget. The guarded 29.2% result still trails the earlier Base-only 21.7% result under that stress condition. Keeping live text is a fallback, not an accuracy guarantee.

### Question vocabulary prompt

Only whitelist terms present as complete words in the current question title enter the prompt. The reference/model answer and recognized transcript are never prompt sources. Transformers.js 4.3.2 does not implement `prompt_ids`; the worker supplies a previous-context decoder prefix and strips those conditioning tokens before pipeline text decoding and scoring. The implementation follows [Whisper’s previous-context token construction](https://github.com/openai/whisper/blob/main/whisper/decoding.py) and the installed Transformers.js generation code. Prompt text is never prepended to the returned transcript.

| Five human FOSDEM cases | Raw terms recognized | After spelling correction | Mean finish |
| :--- | :--- | :--- | :--- |
| Prompt off | 3/5 | 3/5 | 8.18 s |
| Current-question vocabulary | 4/5 | 4/5 | 7.93 s |

The prompted run recognized XGBoost, RAG, embeddings and BM25; LoRA remained unrecognized. This is one positive excerpt per term, not general technical-term accuracy. Published captions are imperfect, so no gold WER is claimed for the conference excerpts.

As a negative control, the 18 held-out VCTK clips were decoded with all five vocabulary terms in a deliberately unrelated question prompt. None of those terms occurs in their references. Raw prompted output contained target terms on **0/18 clips** (0 term/clip matches across 90 opportunities); raw output with no question vocabulary contained them on 0/18. Negative-control WER was 6.7%, versus 6.7% without those unrelated hints. This measures a small false-insertion control; it does not establish prompt safety across spontaneous answers, silence, or room noise.

All five follow-up browser runs completed with exit code 0, no COOP/COEP isolation, and no non-read HTTP requests observed. Download/first-use costs remain included in finish times. These are injected-WAV tests, not physical-microphone tests; WebGPU inference remains unmeasured because Chromium returned no adapter. The [follow-up numeric summary](../scripts/speech-accuracy/followup-summary.json) retains hashes, decisions and warnings.

```bash
# Linux; install/extract cpulimit as described below first. One model at a time.
node scripts/speech-accuracy/evaluate-followup.mjs
node scripts/speech-accuracy/report-followup.mjs
npm run typecheck
npm run check:links
npm run check:mdx
npx vitest run --maxWorkers=1
node scripts/speech-accuracy/verify-ui.mjs
node scripts/speech-accuracy/verify-assets.mjs
npm run check:tracker
```

Implementation verification on 2026-11-09: typecheck, internal links, MDX compilation, 717 unit tests across 121 files, asset hashes, and the focused browser checks passed. The browser checks covered light/dark at 375px/1440px, immediate model answer during deferred transcription, microphone release before answer playback, cancellation and typed fallback. Screenshots were inspected; there was no horizontal overflow or page/console error. Build, pagefind and the full Playwright suite were not run under the explicit memory restriction. No push or deployment was performed.

## What limits this implementation

The microphone path previously requested `audio: true`. That leaves echo cancellation, noise suppression and automatic gain control to browser defaults. Explicit ideal constraints make the request reproducible; `getSettings()` is needed to discover what a particular device actually applies. Echo cancellation can reduce playback leakage but cannot guarantee its removal. Question playback must stop before answering, including keyboard interruption and stalled-clip fallback. These settings need an acoustic test on the owner's laptop; digital injection bypasses the microphone processing stack. See the [media capture specification](https://www.w3.org/TR/mediacapture-streams/) and [echo-cancellation API](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints/echoCancellation).

The production AudioContext requests 16 kHz, allowing the browser's audio converter to resample rather than taking every third sample. A request to the microphone alone does not prove its physical rate. The source rate, context rate and model rate must be distinguished. Band-limited conversion prevents frequencies above the destination Nyquist frequency from aliasing into speech. The corpus preparation uses FFmpeg's resampler. No measured WER improvement from replacing the browser's converter is claimed. See [AudioContext sample-rate behavior](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/AudioContext).

The segmenter uses a fixed RMS threshold (0.012), commits after three 4096-sample quiet callbacks, and otherwise cuts near 8.5 seconds with 1.25 seconds of overlap. RMS distinguishes loudness, not human speech: noise can prevent a pause and quiet consonants can look silent. Edge trimming uses another fixed threshold (0.008). The complete recording is retained, which permits a final decoding pass without accepting those segment boundaries. The existing final pass already uses Moonshine; adding a final pass is not itself a new feature.

The [Moonshine Web example](https://github.com/huggingface/transformers.js-examples/blob/main/moonshine-web/src/worker.js) uses Silero probabilities, different speech entry/exit thresholds and pre-speech buffers. It serializes inference. [whisper.cpp's stream example](https://github.com/ggml-org/whisper.cpp/blob/master/examples/stream/stream.cpp) retains audio between windows and optionally previous tokens. [WhisperLive](https://github.com/collabora/WhisperLive/blob/main/whisper_live/backend/faster_whisper_backend.py) combines VAD, repeated-hypothesis confirmation and optional initial prompts on a server; its latency and server model sizes do not transfer directly to a browser.

The [Transformers.js realtime Whisper WebGPU example](https://github.com/huggingface/transformers.js-examples/blob/main/realtime-whisper-webgpu/src/worker.js) uses a float encoder and quantized decoder. GPU support requires an adapter, compatible operators and sufficient memory; the presence of `navigator.gpu` alone is insufficient. A single-threaded WASM worker is the no-header fallback. Whisper supports overlapping long-audio chunks; the installed Moonshine pipeline does not use Whisper's timestamp-based chunk merger. Model size and accent coverage can dominate front-end changes.

Technical spelling correction cannot recover missing acoustic evidence. Casing an acronym differs from replacing a person's name with LoRA or adding a term from a question. References must remain independent of corrections. Score raw and corrected hypotheses separately and avoid replacing ordinary words without matching question context.

## Corpus and experimental boundary

The [fixed manifest](../scripts/speech-accuracy/corpus.json) contains 36 human VCTK utterances, three speakers per partition and 18 clips in each. Attribution and license are recorded per clip; VCTK is [CC BY 4.0](https://datashare.ed.ac.uk/handle/10283/3443). The two Indian speakers are separated between tuning and held-out partitions. All references are distinct. The noise and speed conditions are controlled transformations, not recordings of naturally fast speech or real environmental noise. See [corpus preparation and limitations](../scripts/speech-accuracy/README.md).

Five additional **human** FOSDEM excerpts cover XGBoost, RAG, LoRA, embeddings and BM25. They are held out only, bringing the fixed human set to 41 recordings: 18 tuning and 23 held out. The [technical manifest](../scripts/speech-accuracy/human-terms.json) records the video, exact times, captions, attribution and license for each excerpt. The source video-directory footers specify [CC BY 2.0 Belgium](https://video.fosdem.org/2025/ub2252a/); [retained license evidence](../scripts/speech-accuracy/sources/fosdem-license-evidence.json) covers all three directories. The LoRA term was checked independently on the speaker's slide at video time 946 seconds, which reads “Support LoRA adapters”; the published caption spells it “lower”.

The FOSDEM captions contain errors and have not been manually audited. They are used to locate and annotate the five term cases, **not as gold WER references**. A separate ten-clip, two-voice eSpeak diagnostic also contains the terms, with different sentences and voices per partition. It is synthetic and remains separate from the human results. The gated Indian technical-interview dataset and the NPTEL mirror without a declared license were excluded.

All current browser measurements inject digital WAV audio through a Web Audio MediaStream. They are not real-microphone tests, even though the production engine receives a MediaStream. The harness runs without COOP/COEP. No audio is sent to a transcription API.

## CPU and GPU measurement

Both headless and headed Chromium reported no WebGPU adapter, despite a secure context and `navigator.gpu` being present. The [headed capability probe](../scripts/speech-accuracy/gpu-capability.json) records this browser limitation; it does not establish that the laptop lacks GPU hardware. The WebGPU initialization/fallback path is tested separately; no GPU throughput result is claimed.

A calibration discovered that CDP `Emulation.setCPUThrottlingRate` affects the page but not this worker. Sending that command to a worker target returns `Operation is only supported for pages, not workers`. The same 50-million-iteration square-root loop measured 126.7 ms with the page at 1× and 131.3 ms with the page at 4×; the [calibration artifact](../scripts/speech-accuracy/throttle-calibration.json) records both observations. Those values are calibration observations, not ASR timings. A user systemd scope also lacked the CPU controller, so a requested CPU quota could not be verified. The fork-monitoring `cpulimit` wrapper crashed during cleanup (exit 139), so that attempt is excluded. The locked ASR slowdown experiment attaches `cpulimit` directly to the single Chromium renderer PID and gives it a 25% CPU budget. The renderer contains the ASR worker. This duty-cycles processes and is an approximation of a slow CPU, not a phone benchmark. The run records a worker calibration and identifies the CPU limiting method.

## Original frozen implementation and tuning evidence

The Better profile runs Moonshine Tiny live and Whisper Base.en over the complete answer after capture. Fast retains Tiny without the Whisper pass. Low-memory and Data Saver recommendations use Fast; these heuristics are not measured throughput detection. The ASR pipelines are disposed and loaded sequentially. After a final check, the live model is restored before the next microphone acquisition. The benchmark measures ASR; grading and text-to-speech models are outside this measurement.

Pinned model artifacts total 32,079,632 bytes for Tiny and 79,586,556 bytes for Whisper Base.en: 111,666,188 bytes combined, plus the runtime. These are repository artifact sizes, not measured compressed transfer sizes. The page shows aggregate download progress and distinguishes downloading from preparing the model. See [model revisions and artifact metadata](../scripts/speech-accuracy/model-versions.json).

Quiet audio receives bounded gain, capped at 8×, without modifying the original samples or amplifying near-silence. Capture drains for 300 ms before stopping tracks, covering the 256 ms callback interval. Request/session IDs prevent stale messages from completing the wrong operation. Only known audio overlap is deduplicated; a speaker's repeated phrase after a pause is retained. Final-vs-live agreement compares the original live transcript rather than the final transcript with itself.

Whisper uses 30-second chunks with five-second strides for long recordings and timestamp-based merging. A final result shorter than 65% of a live transcript of at least 20 words is rejected in favor of the live text. This is a completeness heuristic, not a confidence estimate. Initialization and inference failures retry through single-thread WASM; final-pass failure preserves live text and shows a warning. Cancellation closes capture and invalidates pending work.

The original choice was selected on the tuning partition before the configuration freeze. The isolated gain, model-choice and timestamp-merging experiments remain in the committed JSON artifacts and freeze hashes; the accuracy tables in this report use held-out audio only.

Question and stalled-fallback playback stop before capture. Focus music pauses during capture and resumes afterward only if it was previously playing. The focused UI protocol test verified that behavior, microphone denial, cancellation during model loading, and no horizontal overflow or console errors in light/dark themes at 375px and 1440px. It uses a stubbed recognizer and Chrome's fake microphone; it does not prove acoustic echo cancellation or recognition accuracy. Its fake track reported 48 kHz while the production AudioContext reported 16 kHz. See [UI observations](../scripts/speech-accuracy/ui-verification.json).

## Held-out results

These tables use only the fresh `evaluation-*` runs after the configuration freeze. The main WER result covers 18 held-out VCTK clips. WER is corpus-weighted edit distance before technical spelling correction. The live snapshot is the visible text at file playback end, so it includes unfinished output and latency effects.

| CPU budget | Profile | Final WER (edits / reference words) | Live snapshot WER | Mean first live output; clips with live text | Finish mean / median |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 100% | Before: Moonshine Base | 16.7% (20/120) | 31.7% | 1.49 s; 18/18 | 0.66 s / 0.68 s |
| 100% | After: Tiny live + Whisper final | 6.7% (8/120) | 20.8% | 1.45 s; 18/18 | 7.17 s / 5.92 s |
| 25% (renderer-wide starvation) | Before: Moonshine Base | 21.7% (26/120) | 65.8% | 1.59 s; 17/18 | 2.29 s / 2.43 s |
| 25% (renderer-wide starvation) | After: Tiny live + Whisper final | 73.3% (88/120) | 99.2% | 2.78 s; 1/18 | 28.22 s / 24.65 s |

First-live-output timing starts at file playback, includes source leading silence, and excludes output first appearing during finalization. Missing live output is reported in the coverage count, not converted to zero latency. This is not word-aligned acoustic latency. Finish timing includes the 300 ms drain in the new profile, queued work, decoding, and any first-use final-model download. These are laptop observations, not device-wide guarantees.

The new profile hit its 90-second final-check deadline on 1/18 clips under the 25% CPU budget. Those clips retain live text and expose a warning. This delay is part of the measured finish time; it is not omitted from the mean or treated as a successful Whisper refinement.

On the normal CPU run, the final transcript changed from **16.7% to 6.7% WER**. The first clip's finish time was 0.62 s before and 26.80 s after; the new profile downloads its final model on first use. 0 of 18 new-profile clips raised a final-pass warning.

### Human technical-term cases

The five FOSDEM excerpts provide one positive case per requested term. The metric counts whether the required term is present as a complete token sequence, accepting the preregistered orthographic variants. It measures term presence across five cases, not precision, every spoken occurrence, or general interview accuracy. Their captions are imperfect, so no gold-reference WER is reported for them.

| Profile | Raw recognized terms | After contextual spelling correction |
| :--- | :--- | :--- |
| before | 3/5 (60%) | 3/5 (60%) |
| after | 3/5 (60%) | 3/5 (60%) |

Both profiles recognized XGBoost, RAG and embeddings in these excerpts; neither recognized LoRA or BM25. Contextual correction did not recover those two cases.

### Long-answer diagnostic

This composite reuses the held-out Indian speaker's six VCTK recordings with two-second pauses. It is not another independent test subject or clip.

| Profile | Final WER | Finish time | Final-pass warnings |
| :--- | :--- | :--- | :--- |
| before | 20.0% | 8.85 s | 0 |
| after | 15.0% | 21.28 s | 0 |

### Synthetic diagnostic, reported separately

Five held-out eSpeak sentences use a different voice and different sentences from the synthetic tuning partition. These are mechanical vocabulary diagnostics, not real-microphone or human-speech accuracy evidence.

| Profile | WER | Required terms present, raw / corrected |
| :--- | :--- | :--- |
| before | 22.5% | 1/5 / 1/5 |
| after | 30.0% | 2/5 / 3/5 |

All ten locked browser/model runs completed with exit code 0, cross-origin isolation disabled, and no non-read HTTP requests observed. The run JSON retains transcripts, live updates, source/captured sample counts, model versions, source hashes, and effective backend labels.

CPU calibration observations (same fixed 500-million-iteration worker loop): before, 100% budget: 1.19 s; after, 100% budget: 1.03 s; before, 25% budget: 3.50 s; after, 25% budget: 3.61 s. The 25% limiter slows the renderer process containing the worker; its duty cycling is not an exact simulation of all mobile hardware.

### Supplemental worker-only CPU contention

The renderer-wide limiter also stopped capture threads: mean playback wall time divided by file duration was 1.063 before and 1.136 after, versus 0.997 and 0.999 without it. It therefore mixes recognition slowdown with capture scheduling disruption. Those unfavorable results remain above. After observing this limitation, a separate hardware condition was preregistered without changing the frozen recognition code, models, corrections or audio. It is a supplemental measurement, not a new held-out configuration search.

The ASR worker and three equal-priority CPU burners share one Linux logical CPU; the other renderer threads exclude that CPU. An independent worker calibration measured 3.60× slowdown. This approximates 4× inference stress while capture remains schedulable; it is not a phone simulation or an exact fourfold clock reduction. The source hashes and commands are in [the supplemental protocol](../scripts/speech-accuracy/worker-throttle-protocol.json).

| Profile | Final WER | Live snapshot WER | First live output; coverage | Mean finish | Worker calibration | Final warnings |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| before | 15.8% (19/120) | 74.2% | 1.90 s; 16/18 | 3.92 s | 4.93 s | 0 |
| after | 6.7% (8/120) | 56.7% | 1.72 s; 18/18 | 22.08 s | 4.69 s | 0 |

Both supplemental browser runs exited 0. Per-run worker affinities, priorities and calibration timings are retained beside the run JSON. These runs use the same digital-injection limitations as the main table.

The exact numeric summary and hashes are in [the evaluation summary](../scripts/speech-accuracy/evaluation-summary.json). Parity with ChatGPT or Claude remains unmeasured.

## Reproduction commands

The original frozen commands below require commit `00f62fcc` in a separate checkout; current runtime files intentionally differ. Use the follow-up commands above for the merged implementation. The committed WAVs and manifests are canonical. Preparation scripts refuse to overwrite a frozen evaluation. To build another corpus version, preserve this directory and its held-out results, then create a new version before tuning.

```bash
# Inspect the frozen inputs and model/version/source hashes.
node scripts/speech-accuracy/verify-assets.mjs
cat scripts/speech-accuracy/frozen-corpus.json

# Recheck page-only versus worker CPU throttling; no ASR model is loaded.
node scripts/speech-accuracy/calibrate-throttle.mjs

# Install cpulimit normally, or extract the Ubuntu package without installing it.
mkdir -p /tmp/stt-cpulimit
cd /tmp/stt-cpulimit
apt download cpulimit
dpkg-deb -x cpulimit*.deb extracted
cd -

# One browser and one ASR transcriber at a time; logs free memory before every run.
# Completed locked files are retained rather than overwritten.
STT_CPULIMIT=/tmp/stt-cpulimit/extracted/usr/bin/cpulimit \
  node scripts/speech-accuracy/evaluate-heldout.mjs
node scripts/speech-accuracy/report.mjs

# Supplemental worker-only approximate 4x stress (Linux taskset + C compiler).
mkdir -p /tmp/stt-thread-throttle
cc -O2 scripts/speech-accuracy/cpu-burn.c -o /tmp/stt-thread-throttle/burn
# Match the Chromium worker's nice 5; this only lowers the launcher's priority.
python3 -c 'import os; os.setpriority(os.PRIO_PROCESS, 0, 5); os.execvp("node", ["node", "scripts/speech-accuracy/calibrate-worker-throttle.mjs"])'
python3 -c 'import os; os.setpriority(os.PRIO_PROCESS, 0, 5); os.execvp("node", ["node", "scripts/speech-accuracy/evaluate-worker-throttled.mjs"])'
node scripts/speech-accuracy/report.mjs

# Probe the headed browser adapter without an ASR model.
node scripts/speech-accuracy/probe-gpu.mjs

# UI protocol stubs + Chrome fake microphone, not ASR accuracy or a physical mic.
node scripts/speech-accuracy/verify-ui.mjs

npm run check:tracker
npm run typecheck
npm run check:links
npm run check:mdx
npx vitest run --maxWorkers=1
```

The evaluation command invokes historical code with `--revision=3f1ec1b581cdc02992fb08297457b90a81be9133 --profile=better`, and current code with `--profile=better --prepare=normalize --drain=300`. Both use the same pinned model artifacts, browser and fixed audio. Human VCTK runs use `--cpuLimit=25 --cpulimit=...` for the CPU-limited condition. The other held-out datasets use `--corpus=human-terms`, `--corpus=terms` and `--corpus=sequence` at the normal CPU budget. Full commands and filenames are encoded in [the locked runner](../scripts/speech-accuracy/evaluate-heldout.mjs).

The independent tuning ablations are retained as `base-tune-batch.json`, `gain-tune-batch.json`, `whisper-tune-wasm.json`, `whisper-gain-tune.json`, `hybrid-tune.json` and the sequence comparisons. They compare gain with the same model, model choice with the same audio preparation, and timestamp settings with the same long recording. They are not included in the held-out tables. Capture draining, request races, overlap/repetition handling, GPU failure recovery and cancellation have unit tests. No model configuration was changed using held-out hypotheses.

Build, pagefind and the full Playwright suite were omitted under the brief's explicit 8 GB memory rule. Production bundle, prerender and deployment checks remain for the maintainer's shipping workflow. No push or deployment was performed.

## What still requires the owner's microphone

Record consented, spontaneously spoken technical answers in Indian English, with natural hesitations and fast passages. Include all five requested terms and ordinary-word controls such as a person named Laura. Compare a headset with built-in laptop speakers, quiet speech with fan noise, and speech starting immediately after the question. Inspect actual track settings, clipped peaks, final-word retention, transcript lag and cancellation while a model is loading. Browser and OS audio processing, room echo, microphone distance and physical sample-rate conversion cannot be validated with injected WAVs.

The held-out split is held out from this configuration search; it does not establish whether a pretrained model previously encountered VCTK. Natural fast speech, real background interference, silence-only hallucination rates, Bluetooth devices and long spontaneous answers need a broader manually transcribed corpus. The FOSDEM term cases are small positive examples, not a precision study or a full technical-answer benchmark. These results support the measured browser trade-off, not a promise of server-model equivalence.
