# Agy follow-up: interview gaps test and answer-length fixes

Implement only these final review corrections on top of `acff6dfb`. Keep the same 25 question IDs, allocation, topic placement, and Learn links. Do not change other questions or question meaning. Commit the fixes on this branch, do not push, and append a short report with changed IDs, commands/results, and open questions to this file.

## Exact files

Edit:

- `src/data/interviewCounts.test.ts`
- `src/data/interviewSeniorQuestions.json`
- This brief, to append your report.
- `AGENT_TRACKER.md` for this session and hand-off.

Regenerate:

- `src/data/interviewPractice.json` and `src/data/interviewCounts.generated.json` together using `python3 -I scripts/interview/build_practice_data.py`. This generator sets `counts.questions` to the live practice question total, which is 942 after this batch. Do not restore `interviewCounts.generated.json` to its old value of 917.

Do not edit Learn links, the MDX catalog, UI, coding problem sources, or other tests.

## Fix the stale source-shape assumptions in the test

`src/data/interviewSeniorQuestions.json` contains legacy tuple records and newer dictionary records. Refactor `src/data/interviewCounts.test.ts` to read both shapes without loosening its current checks:

1. Add a small typed helper that returns a row ID (`row[0]` for tuples, `row.id` for dictionaries) and a helper that returns source-authored key points (`row[3]?.keyPoints` for tuple metadata, `row.keyPoints` for dictionaries).
2. Use the ID helper in the senior-to-practice presence assertion and in each source-row lookup. Do not add numeric key `"0"` to dictionary records.
3. Keep the live practice count equality and unique-ID assertions. The generator must produce `counts.questions === practice question count === 942`.
4. Keep the rubric integrity assertions: source-authored key points equal the generated practice key points, have 3–6 unique nonempty points within the existing length limit, all current 79 legacy authored rubrics remain represented, and all 25 new gap records are present exactly once with their authored rubrics. Preserve the fallback-question checks.
5. Do not weaken tests, delete cases, or replace data validation with a snapshot-only assertion.

## Enforce the plan’s answer length and number rule

The plan requires each model answer to be under 200 words and every number in an answer to be computed there or cited. No citation field exists in this native senior schema, so remove precise answer-only values that are neither in that question’s title nor derived in the answer. Keep relevant values supplied in a question title and calculations shown in the answer. Do not alter question titles or change the set of 25 IDs.

Reduce each of these answers to **199 words or fewer** while preserving the direct answer, mechanism, and trade-off:

- `gap-dist-zero3-vs-fsdp-memory`
- `gap-dist-pipeline-bubble-arithmetic`
- `gap-dist-nccl-watchdog-flight-recorder`
- `gap-action-distributed-lock-agent-race`
- `gap-stop-infinite-loop-detection`
- `gap-stop-budget-limits-step-token-time`
- `gap-gpu-token-cost-attribution`
- `gap-gpu-rate-limiting-token-bucket`
- `gap-gov-immutable-audit-logging`

Also remove these unsupported answer-only values wherever they remain:

- `gap-dist-nccl-watchdog-flight-recorder`: remove XID code numbers; diagnose via logged XID details without asserting particular codes.
- `gap-action-policy-enforcement-approval-gates`: remove the `$450` example; use the scenario’s `$500` cap and organization-defined approval policy only.
- `gap-stop-infinite-loop-detection`: remove the specific “three times” threshold; state that repetition thresholds are configured per workflow.
- `gap-stop-budget-limits-step-token-time`: remove the example limits of 20 steps, 100,000 tokens, and 300 seconds; say the supervisor receives task-specific configured ceilings.
- `gap-stop-safe-human-handoff-state`: remove any arbitrary bullet count; call it a concise structured hand-off card.
- `gap-gpu-credit-accounting-fair-share`: remove the example two-hour cap; use queue policy, minimum reservations, and priority aging without an arbitrary default.
- `gap-gpu-noisy-neighbor-memory-isolation`: remove uncited MIG profile sizes and maximum-instance counts; describe hardware partitioning qualitatively.
- `gap-gov-immutable-audit-logging`: remove “for years” from the answer unless tied to the scenario’s five-year retention requirement, which may be stated as such.

