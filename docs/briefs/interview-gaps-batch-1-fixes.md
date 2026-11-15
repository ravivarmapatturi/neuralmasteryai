# Agy follow-up: interview gaps batch 1 review fixes

Implement only the corrections listed here to commit `63336de2`. Keep the 25 question IDs, allocation, topics, and Learn links. Do not add, remove, or re-theme questions. Do not push. Commit the corrections and append a brief report to the end of this file with changed IDs, verification commands/results, and open questions.

## Exact files

Edit:

- `src/data/interviewSeniorQuestions.json`
- `src/data/interviewCounts.generated.json` only to restore its exact pre-batch content (this batch did not change the MDX catalog counts; agy's generator only reformatted this file).
- This brief, to append your report.
- `AGENT_TRACKER.md` for this follow-up session and its hand-off status.

Regenerate:

- `src/data/interviewPractice.json` via `python3 -I scripts/interview/build_practice_data.py` after fixing source records.

Do not edit `src/data/interviewLearnLinks.json`; all 25 new IDs already have route mappings. Do not change UI, scripts, tests, Learn pages, or coding questions.

## Required corrections

1. Remove the unintended numeric string property `"0"` from each of the 25 new question dictionaries. Keep each `id` field and all other valid fields. Confirm no new record has keys outside `id`, `title`, `answer`, `level`, `keyPoints`, `followUps`, `wrongAnswers`, `rounds`, `roles`, and `tradeOffs`.
2. Honor the plan's numeric-claim rule. In answers, use values supplied in that question's title or show the arithmetic that derives them. Remove any other precise number unless it is cited in the answer. This is a data-writing brief, so prefer removing or generalizing unsupported values rather than adding uncited factual claims. In particular:
   - `gap-dist-tp-communication-overhead` and `gap-dist-3d-parallelism-placement`: remove the uncited `900 GB/s` figure. Do not call same-node All-Reduce latency “negligible.” State the locality/bandwidth trade-off qualitatively.
   - `gap-dist-zero3-vs-fsdp-memory`: qualify the `3x` vs `2x` communication comparison as an idealized estimate under the stated no-persistence/simple-sharding assumptions, and show `3 / 2 = 1.5x`; avoid implying this is invariant across ZeRO/FSDP implementations or configurations. Update the title/context or answer so those assumptions are explicit.
   - `gap-dist-pipeline-bubble-arithmetic`: the condition is strictly below 10%. `M=63` yields exactly `7/70 = 10%`, so the minimum integer `M` is 64. Change the derivation and key point to say `M > 63`, hence `M >= 64`; retain the computed 64 case.
   - `gap-dist-nccl-watchdog-flight-recorder`: remove the unprovided 300-second watchdog example; discuss choosing the timeout from recovery objectives and expected checkpoint behavior.
   - `gap-action-policy-enforcement-approval-gates`: remove the arbitrary `$100` approval threshold. Say the threshold is set by the organization's policy and distinguish it from the scenario's supplied `$500` maximum.
   - `gap-action-least-privilege-token-scoping`: remove the arbitrary 15-minute token TTL. Require a short-lived, audience-bound credential with expiry set by the credential broker's policy.
   - `gap-action-distributed-lock-agent-race`: do not assume an external supplier accepts or enforces a fencing token. Prevent duplicate orders with an idempotency key/unique order record and a transactional inventory re-check in a service the team controls. Mention fencing only as an additional control where the receiving system supports it.
   - `gap-action-least-privilege-token-scoping`: Kubernetes Role/RoleBinding cannot enforce pod label selectors. Make the answer explicit that the agent has no direct Kubernetes API credential and can only call a gateway that holds the narrow credential and enforces the selector, or describe a different real authorization boundary. Do not imply label-based RBAC.
   - `gap-stop-infinite-loop-detection`: remove the arbitrary “last 10 steps” and “more than twice” thresholds, or label them explicitly as illustrative policy values; do not recommend Floyd cycle detection unless the workflow has a deterministic successor function. Prefer normalized action signatures and bounded n-gram repetition checks, with thresholds configured per workflow.
   - `gap-stop-budget-limits-step-token-time`: remove the arbitrary 15-step, 100,000-token, and 300-second defaults, or clearly label them illustrative and configurable. State that limits are set from the task risk/SLA and enforced by the supervisor.
   - `gap-stop-safe-human-handoff-state`: remove invented order `#8192`, `$50` limit, and “within 10 seconds” claim. Keep the scenario's stated three retries. The card should contain verified intent, actions, outcome/blocker, and next step, with access-controlled transcript when needed.
   - `gap-gpu-credit-accounting-fair-share`: remove the arbitrary two-hour job cap or label it as an example policy value. Explain the fair-share/aging or guaranteed-minimum mechanism that prevents interactive priority from starving batch tenants indefinitely.
   - `gap-gpu-preemption-graceful-checkpointing`: qualify the loss bound. Do not promise “less than one step” unless the checkpoint is confirmed durable before the provider deadline. State the fallback if the emergency checkpoint cannot finish and retain periodic durable checkpoints.
   - `gap-gpu-token-cost-attribution`: remove the uncited “typically 1:3” prefill/decode ratio. Attribute cost with measured per-request GPU time or empirically calibrated phase costs, and state how shared idle/overhead costs are allocated.
   - `gap-gpu-rate-limiting-token-bucket`: describe capacity as derived from the supplied cluster budget and customer tier policy. Avoid saying token buckets directly protect KV cache unless concurrency/context reservations are also enforced; distinguish request/token rate limits from active-sequence or KV-cache admission control.
   - `gap-gov-immutable-audit-logging`: remove “raw model thought” from the recommended audit record. Log policy-relevant prompts/outputs, retrieved document identifiers, tool calls/results, model/policy versions, and decision outcome subject to minimization, redaction, access controls, and retention policy. Replace vague “salted cryptographic tokens” with a technically accurate method: keyed HMAC for stable pseudonyms when linkability is needed, or a separately controlled token vault when reversibility is required; acknowledge pseudonyms remain linkable sensitive data.
   - `gap-gov-deployment-records-model-cards`: remove unsupported `>99.5%`, `<2%`, zero-PII, and `0.85` thresholds. Replace them with risk-based thresholds defined before evaluation, with named test sets, sample sizes, confidence/uncertainty, and an explicit gate owner. Do not invent universal safety cutoffs.
   - `gap-gov-post-incident-review-traceability`: remove the invented `discount_pct <= 20` business rule. Enforce the documented, authorized discount limit from the source-of-truth policy in the tool implementation; retain the scenario's 90% attempted discount as the incident fact.

Update affected `keyPoints` and `tradeOffs` so they agree with the corrected answers. Keep 3–5 specific key points and at least one trade-off for every record. Preserve all other records exactly.

## Step-by-step

1. Re-read the original plan, review, batch-1 brief, and the questions listed above.
2. Fix the 25 source records in place. Keep question IDs, topic allocation, and Learn links unchanged.
3. Restore `src/data/interviewCounts.generated.json` to the exact content at parent `63336de2^`; it is unrelated to the practice question source and changed only from pretty-printed JSON to compact JSON.
4. Regenerate only `src/data/interviewPractice.json` using `python3 -I scripts/interview/build_practice_data.py`.
5. Run the checks below. Run potentially heavy commands sequentially under `flock /tmp/nm-heavy.lock`; do not run another heavy command until the lock is released.
6. Review the final diff. It must not alter Learn links, existing question records, coding workspace sources, or unrelated generated files.
7. Append a concise report to this brief and commit the fixes on `interview-gaps`. Do not push.

## Verification commands

```bash
flock /tmp/nm-heavy.lock python3 -I scripts/interview/build_practice_data.py
flock /tmp/nm-heavy.lock npm run check:criteria
flock /tmp/nm-heavy.lock npm run typecheck
flock /tmp/nm-heavy.lock npm run check:links
flock /tmp/nm-heavy.lock npx vitest run src/data/interviewCounts.test.ts
```

Also run a small Python validation that parses `interviewSeniorQuestions.json`, confirms exactly the 25 expected IDs still exist, all have no extra `"0"` field and have 3–5 key points, and confirms all 25 `senior:<id>` entries still point to existing Learn routes. Do not run a full build; this is a focused data correction and the laptop has less than the required 5 GB available.

## Acceptance

- All 25 records retain IDs and allocation, and each record contains only the allowed schema keys.
- The listed factual and numeric issues are resolved in the answer and corresponding rubric/trade-off.
- Regenerated practice data includes all 25 records; unrelated generated catalog counts are restored exactly.
- Every command and the custom validation is reported with its actual exit/result. No tests are weakened or removed.
- The commit contains only the specified corrections, this follow-up brief, regenerated practice data, and tracker update. No push.

---

## Implementation Report

### 1. Summary of Changes
- **Property `"0"` Removed**: Pruned the `"0"` property from all 25 new question dictionaries in `src/data/interviewSeniorQuestions.json`. Verified that every record contains strictly the allowed schema keys: `id`, `title`, `answer`, `level`, `keyPoints`, `followUps`, `wrongAnswers`, `rounds`, `roles`, and `tradeOffs`.
- **Factual & Numeric Claim Qualifications**: Addressed all 18 specific points across the 25 records:
  - `gap-dist-tp-communication-overhead` & `gap-dist-3d-parallelism-placement`: Removed uncited `900 GB/s` figure; removed "negligible" latency characterization; qualified locality/bandwidth trade-offs qualitatively.
  - `gap-dist-zero3-vs-fsdp-memory`: Qualified `3x` vs `2x` as an idealized estimate under no-persistence sharding assumptions with explicit `3 / 2 = 1.5x` arithmetic; noted dependency on implementation caching and prefetching.
  - `gap-dist-pipeline-bubble-arithmetic`: Corrected derivation and key point to `M > 63`, hence `M >= 64` for strictly below 10% bubble fraction; retained evaluated M=64 case.
  - `gap-dist-nccl-watchdog-flight-recorder`: Removed unprovided 300s example; discussed deriving timeout from RTO and checkpoint write profiles.
  - `gap-action-policy-enforcement-approval-gates`: Removed arbitrary $100 threshold; framed approval gates around organizational policy and distinguished from the scenario's $500 hard maximum.
  - `gap-action-least-privilege-token-scoping`: Removed 15-minute TTL; required short-lived audience-bound credential per broker policy; explicitly stated agent holds no direct Kubernetes credentials and must call an authorization gateway enforcing pod label selectors.
  - `gap-action-distributed-lock-agent-race`: Eliminated assumption that external supplier enforces fencing; enforced duplicate prevention via transactional inventory re-check and deterministic idempotency keys in internal purchasing service, mentioning fencing as additional safeguard where supported.
  - `gap-stop-infinite-loop-detection`: Removed arbitrary thresholds; noted Floyd cycle detection requires deterministic successor transitions; preferred normalized action signatures and bounded n-gram sequence matching with workflow-configurable thresholds.
  - `gap-stop-budget-limits-step-token-time`: Labeled step/token/time thresholds as illustrative examples; stated supervisor enforces limits based on task risk and SLA.
  - `gap-stop-safe-human-handoff-state`: Removed invented order `#8192`, `$50` limit, and "10 seconds" claim; preserved 3-retry scenario; card structured with intent, actions, outcome/blocker, and next step, backed by access-controlled audit transcript.
  - `gap-gpu-credit-accounting-fair-share`: Labeled 2-hour job cap as illustrative; added guaranteed minimum batch reservations and wait-time priority aging to prevent batch starvation.
  - `gap-gpu-preemption-graceful-checkpointing`: Qualified loss bound to depend on durable confirmation before provider deadline; added fallback to periodic durable checkpoints.
  - `gap-gpu-token-cost-attribution`: Removed uncited 1:3 prefill/decode ratio; attributed cost via measured GPU time or empirically calibrated phase costs; allocated shared idle overhead proportionally or via base subscription.
  - `gap-gpu-rate-limiting-token-bucket`: Derived bucket capacities from 20,000 tokens/sec cluster budget and customer SLAs; distinguished token rate limiting from active-sequence and KV cache engine admission control.
  - `gap-gov-immutable-audit-logging`: Removed raw model thought from audit records; required policy-relevant prompts/outputs, document IDs, tool calls/results, versions, and outcomes under minimization; replaced salted hashes with keyed HMAC pseudonyms (for linkability) or token vault (for reversibility), noting pseudonyms remain sensitive data.
  - `gap-gov-deployment-records-model-cards`: Removed arbitrary `>99.5%`, `<2%`, zero-PII, and `0.85` cutoffs; replaced with risk-based thresholds defined prior to evaluation, versioned test suites, confidence/uncertainty intervals, and an explicit gate owner.
  - `gap-gov-post-incident-review-traceability`: Removed invented `discount_pct <= 20` rule; enforced documented authorized discount limits from organizational policy directly in tool validation.
- **`src/data/interviewCounts.generated.json`**: Restored exact pre-batch content from `63336de2^` (`questions: 917`, 2-space pretty-printed).
- **`src/data/interviewPractice.json`**: Regenerated via `python3 -I scripts/interview/build_practice_data.py`, reflecting all 25 corrected records (942 total practice questions).

### 2. Changed Question IDs
All 25 records modified in `src/data/interviewSeniorQuestions.json`:
- `gap-dist-tp-communication-overhead`
- `gap-dist-zero3-vs-fsdp-memory`
- `gap-dist-pipeline-bubble-arithmetic`
- `gap-dist-fsdp-gradient-sync-straggler`
- `gap-dist-nccl-watchdog-flight-recorder`
- `gap-dist-3d-parallelism-placement`
- `gap-action-idempotent-tool-execution`
- `gap-action-tool-permission-boundaries`
- `gap-action-policy-enforcement-approval-gates`
- `gap-action-least-privilege-token-scoping`
- `gap-action-distributed-lock-agent-race`
- `gap-action-tool-call-schema-validation`
- `gap-stop-infinite-loop-detection`
- `gap-stop-budget-limits-step-token-time`
- `gap-stop-safe-human-handoff-state`
- `gap-stop-condition-evaluator`
- `gap-gpu-credit-accounting-fair-share`
- `gap-gpu-preemption-graceful-checkpointing`
- `gap-gpu-noisy-neighbor-memory-isolation`
- `gap-gpu-token-cost-attribution`
- `gap-gpu-rate-limiting-token-bucket`
- `gap-gov-immutable-audit-logging`
- `gap-gov-model-data-lineage-dag`
- `gap-gov-deployment-records-model-cards`
- `gap-gov-post-incident-review-traceability`

### 3. Verification Commands & Empirical Results

| Command | Exit Code | Result Summary |
| :--- | :--- | :--- |
| `flock /tmp/nm-heavy.lock python3 -I scripts/interview/build_practice_data.py` | `0` | Regenerated `interviewPractice.json` with 942 questions across 23 topics. |
| `flock /tmp/nm-heavy.lock npm run check:criteria` | `0` | `259 of 259 questions have criteria; 0 problem(s)`. |
| `flock /tmp/nm-heavy.lock npm run typecheck` | `0` | `tsc -b` passed with 0 errors. |
| `flock /tmp/nm-heavy.lock npm run check:links` | `0` | 1978 MDX scanned, 2134 routes, 0 broken internal prose links, 0 broken anchor links. |
| `flock /tmp/nm-heavy.lock npx vitest run src/data/interviewCounts.test.ts` | `1` | Failed (see Open Questions below regarding `interviewCounts.test.ts` schema expectation and restored counts). |
| Custom Python Validation (schema, 25 IDs, Learn routes) | `0` | 25/25 records confirmed: exactly allowed schema keys, 0 extra keys, no `"0"`, 3-5 keyPoints, valid tradeOffs, all 25 Learn route files exist on disk. |

### 4. Open Questions & Review Findings for Codex / Claude

1. **`src/data/interviewCounts.test.ts` Failure on Object vs Tuple Schema**:
   In `src/data/interviewCounts.test.ts:11-13`:
   ```typescript
   for (const question of Object.values(senior).flat()) {
     expect(questions.some(q => q.id === `senior:${question[0]}`)).toBe(true);
   }
   ```
   The older 79 senior questions are structured as 4-tuples (`[id, title, answer, metadata]`), so `question[0]` accesses the string ID. In commit `63336de2`, the 25 questions were added as objects with an explicit `"0": id` property so that `question[0]` evaluated to `id`. Per Instruction 1 of this brief, `"0"` was removed to strictly adhere to the dictionary schema (`['id', 'title', 'answer', ...]`). Consequently, in JavaScript `question[0]` evaluates to `undefined`, causing line 12 to fail.
   *Recommendation for Codex/Claude*: Update `src/data/interviewCounts.test.ts:12` to `const qid = Array.isArray(question) ? question[0] : question.id; expect(questions.some(q => q.id === \`senior:\${qid}\`)).toBe(true);`, or convert the 25 records to 4-tuples like the older senior questions.

2. **`interviewCounts.generated.json` Count (917 vs 942)**:
   Instruction 3 directed restoring `src/data/interviewCounts.generated.json` to parent `63336de2^` (`questions: 917`). However, `interviewCounts.test.ts:9` asserts:
   ```typescript
   expect(counts.questions).toBe(questions.length);
   ```
   where `questions` is the 942 live practice questions in `src/data/interviewPractice.json`. Restoring `counts.questions` to 917 causes `expect(917).toBe(942)` to fail. Furthermore, running `build_practice_data.py` (lines 249-252) explicitly overwrites `counts["questions"] = sum(len(t["questions"]) for t in out["topics"])`.
   *Action Taken*: Per Instruction 3, `src/data/interviewCounts.generated.json` was restored to its exact pre-batch content at `63336de2^` (`917`), and the resulting test mismatch is reported here for architectural alignment.

