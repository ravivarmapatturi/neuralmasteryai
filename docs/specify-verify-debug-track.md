# Track design: Specify, Verify, Debug (October 2026)

A practice track for the question the user asked on 2026-10-21: *if a coding agent writes correct code, what is left to learn?*

## The question, made precise

Assume the agent's code is always correct **for the instructions it was given**. Everything that still goes wrong then falls into one of five places, and none of them is "typing the code":

1. **The instructions were wrong or incomplete.** The rule said "30 days" and nobody said whose timezone.
2. **The code meets the spec but production doesn't.** Clients retry, caches go stale, a dependency fails first and something else gets the blame.
3. **"Correct" can't be written as a unit test.** An LLM answer has no single expected output, so someone has to define and measure "good".
4. **Several correct designs, one budget.** Each design works. Only one meets 50 requests a second under a p95 of 2 seconds at a cost the business accepts.
5. **Something broke and the evidence is scattered.** Logs, deploys and metrics, plus a decision to make: roll back now, or wait.

Those are the five skills this track trains: **specify** (1), **verify** (3), **debug** (2, 5) and **decide** (4, 5).

## What the research says (2026, sources at the end)

- **Verification is the bottleneck, not writing.** In METR's randomised trial, experienced developers took 19% longer with AI tools while believing they were 20% faster. Most of the time went on reviewing and correcting output, and they accepted under 44% of generations. Team data points the same way: more pull requests merged, review time up 91%, delivery metrics flat.
- **Developers don't trust the output, and they're right not to.** In Stack Overflow's 2025 survey of 49k developers, 46% distrust AI accuracy and 66% name "almost right, but not quite" as their top frustration. Veracode found insecure choices in 45% of 80 security-sensitive tasks across 100+ models, and the rate isn't improving.
- **Hiring has shifted to judgment.** In BairesDev's Q2 2026 survey, 64% of senior developers say juniors over-rely on AI without understanding it, and 50% name weak debugging. Only 5% of juniors name "writing code from scratch" as a hiring factor. CoderPad lists "judgment and verification: can they evaluate, edit and fact-check AI output" as one of three AI-proficiency criteria.
- **Interviews changed to match.** Meta runs an AI-enabled coding round: one multi-stage problem in an existing codebase, often starting with a bug fix. It is scored on problem solving, code quality, verifying the AI's output and communication. Prompting is not scored on its own. LLM-engineer loops now commonly include a standalone evaluation round and production-debugging questions ("retrieval returns the wrong passages, how do you debug it?", "precision dropped overnight", "how do you roll back").
- **Leaning on AI can stop the learning.** Anthropic's January 2026 trial (n=52) found that people who learned a new library with AI help scored 17% lower on a follow-up quiz, with the biggest gap on debugging. People who used the AI to understand the material rather than to generate code kept up. The track is built so the learner does the judging, not the model.
- **Evals start with reading data.** Hamel Husain's evals FAQ calls error analysis the most important activity: read the traces, name the failures, then write binary checks for the frequent ones. It warns against starting from a rubric written before looking at any data.
- **Production LLM failures are mostly silent.** A 2026 eight-week study of a production agent logged 22 incidents. Humans caught about 70% of them while 4,286 automated tests stayed green. RAG failures cluster in chunking, stale indexes and confidently invented "grounded" answers.

## Who it's for

- **Asha** (some Python, new to AI): learns how real systems fail before she learns to build big ones. Every stage is one function she can finish in a sitting.
- **Ravi** (working engineer, interviewing): every stage is an interview question he will actually get, answered by doing it, with the follow-up questions written out.

## Format: one system, twelve situations

One running system, **Helpdesk**: the support assistant of a small online shop. It answers policy questions from documents (RAG) and can look up orders and issue refunds (tools). A coding agent wrote all of it, and the code does what it was told. You own it.

Every stage is a situation (a request, a customer ticket, a log dump, a load target, an incident) and one function to write. The judge checks the function's behaviour, standard library only, in the browser. For the stages about judgment (tests, evals, decisions), the function's *output* is checked against cases built to catch the shallow answer.