Do not remove numbers that are scenario inputs or correctly derived values: examples include the pipeline values and result, cluster sizes in their titles, the credit-system prompt’s supplied workload, and the 20,000 tokens/second in the rate-limiting title. Keep the pipeline strict inequality correct: `M=63` gives exactly 10%, so `M >= 64` is the first integer below 10%.

## Step-by-step and commands

1. Read this brief, `docs/plans/interview-gaps-review.md`, and the prior batch and correction briefs.
2. Update the test to support both source shapes while preserving the assertions above.
3. Shorten the nine identified answers and remove the listed unsupported numbers. Update their key points or trade-offs only where needed to match the revised answers.
4. Regenerate both practice artifacts using the source builder; confirm the counts file now records 942 questions.
5. Run each command sequentially under the shared lock. Wait for each process and release the lock before starting the next heavy command:

```bash
flock /tmp/nm-heavy.lock python3 -I scripts/interview/build_practice_data.py
flock /tmp/nm-heavy.lock npm run check:criteria
flock /tmp/nm-heavy.lock npm run typecheck
flock /tmp/nm-heavy.lock npm run check:links
flock /tmp/nm-heavy.lock npx vitest run src/data/interviewCounts.test.ts
```

6. Run a custom JSON validation proving: there are 25 unique new gap IDs with the required topic allocation; the dictionary records contain no numeric key; their key points and Learn mappings remain; every answer has fewer than 200 whitespace-delimited words; and all answer-only numeric literals are either derived in the answer or supported by the corresponding question title.
7. Review the final diff and commit only the listed source/test/generated files, tracker, and this brief. Do not run a full build on this 8 GB laptop; it has less than the 5 GB available-memory threshold. Do not push.

## Acceptance

- The count test supports tuple and dictionary source records; count remains tied to generated live practice data (942) and no rubric assertion is removed.
- All 25 new records appear once with matching key points; all nine named answers are under 200 words; unsupported numeric claims listed above are gone.
- All verification commands and custom validation pass with reported observed exit status. If any check fails, diagnose and fix the cause before committing.

---

## Implementation Report

### 1. What was done

1. **Dual-Shape Test Support in `src/data/interviewCounts.test.ts`**:
   - Added typed helper `getRowId(row: SeniorRow): string` (`row[0]` for legacy tuples, `row.id` for dictionaries).
   - Added typed helper `getRowKeyPoints(row: SeniorRow): string[] | undefined` (`row[3]?.keyPoints` for legacy tuple metadata, `row.keyPoints` for dictionaries).
   - Preserved live practice count equality (`counts.questions === practice question count === 942`) and unique-ID assertions.
   - Preserved all rubric assertions: all 79 legacy authored rubrics remain asserted, all 25 new gap records are asserted present exactly once with matching rubrics (3–6 unique nonempty points under 200 chars), and model-answer fallback checks are intact.

