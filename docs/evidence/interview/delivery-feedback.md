# Interview delivery feedback (C4)

The answer screen and earlier attempts show one wrapping row of measurements. There is no delivery grade. Speech measurements are saved on the attempt and follow the existing account sync and JSON backup path. Old attempts and typed answers have no delivery row.

## Definitions

- Time: captured audio samples / 16,000, compared with an approximate 120-second target. Includes leading, internal and trailing silence; excludes microphone permission, model preparation and post-capture inference.
- Speaking: samples whose existing normalized RMS is at least 0.006 / 16,000. This is the existing capture detector, not a new speech model; background noise may count as speech and quiet speech may count as silence.
- Pace: final transcript word count × 60 / captured audio seconds, rounded to the nearest integer. Includes pauses in the denominator. Apostrophes within words remain part of the word.
- Filler matches: case-insensitive whole-token occurrences of `um`, `uh`, `like`, `you know`, `basically`, and `actually`. The two-token phrase counts once. Punctuation is unnecessary. ASR may remove or misrecognize fillers; these are transcript matches, not a count verified against recorded speech.
- Long pauses: each continuous run of non-speech samples strictly longer than 3 seconds after the first speech sample. Leading silence is excluded; trailing silence counts. Continued silence counts once, regardless of its duration. Integer sample counts avoid drift at the threshold.

Only the final transcript and existing capture samples/RMS decisions are used. No transcript arrival timestamps, additional audio capture, network request or new model is introduced. Storage validation drops malformed delivery fields while preserving the rest of a historical attempt.

## Punctuation-free filler measurement

`src/lib/interviewDelivery.test.ts` freezes four short, manually labelled fixtures. These are synthetic spoken-style transcripts, not real microphone recordings or a representative benchmark.

| Transcript | Labelled fillers | Matches | False positives |
| --- | ---: | ---: | ---: |
| um I would uh cache the result you know basically to reduce latency actually like um that helps | 7 | 7 | 0 |
| I like Python and I like to test failures | 0 | 2 | 2 |
| do you know the limit it actually dropped from ten to five this is basically a queue | 0 | 3 | 3 |
| album umbrella unlike likely basic actual knowledge | 0 | 0 | 0 |

Measured fixture totals (focused test exit 0): 7 labelled filler uses, 12 matches, 5 false positives, 0 missed fillers. Precision is 58.3% and recall is 100% on these four fixtures only. The two verb uses of “like” are false positives, as are a literal “you know” question, a factual “actually,” and a descriptive “basically.” A literal matcher cannot resolve their intent without more context; the UI therefore says “filler matches.” Separate fixtures exercise all six terms, repetition, mixed case, punctuation and word boundaries.

## Verification

- Copy trim commit: `16612bf1`. Typecheck, links, MDX 2003/2003 and full Vitest 897/897 passed. The initial typecheck hit the unchanged 2 GiB host floor; the bounded retry passed with a 2230 MiB host minimum.
- C4 focused tests: 4 files, 26 tests passed (4.88s, 2645 MiB host minimum). Includes capture-to-feedback integration, strict pause threshold, all filler fixtures, old/malformed attempts, merges and backup restore.
- Browser: the copy/self-rating and role-readiness checks passed (2 cases, light/dark, 375/1440px). The C4 case passed separately in 15.6s (18.4s including startup, 2161 MiB host minimum). It uses a real browser audio capture path with an oscillator and a 3.5-second silence, plus deterministic inference doubles. It verifies one long pause, 8 filler matches in 10 words, sample-based duration/pace, reload/history persistence and no row for a subsequent typed answer. No real-mic or new model accuracy claim.
- Visually inspected all four C4 screenshots at 375 and 1440px in light and dark. The row wraps to two lines at 375px, stays on one line at desktop, and has no horizontal overflow. The browser case recorded zero page exceptions. Screenshots remain in `/tmp/nm-delivery-browser/` rather than the repository.
- The first C4 browser run exposed a fixture defect: the ASR double returned the whole answer for both audio segments. Replaced those duplicate responses with two consecutive five-word segments; unchanged numeric assertions then passed.
- Final full Vitest: 188 files, 905 tests passed in 263.65s; host minimum 2138 MiB. Final typecheck, links and MDX (2003/2003) passed; combined scope host minimum 2214 MiB.

Heavy jobs run sequentially in a 500 MiB-high / 1800 MiB-hard systemd scope with up to 6 GiB swap and a 2048 MiB Node heap. The 2 GiB host-available guard remains unchanged. Production build requires 5 GB available; `free -g` showed 2 GB, so it was not started. Started browser/server processes are closed after each run; final process inspection found none remaining. No push.
