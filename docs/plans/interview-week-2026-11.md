# /interview: one-week plan (9 to 16 November 2026)

Goal: the best place to prepare for senior AI engineering interviews. Two questions drive everything. Do we cover what high-paying interviews ask today? Is practising here better than anywhere else?

Rules for every item: follow AGENTS.md; one agent per set of files; lead reviews before shipping; CI gates deploys; no fine print or marketing text; report only what was measured.

## A. Coverage audit (what we found)

Public 2026 sources agree on the themes: LLM app design has largely replaced recommendation systems as the common design prompt, and coding has moved to practical pieces (chunking, retrieval, reranking, parsing, eval harnesses). Sources are mostly prep sites and candidate reports, so treat them as signals. We have no verified first-hand reports from OpenAI, Anthropic or Indian 40 LPA loops.

A keyword check of our 777 questions (title matches, a rough screen and not proof) shows:

| Theme | Questions | Status |
| --- | --- | --- |
| Hands-on coding: chunker, BM25, reranker, output parser, eval harness, batcher, rate limiter | 14 coding questions; 0 titled implement chunker or BM25 | Biggest gap |
| Distributed training | 0 | Gap |
| Idempotent agent actions, tool permissions, policy layer | 0 | Gap |
| GPU quota and credit systems, multi-tenant fairness | 0 | Gap |
| AI governance and audit | 1 | Gap |
| Agent termination and loop prevention | 1 | Gap |
| Feature stores, A/B testing, recommendation systems (classical MLOps and big-tech loops) | 1, 4, 5 | Thin |
| Continuous batching, A2A, quantization, model routing | 2 each | Thin |
| Prompt caching, semantic cache, indirect injection, rate limits, voice | 4 to 5 each | Thin |
| RAG, evals, MCP, coding agents, project stories, fine-tuning | 8 or more | Good |

## B. Better questions

1. Build `docs/evidence/interview/market-map.csv`: real recent reports and job descriptions (company, role, level, date, URL, theme). Never claim a company asked something without a source.
2. Fill gaps in the order above, 100 to 150 new questions, deduplicated against the bank. Each has a model answer of about 2 minutes, trade-offs, follow-ups, a common wrong answer, role and round tags, and a source for the theme.
3. Add a key-point rubric to each question: 3 to 6 points a strong answer must hit. The answer check then scores against these, which is more honest than similarity to one model answer.
4. Tag by level (mid, senior, staff) and show "Reported at" only when sourced.
5. New track, "Debug this": a realistic failure with data, such as retrieval recall dropped after a re-index. Debugging is a common round.
6. Add coding questions that run in the browser with real tests through the existing Pyodide judge.

## C. Experience improvements

1. Mastery graph (owner request). Each topic node and its spokes get brighter and thicker as questions are completed, using a smooth scale from 0 to 100%. Show the percentage beside the label. Group arcs show group totals. Motion stays subtle and respects reduced motion; must be readable in both themes and at 375px.
2. Spoken follow-up. After your answer, the interviewer asks one follow-up, picked from the rubric point you missed. This is the closest thing to a real interview and few prep tools do it on-device.
3. Attempt history. Keep each attempt's score and transcript on the question, so you can see your second try beat your first. Practice again then shows the comparison.
4. Delivery feedback: answer length against a target, pace, filler words, and long silences. Measured on the transcript and timing only.
5. Review queue. Questions you did badly on come back on a spaced schedule, using the existing spaced repetition logic. "Today's 10" mixes due reviews and new gaps.
6. Readiness per role. Applied AI, Agentic, Inference, Evaluation: a score built from coverage and rubric results, listing the weakest three topics. Never a pass prediction.
7. Timed mock loop. Pick a role and 30 or 60 minutes; get a realistic screen, depth and design mix without seeing answers until the end, then a scorecard.
8. System design canvas. For design questions, sketch boxes and arrows while talking, then compare with a reference architecture diagram.
9. Find and filter: search by text, bookmarks, filter by level, unanswered and weak. Clear filter state in the URL.
10. Polish pass: one primary action per screen, stable layout between steps, error states for mic and model loading, keyboard and screen reader pass, 375px pass.

## Order and owners

| Day | agy | Codex | Lead |
| --- | --- | --- | --- |
| 1 | Finish senior answer review | Speech: Standard and High accuracy tiers | Review, ship |
| 2 | C1 mastery graph | Finish speech, real-mic test checklist | Review, ship |
| 2-3 | B1 market map, B2 first 50 questions | C3 attempts and B3 rubric engine | Quality-sample questions |
| 4 | B2 next 50 to 100, B5 debug track | C2 spoken follow-up | Review |
| 5 | B4 tags, B6 coding questions | C5 review queue, C6 readiness | Review |
| 6 | C9 find and filter, C10 polish | C7 timed mock loop | Review |
| 7 | Mobile and theme pass | C8 canvas if time allows; C4 delivery feedback | Full walkthrough, weekly report |

Parked: focus-sync emulator test (WIP commit in the speech worktree) resumes when Codex has a gap.

## How we know it worked

- Every gap in table A has at least 5 reviewed questions, or a written reason why not.
- Rubric scores agree with a hand-marked sample of 30 answers; report the agreement.
- Spoken flow works on a real mic, confirmed by the owner.
- CI green, and no overflow at 320 and 375px.

## Sources

- [Exponent: AI engineer interview questions](https://www.tryexponent.com/blog/ai-engineer-interview-questions)
- [Technical interview post: what applied-AI engineer interviews test in 2026](https://www.techinterview.org/post/3233476824/ai-engineer-interview-rag-agents-evals/)
- [ML engineer interview in the post-LLM era](https://www.techinterview.org/post/3233474925/ml-engineer-interview-post-llm-era/)
- [PracHub: generative AI system design questions](https://prachub.com/resources/generative-ai-system-design-interview-questions-rag-agents-evals-and-guardrails)
- [Masai: AI engineer salary in India 2026](https://www.masaischool.com/blog/ai-engineer-salary-in-india-2026-fresher-to-10-years-experience/)
- [Senior ML interview process guide](https://interviewkickstart.com/blogs/articles/senior-machine-learning-engineer-interview-process)
