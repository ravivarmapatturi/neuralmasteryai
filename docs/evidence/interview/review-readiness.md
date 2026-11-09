# Interview review queue and role coverage

The merge is `e6c042bb`, through origin/main `05701980`. The catalog contains 917 questions, including 219 senior questions and 30 debug questions. All main question fields and corrected answers were compared by ID and retained. The 79 authored rubrics contain 351 key points. Level totals: 416 mid, 406 senior, 95 staff.

## C5 review behavior

The queue reuses `REVIEW_INTERVALS_DAYS` (1, 3, 7, 14, 30 days). A first Got it rating starts at one day; a due successful review advances a stage, capped at 30 days. Early practice does not advance a stage. Partly and Missed it reset to one day. Changing a rating on the same attempt does not count as an additional review. Automated judge output does not enter this calculation.

Today's ten reserve up to five places for due reviews and five for unseen questions, filling remaining places from either pool. New questions come from topics with the least self-rated Got it coverage. The list stays assigned for the local calendar day, including after completion, reload or sync. One skip replaces one question. Concurrent-device skips resolve to one deterministic skip for that day. The separate expandable review queue exposes every due question, including those outside today's ten. Previous/Next follows the selected review-session order rather than unrelated catalog filters.

Compact per-question completion, self-rating, assignment and skip records use account-specific local storage plus a Firestore transaction and snapshot listener, following the attempt-history protocol. Each field merges independently. Offline changes retry; guest records are adopted once, and account switches isolate in-flight results. Historical captured attempts and completion awards migrate without assigning a self-rating. Transcript history stays bounded independently. Compact progress has a 2,000-question / 450,000-byte ceiling; the 917-question fixture survives export and restore. The existing JSON exporter includes the new namespaced storage key.

## C6 role coverage

Applied AI, Agentic, Inference and Evaluation show unique completed questions and latest self-rated Got it counts, each out of that role's tagged total. Role totals are 388, 161, 179 and 206 respectively; roles overlap. Judge outputs are not inputs to these counts. The three topic links use the lowest Got it coverage, then Missed it and Partly as tie-breakers. Unrated topics remain visible as coverage gaps.

Practice completion is independent of points: the existing Mark complete reward action remains available until an actual award exists. A captured coding answer alone does not display Solved in editor. The browser reward flow and a new unit regression cover these integration cases.

The same compact records drive readiness, sync and JSON export. Counts are derived rather than separately stored, so role totals stay tied to the current catalog. Unit checks preserve all four views after export/restore and account isolation, reject judge scores as mastery signals, and show a lower Got it count after a newer Missed it rating. Explicit topic/role links open that filtered catalog rather than resuming an unrelated last question.

The seeded browser fixture measured:

| Role | Completed | Self-rated Got it | Role total |
| --- | ---: | ---: | ---: |
| Applied AI | 6 | 3 | 388 |
| Agentic | 2 | 1 | 161 |
| Inference | 2 | 1 | 179 |
| Evaluation | 3 | 1 | 206 |

All four roles were checked at 375 and 1440 pixels in both themes: sixteen combinations, document width equal to viewport width, three linked topics each, zero page exceptions, and zero model downloads. The targeted browser case passed in 17.2 seconds with a 2,499 MiB host minimum. The sixteen captures were inspected. Final captures center the region to keep the sticky navbar outside the crop.

## Measured checks

C6 final typecheck and full Vitest passed: 896 tests across 186 files. All 42 interview-room browser cases passed in 3.4 minutes, including the points-flow regression, level filters, debug topic, review queue and all four role views. The final sequential typecheck/unit/browser pipeline kept at least 2,392 MiB host memory available. Final link checks, 2,003 MDX compilations, 259 criteria checks and tracker validation passed.

Merge checks passed: typecheck; 879 unit tests across 182 files; 39 interview-room browser cases; links; compilation of 2,003 MDX files; 259 criteria checks.

C5 final checks passed: typecheck and 892 unit tests across 185 files. The two new browser cases passed in 22.1 seconds with a 2,561 MiB host minimum. Links, all 2,003 MDX files and all 259 criteria checks passed.

C5 browser fixtures measured a frozen ten-question list with five due reviews and five new questions across reloads. One skip produced eleven stored assignments with exactly ten active questions. Previous/Next advanced from question 1 of 10 to question 2 of 10 in the saved daily order. A self-rating survived a late automated result and reload. The queue and answer controls measured document widths exactly 375 and 1440 pixels in both themes, with zero page exceptions. All eight queue/rating captures were inspected.

Browser inference uses worker doubles; these checks do not measure model accuracy or physical microphone quality. Firestore transaction, conflict, retry and ownership checks use test doubles; live cloud sync was not measured.

## Memory limits

Heavy commands run sequentially with a 2 GiB host-available floor. A systemd scope applies a 500 MiB physical-memory high watermark, 1,800 MiB hard limit, and up to 6 GiB swap; Node heap is capped at 2,048 MiB. Merge-check host minima were 2,138 MiB for typecheck, 2,121 MiB for browser tests and 2,214 MiB for full Vitest. C5's first browser checks completed in 28.8 seconds with a 2,484 MiB host minimum.

The production build is deferred because `free -g` reports less than the required 5 GB available. No build, deployment, live-cloud-sync or real-model performance claim is made for C5/C6.

Final build preflight: `free -g` reported 2 GB available, below the hard 5 GB minimum. All started dev servers, test workers and browser processes exited. No push.
