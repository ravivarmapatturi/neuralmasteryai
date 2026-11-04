# Brief: last fixes before the Interview Room ships

Branch interview-speech-test. No push; I ship. The user wants release today and iteration after, so fix only these. Commands in timeouts.

From your real-speech run:
1. Strong answer transcript came out of order and lost its start: "Downstream tasks prompting ... a foundation model is pre-trained...". Weak: "Sets are small in computers use them to process". Next-token: "A fungi model is very common with mole". Debrief quoted "Poopins". Chrome loops fake audio by default, which may cause this: re-run with `--use-file-for-fake-audio-capture=<wav>%noloop` and start the capture exactly at listening. Print the WER of each final transcript against the known script. Require WER under 25% for a pass. If order or starts are still lost, fix the real bug in the room's pipeline (it must not lose the first seconds while the model or worker starts: buffer from mic start). The final pass must run over ALL audio in order.
2. Same follow-up asked twice. Never repeat a probe in a question; if none are left, move on.
3. Don't quote evidence that looks like noise: only quote a sentence that matched a point or a key term; otherwise say no evidence was heard.
4. "Depth when probed" must rest only on answers given after a follow-up.
5. Revert src/data/blogMeta.generated.json and lastUpdated.generated.json to origin/main. Rebase on origin/main. Lab routes stay out of production builds or at least noindex and unlinked; verify. Report what public/ adds compared with origin/main, and remove anything not needed by the room.
6. Run typecheck, links, full vitest, build, the real-speech verify and the 375px check. Commit and paste the 3 transcripts with WER and debriefs.

Do not claim anything you did not run.
