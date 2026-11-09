# Runnable coding questions (plan B6)

First git fetch and merge origin/main. Follow AGENTS.md, the lab and interview-question skills, and section 8 of AGENTS.md on Pyodide. Do not push. No npm run build.

Coding is the biggest gap in docs/plans/interview-week-2026-11.md. Add 20 practical AI engineering coding questions to /interview that run in the browser with real tests, reusing the existing practice problems and Pyodide judge rather than a new engine. Check existing problems first: link to one when it already fits, and write new ones only for what is missing. Topics: text chunker with overlap, BM25 scoring, reciprocal rank fusion, simple reranker, structured output parser with repair, eval harness with a regression check, token bucket rate limiter, request batcher, retry with backoff and jitter, semantic cache lookup with threshold, agent loop with a step budget and loop detection, idempotent tool call wrapper.

Each question: a clear task, starter code, hidden and visible tests that pass with your reference solution and fail on a wrong one (prove this by running a broken version), hints, and a reference solution shown after an attempt. Standard library and numpy only. From the interview question, a plain action opens the code editor and returning keeps your place; completing it counts toward progress once. Works at 375px and in both themes.

Run each solution through the real judge and report pass counts. Write plain human copy. Report what you measured.
