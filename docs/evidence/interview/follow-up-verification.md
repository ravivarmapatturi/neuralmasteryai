# Spoken follow-up checkpoint — 9 November 2026

Status: implementation committed; pending interview browser and visual verification completed in the continuation below. Broader production gates remain separate. Do not treat this checkpoint as release sign-off.

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
| Focused final judge/history/follow-up selector tests | 20 passed in 3.53s |
| Scoped TypeScript check | Passed for main screen, follow-up component, and judge/history/selector tests with project compiler options; full project typecheck remains blocked |
| Internal links and anchors after follow-up changes | Passed; 1,967 MDX files, 986 TSX files scanned |
| Final full typecheck | Refused by 2 GiB memory floor; earlier attempt stopped at 1,972 MiB |
| Final full Vitest | Refused by 2 GiB memory floor |
| MDX compilation | Refused by 2 GiB memory floor |
| New typed follow-up browser case | Passed individually in 8.0s total: late review, save, retry, history, reload |
| Full Playwright interview-room suite | First 17 existing cases passed; guard stopped the process at 2,040 MiB before rubric and follow-up cases. No final full-suite pass. Voice/navigation follow-up cases unrun |
| Build | Not started; available RAM below required 5 GB |
| Responsive/theme screenshots and console review | Pending; no browser run was possible |
| Physical mic, actual follow-up TTS/ASR quality | Not measured |

The prepared browser tests replace only worker inference, retaining the real worker clients, voice playback scheduling, Web Audio capture and mic-track cleanup. Fifteen new cases cover typed save/late-review/reload, voiced capture/save, all combinations of four follow-up phases and three navigation actions, and permission-denial/late-permission cleanup. The voice test supplies a synthetic tone to real capture and uses an ASR response double; it is not a speech accuracy measurement. New unit cases cover routing, expected-answer removal, independent merge ordering, bounds, backup/restore and main-transcript merge stability; all passed. The typed follow-up browser case passed, while the other 14 new browser cases still need to run.

## Resume verification

Keep heavy jobs sequential and retain `scripts/speech-accuracy/with-memory-floor.mjs`. Use a Vite server on port 4173 for development browser tests (the existing Playwright configuration reuses it); stop it before full typecheck/tests/build. Run focused tests first, then the complete gates and browser suite. Check light/dark at 375 and 1440 pixels, including overflow and console errors. Full build requires at least 5 GB available as checked with `free -g`.

Run both fixed-sample commands in `rubric-evaluation.md` with Vite on 5173 once memory permits. Keep sentence pairs disabled unless recall improves without increasing false positives. The fixed 30-answer sample and all manual marks remain unchanged. No sample-specific tuning has been applied; a new held-out set is needed if later tuning uses this sample repeatedly.

All dev server/browser processes started for this checkpoint were stopped. Other applications and other worktrees' processes were left untouched. No push.

A subsequent baseline rerun with unchanged single-sentence matching was stopped at 2,015 MiB before inference. It also produced no result. Both the original baseline and unchanged sample remain available; no after metric exists.


## Pending browser and visual checks completed — 9 November, 17:32 IST

Ran each of the 19 pending cases individually with one Playwright worker, waiting for memory between cases. The unchanged process-group guard retained its 2,048 MiB floor; the queue waited for 2,816 MiB before launching a case. The initial voice attempt stopped at 2,037 MiB, then the queued rerun passed. No test assertion or guard was weakened.

| Coverage | Observed result |
| --- | --- |
| Rubric labels, retry comparison, history and reload | Passed, 10.0s command total |
| Failed review and empty rubric attempt | Passed, 6.4s |
| Typed follow-up, late main review, retry/history/reload | Passed, 7.6s |
| Real capture lifecycle with synthetic tone and TTS/ASR inference doubles | Passed, 6.7s |
| Next / Previous / Practice again during asking, answering, final transcription and saved state | All 12 cases passed individually, 5.9–7.1s each |
| Permission denial and late permission resolution after navigation | Passed, 6.6s |
| Checklist visual case | Passed; final viewport capture rerun 5.4s |
| Follow-up visual case, including mobile Save follow-up click | Passed; final viewport capture rerun 5.2s |
| Focused judge/history/selector Vitest | 20/20 passed, 3.60s |
| Links and anchors | Passed |

Inspected all eight focused viewport screenshots: checklist and active typed follow-up at 375×1,000 and 1,440×1,000, light and dark. Labels, wrapping, focus outline, textarea and buttons were readable. Document scroll width matched viewport width in every case. All checklist points fit above the mobile sticky actions in the focused view. The follow-up save and mic controls remained accessible, and saving at 375px passed. No page exceptions were observed in either visual case. Full-page screenshots initially showed fixed bars at the capture's scroll offset; viewport recaptures confirmed the actual layout.

Images remain in ignored `test-results/pending-18/` and `test-results/pending-19/`, not committed. This is 19 passing individual cases, not a claim of a new full-suite run. Speech accuracy and a physical mic remain unmeasured. The Vite server and all test browser processes were stopped. Build was not started: `free -g` showed 3 GB available, below the repository's 5 GB requirement. Full project gates will be revisited after the next answer-judge change. No push.
