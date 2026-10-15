# Practice rebuild (October 2026)

Why Practice was rebuilt, who it's for, how it's organised now, and the bar a problem has to clear before it's shown.

## What was wrong

A review of the live site on 2026-10-15 found:

- **Volume over quality.** 1,549 problems spread across 54 topics that overlapped each other ("Classical ML" vs "Classical Machine Learning", two "Transformers & LLMs", NumPy/Pandas split three ways), plus orphan topics with 1–3 problems.
- **Titles that promised more than the task.** "#092 ReAct Loop From Scratch" only checked that three strings were non-empty. Some curriculum entries were placeholders: `mlops_and_data_systems_module_2_problem_8(*args, **kwargs)`, with a "test" that expected `True` from empty input.
- **No difficulty curve.** All 30 Agent Loop problems were "medium".
- **Generator boilerplate on every page.** "Practice: Practice:" titles, "#861. … Rank #861 of 1072 · 40 XP", "Master X in the Y track of the 1,000+ problem curriculum", a "How to solve this, step by step" box that printed the algorithm before the learner had tried anything, and URLs like `/practice/agent-loop-prob-2`.
- **A headline that read as AI-generated.** "Practice AI — 1549 Real, Hands-On Problems". The user said it directly: people can tell.

## What the good ones do (research, kept short)

| Reference | What makes people come back | What we took |
|---|---|---|
| **CodeCrafters** ("build your own Redis/Git") | One real program, built in stages. Each stage is a small, tested increment on *your* previous code. | Project tracks: each stage's starter contains the finished code of the stages before it. |
| **Karpathy, micrograd / nn-zero-to-hero** | You build the whole thing in about 100 lines and understand every line. Nothing is hidden behind a library. | Standard-library-only stages, small enough to read in full. The capstone is about 60 lines you wrote yourself. |
| **deep-ml.com** | One function, a precise spec, real tests, a reference solution after you try. | Kept the single-function format and the hidden tests. The reference solution stays collapsed under the write-up. |
| **Exercism** | Hand-written problem statements, test suites that catch the edge cases, and a "learning exercise → practice exercise" ladder. | The quality bar below: every hidden test is there to catch a specific mistake. |
| **LeetGPU** | Immediate, exact feedback from real execution. | In-browser Pyodide judging with exact expected outputs. A scripted model makes even the agent tests deterministic. |
| **fast.ai** | Top-down: you get something working first, then dig into why. | Stage 1 runs right on `/practice`, and the write-up comes after the code. |

**Reuse (per the standing "check open source first" rule).** The agent track's *content* is original. Nothing open covers "build a tool-calling agent step by step with deterministic tests", but the *pattern* is borrowed from CodeCrafters. The other ten tracks reuse the best of the existing catalogue instead of generating more. Open-Deep-ML's MIT-licensed problem set (`scratch/add_open_deep_ml_problems.py` in the main checkout was an earlier attempt) is the obvious source for upgrading the math/ML/DL tracks. It's listed as a follow-up below.

## Two learners

### Asha: knows some Python, new to AI

- **Finds useful:** a first problem that runs in ten seconds with no account. Problems small enough to finish in one sitting. Being told why a step matters before being asked to do it. A link back to the lesson when she's stuck.
- **Bored or scared off by:** walls of 1,500 problems with no order. Jargon titles ("Medusa Multi-Head Speculative Acceptance"). Tests that fail with no explanation. XP and badges that feel like a game layered over nothing.
- **Comes back for:** visible progress through something that *becomes* something ("I'm on stage 5 of building an agent"). The next problem is always obvious, and every problem is honest about what it teaches.

### Ravi: working engineer, preparing for AI-engineer interviews or building agents

- **Finds useful:** problems that mirror production failures he'll actually hit (orphaned tool results, runaway loops, parallel tool-call IDs, eval harnesses). Exact specs. Hidden edge-case tests that catch real bugs (`bool` is an `int`, `JSONDecodeError` isn't `ValueError`). A capstone he could talk about in an interview.
- **Bored by:** toy one-liners dressed up with big titles ("return tool_to_server[tool_name]"). Inflated counts. Answers in the problem statement. Being made to read beginner prose to get to the spec.
- **Comes back for:** depth over breadth: a track he can't fake, a reference solution to compare against after he passes, and the feeling that he now understands what the frameworks (LangGraph, the OpenAI Agents SDK, Claude Code's loop) are doing underneath.

### Design principles derived from them

1. **Fewer, better problems.** Show only curated work and say the real count. Never inflate it.
2. **Tracks are paths, not buckets.** Each one runs easy → hard. Where possible a track is one project built in stages.
3. **The spec is exact; the tests are honest.** Visible examples teach, and hidden tests each target a specific mistake. A starter that passes any test is a broken problem (checked automatically).
4. **Explain after, not before.** Hints and the reference solution sit behind deliberate clicks. The write-up covers what, how, why, the limitation, and one line to remember, and ends with a bridge to the next stage.
5. **A real-world hook in every problem**: the production failure or interview question it maps to.
6. **Plain, human presentation.** No "Master X", no rank or XP boilerplate, no emoji headers, no generated-sounding superlatives. Descriptive URLs.

