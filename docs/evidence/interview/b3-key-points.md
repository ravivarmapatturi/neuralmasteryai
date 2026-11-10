# B3 key-point coverage — 10 November 2026

Added 200 hand-authored rubrics containing 800 points. Each question has four short, checkable points drawn from its own model answer. Coverage increased from 79 to 279 of 917 questions (30.4%). All 79 existing rubrics are preserved. No answer text, question IDs or other question metadata changed.

The selection covers all 140 senior-bank questions without a rubric, including this week's gaps and all 30 Debug this questions, plus 60 system-design and RAG questions. The additions comprise 36 RAG, 33 system design, 30 debugging, 20 coding, 15 agents, 14 inference serving, 10 distributed training, 8 production MLOps, 8 cost/capacity, 7 safety/governance, 5 quantization, 5 evaluation, 5 voice/multimodal and 4 multi-agent questions. This is an editorial selection for senior preparation, not a measured ranking of interview frequency.

## Persistence and answer integrity

`src/data/interviewKeyPoints.json` stores points by stable practice question ID. `build_practice_data.py` applies them after collecting source questions, validates their shape, rejects unknown IDs and refuses to overwrite source rubrics. Neither source-bank answers nor the evaluator changed. Both practice-data regeneration and `npm run generate:interviews` preserve the points. A second practice regeneration was byte-for-byte identical.

`b3-integrity.json` records the comparison against merged baseline `9fcc2846`. `python3 scripts/interview/verify-key-points.py` checks all 917 questions, all 200 overrides, all 79 preserved rubrics, the recorded sample excerpts and unchanged held-out scorer inputs. The SHA-256 of sorted ID/answer pairs is `0f6b7dd2f28114d6e972d7e685a990b236c06ddd97ac21f34c4cd8ceaa681f27` both before and after.

## Manual support sample

`b3-support-sample.json` records 30 questions spanning the selected topics and all 120 points on those questions. Codex read each sampled point against its own complete model answer: **120 supported, 0 unsupported**. Exact answer excerpts are retained for review, using the full answer where several sentences support one point. This is an agent-authored manual reading, not independent human review or independent verification of technical claims in the original answers. All 800 new points were authored while reading their source answers; the retained audit covers 120 of them. The verifier confirms excerpt integrity; it does not automate semantic entailment.

## Held-out judge comparison

The existing frozen `judge-v2-heldout.json` includes 30 rubric answers and six reference-answer cases. The actual browser WASM baseline judge scored all **30/30 checklist cases** and three reference-answer cases. The remaining three reference-answer cases could not finish under the unchanged 2 GiB host-memory floor. No fabricated or reused predictions fill those gaps.

| Checklist measure | Saved baseline | New measured run |
| --- | ---: | ---: |
| Held-out answers | 30 | 30 |
| Point decisions | 135 | 135 |
| Detected points | 26 | 26 |
| Correct detections | 23 | 23 |
| False positives | 3 | 3 |
| True negatives | 66 | 66 |
| False negatives | 43 | 43 |

All 135 checklist verdicts match the baseline. The 69 manually marked absent points produced three false positives in each run. Across all 33 completed cases, there were 35 detections, including four false positives, in both runs; all 150 verdicts match. The raw partial run is `b3-judge-heldout.json`, and computed counts are in `b3-judge-comparison.json`. The held-out inputs did not overlap the new rubrics, so this checks evaluator regression on existing cases; it does **not** establish accuracy on the 200 new rubrics. The low recall remains a limitation.

The run used the existing `evaluate-judge-v2.mjs baseline heldout` harness against the pinned local model mirror, under `scripts/speech-accuracy/with-memory-floor.mjs`. It used real q8 MiniLM embeddings and MobileBERT MNLI, not inference doubles. The compiled bundle hash differs from the historical run; scorer source, worker source and model manifest match `9fcc2846` byte-for-byte. No inference-performance comparison is claimed. The initial run saved 33 cases before the session interruption. Normal and single-process browser resume attempts subsequently stopped at the memory floor without adding predictions. The final attempt additionally limited the browser JS heap to 128 MiB and set MALLOC_ARENA_MAX=2; it stopped at 2030 MiB available. The smaller browser attempt did not change the scorer, models or thresholds.

## Verification and limits

| Check | Observed result |
| --- | --- |
| Fetch and merge origin/main | Fast-forward to `9fcc2846` |
| Question and answer integrity | 917 before/after; zero answer or other question metadata changes |
| Practice regeneration | Byte-for-byte stable; overrides retained after catalog export |
| Criteria check | 259/259; zero problems |
| Internal links and anchors | Passed |
| MDX compilation | 2003 files; zero failures |
| Focused rubric and InterviewPage tests | 12/12 passed |
| Banned-phrase scan of new points | Zero hits |
| Full typecheck | Stopped at 2040 MiB by the 2 GiB guard; not passed |
| Full Vitest, one worker | Attempts stopped at 2043 and 2003 MiB by the 2 GiB guard; not passed |
| Production build | Not started; available memory below the required 5 GB |
| UI manual answer exercise | Not performed; existing InterviewPage tests passed, no UI code changed |

The four-layer ship gate remains blocked by memory. These commits are for review, not deployment sign-off. All started model servers and browsers were stopped. No push; MockInterviewPage.tsx and timedMock files were untouched. The unrelated untracked judge brief was preserved.

Batch 1: `14680ee1`, 100 new rubrics, coverage 179/917. Batch 2: `32f0dba8`, the other 100, coverage 279/917, and this audit evidence. Files were staged by name.
