# Agy brief: interview gaps, batch 1

Implement only this brief. Add 25 new scenario questions to the `/interview` senior practice bank and verify the seven already-listed coding questions are runnable and correctly linked. Do not author duplicate coding questions, add the deferred thin themes, create Learn pages, change UI, or modify generated outputs by hand. If the repository does not match the exact sources/commands below, stop and append the question to this brief.

## Exact files

### Edit

- `src/data/interviewSeniorQuestions.json`
- `src/data/interviewLearnLinks.json` (add one real Learn link for each new question ID, using the existing `senior:<id>` key convention).

### Regenerate when required

- `src/data/interviewPractice.json` via `python3 -I scripts/interview/build_practice_data.py`.
- `src/data/practice/problemSets.generated.json` and generated practice problem MDX only if the coding workspace verification reveals that one of the seven mapped problems is absent or stale. Do not add or alter coding problem content in this batch. If a repair is needed, stop and report it instead of expanding scope.

### Do not edit

- `src/data/interviewCatalog.generated.json`, `src/data/interviewTopics.generated.json`, `src/data/interviewSearch.generated.json`, `src/data/interviewCounts.generated.json` (MDX interview-prep projection; not the source for this work).
- Any UI, Learn page, coding question, coding solution, test file, or script.

## Required content allocation

Append exactly 25 dictionary records under these existing topic keys in `src/data/interviewSeniorQuestions.json`:

| Topic key | Count | Coverage to include |
| --- | ---: | --- |
| `deep-learning` | 6 | Data, tensor, and pipeline parallelism; ZeRO/FSDP memory placement; gradient synchronization; a distributed failure/debugging case. Include at least one arithmetic question whose inputs are fully stated in the question. |
| `agents` | 6 | Idempotent retries and duplicate side effects; tool permission boundaries; policy enforcement and approval gates; least privilege. |
| `cost-capacity` | 5 | GPU quotas and credit accounting; preemption; fair scheduling; noisy-neighbour isolation; billing/usage attribution. |
| `safety` | 4 | Audit logging; model/data lineage; model cards or deployment records; incident review and traceability. |
| `agents` | 4 additional | Agent termination conditions; step/token/time budgets; loop detection; safe human hand-off. |

The final totals for this change must be 10 new records under `agents`, 6 under `deep-learning`, 5 under `cost-capacity`, and 4 under `safety` (25 total). Use unique IDs prefixed by theme: `gap-dist-`, `gap-action-`, `gap-gpu-`, `gap-gov-`, and `gap-stop-`. Check all existing IDs before choosing suffixes. Do not create a new topic key.

## Record schema

Use the existing dictionary form in `src/data/interviewSeniorQuestions.json` exactly:

```json
{
  "id": "gap-dist-example",
  "title": "A scenario title phrased as a concrete interview question",
  "answer": "Under 200 words. Start with the direct answer, explain the mechanism, then state the meaningful trade-off.",
  "level": "senior",
  "keyPoints": [
    "Names a question-specific diagnosis or invariant.",
    "Explains a relevant mechanism or calculation.",
    "Chooses a concrete action and its trade-off."
  ],
  "followUps": ["A specific next question an interviewer would ask."],
  "wrongAnswers": ["A plausible but materially incorrect response.", "A second distinct failure mode."],
  "rounds": ["systems-design"],
  "roles": ["ml-systems-engineer"],
  "tradeOffs": ["A concrete trade-off stated without unsupported benchmark claims."]
}
```

Senior-bank records do not carry `sourceRoute`; Learn links live in `src/data/interviewLearnLinks.json`, keyed as `senior:<id>`. Add one link mapping per new record in that file using these verified routes, chosen by topic:

- Distributed training: `/docs/mlops/gpu-and-distributed-training`.
- Idempotency, permissions, and policy: `/docs/agents/react-agent-production`, `/docs/agents/mcp/protocol-deep-dive`, or `/docs/software-system-design/distributed-locks` (choose the closest route per question).
- GPU quota/capacity: `/docs/mlops/ai-cost-engineering` or `/docs/mlops/production-reliability` (closest available; no dedicated quota/fairness page exists).
- Governance/audit: `/docs/mlops/legal-licensing-and-governance` or `/docs/agent-observability/opentelemetry-and-distributed-tracing` (closest available; no dedicated audit-workflow page exists).
- Termination/loop prevention: `/docs/agents/loops-and-graphs` or `/docs/agents/react-agent-production`.

