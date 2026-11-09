# Senior interview answer review

First git fetch and merge origin/main. Follow AGENTS.md and the interview-question and writing-voice skills. Do not push.

Review all 79 questions in src/data/interviewSeniorQuestions.json as a senior AI/ML interviewer for 30-40 LPA roles. For each, record in docs/evidence/interview/senior-review.csv: id, verdict (ok or fixed), and the reason. Fix answers that are factually wrong, vague, missing the trade-off a senior candidate must state, or AI-sounding. Keep answers speakable in about 2 minutes. Do not invent numbers: any figure must be well established, or be removed. Do not add or remove questions. Rebuild with scripts/interview/build_practice_data.py and confirm the question total stays 777. Run the interview tests and typecheck only. Commit in batches and report the real counts from the CSV.
