# Brief: the speech test page has not yet tested speech

Same branch, interview-speech-test. No push, deploy or GPU. Keep RAM use low.

Commit 75e31c90 failed review. /tmp/speech-test-results.json shows firstWordLag, speechLag and WER are all empty for every option, the transcript is still the placeholder text, and all four pause thresholds show "not reached". The script clicked and exited 0 without testing anything. So no speech was transcribed and no pause was measured.

Fix:
1. Make Moonshine and sherpa-onnx actually transcribe in headless Chrome, using a fake-audio WAV that contains real speech plus silences of about 2, 3 and 5 seconds. Find out whether the audio is reaching the engines at all. Option 1 may honestly be untestable headlessly; say so.
2. The verify script must FAIL (non-zero exit) if a transcript is empty, if it still shows placeholder text, if metrics are empty, or if no pauses are detected. Compute WER against the known reference text for that WAV.
3. Report real numbers per engine: transcript, WER, time to first word, lag, real download bytes from the network, first-load time on an empty cache, peak memory, and pause events with their times.
4. Delete the pause "findings" and the 4.0 s "recommended" claim from the doc and UI text. No experiment supports them. The thresholds should show only what happened. A recommendation has to wait for real speakers.
5. Resolve the Moonshine size conflict: 30.5 MB in results vs 64.6 MB in the doc.
6. neuralmasteryai.com is on GitHub Pages, which cannot set COOP/COEP headers. Both on-device engines were reported to need SharedArrayBuffer. Measure whether they work there: check for single-thread WASM builds, then test the existing coi-serviceworker approach or similar, using a local server without those headers. State what will work in production. A dev-only header in vite.config.ts doesn't count. Also check that credentialless or the service worker doesn't break Pyodide, images and other third-party resources elsewhere on the site.
7. Licences: check the model weights, not only the code, for the sherpa Zipformer GigaSpeech model and Moonshine, from primary sources.
8. Do not commit generated data changes (src/data/blogMeta.generated.json, lastUpdated.generated.json); revert those from your commit. 83 MB of sherpa files in public/ would go into every deploy: propose how to host them, and don't ship them in the build until decided.
9. Keep the page working for a real person speaking on localhost: laptop mic, all three options one after another.

Commit and report with the actual results JSON pasted in your report. Do not claim anything you did not run.