## The new structure: 11 tracks (was 54)

| # | Track | Kind | Level | Problems |
|---|---|---|---|---|
| 1 | **Build an Agent** | project (pilot) | Intermediate | 12 |
| 2 | Python for AI | curated set | Beginner | 19 |
| 3 | NumPy & Data Wrangling | curated set | Beginner | 18 |
| 4 | Math for ML | curated set | Beginner | 18 |
| 5 | Classical ML from Scratch | curated set | Intermediate | 21 |
| 6 | Neural Networks by Hand | curated set | Intermediate | 24 |
| 7 | Inside an LLM | curated set | Intermediate | 22 |
| 8 | RAG & Retrieval | curated set | Intermediate | 21 |
| 9 | Agents in Production | curated set | Advanced | 24 |
| 10 | ML Systems & MLOps | curated set | Advanced | 14 |
| 11 | Coding Interview Patterns | curated set | Intermediate | 38 |

231 curated problems in total. The source of truth is `src/data/practiceCatalog.ts`. The other ~1,330 files are **hidden, not deleted**: their URLs still work, but they're out of every list, count, recommendation and the sitemap. The 31 that duplicate a curated problem redirect to it (for example `/practice/ds-algo-prob-1` → `/practice/reverse-a-singly-linked-list`).

Each curated set is meant to become a project track like the pilot. Proposed projects:

- **Neural Networks by Hand** → build micrograd, then an MLP trainer.
- **Inside an LLM** → build a tiny GPT forward pass, then the sampler, then a KV cache.
- **RAG & Retrieval** → chunker, then index, then hybrid retriever, then re-ranker, then grounded-answer checker.
- **Classical ML** → a small scikit-learn: fit/predict for 5 models plus metrics.
- **Coding Interview** → stays a pattern ladder, since that's how interviews actually work.

## The quality bar for a single problem

A problem ships only if it has all of these:

1. **An exact spec.** Return types, error types and message strings are stated, so a correct solution can't fail on wording.
2. **Visible examples that teach** (about 4) and **hidden tests that catch specific mistakes** (about 5). Each hidden test has a label saying what it catches.
3. **Machine-checked tests.** Every expected output is computed from a reference solution, hand-pinned expectations must agree with it, and the starter code must fail at least one test.
4. **A worked intuition**: what / how / why it matters in production / where it breaks / one line to remember, then a bridge to the next problem.
5. **A real-world hook** in the "why it matters" line.
6. **A link to the matching Learn page.**
7. **A collapsed reference solution**, shown only after a click.
8. **A descriptive URL and title**, with no generator boilerplate.

## The pilot: Build an Agent (12 stages, 106 tests, 55 hidden)

| # | Stage | Difficulty | What it adds |
|---|---|---|---|
| 1 | Parse a Tool Call From Model Output | easy | JSON out of prose and fences, one error type |
| 2 | Validate Tool Arguments Against a Schema | easy | JSON Schema subset, the `bool`-is-`int` trap |
| 3 | Dispatch Tool Calls Without Crashing the Agent | easy | every failure becomes an observation |
| 4 | The Agent Loop | medium | the ReAct loop; the model only knows `messages` |
| 5 | Recover From Malformed and Failing Tool Calls | medium | errors fed back in context, circuit breaker |
| 6 | Guardrails: Loop Detection and Token Budgets | medium | repeat-call signatures, context budget |
| 7 | Trim Context Without Orphaning Tool Results | medium | pinned task, atomic call/result groups |
| 8 | Parallel Tool Calls With IDs | medium | `tool_call_id` matching, isolation, fan-out cap |
| 9 | Long-Term Memory Recall | medium | relevance, then recency, then id |
| 10 | Plan-and-Execute With Dependencies | hard | DAG validation, Kahn ordering, skip cascades |
| 11 | Evaluate Your Agent | hard | outcome vs trajectory metrics, failure reasons |
| 12 | Capstone: A Production Agent Loop | hard | all of the above + cumulative cost + trace |

**How the tests stay deterministic.** The model is scripted (`make_llm(script)`), but it still *reads* the conversation. Placeholders like `{last_tool_result}` and `{context_size}` are filled from the messages the learner's loop actually sent it. A loop that forgets to append a tool result therefore produces a wrong answer, just as it would with a real model.

**Source:** `scripts/practice/agent_track/` (`stages.py` holds prose and tests, `solutions.py` the references, `build.py` the generator and checker). Run `python3 -I scripts/practice/agent_track/build.py` to regenerate, or add `--check` to verify only.

**Verified:** all 12 reference solutions pass all 106 tests in CPython (`build.py`) *and* in the browser's Pyodide judge (Submit on each page).

## Follow-ups (not done here)

- Convert the next track into a project (Neural Networks by Hand → micrograd), reusing Open-Deep-ML where licensing allows.
- Write per-problem intuition for the curated sets. Many still have only a short Overview/Task, without the full what/how/why/limitation write-up.
- Carry the learner's *own* code forward between stages (today the starter carries the reference code).
- A sitewide "doesn't feel AI-generated" pass beyond Practice, starting with the homepage Learning Path section the user flagged.