| # | Stage | Skill | Interview question it answers |
|---|---|---|---|
| 1 | Turn the request into tests | specify | "How would you know the agent's code is right?" |
| 2 | The code is right, the rule is wrong (timezones) | specify / debug | "Correct code, wrong answer, why?" |
| 3 | Read the logs before the code | debug | "Walk me through debugging an incident" |
| 4 | Retries refund twice | debug | "What breaks when clients retry?" (idempotency) |
| 5 | Stale answers after a policy change | debug | "Your RAG answers are out of date" |
| 6 | Measure retrieval before tuning it | verify | "How do you evaluate retrieval separately from generation?" |
| 7 | Write a check that agrees with people | verify | "How do you evaluate LLM output with no single right answer?" |
| 8 | A judge you can trust | verify | "What goes wrong with LLM-as-judge?" |
| 9 | Will it hold 50 requests a second? | decide | Capacity and cost in LLM system design |
| 10 | A document tells the bot to refund | specify / verify | Prompt injection and tool permissions |
| 11 | Ship it or roll it back | decide | Canary analysis, "how do you roll back safely?" |
| 12 | Capstone: the incident review | all | The full debugging round |

Each stage's page carries:
- what happened,
- what to do,
- why this is still a human job when an agent writes the code,
- where the technique stops working,
- one line to remember,
- **In an interview:** the question, how to answer it, and the usual follow-ups.

## Quality bar (same as the Practice rebuild, plus one rule)

- Every expected output is computed from a reference solution. The build fails if a hand-pinned answer disagrees, or if the starter passes every test.
- Hidden tests each target one specific shallow answer (the off-by-one boundary, the cache key without the version, the loudest error instead of the first one).
- **New rule:** the scenario data is small enough to read in full. A learner should be able to find the bug by reading, not by guessing what a test generator did.
- Plain prose. No "master", no inflated counts, no emoji headers.

## Order of work, and where interview coverage stands

The interview pages hold 171 questions: 145 RAG, 13 LLM fundamentals, 13 agents. All of them are read-and-reveal. Missing entirely: evaluation outside RAG, production debugging outside RAG, LLM serving cost and latency, prompt-injection defence, canary and rollback, the AI-assisted coding round, classical ML breadth, deep-learning training, and fine-tuning.

This track closes the first six of those gaps as checkable exercises, so it comes first. After it, in order:

1. Checkable interview banks for classical ML, deep-learning training, and serving and fine-tuning: short-answer and numeric questions with automatic checking.
2. Converting the existing 171 reveal questions to self-check form where a check is honest (numeric, ordering, pick-the-failure). Pure explanation questions stay as reveal-and-compare.

## Sources

- METR randomised trial, via [DX's summary](https://getdx.com/blog/metr-study-on-how-ai-affects-developer-productivity/) and [The Register](https://www.theregister.com/2025/07/11/ai_code_tools_slow_down/)
- [Stack Overflow 2025 survey coverage, InfoWorld](https://infoworld.com/article/4031673/ai-use-among-software-developers-grows-but-trust-remains-an-issue-stack-overflow-survey.html)
- [Veracode 2025 GenAI Code Security Report](https://www.veracode.com/resources/genai-code-security-report/)
- [BairesDev Dev Barometer Q2 2026](https://www.bairesdev.com/blog/dev-barometer-q2-2026-ai-career-reset/)
- [CoderPad State of Tech Hiring 2026](https://coderpad.io/survey-reports/coderpad-state-of-tech-hiring-2026/)
- [interviewing.io on Meta's AI-assisted coding round](https://interviewing.io/blog/how-to-use-ai-in-meta-s-ai-assisted-coding-interview-with-real-prompts-and-examples)
- [What GenAI engineer interviews test](https://www.techinterview.org/post/3233476396/what-genai-engineer-interviews-test/)
- [Anthropic: How AI assistance impacts the formation of coding skills](https://www.anthropic.com/research/AI-assistance-coding-skills)
- [Hamel Husain, LLM evals FAQ](https://hamel.dev/blog/posts/evals-faq/)
- [Silent failures in a production LLM agent (arXiv 2606.14589)](https://arxiv.org/html/2606.14589v1)
- [Skills for the future software profession (arXiv 2606.21894)](https://arxiv.org/html/2606.21894v1)
- [Simon Willison, 22 August 2026](https://simonwillison.net/2026/aug/22/more-than-just-code-review)
