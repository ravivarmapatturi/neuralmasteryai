# Brief for Codex: question-specific interview criteria

**Goal:** every one of the 241 bank questions gets 2-5 criteria and a follow-up specific to that question. Today 14 have them; 227 still show the same three generic lines.

**Read first:** `AGENTS.md`, `.agents/skills/interview-question/SKILL.md`, `.agents/skills/writing-voice/SKILL.md`.

## What to edit

Only `src/data/interviewCriteria.json`. Add one entry per question id from `src/data/interviewCatalog.generated.json`. Follow the 14 existing entries exactly (see `cml-high-variance-tree` and `cml-base-rate`).

```json
"<question id>": {
  "criteria": ["...", "..."],
  "followup": "..."
}
```

## Rules

- Write criteria from **that question's own `answer`**. Every criterion must be something the model answer actually contains. Don't add facts it doesn't have.
- Each criterion is one checkable thing, starting with a verb: "Computes…", "Names…", "Explains…", "Proposes…", "Distinguishes…".
- `calculation` questions: the first criterion states the computation and the result with the same numbers as the answer.
- `choice` questions: one criterion for the correct mechanism, one for why the tempting wrong option fails.
- Count: 2-3 for calculations, 3-5 for everything else.
- `followup`: take the first bolded follow-up question from the answer's "Follow-ups you'll get" section when it exists; otherwise write the most natural next question an interviewer would ask. Never use the generic "What assumptions does your answer depend on…".
- Plain English. No banned phrases (see `writing-voice`).

## Batches

Work one bank at a time, in this order: classical-ml, deep learning / training, serving & fine-tuning, LLMs & agents, then the rest. After each bank:

```bash
npx vitest run src/components/InterviewPage.test.tsx
node -e "const d=require('./src/data/interviewCriteria.json');const q=require('./src/data/interviewCatalog.generated.json').questions;console.log(Object.keys(d).length-1,'of',q.length)"
npm run typecheck
```

Commit each bank separately: `feat(interview): specific criteria for <bank> (<n> questions)`.

## Hard gate (added after review)

The first RAG attempt was rejected: all 117 entries were answer sentences with "States:/Explains:" labels. Before every commit run:

```bash
npm run check:criteria
```

It must print `0 problem(s)`. It rejects labelled fragments, criteria that don't start with a verb, criteria over 160 characters, and 14-word runs copied from the answer. Do not generate criteria with a script: write each one from reading the answer.

## Done when

`npm run check:criteria` prints `241 of 241` and `0 problem(s)`, every test passes, and the tracker row is marked `COMPLETED`. This is light work: no build needed, and it's safe to run while nothing else heavy is running.
