# Quality pass on market map and new questions

First git fetch and merge origin/main. Follow AGENTS.md and the writing-voice skill. Do not push. No npm run build.

Review of your last batch found problems. Fix them before writing anything new.

1. Market map. Many rows are not evidence: careers.swiggy.com and atlassian.com/company/careers are generic pages, jobs.ashbyhq.com/sarvam-ai returned 404. Every row must link to one specific posting or one specific report that you opened in this session, and the theme must be stated on that page. Delete any row that fails; a shorter true list is the goal. Add a `verified_on` date. Report rows kept and removed.
2. Your 50 new questions. Re-check every technical claim. Examples to fix: "completely eliminating gradient underflow" (BF16 reduces it, it does not remove it), "zero false positives" for regex, and unsourced latency numbers stated as fact. State typical numbers as rough, or remove them. Avoid invented product-style names such as "Execution Budget Circuit Breaker"; describe the mechanism.
3. Rewrite them for speaking aloud. A candidate says these in an interview: use short plain sentences, first explain the idea, then the trade-off, no stacked jargon or bracket lists. Keep the 2-minute length. Keep every answer's real content. Record each change in docs/evidence/interview/new-questions-review.csv with id, verdict and reason.
4. Only then add the next 50 questions (plan B2): thin themes first (continuous batching, A2A, quantization, model routing, feature stores, A/B testing, recommendation systems, prompt caching, semantic cache, rate limits, voice), to the same standard.

Rebuild with scripts/interview/build_practice_data.py, run interview tests and typecheck, and report real counts.
