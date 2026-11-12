# Brief: focus timer runs continuously (agy)

Worktree: `neuralmastery/platform-vite-timer`, branch `timer-always-on`. Do not push. Commit on the branch; Claude reviews and ships.

## What the owner asked for

- When someone is on the site, the focus timer starts on its own: 25 min focus, then a 5 min break.
- After each phase the next one starts automatically: focus → break → focus → break → … (every 4th break is the long break, as today).
- The timer must never stop by itself. It only stops when the user clicks Pause (or Reset). Today it stops after the break ends; that is the bug.

## What to do

1. Reproduce first. Write a failing test that shows the timer stopping after a break (unit test in `src/lib/focusTimer.test.ts` and/or the context test). Look at every path that can leave the timer not running: `rolloverTimer` and `completePhase` in `src/lib/focusTimer.ts`, the tick / visibility / reload handling in `src/contexts/FocusTimerContext.tsx`, `status: 'phaseEnded'`, `pausedReason`, and states loaded from localStorage that still have `autoStartNext: false` from older visits.
2. Make continuous running the only behaviour:
   - Remove the "auto-start next" switch from `FocusTimerPopover.tsx` and `FocusPage.tsx` and treat it as always on. Old saved states with `autoStartNext: false` must be migrated to on when loaded.
   - No path may end in a stopped or `phaseEnded` state except an explicit Pause/Reset by the user.
   - Start a focus session automatically the first time a visitor lands on any page (if no timer state exists yet, or it is idle and the user has not paused it). Do not restart one the user paused.
   - Keep the session log correct: each finished focus phase is saved exactly once, including after reload or a hidden tab.
3. Tests to update or add (updating tests to this requested design is fine; do not weaken unrelated ones):
   - Unit: focus ends → break running; break ends → focus running; 4th focus → long break; a 3-hour gap while the tab was closed rolls over to the correct phase and stays running; Pause stops it and nothing restarts it; a saved state with `autoStartNext: false` loads as running continuously.
   - E2E `tests/focus-timer.spec.ts`: replace "with auto-start switched off, the break card waits for a click" with a test that fast-forwards (Playwright clock) through focus → break → focus and checks the timer is still running and counting down after the break. Keep the reload, hidden-tab and 320/375 px tests passing.
4. Checks you run (8 GB laptop, one heavy job at a time, use `flock /tmp/nm-heavy.lock`): `npx vitest run src/lib/focusTimer.test.ts src/contexts`, `npm run typecheck`, then `npx playwright test tests/focus-timer.spec.ts --workers=1`. No full build.
5. Add an `AGENT_TRACKER.md` row and run `npm run check:tracker`. Commit with a plain message. Report: root cause of the stop (file:line), what changed, test output.
