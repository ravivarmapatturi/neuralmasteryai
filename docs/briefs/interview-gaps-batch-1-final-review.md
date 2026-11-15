# Agy final review: close two precision gaps

Make only the two corrections below on top of `ed8f5ac5`. Keep the 25 question IDs and all other question records unchanged. Commit on this branch, do not push, and append a short report with command results and open questions to this brief.

## Files

- Edit `src/data/interviewSeniorQuestions.json` only.
- Regenerate `src/data/interviewPractice.json` and `src/data/interviewCounts.generated.json` with `python3 -I scripts/interview/build_practice_data.py`.
- Update `AGENT_TRACKER.md` for this session.
- Append your short report to this brief.

## Corrections

1. `gap-dist-3d-parallelism-placement`: the current question gives 32 nodes × 8 GPUs but asks for the “optimal” mapping; its answer chooses PP=4 without a workload constraint that makes 4 the optimum. Change the scenario/title to state that the architecture requires four pipeline stages, and ask for one feasible hierarchical mapping. Keep the 32×8 topology. The answer should then derive TP=8 within the node, PP=4 from the stated requirement, and DP=256/(8×4)=8 across the remaining ranks. Keep arithmetic consistent in key points and trade-offs. Do not assert a unique optimum.
2. `gap-gov-model-data-lineage-dag`: remove the unreferenced `SHA-256` specificity from the answer. Say “cryptographic content hash” unless the question includes a source citation. Keep the lineage mechanism and all question IDs unchanged.

## Verification

Run sequentially under `flock /tmp/nm-heavy.lock`:

```bash
flock /tmp/nm-heavy.lock python3 -I scripts/interview/build_practice_data.py
flock /tmp/nm-heavy.lock npm run typecheck
flock /tmp/nm-heavy.lock npx vitest run src/data/interviewCounts.test.ts
```

Also confirm the two IDs remain unique, all 25 questions remain present, all new answers are under 200 words, generated practice/count totals agree at 942, and no unrelated question records changed. Do not run a full build or push.

---

## Implementation Report

### 1. Summary of Actions
- **`gap-dist-3d-parallelism-placement`**:
  - Updated scenario/title to specify that the model architecture requires four pipeline stages and asked for a feasible hierarchical assignment across the 32-node × 8-GPU (256 GPUs total) topology.
  - Updated the answer to derive $TP = 8$ within the node, $PP = 4$ from the stated architectural requirement, and $DP = 256 / (8 \times 4) = 8$ across remaining cluster ranks.
  - Maintained consistent arithmetic in `keyPoints` ($TP = 8$, $PP = 4$, $DP = 8$, total $8 \times 4 \times 8 = 256$) and `tradeOffs` without asserting a unique optimum.
  - Kept answer length concise at 149 words (< 200 words).
- **`gap-gov-model-data-lineage-dag`**:
  - Removed unreferenced `SHA-256` specificity from the answer, replacing it with "cryptographic content hashes".
  - Preserved the DAG lineage mechanism, keyPoints, tradeOffs, and question metadata.
  - Kept answer length concise at 142 words (< 200 words).
- **Regenerated Practice Data**:
  - Executed `flock /tmp/nm-heavy.lock python3 -I scripts/interview/build_practice_data.py`.
  - Regenerated `src/data/interviewPractice.json` (942 questions total across 23 topics).
  - Verified `src/data/interviewCounts.generated.json` matches at 942 questions.
- **Integrity Verifications**:
  - Verified all 25 gap questions remain present and both target IDs remain unique.
  - Confirmed all 25 gap question answers are under 200 words (ranging from 131 to 192 words).
  - Confirmed only the two targeted question records in `src/data/interviewSeniorQuestions.json` and the corresponding records in `src/data/interviewPractice.json` were modified; zero unrelated question records changed.
- **Agent Tracker**:
  - Updated `AGENT_TRACKER.md` row to `COMPLETED`.

### 2. Verification Commands & Observed Results

| Command | Exit Code | Result Summary |
| :--- | :--- | :--- |
| `flock /tmp/nm-heavy.lock python3 -I scripts/interview/build_practice_data.py` | `0` | Practice data and counts regenerated: 942 questions across 23 topics; 0 duplicates, 0 skipped. |
| `flock /tmp/nm-heavy.lock npm run typecheck` | `0` | `tsc -b` exited 0 with 0 errors. |
| `flock /tmp/nm-heavy.lock npx vitest run src/data/interviewCounts.test.ts` | `0` | 1 test file passed, 2/2 tests passed in 1.32s. |
| `npm run check:links` | `0` | 1978 MDX scanned, 2134 routes, 0 broken prose links, 0 broken anchor links. |
| Custom Validation Script | `0` | Confirmed 244 senior questions (all unique IDs), exactly 25 gap IDs across topics, all 25 answers < 200 words, practice questions total = 942 (all unique), exactly 2 questions changed between HEAD and working tree. |

### 3. Open Questions
None. Both precision issues identified in the final review brief have been addressed, verified, and confirmed.

