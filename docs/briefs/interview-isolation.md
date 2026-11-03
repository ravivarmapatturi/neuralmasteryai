# Brief: run Moonshine on GitHub Pages without harming the site

Branch interview-speech-test; a local dev server is running on port 5199, so don't kill it and use a different port. Do not push or deploy. Keep RAM use low; no full builds unless needed.

Moonshine scored best (13.8% WER on one fake-audio clip, 450 ms lag, 61.6 MB) but its WASM package reportedly needs SharedArrayBuffer, and GitHub Pages can't set COOP/COEP. Your doc lists options without testing them.

Test these and report what actually works:
1. Serve dist/ on a local static server with NO COOP/COEP headers, to match production. Confirm what happens today to Moonshine.
2. Check whether onnxruntime-web can run the Moonshine models single-threaded without SharedArrayBuffer (numThreads = 1) instead of @moonshine-ai/moonshine-wasm. Measure lag and WER on the same audio. This is the preferred route.
3. If not, prototype coi-serviceworker with COEP credentialless, activated only for the interview route so the rest of the site is untouched. Verify that /interview gets crossOriginIsolated, that other routes don't, and that a Practice page with Pyodide, images and fonts still works. Note the reload it causes, and Safari behaviour from primary sources.
4. Measure on Chrome with CPU throttled 4x as a rough stand-in for a low-end phone, labelled as a simulation.
5. Where should model files be hosted? Check the Hugging Face CDN or a similar route with CORS, rather than the 83 MB in public/ per deploy. Moonshine's 61.6 MB: where does it load from today?

Commit, and write findings into docs/interview-speech-test.md. Paste measured numbers in your report. Do not claim anything you did not run.
