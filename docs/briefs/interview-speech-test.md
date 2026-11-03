# Brief: live speech and end-of-answer test page

Read AGENTS.md first, if present. Work only in this worktree, branch interview-speech-test. Do not push, deploy, or start GPU jobs. This laptop has 8 GB RAM: one heavy command at a time, and use NODE_OPTIONS=--max-old-space-size=4096 for builds. Do not touch ../platform-vite-figs.

## Goal
Neural Mastery is getting a spoken mock interview: the interviewer speaks, the learner answers aloud, words appear live, and the interviewer continues after the learner finishes. The user approved this mock-up: https://claude.ai/artifact/QRE9ijF9pMsrr7xDaQ4Ce6
We have no real browser numbers for live transcription. Build a test page to get them. This is a test tool, not the product page.

## Build
A route /lab/speech-test, not linked from navigation and marked noindex, that lets a person compare these on the same spoken answer:
1. Browser speech recognition with interimResults on.
2. Moonshine streaming tiny, on device. Check the current official browser path first (moonshine-ai/moonshine repo).
3. sherpa-onnx WebAssembly streaming English model. Use the smallest suitable model.
Reuse existing open-source demos and packages. If one option can't run in a browser, record exactly why and continue with the others. Models load only when that option is chosen.

Show live for each: partial text, time from speech to first word, lag behind speech, download bytes, load time, peak JS heap where available, device (WebGPU or WASM), and browser.

## End-of-answer detection
Add voice activity detection (Silero VAD via an existing web package, or the simplest reliable option). Show when it would have ended the answer at pause settings of 1.5, 2.5, 4 and 6 seconds, without actually stopping. The goal is to learn which length doesn't cut in on someone thinking.

## Test script
On screen, include one fixed paragraph to read for accuracy, computing WER against it, and one free-answer prompt: "What is a foundation model, and how is it different from a regular ML model?" Results stay in the browser, with a Copy results button that produces JSON. No audio or text leaves the device for options 2 and 3. Say on screen that option 1 may send audio to the browser's speech service.

## Must work
Chrome on desktop and Chrome on Android at phone width, with no horizontal overflow at 375px. A clear message if the microphone is blocked or a model fails.

## Done means
- Existing tests and `vite build` pass; add tests for WER and the pause logic.
- Run it yourself with a fake audio device (Chrome --use-fake-device-for-media-stream --use-file-for-fake-audio-capture with a real speech WAV) and report measured numbers for each option. State plainly that these are not a real microphone test.
- Write docs/interview-speech-test.md with what you measured, what you could not, licences from primary sources, and download sizes.
- Commit your files on the branch and report back. Do not claim anything you did not run.
