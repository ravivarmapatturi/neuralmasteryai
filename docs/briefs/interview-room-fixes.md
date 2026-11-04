# Brief: Interview Room release blockers

Branch interview-speech-test. No push or deploy; I review and ship. Commands in timeouts; never wait beyond 5 minutes.

Commit 1cd8631f failed review on these points:
1. public/sherpa-onnx (83 MB) is still shipped, dist is 182 MB. Remove from public/ everything the room doesn't use (sherpa, multi-threaded Moonshine) and any lab option depending on it, plus the package from package.json if unused. Keep the lab pages working with what remains, or remove them from production routes. Report dist size against origin/main.
2. Overall summary text is a fixed sentence ("You reasoned well through parts of the design...") that can be false. Build every sentence from what actually happened: name the points covered and not heard, and only praise evidence that exists. Nothing may be claimed without a matching quote or a point result. "Call" labels stay but must have one clear, tested rule. Signal rows without evidence say so.
3. Prove the full flow with real speech: a fake-audio WAV of a spoken answer through Chrome's fake device, through real Moonshine, final pass, real MiniLM and NLI judge, real follow-up selection, to debrief. No typed or stubbed transcript. The test must fail on an empty transcript. Paste the actual transcript, follow-ups chosen and full debrief text for: a strong answer, a weak answer, and the foundation-model next-token answer.
4. Check on a static server of dist/ with no special headers: no main-bundle growth (report the numbers), no model requests on other routes, network log showing no answer text or audio leaves the browser (only model downloads), mic and synthesis stop on leaving, and typed fallback when the mic is denied.
5. Remove the lang en-IN edit only if unused; the room must pick an available en-IN voice then any English, and work if none exists.

Commit and paste results. Do not claim anything you did not run.
