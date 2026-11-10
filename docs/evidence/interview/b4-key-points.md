# B4 key-point coverage — 10 November 2026

Added 200 hand-authored rubrics with four short, answer-grounded points each: 800 new points. Coverage increases from 279 to 479 of 917 questions, or 52.2 percent. All 279 existing rubrics are preserved. The 917 question IDs, answers and other question fields are unchanged. This is an editorial selection for senior AI engineering preparation, not a measured ranking of hiring frequency.

| Topic | New rubrics |
| --- | ---: |
| Evaluation | 38 |
| Agents | 36 |
| Inference serving | 35 |
| GPU memory and quantization | 20 |
| Prompting and structured output | 22 |
| Production MLOps | 29 |
| Safety | 20 |
| Total | 200 |

The frozen held-out questions were excluded from the selection, including the evaluation question that uses reference-answer scoring. No evaluator, source answer, frozen example, threshold or model manifest changed.

## Answer integrity and persistence

The points live in `src/data/interviewKeyPoints.json` and are applied by the existing practice-data builder. The first review commit adds 100 rubrics; the second adds 100 more. `scripts/interview/verify-key-points.py` now accepts a baseline, batch name and expected batch size; its defaults audit B4 against merged baseline `3b261bd1`. It compares every question field, preserves prior rubrics and checks all support excerpts and held-out inputs.

`b4-integrity.json` records 917 unchanged answers, 279 preserved rubrics, 200 additions and 800 new points. The SHA-256 of sorted ID/answer pairs remains `0f6b7dd2f28114d6e972d7e685a990b236c06ddd97ac21f34c4cd8ceaa681f27`. Catalog export followed by practice regeneration preserves every point. A second practice regeneration is byte-for-byte identical. The banned-phrase scan found zero hits in the 800 new points.

## Support sample

`b4-support-sample.json` retains 30 questions spanning all seven selected topics. Codex read all four points for each sampled question against its complete model answer: 120 supported, zero unsupported. The full exact answer is retained as the support excerpt for each check. This records agent-authored manual review, not independent human review or independent validation of the answers' technical claims. The integrity script checks excerpt provenance and point identity; it does not infer semantic support.

## Held-out judge comparison

A fresh browser WASM run completed all 36 frozen answers with the existing q8 MiniLM embeddings and MobileBERT MNLI models. Its 162 point verdicts exactly match the saved baseline. The 30 rubric-based answers alone also match on all 135 verdicts.

| Measure | Saved baseline | Fresh run |
| --- | ---: | ---: |
| Answers | 36 | 36 |
| Point decisions | 162 | 162 |
| True positives | 36 | 36 |
| False positives | 4 | 4 |
| True negatives | 78 | 78 |
| False negatives | 44 | 44 |

On the 30 rubric-only answers, the counts are 23 true positives, three false positives, 66 true negatives and 43 false negatives in both runs. The unchanged recall remains a limitation. This is a regression comparison on unchanged questions, not an accuracy study of the 200 additions. The sample has been used in previous runs and is not a newly untouched holdout.

Raw predictions are in `b4-judge-heldout.json`; computed counts are in `b4-judge-comparison.json`. Scorer source, worker source and the pinned model manifest match `3b261bd1` byte-for-byte. The compiled worker hash differs from the historical baseline. Recompiling the current worker reproduced the measured worker hash exactly. No performance comparison is claimed.

The first attempt used Vite before it was ready and produced a worker-loading error with zero predictions. The successful attempt served both the harness worker and models directly from the existing pinned local mirror, avoiding the extra dev server. Its recorded first failed attempt and subsequent successful attempt remain in the raw report. No earlier predictions filled missing rows.

Reproduction uses a fresh output directory containing copies of `judge-v2-heldout.json`, `judge-v2-ground-truth.json`, `judge-v2-model-manifest.json` and `judge-v2-thresholds.json`, and the prepared pinned local model cache:

```bash
node scripts/interview/judge-v2-models.mjs compile
node scripts/interview/judge-v2-models.mjs serve
# In a second terminal; stop the mirror after the run:
RUBRIC_BASE_URL=http://127.0.0.1:5188 JUDGE_V2_DIR=/tmp/b4-judge \
  node scripts/speech-accuracy/with-memory-floor.mjs \
  node scripts/interview/evaluate-judge-v2.mjs baseline heldout
python3 scripts/interview/verify-key-points.py
```

## Verification and limits

| Check | Observed result |
| --- | --- |
| Fetch and merge | Fast-forwarded to origin/main `3b261bd1` |
| Tracker, criteria and internal links | Passed; 259/259 criteria, zero link problems |
| MDX compilation | 2003 files, zero failures |
| Focused key-point, InterviewPage and mock-page tests | 19/19 passed |
| Question integrity and regeneration | Passed, including unchanged held-out inputs |
| Held-out browser inference | 36/36 completed; all 162 verdicts match baseline |
| Sitemap and route encoding | Mock plus 917 unique question URLs verified |
| Full typecheck | Stopped at 2027 MiB by memory guard; a 512 MiB heap attempt exited 134 with heap exhaustion |
| Full Vitest, one worker | Attempts stopped at 1949 and 2027 MiB by memory guard |
| Production build and prerender | Not started; available RAM below required 5 GB |
| Manual browser metadata/theme review | Initial server-readiness failure; retry stopped at 1996 MiB by memory guard before capture |
| Manual answer exercise | Not performed; focused interview tests passed |

The four-layer ship gate is blocked by memory. These commits are reviewable source changes, not deployment sign-off. The HTTP audit and static routing changes are documented separately in `b4-static-routes.md`. No CSS or component layout was edited. All servers and browsers started for these checks were stopped. No push; the unrelated untracked judge brief was preserved.
