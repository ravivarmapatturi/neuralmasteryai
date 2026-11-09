# Debug this track and level tags (plan B5 and B4)

First git fetch and merge origin/main. Follow AGENTS.md, the interview-question and writing-voice skills. Do not push. No npm run build. Same accuracy and speakable standard as docs/briefs/questions-quality-pass.md.

1. B5: 30 "Debug this" questions as a new topic. Each gives a realistic production failure with concrete evidence in the question text: for example, retrieval recall dropped after a re-index with sample metrics, latency tail grew after enabling continuous batching, an eval score rose but user complaints rose too, an agent's cost doubled after a prompt change. The answer walks through the hypotheses in order, how to test each one, the actual cause, the fix, and how to prevent it again. Add the graph topic with a short name and a matching small visual. Numbers in scenarios are scenario data, which is fine; keep them internally consistent.
2. B4: add a `level` tag (mid, senior, staff) to all questions you can judge honestly, plus a level filter next to round and role on /interview. Use the same filter logic so Previous and Next respect it. Record how you assigned levels.
3. Fix `date` in docs/evidence/interview/market-map.csv: every row says 2026-02. Use each posting's real date, or leave it blank when the page shows none. Do not guess. Add first-hand candidate reports only if you can open them.

Update tests, screenshot the new filter at 375 and 1440, and report real counts.
