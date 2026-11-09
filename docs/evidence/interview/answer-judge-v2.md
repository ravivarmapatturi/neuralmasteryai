# Answer judge v2 experiment

Neither candidate met the ship rule. On the 36-answer held-out set, baseline recall was 45.0%, STS-B was 42.5%, and MS MARCO was 37.5%. All had four false positives overall, but both candidates increased rubric-only false positives from three to four. The live MiniLM/MobileBERT scorer stays in place. Candidate models and reverse-warning labels are not activated; automatic coverage percentages remain hidden.

The pending browser/visual checks were finished first and committed as `453cfd87`: 19 individual cases passed and eight focused theme/viewport captures were inspected. The v2 brief was then read, and `origin/main` was fetched and merged in `c765aed3`, preserving 79 rubrics alongside main's 100 new questions (877 questions total).

## Frozen evaluation protocol

`rubric-sample.json` is the 30-answer development set. Its original 129 hand marks and all rubric wording are unchanged. `judge-v2-ground-truth.json` freezes the 22 questions used for development and held-out evaluation, preventing later bank edits from changing the experiment.

`judge-v2-heldout.json` contains 36 new answers across twelve questions absent from the development set: twelve strong, twelve partial and twelve weak answers, with 162 marked point decisions (80 present, 82 absent). They include paraphrases, unpunctuated spoken-style responses, swapped definitions, explicit negations and an unrelated sentence. The answers and labels were frozen in `a59103a5` and extended for reference-answer fallback coverage in `5432d867`, before the first quality prediction. These are Codex-authored manual semantic labels, not an independent human evaluation. No thresholds were tuned on this set.

The fixed candidate family is a MiniLM bi-encoder selecting three single sentences or overlapping pairs per ground-truth point, followed by one relevance/similarity cross-encoder and DeBERTa NLI. Compare MS MARCO MiniLM L6 with STS-B TinyBERT L4, provided their actual ONNX files load in Transformers.js. NLI checks user evidence as the premise and the ground-truth point as the hypothesis. The reverse check swaps that direction to flag unsupported user sentences and contradictions. Similarity alone must not establish coverage.

Tune a small declared threshold grid using development predictions only, choosing the highest recall subject to no more than the baseline's two false positives; break ties by precision and then stricter thresholds. Freeze the selected settings before held-out inference. Run today's actual judge on the new set as the paired baseline. A winner must improve held-out recall without increasing the count or rate of false positives on the same labels. A numeric coverage percentage stays hidden unless held-out strong/weak distributions clearly separate; even separation is not proof of calibration.

## Candidate sources and licences

