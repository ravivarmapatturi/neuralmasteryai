# Spoken follow-up checkpoint — 9 November 2026

Status: implementation prepared; runtime verification blocked by available memory. Do not treat this checkpoint as release sign-off.

## Behavior implemented

After the model answer is visible and main transcription has finished, questions with `followUps` offer **Answer a follow-up**. The existing bank has 438 such questions out of 777; the 79 rubric questions have no follow-ups yet. No new question content was invented for this change.

Selection prefers a bank entry sharing substantive terms with a Not detected point, preserving bank order on ties. This lexical routing heuristic is not a correctness check. If the review is pending, unavailable or has no matching terms, selection uses the first bank follow-up. Source-bank level labels and appended `Expected:` answer notes are removed from the spoken question.

The prompt uses `speakInBrowser`, the existing on-device Kokoro `am_michael` voice. The learner can answer aloud or type. The main answer screen and its Previous, Next and Practice again controls remain present during asking, answering, final transcription and saved states. Other read-aloud controls and model switching are disabled during an active follow-up to avoid overlapping playback or swapping the active recognizer.

The follow-up reuses the parent's speech engine. It does not allocate a second ASR engine. Cancellation closes voice playback and capture, stops mic tracks, and invalidates pending permission/setup callbacks. Final ASR shares the parent's finalization fence before the next answer can start.

Prompt and transcript are attached to the attempt, with draft updates while typing or receiving live words and a final saved state. Main review and follow-up fields merge independently, so a late review cannot erase the follow-up or vice versa. Follow-up revisions preserve corrected drafts. Existing count and 200,000-byte history limits apply; follow-up prompts are capped at 1,000 characters and transcripts at 4,000. The existing account sync and JSON backup paths carry this normalized field. Earlier-attempt details display it.

## Verification observed

| Check | Result |
| --- | --- |
| Fetch/merge origin/main | Merged; preserved tracker entries, history CSS and mastery graph CSS in conflict resolution (`3d8626f2`) |
| Checklist/history label correction | `bbd70f12` |
| Sentence-pair experiment, disabled by default | `6c2b6551`; real-model run stopped at 2,030 MiB before page creation; no after measurement |
| Focused judge/history tests before follow-up changes | 14 passed in 2.00s |
| TypeScript syntax parsing | Passed for main screen, follow-up component, attempts, selector and browser spec; not a typecheck |
| Internal links and anchors after follow-up changes | Passed; 1,967 MDX files, 986 TSX files scanned |
| Final full typecheck | Refused by 2 GiB memory floor; earlier attempt stopped at 1,972 MiB |
| Final full Vitest | Refused by 2 GiB memory floor |
| MDX compilation | Refused by 2 GiB memory floor |
| Final Playwright interview-room suite | Refused by 2 GiB memory floor; no new browser case has a measured pass |
| Build | Not started; available RAM below required 5 GB |
| Responsive/theme screenshots and console review | Pending; no browser run was possible |
| Physical mic, actual follow-up TTS/ASR quality | Not measured |

The prepared browser tests replace only worker inference, retaining the real worker clients, voice playback scheduling, Web Audio capture and mic-track cleanup. Fifteen new cases cover typed save/late-review/reload, voiced capture/save, all combinations of four follow-up phases and three navigation actions, and permission-denial/late-permission cleanup. The voice test supplies a synthetic tone to real capture and uses an ASR response double; it is not a speech accuracy measurement. New unit cases cover routing, expected-answer removal, independent merge ordering, bounds, backup/restore and main-transcript merge stability. These additions still need to run.

## Resume verification

Keep heavy jobs sequential and retain `scripts/speech-accuracy/with-memory-floor.mjs`. Use a Vite server on port 4173 for development browser tests (the existing Playwright configuration reuses it); stop it before full typecheck/tests/build. Run focused tests first, then the complete gates and browser suite. Check light/dark at 375 and 1440 pixels, including overflow and console errors. Full build requires at least 5 GB available as checked with `free -g`.

Run both fixed-sample commands in `rubric-evaluation.md` with Vite on 5173 once memory permits. Keep sentence pairs disabled unless recall improves without increasing false positives. The fixed 30-answer sample and all manual marks remain unchanged. No sample-specific tuning has been applied; a new held-out set is needed if later tuning uses this sample repeatedly.

All dev server/browser processes started for this checkpoint were stopped. Other applications and other worktrees' processes were left untouched. No push.
