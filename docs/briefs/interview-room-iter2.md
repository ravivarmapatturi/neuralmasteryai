# Brief: Interview Room iteration 2

Branch interview-speech-test, rebased on origin/main. No push; I ship. Commands in timeouts.

Version 1 is going live. Improve in this order, one commit each:
1. Load all 20 questions and the 5 transitions from ../../vaayuedge-model/docs/evidence/interview-content/questions.json into src/data/interviewRoomQuestions.json. Check every next_practice route exists. The session picks 4 questions, or 2 for the short length, varied between sessions.
2. Debrief wording. Today it reads: "We did not hear evidence for: pretrained at scale on massive; acts as a shared base...". Rewrite to natural prose matching the mock-up (docs/interview-room-reference.html): use a short human label for each point, no truncated claims, no semicolons lists, one or two sentences. Do not mark down a true statement merely for being outside the rubric: if a learner gives a sensible trade-off, the row should show it. The next-token test answer contains "XGBoost much cheaper for tabular data" yet Trade-offs says "Not heard yet": fix that.
3. Session debrief across questions, with one overall call, plus per-question detail. Keep the same look.
4. Real-speech verify on 2 more questions with spoken WAVs, WER under 25%. Same gates: typecheck, links, vitest, build, 375px.

Commit and paste real debrief text. Do not claim anything you did not run.

## Added after this brief (same branch, separate commits, after items 1-4)
5. Pre-recorded interviewer audio: ../../interview-voice-audio with a manifest from the voice task, once it exists. Serve as static files, lazy-loaded per clip, and use them in place of browser speech. Browser voice is only a last-resort fallback. The user called the browser voice "like a ghost". Follow-ups must be the fixed recorded text; do not speak dynamic quotes.
6. Quality setting on the setup screen, same design: Fast (default), Better accuracy, Best feedback, with real download sizes. Device check using navigator.gpu and deviceMemory recommends one, warns before large downloads, and drops down a level on failure. Only ship an option once measured better: Better accuracy needs a real WER comparison against Moonshine on your speech WAVs; Best feedback is hidden until the LLM test below passes.
7. Borrow from activated-intelligence/voice-chat (MIT, keep attribution): Silero VAD end-of-speech and live waveform on the listening screen, hands-free call feel. Read its code first; no new default downloads above 5 MB.
8. Fix: /interview/room returns HTTP 404 status from static hosting; prerender it so the status is 200 and it's in the sitemap. Remove /lab/ routes from production build.
9. LLM debrief test, offline only, no UI: run a Qwen 1.5B class model (use the repo's WebLLM model) in headless Chrome if WebGPU allows, or via CPU GGUF with the same model otherwise, on 40 rows from ../../vaayuedge-model/docs/evidence/interview-judge/gold.jsonl plus the foundation-model next-token answer, using a rubric-grounded JSON prompt. Report agreement with labels against the current judge, invented claims count, latency, RAM. State a recommendation. Say if the machine could not run it.
Check free -g before anything heavy; one heavy job at a time.

## Added: live Whisper test (do before item 6)
User's real mic result: Moonshine single-thread is the only option showing live words for them, but it mishears some words. VaayuEdge already uses onnx-community/whisper-base.en. Test it and whisper-tiny.en inside the same live segment pipeline (commit finished phrases, re-read only the current one), with no special headers. Measure on the same WAVs against Moonshine: WER, technical term accuracy, lag, revisions, download, with WebGPU and WASM, normal and 4x throttled CPU. Add both as options on /lab/speech-test so the user can try them. Then decide "Better accuracy" from the data: live Whisper where it keeps up, otherwise Moonshine live plus a Whisper pass on the full audio after each answer. Share model loading code with the existing worker rather than duplicating it.

Also test onnx-community/moonshine-base-ONNX (INT8) in the same live test as the Whisper models, and add it to /lab/speech-test. It may give better accuracy in the same family. Note activated-intelligence/voice-chat is not word-by-word live: it transcribes after 1 s of silence, using whisper-base fp32 and 262 MB Supertonic on WebGPU. Take its Silero VAD and waveform only.
