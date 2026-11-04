# Brief: Interview Room iteration 3

Branch interview-speech-test. No push; I ship. One commit per item, with commands in timeouts. Same gates, and paste real output.

1. Bug: the "Next question" button in the listening screen advances without saving the current question, so the session debrief drops it. Save what was said, and show unanswered questions as not answered instead of scoring them. Add a test.
2. Better accuracy: if not already wired, stream with Moonshine Tiny during speech and run a Whisper Base pass on the full recording when the answer ends, then judge the refined transcript. Measure on the real-speech WAVs before and after, and report rubric agreement as well as WER.
3. Judge: agreement against gold is 56.3% and conflict recall was 28%. Find the most common wrong decisions on the gold set, list them, and improve thresholds or rubric wording without overfitting. Hold out at least 30% of gold and report held-out numbers only.
4. Full-flow test on the production build at 375px and desktop: pre-recorded audio plays, the skip button works, and typed and fake-mic answers both reach the session debrief. Use Chromium's fake audio device and say it is fake.

Do not change the approved look. Check free -g first; one heavy job at a time, another agent is also running.
