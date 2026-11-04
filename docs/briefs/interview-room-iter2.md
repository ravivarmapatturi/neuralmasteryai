# Brief: Interview Room iteration 2

Branch interview-speech-test, rebased on origin/main. No push; I ship. Commands in timeouts.

Version 1 is going live. Improve in this order, one commit each:
1. Load all 20 questions and the 5 transitions from ../../vaayuedge-model/docs/evidence/interview-content/questions.json into src/data/interviewRoomQuestions.json. Check every next_practice route exists. The session picks 4 questions, or 2 for the short length, varied between sessions.
2. Debrief wording. Today it reads: "We did not hear evidence for: pretrained at scale on massive; acts as a shared base...". Rewrite to natural prose matching the mock-up (docs/interview-room-reference.html): use a short human label for each point, no truncated claims, no semicolons lists, one or two sentences. Do not mark down a true statement merely for being outside the rubric: if a learner gives a sensible trade-off, the row should show it. The next-token test answer contains "XGBoost much cheaper for tabular data" yet Trade-offs says "Not heard yet": fix that.
3. Session debrief across questions, with one overall call, plus per-question detail. Keep the same look.
4. Real-speech verify on 2 more questions with spoken WAVs, WER under 25%. Same gates: typecheck, links, vitest, build, 375px.

Commit and paste real debrief text. Do not claim anything you did not run.