- [MS MARCO MiniLM Transformers.js export](https://huggingface.co/Xenova/ms-marco-MiniLM-L-6-v2) provides the paired-input classification model. The [upstream model](https://huggingface.co/cross-encoder/ms-marco-MiniLM-L-6-v2) uses Apache-2.0. It scores passage relevance, which is insufficient by itself to establish entailment.
- [STS-B TinyBERT L4](https://huggingface.co/cross-encoder/stsb-TinyBERT-L4) uses Apache-2.0 and provides ONNX weights. Its similarity output is not a correctness probability.
- [DeBERTa v3 small Transformers.js export](https://huggingface.co/Xenova/nli-deberta-v3-small) derives from [cross-encoder/nli-deberta-v3-small](https://huggingface.co/cross-encoder/nli-deberta-v3-small), licensed Apache-2.0. It predicts contradiction, entailment and neutral relations. Actual label mapping will be read from config.

Export model cards do not repeat the upstream licence field. Record export and upstream revisions and preserve attribution if a candidate ships. No model weights are committed to the repository.

The sequential WASM measurements and final rejection decision are recorded below. Candidate models remain experimental; no numeric coverage grade is enabled.


The ship check requires false positives not to increase separately for rubric questions and reference-sentence questions, preventing aggregate results from hiding a regression in either source. This additional check was declared before held-out inference.

## Loading and resource adjustments before candidate predictions

The isolated baseline reproduced the original development counts exactly: TP 27, TN 64, FP 2, FN 36. A local-mirror tokenizer metadata problem was corrected before that run; the failed attempt is retained in `judge-v2-load-failure.json`.

The DeBERTa v3 small pipeline repeatedly reached the unchanged host floor during loading before producing any candidate predictions. Those attempts are retained in `judge-v2-guarded-loads.json`. The largest recorded sampled browser PSS was about 1.32 GB during these incomplete loads. Disabling NLI graph optimization was prepared to reduce loading allocations; no quality threshold was changed.

Before any candidate prediction, the experiment added [Xenova/nli-deberta-v3-xsmall](https://huggingface.co/Xenova/nli-deberta-v3-xsmall), with an 87,246,587-byte q8 model file. Its [upstream NLI model](https://huggingface.co/cross-encoder/nli-deberta-v3-xsmall) uses Apache-2.0; the [Microsoft base model](https://huggingface.co/microsoft/deberta-v3-xsmall) uses MIT. Both relevance cross-encoders will use this smaller NLI model with graph optimization disabled. This is a resource-driven substitution made without candidate scores, not held-out tuning. Small remains recorded as an unsuccessful guarded load, requiring a larger opt-in/resource envelope before quality can be measured.


## Development selection (frozen before held-out inference)

Both browser-sized cross-encoders loaded and ran with xsmall NLI. The 60-setting grid per candidate was used once on the original 30 answers. It varied only the declared similarity, cross-score and entailment thresholds; contradiction remained 0.8. The selected settings are committed in `judge-v2-thresholds.json` before any held-out inference.

| Development candidate | TP | FP | FN | Recall | Precision | Point agreement |
| --- | --- | --- | --- | --- | --- | --- |
| Today's judge | 27 | 2 | 36 | 42.9% | 93.1% | 70.5% |
| MS MARCO MiniLM + xsmall NLI | 21 | 0 | 42 | 33.3% | 100.0% | 67.4% |
| STS-B TinyBERT + xsmall NLI | 31 | 1 | 32 | 49.2% | 96.9% | 74.4% |

Selected MS MARCO thresholds: similarity 0.35, sigmoid cross-score 0.25, entailment 0.5. Selected STS-B thresholds: similarity 0.25, sigmoid cross-score 0.25, entailment 0.5. These are operating thresholds, not calibrated correctness probabilities. STS-B's six-percentage-point development gain is not sufficient to claim a winner. No further grid expansion or rubric paraphrase tuning was applied after seeing these results.

Forward and reverse raw scores, actual matching text, timings and memory records are retained in the per-candidate JSON files. All runs used the actual pinned ONNX weights in a real browser, WASM, one thread, a 2 GiB process limit with swap disabled, and the unchanged 2 GiB host-memory floor.


## Held-out decision: keep the current scorer

The held-out set has 36 answers, 162 point decisions, 80 present points and 82 absent points. All three pipelines ran on the same frozen answers and ground truth. The first 30 held-out answers use rubrics; six additional answers exercise model-answer-sentence ground truth. No held-out answer, label, rubric wording or threshold was changed after predictions began. Statistical summaries use linearly interpolated empirical quantiles; their medians were checked independently with Python's `statistics.median`.

| Held-out pipeline | TP | TN | FP | FN | Recall | Precision | Point agreement |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Today's judge | 36 | 78 | 4 | 44 | 45.0% | 90.0% | 70.4% |
| MS MARCO + xsmall NLI | 30 | 78 | 4 | 50 | 37.5% | 88.2% | 66.7% |
| STS-B + xsmall NLI | 34 | 78 | 4 | 46 | 42.5% | 89.5% | 69.1% |

All pipelines had a 4/82 = 4.9% false-positive rate over hand-marked absent points. STS-B is the best candidate attempt by held-out recall, but loses 2.5 percentage points of recall against the paired baseline. MS MARCO loses 7.5 points. Neither reaches the prespecified +10-point gain or the requirement for a positive lower confidence bound. The paired answer-cluster bootstrap (10,000 resamples, fixed seed) gives STS-B a recall-gain interval of approximately −13.2 to +8.7 percentage points, and MS MARCO −17.8 to +3.9 points.

| Held-out agreement by answer strength | Strong (54 decisions) | Partial (54) | Weak (54) |
| --- | --- | --- | --- |
| Today's judge | 44.4% | 72.2% | 94.4% |
| MS MARCO + xsmall NLI | 33.3% | 74.1% | 92.6% |
| STS-B + xsmall NLI | 40.7% | 74.1% | 92.6% |

| Ground-truth source | Baseline recall / FP | MS MARCO recall / FP | STS-B recall / FP |
| --- | --- | --- | --- |
| rubric | 34.8% / 3 | 34.8% / 4 | 39.4% / 4 |
| reference | 92.9% / 1 | 50.0% / 0 | 57.1% / 0 |

The development gain did not generalize. Threshold selection may have overfit the small development set, and the held-out questions also differ from it. No further tuning was attempted after this result. The held-out set remains a genuine test of these frozen settings; it must not become another tuning round for a later release claim.

## Coverage distributions and numeric grades

Each value below is the fraction of points detected for an answer, not a probability that it is correct. Human-marked strong answers covered every rubric point by construction; partial and weak labels were written before inference.

| Pipeline / group | Min | Q25 | Median | Q75 | Max | Mean |
| --- | --- | --- | --- | --- | --- | --- |
| Today's judge / strong | 0.0% | 23.8% | 50.0% | 52.5% | 100.0% | 45.0% |
| Today's judge / partial | 0.0% | 0.0% | 22.5% | 42.5% | 60.0% | 24.2% |
| Today's judge / weak | 0.0% | 0.0% | 0.0% | 5.0% | 25.0% | 5.4% |
| MS MARCO + xsmall NLI / strong | 0.0% | 15.0% | 25.0% | 52.5% | 100.0% | 34.6% |
| MS MARCO + xsmall NLI / partial | 0.0% | 15.0% | 25.0% | 28.7% | 50.0% | 22.5% |
| MS MARCO + xsmall NLI / weak | 0.0% | 0.0% | 0.0% | 21.3% | 25.0% | 7.9% |
| STS-B + xsmall NLI / strong | 0.0% | 20.0% | 32.5% | 63.7% | 100.0% | 42.1% |
| STS-B + xsmall NLI / partial | 0.0% | 15.0% | 25.0% | 28.7% | 50.0% | 22.5% |
| STS-B + xsmall NLI / weak | 0.0% | 0.0% | 0.0% | 21.3% | 25.0% | 7.9% |

Strong and weak ranges overlap, including strong answers with zero detected points. These results do not support a trustworthy numeric grade. Both rubric and legacy reference-answer coverage percentages are hidden in the live answer screen and attempt history. Topic completion percentages still measure completion, independently of answer checking.

## Matching evidence and reverse signals

Every experimental covered point retains the actual candidate sentence/window as evidence in the raw and summarized JSON. The live checklist now also quotes the existing scorer's matching user text under Covered points. Saved evidence is capped at 1,000 characters per point and is included in account sync and JSON backup through the existing bounded history format. No quote is fabricated for an undetected point. This is a presentation change; the live detection algorithm is unchanged.

The reverse pass uses the user's sentence/window as the hypothesis and its three nearest ground-truth points as the premise. It retains text and model scores for review:

| Candidate | Supported | Unmatched (potential off-topic signal) | Possible conflict |
| --- | --- | --- | --- |
| MS MARCO + xsmall NLI | 20 | 64 | 38 |
| STS-B + xsmall NLI | 29 | 55 | 38 |

These are 122 sentence/windows, including windows from unpunctuated answers. Unmatched text can be correct detail absent from the rubric. Reverse signals were not independently hand-labelled, so these counts are not off-topic or contradiction accuracy measurements. They are available for inspecting the experiment, not enabled as new live warnings. The existing Covered / Not detected labels remain the learner-facing contract.

Both candidates falsely detected all four examples below in weak answers. These errors show why lexical relevance and generic entailment confidence do not establish technical correctness:

| Point incorrectly detected | Actual user evidence |
| --- | --- |
| Batch norm uses running statistics at inference | “At inference batch norm must recompute statistics from the current batch and layer norm cannot run with one example.” |
| Loss scaling protects small FP16 gradients | “Loss scaling protects small gradients by making the loss smaller.” |
| Self-attention takes Q, K and V from one sequence | “Self-attention takes its queries from the encoder and its keys from the decoder. Cross-attention takes all three from one sequence.” |
| A p-value is a tail probability under the null | “A p-value of 0.02 proves the null has a two percent chance of being true.” |

The loss-scaling answer names a correct purpose with an incorrect mechanism; the short ground-truth point alone does not encode that mechanism. We did not rewrite it after seeing this failure. DeBERTa assigned the chosen candidate about 99% entailment there; that value is not a calibrated correctness probability.

## Download, memory and WASM time

The browser used actual pinned ONNX files, one WASM thread, no inference doubles, and a local HTTP mirror of the unmodified upstream files. Model bytes are unique assets requested by a cold browser, including tokenizers/configs. All pipelines additionally requested 26,914,834 bytes of WASM/runtime modules. Local-mirror loading times do not measure internet download latency. STS-B used the upstream `model_qint8_avx512.onnx` graph via `model_file_name`; the fp32 loader suffix option only selected that custom filename. The graph itself is int8 and loaded successfully on WASM. Candidate NLI graph optimization and CPU memory arena were disabled to limit allocation peaks; baseline settings were unchanged. Paired inputs were capped at 256 tokens.

| Pipeline | Unique model assets (decimal MB) | Max kernel cgroup peak over dev/test (MiB) | Max sampled browser PSS (MiB) | Held-out median / p95 per answer (seconds) |
| --- | --- | --- | --- | --- |
| Today's judge | 51.37 | 837.4 | 610.5 | 0.49 / 0.67 |
| MS MARCO + xsmall NLI | 143.45 | 1077.1 | 1046.2 | 4.35 / 5.44 |
| STS-B + xsmall NLI | 134.96 | 1045.5 | 1065.0 | 4.09 / 5.13 |

The kernel peak includes the isolated browser, benchmark runner and memory guard in a 2,048 MiB cgroup with swap disabled. Browser PSS/RSS were sampled every 100 ms across the browser process tree; PSS shares library pages proportionately, while RSS double-counts shared mappings. Kernel cgroup accounting and PSS are different accounting methods. Full samples and attempt histories are retained in JSON.

The isolated judge component fits below 2 GiB in these successful runs, within a 4 GB component envelope. Simultaneous Standard ASR plus judge residency on a physical 4 GB device was not tested. The report therefore labels candidate activation as requiring opt-in until that combined budget is verified. The larger small-NLI candidate did not finish loading under the host floor; its quality, per-answer time and complete peak are unavailable. Its 172.44 MB q8 model file and guarded-load lower bounds are recorded, not passed off as a successful benchmark. No candidate is activated because the accuracy rule already fails.

## Reproduce and inspect

- Frozen inputs: `rubric-sample.json`, `judge-v2-heldout.json`, `judge-v2-ground-truth.json`.
- Weight revisions, exact file sizes and SHA-256: `judge-v2-model-manifest.json`.
- Raw predictions and timings: `judge-v2-{baseline,marco,stsb}-{dev,heldout}.json`.
- Frozen settings and all 60 development trials per candidate: `judge-v2-thresholds.json` (`cdecef10`).
- Aggregate decision, distributions, bootstrap and per-point evidence: `judge-v2-summary.json`.

Use `JUDGE_V2_DIR` to select a fresh evidence directory for a repeat; copy the frozen inputs there. `judge-v2-models.mjs prepare` mirrors the pinned files outside the repository, `compile` bundles the experiment worker without building the app, and `serve` streams the mirror on port 5188. Set `RUBRIC_BASE_URL=http://127.0.0.1:5188`. Run `evaluate-judge-v2.mjs <baseline|marco|stsb> dev` one at a time under `with-memory-floor.mjs` and the documented swap-disabled cgroup limit. Then run `judge-v2-analysis.mjs tune` and freeze its output before running the three held-out jobs and `judge-v2-analysis.mjs report`. Tuning now refuses to run after held-out output exists. Existing measured results are immutable evidence; use a fresh directory for repetition and a genuinely new held-out set for new model/threshold tuning.

Final verification and commit details follow below. No push.


### Larger-NLI load attempt (not a completed candidate)

MS MARCO with DeBERTa v3 small never produced a prediction under the current host floor. Recall, precision, false positives, strength-group agreement and time per answer are therefore **not available** for that variant. The planned cold model assets total about 228.64 MB from the pinned manifest, including the 172.44 MB NLI model graph. Guarded incomplete loads reached a sampled browser PSS lower bound of about 1.32 GB. Those values describe incomplete attempts, not a complete Standard-budget pass. The successful comparisons above use xsmall NLI.


## Final verification and commits

| Check | Observed result |
| --- | --- |
| Pending interview browser/visual checks before v2 | 19/19 passed individually; eight focused light/dark 375/1440 captures inspected; `453cfd87` |
| Final browser rechecks after matching quotes and hidden percentages | 4/4 passed individually: rubric/history/reload, typed follow-up persistence, checklist visual case, follow-up visual case including mobile save |
| Final visual inspection | All eight final 375×1,000 / 1,440×1,000 light/dark viewport images inspected; no overflow or page exceptions observed; quotes, focus outline and controls readable |
| Full project typecheck | `npm run typecheck` exit 0 with 896 MiB heap / 8 MiB semi-space after waiting/retrying under the unchanged host floor |
| Full unit suite | 873/873 passed across 181 files, 246.73s, one worker, 512 MiB heap |
| MDX compile | 1,993 files, zero failed |
| Internal prose/anchor links | Passed, zero broken links |
| Criteria | 259/259, zero problems |
| Tracker / diff / banned-phrase check | Passed |
| Freeze enforcement | A post-held-out tune attempt was rejected and the threshold file's SHA-256 remained unchanged |
| Production build | Not started: final `free -g` showed 2 GB available, below AGENTS.md's required 5 GB; no production-build pass is claimed |

The first full unit run had 872 passes and one failure: an older test assumed the entire senior bank still contained 79 questions after main added 100. The updated test retains all 79 original rubric-count, uniqueness, length and source-parity assertions, checks the complete source-derived senior count, and separately validates all 100 reference-answer fallback records and their follow-ups. The complete rerun passed. Full typecheck also found a token-list inference error in the follow-up selector; an explicit `string[]` annotation fixes it without changing the routing behavior.

The final browser images remain in ignored `test-results/pending-3/` and `test-results/pending-4/`; they are not committed. Tests used inference doubles for UI behavior; the accuracy measurements used real ONNX/WASM models. A physical mic and simultaneous ASR/judge residency were not tested.

Research commits: `a59103a5` and `5432d867` freeze the held-out data; `fb43444f` adds the harness; `05ba1e99` records baseline parity and loading constraints; `cdecef10` freezes development settings; `9d4fbcd6` records the held-out rejection. The final UI commit adds matching quotes, retains Covered / Not detected, and hides unvalidated numeric coverage in both answer review and history. The scorer is unchanged and still runs after the model answer has appeared.

All started dev/model servers and test browsers are stopped. Codex's own tool-host processes are left running. The model mirror stays cached outside the repository for reproducibility; no weights, screenshot files, or scratch scripts are committed. No push.
