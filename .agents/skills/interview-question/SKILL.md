---
name: interview-question
description: Rules for writing Neural Mastery interview questions (src/data/interviewCatalog*, scripts/interview/, interview-prep docs). Use whenever adding, editing or importing interview questions or study guides.
---

# Writing an interview question

A good question is one a real interviewer at a product AI company would ask, with an answer a strong candidate could give in 2-3 minutes. The learner answers in their own words, then compares against criteria and a model answer.

Schema: `InterviewQuestion` in `src/data/interviewCatalog.ts` (`id, bank, area, section, title, context, criteria[], answer, followup, kind, options?, correctOption?, numericAnswer?, tolerance?, unit?, sourceRoute`).

## Rules per field

- **title**: a scenario, not a definition. ✅ "A decision tree scores 99% train / 71% validation. What do you try first?" ❌ "What is overfitting?"
- **context**: the constraints that make the answer non-trivial (data size, latency budget, team, scale). Not "Answer in your own words". The UI already says that.
- **criteria**: **3-5 criteria specific to this question**, each checkable: "Names high variance as the cause", "Proposes max_depth or min_samples_leaf", "Mentions checking for leakage if the gap persists". Generic criteria ("Answer the question directly") are banned. *Currently all 241 questions share the same 3 generic criteria; fixing these is open work. Fix any question you touch.*
- **answer**: the model answer. Leads with the direct answer in one sentence, then the mechanism, then the trade-off. Under 200 words. Real numbers where they exist.
- **followup**: the specific next question this interviewer would ask ("What if validation stays at 71% after limiting depth?"), not a generic "What assumptions does your answer depend on?".
- **kind**:
  - `choice`: 3-4 options, every distractor a real mistake candidates make, each with a `why`.
  - `calculation`: `numericAnswer`, `tolerance`, `unit`; the answer shows the arithmetic.
  - `explanation`: free text graded against the criteria.
- **sourceRoute**: the Learn page that teaches it. That page must exist (check:links).

## Coverage and balance

Per area, mix roughly 30% fundamentals, 50% applied scenarios, 20% system design / debugging. Match current hiring signal: LLM serving and inference cost, RAG evaluation, agents and tool use, fine-tuning trade-offs, ML system design, classical ML fundamentals.

## Automatic grading

Any model-based evaluator (`server/interview_judge.py`) must be labelled as automated in the UI, show uncertainty, grade content against the criteria (not speaking style), and be validated against human-scored examples before its scores are shown as a grade.

## Done when

`npx vitest run src/components/InterviewPage.test.tsx` passes, the generated catalog regenerates cleanly (`scripts/interview/`), you answered the question yourself in the UI and the criteria judged it sensibly, and `ship-gate` passed.
