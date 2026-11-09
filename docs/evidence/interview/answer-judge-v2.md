# Answer judge v2 experiment

The pending browser/visual checks were finished first and committed as `453cfd87`: 19 individual cases passed and eight focused theme/viewport captures were inspected. The v2 brief was then read, and `origin/main` was fetched and merged in `c765aed3`. The merge preserves the 79 point rubrics alongside main's 100 new questions (877 questions total).

## Frozen evaluation protocol

`rubric-sample.json` is the 30-answer development set. Its original 129 hand marks and all rubric wording are unchanged. `judge-v2-ground-truth.json` freezes the 20 questions used for development and held-out evaluation, preventing later bank edits from changing the experiment.

`judge-v2-heldout.json` contains 30 new answers across ten questions absent from the development set: ten strong, ten partial and ten weak answers, with 135 marked point decisions (66 present, 69 absent). They include paraphrases, unpunctuated spoken-style responses, swapped definitions, explicit negations and an unrelated sentence. The answers and labels were written and committed before any v2 predictions. These are Codex-authored manual semantic labels, not an independent human evaluation. No thresholds will be tuned on this set.

The fixed candidate family is a MiniLM bi-encoder selecting three single sentences or overlapping pairs per ground-truth point, followed by one relevance/similarity cross-encoder and DeBERTa NLI. Compare MS MARCO MiniLM L6 with STS-B TinyBERT L4, provided their actual ONNX files load in Transformers.js. NLI checks user evidence as the premise and the ground-truth point as the hypothesis. The reverse check swaps that direction to flag unsupported user sentences and contradictions. Similarity alone must not establish coverage.

Tune a small declared threshold grid using development predictions only, choosing the highest recall subject to no more than the baseline's two false positives; break ties by precision and then stricter thresholds. Freeze the selected settings before held-out inference. Run today's actual judge on the new set as the paired baseline. A winner must improve held-out recall without increasing the count or rate of false positives on the same labels. A numeric coverage percentage stays hidden unless held-out strong/weak distributions clearly separate; even separation is not proof of calibration.

## Candidate sources and licences

- [MS MARCO MiniLM Transformers.js export](https://huggingface.co/Xenova/ms-marco-MiniLM-L-6-v2) provides the paired-input classification model. The [upstream model](https://huggingface.co/cross-encoder/ms-marco-MiniLM-L-6-v2) uses Apache-2.0. It scores passage relevance, which is insufficient by itself to establish entailment.
- [STS-B TinyBERT L4](https://huggingface.co/cross-encoder/stsb-TinyBERT-L4) uses Apache-2.0 and provides ONNX weights. Its similarity output is not a correctness probability.
- [DeBERTa v3 small Transformers.js export](https://huggingface.co/Xenova/nli-deberta-v3-small) derives from [cross-encoder/nli-deberta-v3-small](https://huggingface.co/cross-encoder/nli-deberta-v3-small), licensed Apache-2.0. It predicts contradiction, entailment and neutral relations. Actual label mapping will be read from config.

Export model cards do not repeat the upstream licence field. Record export and upstream revisions and preserve attribution if a candidate ships. No model weights are committed to the repository.

Measurements and the ship decision will be appended after the sequential WASM runs. No v2 model is live at this checkpoint. The numeric rubric grade remains disabled.


Before any model run, the frozen held-out set was extended to 36 answers (12 strong, 12 partial, 12 weak), adding two questions without rubrics to test the required model-answer-sentence fallback. It now has 162 point decisions: 80 present and 82 absent. No prediction had been observed when this addition was written. Development remains the original 30 answers only. The ship check will also require false positives not to increase separately for rubric questions and reference-sentence questions, preventing aggregate results from hiding a regression in either source.

## Loading and resource adjustments before candidate predictions

The isolated baseline reproduced the original development counts exactly: TP 27, TN 64, FP 2, FN 36. A local-mirror tokenizer metadata problem was corrected before that run; the failed attempt is retained in `judge-v2-load-failure.json`.

The DeBERTa v3 small pipeline repeatedly reached the unchanged host floor during loading before producing any candidate predictions. Those attempts are retained in `judge-v2-guarded-loads.json`. The largest recorded sampled browser PSS was about 1.32 GB during these incomplete loads. Disabling NLI graph optimization was prepared to reduce loading allocations; no quality threshold was changed.

Before any candidate prediction, the experiment added [Xenova/nli-deberta-v3-xsmall](https://huggingface.co/Xenova/nli-deberta-v3-xsmall), with an 87,246,587-byte q8 model file. Its [upstream NLI model](https://huggingface.co/cross-encoder/nli-deberta-v3-xsmall) uses Apache-2.0; the [Microsoft base model](https://huggingface.co/microsoft/deberta-v3-xsmall) uses MIT. Both relevance cross-encoders will use this smaller NLI model with graph optimization disabled. This is a resource-driven substitution made without candidate scores, not held-out tuning. Small remains recorded as an unsuccessful guarded load, requiring a larger opt-in/resource envelope before quality can be measured.
