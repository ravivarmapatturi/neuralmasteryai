# Interview gaps plan review

Reviewed 2026-11-15 against `docs/plans/interview-gaps-2026-11.md`, the current interview and practice data pipelines, and `.agents/skills/interview-question/SKILL.md`.

## Findings and decisions

1. **The seven listed coding questions already exist.** `src/data/interviewSeniorQuestions.json` contains all seven IDs, mapped through `problemId` to runnable tasks in `scripts/practice/sets/ai_engineering.py` and `scripts/practice/sets/rag_pieces.py`. The workspace builder already generates their worker tests and MDX pages. Adding them again would duplicate IDs and content. Batch 1 therefore verifies and preserves these seven; it adds no coding questions.
2. **The plan conflates two schemas.** The skill's `InterviewQuestion` schema (`id, bank, area, section, title, context, criteria[], answer, followup, kind, sourceRoute`) is for MDX interview-prep guides projected by `scripts/interview/export-interview-catalog.mjs`. The `/interview` practice graph and question list use `src/data/interviewSeniorQuestions.json`, generated into `src/data/interviewPractice.json` by `scripts/interview/build_practice_data.py`. Its rubric field is `keyPoints`, with `followUps`, `wrongAnswers`, `tradeOffs`, `rounds`, `roles`, and `level`. The brief targets this latter system, since that is where the plan's neighboring gap questions and runnable workspace links live. New records use 3–5 specific `keyPoints` and hand-written `followUps`; they are not to be mirrored into the MDX catalog.
3. **The count is 25 new scenario questions, not 32 new questions.** The six scenario targets sum to 25. The seven coding targets bring the plan's nominal total to 32 only if none existed; now they are in place, so this batch adds 25 and verifies seven existing coding entries.
4. **The “second batch after this one ships” has no acceptance scope.** It names eleven thin themes but gives no counts or source areas. No Batch 2 implementation brief is issued. Claude should define a separate plan and counts after Batch 1 review.
5. **“Every number ... computed or cited” needs operational interpretation.** Question authors must avoid unsupported benchmark claims and provide arithmetic for calculation questions. Scenario quantities must be explicitly supplied by the prompt or labeled as assumptions; do not invent market or performance statistics.
6. **The route rule is valid, with a gap.** Verified relevant Learn routes include `/docs/mlops/gpu-and-distributed-training`, `/docs/mlops/legal-licensing-and-governance`, `/docs/agents/react-agent-production`, `/docs/agents/loops-and-graphs`, `/docs/agents/mcp/protocol-deep-dive`, `/docs/software-system-design/distributed-locks`, `/docs/mlops/ai-cost-engineering`, `/docs/mlops/production-reliability`, and `/docs/agent-observability/opentelemetry-and-distributed-tracing`. The coding mappings already use real practice problem routes/connections; do not repoint them. No dedicated Learn page was found for GPU quota fairness or an AI governance audit workflow; the closest routes are AI cost engineering and legal/licensing/governance respectively. Record those limitations in the authored question records/review notes; do not create Learn pages in this brief.
7. **Acceptance checks need an exact pipeline.** The practice problem set generator is `python3 -I scripts/practice/sets/build.py --check`; the interview practice data generator is `python3 -I scripts/interview/build_practice_data.py`; interview room catalog export is `npm run generate:interviews`. These are separate outputs. Only regenerate outputs affected by the hand-authored inputs; never edit generated files by hand.

## Batch decision

Issue only `docs/briefs/interview-gaps-batch-1.md`. It covers 25 new `/interview` scenario questions in six themes and a no-duplication verification of the seven existing runnable coding questions. The eleven deferred thin themes need a later plan before they are actionable.

## Source-of-truth boundaries

- New senior practice questions: `src/data/interviewSeniorQuestions.json`.
- Derived interview practice list: `src/data/interviewPractice.json` via `scripts/interview/build_practice_data.py`.
- Existing runnable coding problem definitions: `scripts/practice/sets/ai_engineering.py`, `scripts/practice/sets/rag_pieces.py`.
- Derived coding workspace content: `src/data/practice/problemSets.generated.json` and `src/content/docs/practice-problems/*.mdx` via the practice set builder.
- `src/data/interviewCatalog.generated.json`, `src/data/interviewTopics.generated.json`, and `src/data/interviewSearch.generated.json` come from the MDX interview-prep guides. They are outside this batch because the new questions belong to the practice bank.
