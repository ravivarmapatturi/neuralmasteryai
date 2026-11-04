# Brief: build the real Interview Room behind one question flow

Read AGENTS.md. Branch interview-speech-test. No push or deploy; I review and ship. 8 GB RAM.
Approved experience: https://claude.ai/artifact/QRE9ijF9pMsrr7xDaQ4Ce6
Content: ../../vaayuedge-model/docs/evidence/interview-content/questions.json (3 GenAI Engineer questions, follow-ups, wrong-answer probes, dialogue rules). Copy into src/data; keep its AI-written status out of user copy but noted in code comments.
Judge code to adopt: ../platform-vite-figs/src/lib/answerJudge.ts and .test.ts, and its engine and worker changes (copy them, do not change that folder). Measured: missed-point detection 88% recall, conflict detection only 28%, so never say an answer is "wrong" from the model alone. Use the words "covered" and "not heard yet".

New route /interview/room, linked from /interview as a clear primary action. Keep the existing /interview list working. Flow:
1. Choose track (GenAI Engineer only for now) and allow the microphone once.
2. Interviewer speaks with browser speech synthesis at first, using the best available en-IN voice, then en. Question text hidden, with a "Repeat as text" control.
3. Listening starts automatically when speech ends: Moonshine single-thread in a worker, live words on screen. Load models in the background on the setup screen with visible progress. If the mic or model fails, offer typing; nothing should be a dead end.
4. End of answer: long pause (start at 6 seconds, setting in one constant) and an "I'm finished" button. Never cut in below that.
5. After the answer, run a final pass on all the audio for a cleaner transcript, apply per-question term correction (for example "Laura" to "LoRA" on the LoRA question), and evaluate that.
6. Choose a follow-up by the dialogue rules, with at most 2 per question. Guard against buzzword answers: a point isn't covered by similarity alone unless the answer is long enough and contains a key term from that point.
7. Debrief: overall call, one thing to practise, signals with quotes of the learner's own words, and the marked transcript. State plainly that this is an automated estimate and that speech recognition can mishear. Audio and answers stay on the device; say so only if verified with a network check.

Must: work on GitHub Pages with no special headers; no horizontal overflow at 375px; dark and light; keyboard usable; cancel audio and mic on leaving; no model loaded on other routes; main bundle not grown (lazy route). Remove nothing else. Keep the lab pages noindex and unlinked. Do not ship sherpa files or Moonshine multi-thread to production: remove them from public/ and package.json if unused.

Done means: unit tests for the dialogue logic and term correction; Playwright run with fake audio through a full question to debrief on a server with no special headers, failing on empty results; typecheck, links, full tests, build all pass. Commit and paste results. Do not claim anything you did not run.

## Must match the approved mock-up (overrides anything above)
The user has shown docs/interview-room-reference.html to clients, who liked it. The live room must match it: same screens in the same order, same layout, type, colours in both themes, copy, live-transcript treatment, "Repeat the question as text", "Skip ahead", and debrief structure (call, Practise this next with Answer it again, rows with pills and quotes, marked answer, Start over). Port its CSS scoped to this route, and load its fonts only here. Remove the "Mock-up" footnote. Compare screenshots of each screen side by side at 1440 and 375, in light and dark, and commit them.

Differences allowed only where the mock-up would mislead: the footnote becomes a short honest note that this is an automated estimate and speech can be misheard. Track, level and length controls: show only options with real content; report any that cannot be offered yet rather than showing dead ones. Debrief text comes from pre-written rubrics with the learner's own quotes, never invented.
