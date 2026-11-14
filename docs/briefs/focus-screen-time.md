# Brief: focus time becomes screen time, plus a distraction-free mode (agy)

Worktree: `neuralmastery/platform-vite-focus`, branch `focus-screen-time`. Do not push. Commit on the branch; Claude reviews and ships. Follow AGENTS.md and the skills `ui-design`, `writing-voice`, `agent-tracker`, `ship-gate`. 8 GB laptop: run heavy commands only through `flock /tmp/nm-heavy.lock`, one at a time, no full build.

## What the owner asked for

1. **Remove the Pomodoro concept completely.** No focus/break phases, no 25/5 timers, no long breaks, no break card, no presets, no auto-start switch, no phase notifications or sounds, no countdown.
2. **Focus time = the user's screen time on Neural Mastery.** The clock counts up while the user is on our tab and stops when they are not:
   - counting while `document.visibilityState === 'visible'` **and** the window has focus;
   - stops on `visibilitychange` to hidden, window `blur`, `pagehide`; resumes on visible + `focus`;
   - one clock across all tabs of the site: if two Neural Mastery tabs are open, time is not counted twice (use the existing storage/BroadcastChannel sync or a timestamp lock in localStorage);
   - no catch-up for time away: closing the tab or sleeping the laptop never adds time.
   - The navbar control shows **today's focus time** (e.g. `1h 12m`, or `mm:ss` under an hour), resets at local midnight, and keeps the per-day totals (and per-section totals if the current stats already have them) for the Focus page and Progress page.
   - Keep a manual **Pause** so the user can stop counting while still on the tab; Resume continues. Pause must survive reload.
3. **Distraction-free mode** — an option in the popover and on the Focus page, a switch labelled "Distraction-free".
   - Turning it on calls `document.documentElement.requestFullscreen()` (from the click, browsers require a user gesture) and adds a `distraction-free` class on `<html>` that hides the navbar extras, sidebars, table of contents, footer, feedback widgets and floating buttons, leaving the page content centred and a small "Exit distraction-free" button plus today's focus time.
   - Leaving full screen with Esc or F11 (`fullscreenchange`) turns the mode off and removes the class, so the switch never shows a wrong state.
   - If full screen is refused or unsupported (iOS Safari), still apply the class (content-only layout) and don't throw.
   - The setting is not restored on reload (full screen cannot start without a click); the content-only layout may be.

## Data migration

Saved state from the old timer (`phase`, `preset`, `autoStartNext`, `endsAt`, etc.) must load without errors and be dropped. Past focus sessions/day totals already stored must still show on the Focus page and Progress page.

## Tests (update tests that describe the removed Pomodoro behaviour; that is the requested design change. Do not weaken unrelated tests.)

- Unit (`src/lib/focusTimer.test.ts` or a new `screenTime` module): counts only while visible and focused; stops on hidden/blur; no catch-up after a gap; midnight rollover splits time into two days; two tabs do not double count; pause/resume; old saved state migrates.
- Context/component tests for the navbar control and popover: shows today's time, Pause/Resume, Distraction-free switch calls `requestFullscreen` (mock it) and reacts to `fullscreenchange`.
- Replace `tests/focus-timer.spec.ts` with e2e tests using the Playwright clock: time increases while the page is visible; after `page.evaluate` dispatching `visibilitychange` (hidden) and `blur` it stops; it resumes on focus; reload keeps today's total; distraction-free hides the navbar extras/sidebar/footer and the exit button restores them; 320 and 375 px have no horizontal overflow. Search other specs (`grep -rn "nm-timer\|focus" tests/`) and update any that depend on Pomodoro UI (e.g. `tests/notebook-handwriting.spec.ts`).
- Run: the vitest files you touched, `npm run typecheck`, `npm run check:links`, then `npx playwright test tests/focus-timer.spec.ts --workers=1` (needs a dist build: if `free -g` shows under 5 GB available, run the spec against `npm run dev` with a temporary baseURL override and do not commit that override).
- Check it yourself in `npm run dev`: switch tabs and come back, click another window, toggle distraction-free and press Esc, at desktop and 375 px, light and dark.

## Report

Root files changed, what was removed, how two-tab counting works, test output, and screenshots of the navbar control, popover and distraction-free view in `docs/screenshots/focus/` (do not commit them). Add an `AGENT_TRACKER.md` row and run `npm run check:tracker`.