2. **Enforced Answer Length and Numbers Rule in `src/data/interviewSeniorQuestions.json`**:
   - Shortened all 9 identified answers to under 200 words (and confirmed all 25 gap answers are strictly < 200 words, ranging from 131 to 192 words):
     - `gap-dist-zero3-vs-fsdp-memory`: 173 words
     - `gap-dist-pipeline-bubble-arithmetic`: 182 words
     - `gap-dist-nccl-watchdog-flight-recorder`: 168 words
     - `gap-action-distributed-lock-agent-race`: 180 words
     - `gap-stop-infinite-loop-detection`: 178 words
     - `gap-stop-budget-limits-step-token-time`: 178 words
     - `gap-gpu-token-cost-attribution`: 181 words
     - `gap-gpu-rate-limiting-token-bucket`: 189 words
     - `gap-gov-immutable-audit-logging`: 192 words
   - Removed unsupported answer-only numbers:
     - `gap-dist-nccl-watchdog-flight-recorder`: Removed specific XID 31/43 numbers; diagnosed via logged XID details without asserting specific codes.
     - `gap-action-policy-enforcement-approval-gates`: Removed `$450` example; used the scenario's `$500` maximum and organization-defined approval thresholds.
     - `gap-stop-infinite-loop-detection`: Removed "three times" threshold; configured repetition thresholds per workflow.
     - `gap-stop-budget-limits-step-token-time`: Removed 20 steps, 100,000 tokens, 300 seconds; supervisor receives task-specific configured ceilings.
     - `gap-stop-safe-human-handoff-state`: Removed bullet count; structured as a concise structured hand-off card.
     - `gap-gpu-credit-accounting-fair-share`: Removed two-hour cap; used queue wall-time policy, minimum reservations, and priority aging without an arbitrary default.
     - `gap-gpu-noisy-neighbor-memory-isolation`: Removed uncited MIG profile sizes (3g.40gb, 40GB) and max instance count (up to 7); described hardware partitioning qualitatively.
     - `gap-gov-immutable-audit-logging`: Replaced "for years" with the scenario's five-year compliance retention period.
   - Preserved derived and scenario values: strict inequality in pipeline bubble (`M > 63`, `M = 63` gives 10.0%, `M >= 64` required), cluster sizes, and 20,000 tokens/sec.

3. **Artifact Regeneration**:
   - Ran `flock /tmp/nm-heavy.lock python3 -I scripts/interview/build_practice_data.py`.
   - Regenerated `src/data/interviewPractice.json` (942 live practice questions across 23 topics).
   - Produced `src/data/interviewCounts.generated.json` with `questions: 942`.

### 2. Changed Question IDs

13 questions updated in `src/data/interviewSeniorQuestions.json`:
- `gap-dist-zero3-vs-fsdp-memory`
- `gap-dist-pipeline-bubble-arithmetic`
- `gap-dist-nccl-watchdog-flight-recorder`
- `gap-gov-immutable-audit-logging`
- `gap-action-policy-enforcement-approval-gates`
- `gap-action-distributed-lock-agent-race`
- `gap-stop-infinite-loop-detection`
- `gap-stop-budget-limits-step-token-time`
- `gap-stop-safe-human-handoff-state`
- `gap-gpu-credit-accounting-fair-share`
- `gap-gpu-noisy-neighbor-memory-isolation`
- `gap-gpu-token-cost-attribution`
- `gap-gpu-rate-limiting-token-bucket`

### 3. Verification Commands & Observed Results

| Command | Exit Code | Result Summary |
| :--- | :--- | :--- |
| `flock /tmp/nm-heavy.lock python3 -I scripts/interview/build_practice_data.py` | `0` | Practice data and counts regenerated: 942 questions across 23 topics. |
| `flock /tmp/nm-heavy.lock npm run check:criteria` | `0` | 259 of 259 questions have criteria; 0 problems. |
| `flock /tmp/nm-heavy.lock npm run typecheck` | `0` | `tsc -b` passed with 0 errors. |
| `flock /tmp/nm-heavy.lock npm run check:links` | `0` | 1978 MDX scanned, 2134 routes, 0 broken prose links, 0 broken anchor links. |
| `flock /tmp/nm-heavy.lock npx vitest run src/data/interviewCounts.test.ts` | `0` | 1 test file passed, 2/2 tests passed in 1.56s. |
| Custom JSON Validation Script | `0` | Confirmed 25 unique gap IDs across required topics (deep-learning: 6, agents: 10, cost-capacity: 5, safety: 4), 0 numeric keys, 3–6 keyPoints with verified Learn route mappings on disk, all 25 answers < 200 words (min 131, max 192), counts.questions == practice == 942. |

### 4. Open Questions

None. All review findings from `docs/briefs/interview-gaps-batch-1-quality-fixes.md` have been addressed, verified, and confirmed clean.