The example is structural only; write every title, answer, key point, follow-up, wrong answer, and trade-off specifically for its question. Do not copy it as a question.

## Writing requirements

1. Apply `.agents/skills/interview-question/SKILL.md` and `.agents/skills/writing-voice/SKILL.md` where applicable. Scenario titles must establish a real operational constraint, not ask for a definition. Put enough scenario facts in the title to make the decision non-trivial.
2. The native practice-bank rubric is `keyPoints`, not generated-catalog `criteria`. Write 3–5 manually authored, question-specific key points for each record. Each should be checkable and distinct. Never generate/clone rubric text in a script.
3. Each answer is under 200 words, opens with the direct response, then gives mechanism and trade-off. Avoid made-up benchmarks and unsupported numeric claims. For any calculation, state the values and units in the question and show the arithmetic in the answer.
4. Each question has at least one tailored `followUps` item, two distinct `wrongAnswers`, 1–3 sensible `rounds`, 1–3 existing role IDs, and at least one `tradeOffs` item. Use only real routes listed above.
5. Assign `level` as `senior` for all 25. Keep existing records unchanged.

## Step-by-step

1. Read `.agents/skills/interview-question/SKILL.md`, `.agents/skills/writing-voice/SKILL.md`, `docs/plans/interview-gaps-review.md`, and the target topic sections in `src/data/interviewSeniorQuestions.json`.
2. Verify IDs and topic keys. Count the existing coding records and their `problemId` mappings; confirm all seven IDs from the plan are present exactly once.
3. Inspect the corresponding coding definitions in `scripts/practice/sets/ai_engineering.py` and `scripts/practice/sets/rag_pieces.py`. Do not modify them. Run the coding workspace checks below.
4. Hand-author exactly 25 scenario records following the allocation and schema above. Append within existing topic arrays; preserve all existing records and formatting conventions.
5. Add one corresponding `senior:<id>` Learn link in `src/data/interviewLearnLinks.json` for each new record, pointing to one of the listed routes.
6. Regenerate the practice question projection with `python3 -I scripts/interview/build_practice_data.py`.
7. Run every acceptance command below. Check `git diff` to confirm only the allowed source files and derived practice projection changed. If the generator modifies unrelated content, revert only those generated unrelated changes and report this in the hand-off.

## Commands

Run sequentially; do not run multiple heavy commands concurrently.

```bash
python3 -I scripts/practice/sets/build.py --check
npm run check:criteria
npm run generate:interviews -- --check
python3 -I scripts/interview/build_practice_data.py
python3 -I scripts/practice/sets/build.py --check
npm run typecheck
npm run check:links
npx vitest run src/data/interviewCounts.test.ts
```

`npm run generate:interviews -- --check` validates the separate generated catalog remains in sync; it is not expected to contain these new practice questions. Do not run a full build for this data-only batch unless Claude requests it. Never claim checks passed unless you ran them and observed exit code 0.

## Acceptance checks

- Exactly 25 new unique records are added in the required topic allocation; existing records are unchanged.
- `npm run check:criteria` remains clean. These additions use native `keyPoints`; do not insert dummy rows into `interviewCriteria.json`.
- Each new record has the required schema, 3–5 specific key points, answer under 200 words, a tailored follow-up, two distinct wrong answers, trade-off, and senior level. Each has one `senior:<id>` Learn link to a verified route in `interviewLearnLinks.json`.
- The seven existing coding question IDs remain unique and mapped to the existing runnable problem IDs: `coding-text-chunker` → `coding-text-chunker`; `coding-bm25-from-scratch` → `rag-bm25`; `coding-cross-encoder-reranker` → `coding-simple-reranker`; `coding-json-output-parser` → `coding-json-output-repair`; `coding-eval-harness-precision-recall` → `coding-eval-regression-harness`; `coding-dynamic-batcher` → `coding-request-batcher`; `coding-token-bucket-rate-limiter` → `coding-token-bucket`.
- `python3 -I scripts/practice/sets/build.py --check` passes, confirming the coding workspace definitions and reference solutions remain valid.
- Generated `src/data/interviewPractice.json` contains the new questions in the corresponding topics. Generated catalog files are not hand-edited.
- Typecheck, links, and the focused interview count test pass.
- Report exact command outcomes, question IDs, final topic counts, and any route limitation to Codex for question-by-question review. Do not commit or push; Claude owns final review and push.
