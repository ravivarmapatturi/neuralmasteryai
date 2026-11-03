# Brief: put single-threaded Moonshine in the test page, and test the interviewer's voice

Branch interview-speech-test. No push, deploy or GPU. Keep RAM low. A static server for the user's test runs from a separate copy on port 5199; leave it alone and use another port.

Your report gave strong results for onnx-community/moonshine-tiny-ONNX through transformers.js (28 MB, no SharedArrayBuffer, 6.9% WER, 0.34x real time at 4x throttle), but only the doc was committed, so no one can reproduce them. Fix that:

1. Commit the benchmark scripts and the audio's source and reference text that produced those numbers. Re-run them and paste the output.
2. Add a fourth option to /lab/speech-test: "Moonshine Tiny, single-threaded". It must feel live: use growing audio windows, show partial words as you speak, and keep settled text from changing much. Run it in a Web Worker so the page doesn't stutter. Report the real update interval and how often earlier words change.
3. Make it work on a local static server with NO COOP/COEP headers, and remove the service worker from the plan unless this fails. Fix `vite dev`, which currently crashes on the top-level await in the Moonshine package, since this blocks everyone.
4. Add a test of the interviewer's voice at /lab/voice-test: compare the browser's built-in voice, Piper en_US-lessac-medium, and Kokoro-82M for one fixed question, on a server with no special headers. For each: download bytes from the network, time until audio starts, real-time factor on normal and 4x throttled CPU, licence from primary sources including the Piper voice data licence, and an audio player so a person can compare them. Check for an Indian English voice under a usable licence and report what you find. Don't load a model until it's chosen.
5. Keep the 375px no-overflow check, noindex, and tests for anything new. The verify script must fail on empty results.

Commit and paste results. Do not claim anything you did not run.
