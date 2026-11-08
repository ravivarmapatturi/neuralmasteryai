# Brief: make browser speech recognition on /interview much more accurate

The owner says live speech-to-text mishears too much and wants it to work properly, like voice input in ChatGPT or Claude. Those products mostly run large models on servers. Ours must run in the browser with no server and no paid API. Find how close we can honestly get.

Code: src/lib/speechTest/engines.ts, src/workers/moonshineSingleThreadWorker.ts, src/lib/interviewRoom/qualitySettings.ts, src/components/interview/SimpleInterviewPage.tsx (startAnswering, finishAnswer), correctInterviewTerms in src/lib/interviewRoom/dialogue.ts. Earlier results: docs/speech-models-benchmark.md, scripts/benchmark-live-speech-models.mjs. Do not restyle the page; another agent owns the UI.

Do this in order:
1. Research what actually limits accuracy here. Look at audio capture settings (echoCancellation, noiseSuppression, autoGainControl, 16 kHz resampling quality), VAD and segment boundaries where words get lost, chunk overlap and stitching, the interviewer voice leaking into the mic, model choice, and hints or post-correction for technical terms. Check how open-source browser projects do it (transformers.js Whisper WebGPU demos, moonshine-web, WhisperLive, whisper.cpp stream).
2. Build a fixed test set of at least 30 real speech clips, including Indian-accented English, fast speech, background noise and technical terms (XGBoost, RAG, LoRA, embeddings, BM25). Use openly licensed audio and record the source of each. Split it: tune on one part, report on a held-out part only. Do not use the same synthetic voice for everything.
3. Measure the current system first: WER, technical-term accuracy and live lag. Then test each change one at a time, including Whisper base.en or small.en on WebGPU with WASM fallback, and a final Whisper pass over the full recording after speech ends. Measure a 4x CPU throttle too.
4. Ship the best combination in the code. It must still work without COOP/COEP headers on GitHub Pages, fall back safely, and have a sensible first-load download size with progress shown.

Write docs/speech-accuracy-results.md with a before and after table and exact commands. Never tune on held-out audio. Fake-microphone tests are not real-microphone tests; say which is which, and list what still needs the owner's real mic.

Follow AGENTS.md. 8 GB laptop: do not run npm run build, pagefind or full Playwright; run one model at a time, check `free -g`, another agent is running too. Commit in small steps on this branch. Do NOT push; I review and ship.
