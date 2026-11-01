---
name: lab
description: Rules for building a Neural Mastery Lab (/labs): practice problems, DecisionLab, FailureLab, WouldYouShipThis, design experiments, coding exercises. Use whenever creating or changing a lab or practice problem.
---

# Building a lab

A lab makes the learner **decide and see the consequence**. Reading is not a lab. Every lab has: a situation, constraints, a prediction, an action, an observable result, and a short decision record. Existing patterns: `src/components/practice/{DecisionLab,FailureLab,WouldYouShipThis,DesignExperiment,PracticeWorkspace}.tsx`; catalog in `src/data/practiceCatalog.ts` and `src/data/practice/*.generated.json`.

Also load: `visualization`, `writing-voice`, `ship-gate`.

## Pick the lab type

| Type | Use when | Must contain |
| --- | --- | --- |
| Coding problem (`PracticeWorkspace`) | A skill is best built by implementing it | Starter code, 4-8 visible tests incl. edge cases, hidden tests, a reference solution behind `<Solution>`, complexity note |
| Decision lab | Two or more reasonable designs exist | Scenario with real constraints (latency, cost, data size), 2-4 options that are each right somewhere, consequences per option, "when the other choice wins" |
| Failure lab | A system fails in a non-obvious way | A symptom (log, metric, wrong output), 3-5 hypotheses, evidence the learner reveals step by step, the root cause, the fix, how to detect it next time |
| Would you ship this? | Judgement on a diff/PR/eval | A realistic artifact, a checklist of what to inspect, the verdict with reasons |
| Experiment | A parameter's effect is the lesson | One variable, a prediction prompt, a live chart, what to notice |

## Rules

1. **Situation first**, in plain language with a named system and numbers: "Your RAG bot answers 2,000 queries/day; p95 latency is 4.1s; the SLA is 2s."
2. **Prediction before action.** Ask the learner to commit (choose/estimate) before showing the result.
3. **Feedback explains, not just grades.** Wrong choices get "why it seemed right, why it fails here".
4. **Include a failure case** and when the alternative design is the better choice.
5. **Grading mechanics stay hidden** inside the exercise. Learner-facing text never mentions fixtures, JSON schemas or hidden tests.
6. **Tests are real.** Run the reference solution against every test in Pyodide; also run one known-wrong solution and confirm it fails. Record both in the PR notes.
7. **Link back** to the Learn page that teaches the concept, and from that page to the lab.
8. Difficulty label (Intro / Core / Advanced) matches the prerequisites actually needed.
9. Keep `/practice/...` URLs working; `/labs` is the entry point.

## Done when

Reference solution passes, wrong solution fails, the full flow works with keyboard only, at 375px, in both themes, and `ship-gate` passed.
