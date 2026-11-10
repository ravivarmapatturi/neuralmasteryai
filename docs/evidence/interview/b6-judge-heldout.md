# B6 Held-Out Judge Verification — 10 November 2026

Detections did not fall and false positives did not rise: the held-out check reproduced the baseline exactly with 23 correct detections and 3 false positives across the 30 rubric answers.

All 36 held-out answers and 162 point decisions were scored to completion in a single run using the pinned browser WASM runtime (q8 MiniLM-L6-v2 embeddings + MobileBERT MNLI cross-encoder). Every single point decision matches the frozen historical baseline.

## Rubric-Only Comparison (30 Answers)

| Metric | Saved baseline | Fresh run (B6) | Difference |
| :--- | ---: | ---: | ---: |
| Rubric answers | 30 | 30 | 0 |
| Point decisions | 135 | 135 | 0 |
| Correct detections (true positives) | 23 | 23 | 0 |
| False positives | 3 | 3 | 0 |
| True negatives | 66 | 66 | 0 |
| False negatives | 43 | 43 | 0 |

## Overall Comparison (All 36 Answers)

| Metric | Saved baseline | Fresh run (B6) | Difference |
| :--- | ---: | ---: | ---: |
| Total answers | 36 | 36 | 0 |
| Point decisions | 162 | 162 | 0 |
| Correct detections (true positives) | 36 | 36 | 0 |
| False positives | 4 | 4 | 0 |
| True negatives | 78 | 78 | 0 |
| False negatives | 44 | 44 | 0 |

All 162 of 162 point verdicts match the baseline (`allVerdictsMatch: true`).

## Execution Procedure & Environment

Followed the procedure documented in `docs/evidence/interview/b5-key-points.md` (lines 55–70) per `docs/briefs/judge-heldout-run.md`:
1. Compiled the experiment worker: `node scripts/interview/judge-v2-models.mjs compile`.
2. Started the static local model mirror: `node scripts/interview/judge-v2-models.mjs serve` on port 5188.
3. Copied the four frozen input files (`judge-v2-heldout.json`, `judge-v2-ground-truth.json`, `judge-v2-model-manifest.json`, `judge-v2-thresholds.json`) into an empty directory (`/tmp/b6-judge`).
4. Executed evaluation under the host memory guard:
   ```bash
   RUBRIC_BASE_URL=http://127.0.0.1:5188 JUDGE_V2_DIR=/tmp/b6-judge \
     node scripts/speech-accuracy/with-memory-floor.mjs \
     node scripts/interview/evaluate-judge-v2.mjs baseline heldout
   ```
5. Terminated all server and browser processes immediately after completion. Verified port 5188 is closed and no background processes remain.

## Run Telemetry

- **Status**: Complete (`status: "complete"`, exit code 0).
- **Runtime**: Model loaded in 3,091 ms; all 36 answers scored in 16,371 ms (~455 ms average per answer).
- **Memory**: Minimum available RAM during execution was 2,549.06 MiB (maintained safely above the 2,048 MiB guard floor).
- **Peak Resource Usage**:
  - Peak browser RSS: 831.2 MiB (871,604,224 bytes)
  - Peak browser PSS: 599.9 MiB (628,993,024 bytes)
  - Peak harness RSS: 155.8 MiB (163,336,192 bytes)
- **Input Integrity**:
  - Sample SHA-256: `b2ddafc07e8f95dca1d6ddcd94044b644eec0f6386089dfc3c3a339aa4eca0ca` (matches frozen heldout)
  - Manifest SHA-256: `465f602f9049786f3ca52c061a6c3697357ac886ad0c75cc5219f79d09ca6046`
  - Frozen settings SHA-256: `782017cba5600c7e2316e17bfef576e2794c25fcbb1561f09230eeef5d72ca08`
- **Output Artifacts**: Raw output recorded in `b6-judge-heldout.json`; structured comparison recorded in `b6-judge-comparison.json`. Zero evaluators, models, thresholds, rubrics, or source answers were modified.
