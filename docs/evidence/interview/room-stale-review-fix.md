# Interview-room stale-review regression — 10 November 2026

The failure on `f9898ccf` was a test assumption about the scoring path. At `3b261bd1`, the evaluation topic's second question, `genai-eval-rag-triad-hallucination`, had no key points and used reference scoring. At `f9898ccf`, it has four points and uses rubric scoring. `judgeAnswer` performs two NLI batches; `judgeKeyPoints` performs one. Waiting for exactly two calls therefore timed out despite correct product behavior.

The next question, `genai-hallucination-mitigation`, also gained a rubric. Submitting its empty answer now produces its own local all-missed checklist. The old expectation of no checklist at all was another reference-only assumption.

The test now waits until the delayed NLI reply actually crosses the worker boundary, drains promise and React work through animation frames, then asserts the current question's exact checklist and verdicts. Before and after releasing the old result, an empty rubric answer must contain only its own `Not detected` points; a reference-only answer must still have no checklist. Loading and failure states must be absent, the current transcript must remain empty and the current model answer must remain intact. The existing assertion that every microphone track ends on navigation is preserved.

The product already increments `reviewRef` on navigation and checks that generation before setting review results or errors. No product, CSS or layout change was needed. Old attempts may finish saving to their own history; they cannot replace the active question's review.

## Observed verification

- Targeted reported case: passed, 1/1, 7.4 seconds including setup.
- Corrected full-spec retry: 19 tests passed, including the reported case (4.8 seconds), with no test failures before the guard stopped the command at 2,045 MiB available. It did not complete all 44 tests.
- Fresh sequential shards also hit the floor: first at 2,047 MiB, then at 1,968 MiB with a stricter 350 MiB RAM target, a 768 MiB Node heap and a 128 MiB browser JS heap. Neither run is counted as a full-spec pass.
- Initial full-spec attempt reached the corrected synchronization and exposed the stale no-checklist assertion. It also had browser-closed errors and was stopped by the unchanged 2 GiB host floor at 2,018 MiB. No failures were suppressed.
- Runs use Chromium with inference-worker doubles, no model downloads, one worker, a separate Vite server on port 5189, MemoryHigh=500 MiB, MemoryMax=1,800 MiB, MemorySwapMax=6 GiB and the unchanged 2 GiB host floor.
- A temporary local Playwright configuration selects port 5189 so the other worktree's server on 5173 is left alone. It is not committed.

No push. The key-point batch remains separate from this test fix.

The session initially passed typecheck, links and focused unit tests (12/12). The post-fix typecheck retry stopped at 2,023 MiB; links passed again. Full Vitest attempts are memory-blocked, and the build is deferred below the required 5 GB available RAM. The full ship gate is not passed.
