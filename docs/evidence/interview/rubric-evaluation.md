# Key-point check evaluation — 9 November 2026

The current model is too unreliable for a numeric rubric grade. Rubric questions show hit and missed points; neither the answer screen nor attempt history presents a rubric percentage. Questions without key points retain the existing model-answer sentence check.

## Sample and method

Codex manually marked 30 written answers before running inference: 10 strong, 10 partial and 10 weak answers across 10 senior questions. Strong answers include paraphrases; weak answers include swapped definitions, negation and plausible but incorrect technical claims. This is an agent-authored manual content assessment, not independent human validation. The 30 answers cover 129 binary point decisions, with 63 hand-marked hits and 66 hand-marked misses. The sample was not used to tune the thresholds after measurement.

`rubric-sample.json` contains the answers and the original marks. `rubric-results.json` contains every prediction. Run the evaluation against Vite using:

```bash
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173
node scripts/speech-accuracy/with-memory-floor.mjs node scripts/interview/evaluate-rubric.mjs
```

The measurement uses the actual browser worker, WASM, q8 `Xenova/all-MiniLM-L6-v2` and `Xenova/mobilebert-uncased-mnli`. It does not use inference doubles. For each rubric claim it checks up to three sentences ranked by embedding similarity. A hit requires similarity at least 0.35, entailment at least 0.7 and contradiction below 0.3. A related contradiction at least 0.8 prevents a hit. These are model decision thresholds, not calibrated probabilities of correctness.

## Measured agreement

| Measure | Result |
| --- | --- |
| Point agreement | 91 / 129 = 70.5% |
| Exact answer agreement | 12 / 30 = 40.0% |
| True positives | 27 |
| True negatives | 64 |
| False positives | 2 |
| False negatives | 36 |
| False-positive rate among hand-marked misses | 2 / 66 = 3.0% |
| Precision among predicted hits | 27 / 29 = 93.1% |
| Recall of hand-marked hits | 27 / 63 = 42.9% |

| Answer group | Point agreement |
| --- | --- |
| Strong | 17 / 43 = 39.5% |
| Partial | 33 / 43 = 76.7% |
| Weak | 41 / 43 = 95.3% |

Both false positives occurred on weak answers. The BERT/GPT answer incorrectly says GPT predicts randomly masked words and can see future targets, yet the scorer hits the causal next-token point. The metrics answer swaps precision and recall, yet the scorer hits the recall formula. The NLI model can confuse related vocabulary with the correct relation. Its low recall also misses valid paraphrases. Hit/missed feedback therefore needs learner judgment against the visible model answer; it is not a validated grade. Numeric rubric scores remain disabled in code.

## History and sync contract

Each attempt has a UUID, question ID, completion time, transcript, check status and point verdicts. A draft saves immediately when the learner finishes; revision numbers preserve the final transcription over earlier drafts. Saved points retain the rubric text used for that attempt. A retry comparison names newly hit points and previously hit points missed this time. Comparisons require identical rubric text and completed checks. Empty and failed checks remain in history. Late reviews update their original attempt without appearing on another question.

History keeps the newest 10 attempts per question and 100 overall, caps transcripts at 4,000 characters and bounds the encoded history field to 200,000 UTF-8 bytes. The same normalization and bounds apply to incoming sync data. Merge-by-ID is deterministic and commutative; a checked record supersedes its unchecked draft. A Firestore transaction updates only `interviewAttempts` in the user's progress document with merge enabled, preserving focus sessions and other sibling fields. Snapshots merge concurrent remote attempts; local updates during a sync cause another pass. Failures retain local data and retry on reconnection or after 30 seconds.

Storage is scoped by account. Anonymous attempts are adopted once on sign-in; switching accounts or signing out does not copy the previous account's history. JSON progress export already collects `nm-` keys, so it includes both anonymous and account-scoped attempts. Export/restore coverage checks the complete stored attempt, including transcript and point verdicts.

## Verification and handoff

Feature commits: `27323497` (rubrics and scorer), `0272c2c3` (attempt history and sync). No push.

| Check | Observed result |
| --- | --- |
| Fetch and merge `origin/main` | Already up to date at start |
| Practice-data regeneration | Byte-for-byte identical; 777 questions, 79 senior rubrics, 351 key points |
| Focused unit tests | 22 passed across 6 files |
| Scoped TypeScript | Passed for judge/history/sync/provider; passed separately for the answer screen and new TypeScript tests with the project's compiler flags |
| Internal prose and anchor links | Passed, no broken links |
| MDX compilation | 1,993 files, 0 failed |
| Criteria check | 259 / 259, 0 problems |
| Added browser case: rubric, retry comparison, history and reload | Passed individually with inference doubles on the initial feature implementation |
| Added browser case: failed review and empty rubric answer | Passed individually after draft/final revision handling was added |
| Existing interview browser regressions | First 11 passed in a 19-test run before the memory guard stopped the run |
| Responsive checks | First rubric browser case passed scroll-width assertions at 320, 375 and 1,440 pixels in light and dark; screenshots were generated; light 375px was visually inspected |
| Final browser reruns | Stopped by the 2 GiB host floor, including a reduced-runner-memory attempt; not a passing final suite |
| Full project typecheck | Stopped at the 2 GiB host floor; a 768 MiB heap attempt also exhausted its heap |
| Full unit suite | Stopped by the 2 GiB host floor, including a single-worker 1,024 MiB heap attempt |
| Production build | Not started: available memory stayed below the required 5 GiB |

The browser inference doubles exercise worker RPC and UI behavior, not scoring accuracy. The 30-answer accuracy measurement uses real browser WASM inference. Firestore transaction, retry and account-switch behavior were tested with doubles; no production account or emulator was used for this task. All started servers and browsers were closed.

The four-layer completion gate is **not satisfied**. Full typecheck, full unit tests, production build and final browser/visual review remain for a machine with sufficient available memory. The tracker stays blocked on verification; these commits are available for lead review and must not be treated as deployment sign-off.
