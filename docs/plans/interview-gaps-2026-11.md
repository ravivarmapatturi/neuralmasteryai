# Plan: close the interview question gaps (Nov 2026)

Owner: Claude (plan, final review, ship). Senior engineer: Codex (verify this plan, write agy briefs, review agy's diffs). Implementer: agy (follows the briefs exactly).
Worktree: `neuralmastery/platform-vite-gaps`, branch `interview-gaps`. Nobody pushes except Claude.

## Why

The interview-week market map (`docs/plans/interview-week-2026-11.md`, table "Theme / Questions / Status") shows themes real AI-engineer loops ask about where we have zero or one question. Learners preparing with us will hit these in real interviews and find nothing. Close them with questions as good as our best existing ones.

## What to add

| Gap | Target | Notes |
| --- | --- | --- |
| Hands-on coding: chunker, BM25, reranker, output parser, eval harness, batcher, rate limiter | 7 coding questions, one per item | Runnable in our existing coding-question workspace with tests, like the current coding questions. |
| Distributed training (data/tensor/pipeline parallel, ZeRO/FSDP, gradient sync, failures) | 6 | Mix of scenario, calculation (memory/communication), debugging. |
| Idempotent agent actions, tool permissions, policy layer | 6 | Retries, duplicate side effects, approval gates, least privilege. |
| GPU quota and credit systems, multi-tenant fairness | 5 | Quotas, preemption, fair scheduling, noisy neighbours, billing. |
| AI governance and audit | 4 | Logging, lineage, model cards, audit trails, incident review. |
| Agent termination and loop prevention | 4 | Step/budget limits, loop detection, stop conditions, human hand-off. |

About 32 questions. Thin themes (feature stores, A/B testing, recommendations, continuous batching, A2A, quantization, routing, caching, injection, rate limits, voice) are a second batch after this one ships.

## Quality bar (non-negotiable)

- Follow `.agents/skills/interview-question/SKILL.md` exactly: scenario titles, real constraints in context, 3-5 question-specific hand-written criteria, model answer under 200 words leading with the direct answer, a specific follow-up.
- Every number in an answer is either computed in the answer or cited. No invented benchmarks.
- `sourceRoute` points at a real Learn page; if no page teaches it, pick the closest real one and note the gap in the report.
- Same data format and pipeline as existing questions (whatever Codex finds in `src/data/interview*` and `scripts/interview/`); generated files regenerated, not hand-edited.
- Nothing scripted or templated in bulk. A past Codex bank was auto-generated junk and had to be deleted.

## Done when

`npm run check:criteria` is clean, interview unit tests and typecheck pass, the coding questions' reference solutions pass their own tests in the worker, the new questions show up and filter correctly on /interview, Codex has reviewed every question against the quality bar, and Claude has sampled them and approved.

## Process

1. Codex reads this plan and the code, writes `docs/plans/interview-gaps-review.md` (what's wrong or missing in this plan, decisions taken) and one or more agy briefs in `docs/briefs/` with exact files, schema, steps and tests. Codex may split into batches.
2. Claude starts agy on each brief.
3. Codex reviews agy's commits against the brief and the quality bar, sends fixes back through a follow-up brief if needed.
4. Claude does final review and pushes.
