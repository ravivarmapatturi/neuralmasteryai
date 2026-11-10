# Remaining interview key points — 10 November 2026

Added 438 hand-authored rubrics, each containing four short points grounded in its existing model answer: 1,752 new points. Coverage increases from 479 to 917 of 917 questions. There are zero questions left without key points. All 479 prior rubrics are preserved. Answers, IDs and other question metadata are unchanged.

The first batch prioritizes the remaining evaluation, agent, inference-serving, production MLOps and safety questions, then related protocols, multi-agent systems and sandboxing. GPU memory and prompting/structured output already had complete topic coverage at the starting revision. Additional memory and structured-output questions classified under transformers, tokenization and RAG are covered in later batches. This ordering is editorial judgment for senior AI engineering preparation, not a measured hiring-frequency ranking.

| Batch | New questions | Coverage after batch | Commit |
| --- | ---: | ---: | --- |
| 1 | 100 | 579/917 | `75cf9296` |
| 2 | 100 | 679/917 | `44b86890` |
| 3 | 100 | 779/917 | `082a1de6` |
| 4 | 100 | 879/917 | `d8333014` |
| 5 | 38 | 917/917 | This evidence commit |

| Topic | Additions |
| --- | ---: |
| Evaluation | 1 |
| Agents | 8 |
| Inference serving | 9 |
| Production MLOps | 14 |
| Safety | 11 |
| Protocols | 21 |
| Multi-agent | 19 |
| Sandboxes | 17 |
| Cost and capacity | 21 |
| Evidence and reverse engineering | 14 |
| RAG | 94 |
| Transformers | 35 |
| Post-training | 38 |
| Tokenization and decoding | 19 |
| Deep learning | 32 |
| Math and classical ML | 40 |
| Multimodal | 21 |
| Coding | 8 |
| Behavioral | 16 |
| Total | 438 |

## Source preservation and support review

Points are stored in `src/data/interviewKeyPoints.json` and applied by the existing practice-data builder. Every point was authored while reading that question's complete model answer. No heuristic or extractive script generated the points. Scripts only persist, regenerate and audit the authored text.

The integrity report compares against starting revision `f9898ccf`. It confirms 917 unchanged answers, zero changes to other question fields, 479 preserved rubrics, and exactly 438 new four-point rubrics. The sorted ID/answer-pair SHA-256 remains `0f6b7dd2f28114d6e972d7e685a990b236c06ddd97ac21f34c4cd8ceaa681f27`. The banned-phrase scan over all 1,752 new points found zero hits.

`b5-support-sample.json` records 30 questions and 120 points across the selected subject matter. Codex manually compared every sampled point to its complete source answer: 120 supported, zero unsupported. Exact full answers are retained as excerpts. This is agent-authored review, not independent human review or verification of the original answers' technical claims. The verifier checks excerpt provenance and point identity rather than inferring semantic entailment.

Two previously reference-only frozen questions now have practice rubrics: `genai-eval-llm-as-judge` and `genai-chunking-strategies`. Their answers are unchanged. The frozen harness continues to score both using its original reference inputs. The verifier's explicit `--allow-new-reference-rubrics` option permits these practice-only additions while still requiring frozen input equality with the starting revision. Its default behavior still rejects such additions. No frozen example, ground-truth record, model, scorer or threshold was changed.

Reproduce the integrity audit:

```bash
python3 scripts/interview/verify-key-points.py \
  --baseline f9898ccf --batch b5 --expected 438 --allow-new-reference-rubrics
```

## Held-out regression comparison

The fresh browser/WASM comparison is memory-blocked: **0 of 36 answers scored, 0 fresh point decisions**. Both attempts stopped before predictions, at 2,037 and 2,032 MiB available RAM. The second attempt used a stricter 350 MiB RAM target, a 512 MiB Node heap, and a single-process browser with a 128 MiB JS heap; scorer, model and threshold inputs were unchanged. Raw incomplete attempts are retained in `b5-judge-heldout.json`, and `b5-judge-comparison.json` records zero measured rows and a null regression verdict. No saved predictions fill these gaps. The comparison uses the same 36 previously used frozen answers as B4. It checks regression on the frozen scorer inputs; it does not validate grading accuracy for the 438 additions or exercise the two newly rubric-backed reference questions through the practice-data path. The sample is reused and is not a newly untouched holdout.

The saved baseline has 36 answers and 162 point decisions: 36 true positives, four false positives, 78 true negatives and 44 false negatives. There are no fresh decisions to compare, so no improvement or regression claim is supported. Scorer source, worker source and the pinned manifest are byte-identical to the starting revision; the compiled worker differs from the historical baseline. No performance comparison is claimed.

A retry, once the unchanged memory preconditions hold, can use the existing static model mirror and an empty output directory containing copies of the four frozen `judge-v2-*` input files:

```bash
node scripts/interview/judge-v2-models.mjs compile
node scripts/interview/judge-v2-models.mjs serve
# In another terminal, then stop the mirror after the run:
RUBRIC_BASE_URL=http://127.0.0.1:5188 JUDGE_V2_DIR=/tmp/b5-judge \
  node scripts/speech-accuracy/with-memory-floor.mjs \
  node scripts/interview/evaluate-judge-v2.mjs baseline heldout
```

## Verification

Fetch and merge of `origin/main` succeeded and reported already up to date. Prerender was skipped as requested. No CSS, component layout, evaluator implementation or source answer was edited. The unrelated untracked judge brief was preserved. Files were staged by name and no push was performed.

Typecheck, internal links, criteria (259/259), MDX compilation (2,003 files), and the focused key-point/InterviewPage suites (12/12) passed. Initial full Vitest stopped at 1,966 MiB available RAM; the first focused retry stopped at 2,031 MiB before a later 12/12 pass. A capped full-suite attempt exited 134 when Node's default heap reached about 256 MiB. A subsequent explicit-1-GiB-heap run was stopped for the urgent CI-test investigation; it has no final pass result. A final typecheck attempt stopped at 2,023 MiB. The final catalog export and two practice-data builds passed; regeneration was byte-identical (practice file SHA-256 `b3c07c006a7dd3185479f62dce97c1836b823e12a961aa724c3bfa4694348c49`). The full gate remains memory-blocked.

Heavy commands run sequentially with the unchanged 2 GiB host-memory floor. The capped retry uses MemoryHigh=500 MiB, MemoryMax=1,800 MiB and MemorySwapMax=6 GiB. Production builds require at least 5 GB available RAM; available RAM has stayed below that threshold. The full ship gate cannot be marked passed without the build. No production or deployment sign-off is claimed.

The urgent CI test correction is committed separately as `be5eaf70`; its reason and real browser results are in `room-stale-review-fix.md`. No product behavior was changed. The reported stale-review case passed twice, including in a full-spec retry that passed 19 tests before the memory guard stopped it. The complete 44-test spec did not finish. Manual live-model answer exercise was not performed. All started model mirrors, Vite servers and browser processes were stopped; the other worktree's server was left alone.
