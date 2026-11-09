# Pomodoro focus timer and per-user focus time

Goal: a learner starts a focus session from any page, works, takes real breaks, and can see how much time they actually focused.

## Where it lives
- Navbar: a timer control beside the existing Focus music control (`src/components/layout/Navbar.tsx`, `MobileNavDrawer.tsx`). Idle it shows a small "Start focus" button; running it shows the countdown and the phase. Clicking opens a popover with pause, skip, stop and a link to /focus.
- New page `/focus`: large timer, presets, and the stats below. Add it to the menu and to routing, and prerender it like other product pages.
- `/progress`: one card with today, this week and streak, linking to /focus.
- Do not add it to individual lesson, lab or interview pages. The navbar covers them.

## How the timer works
- New `src/contexts/FocusTimerContext.tsx`, mounted above the routes beside `FocusMusicProvider`, so route changes never stop it.
- Pure logic in `src/lib/focusTimer.ts` with no React, fully unit tested. Store `phase`, `endsAt` and `remainingMs`, and derive time from timestamps. Never count ticks, because background tabs throttle them. A reload resumes correctly from localStorage.
- Cycle: focus, short break, repeat; a long break after 4 focus sessions.
- Presets: 25/5/15 (default), 50/10/30, and custom focus 5-120 min, break 1-30 min.
- When a phase ends: soft chime, document title shows the countdown while running, and a break card appears with "Start break" and "Skip break". Option to auto-start the next phase, off by default.
- Browser notifications only if the user turns them on in the popover. Never prompt on load.
- Focus music: if music is enabled, play during focus and pause during breaks, through the existing `useFocusMusic`. Do not change music behaviour when the timer is not running.
- During a break, the break card suggests stepping away: keep it to one short line.

## What counts as focus time
- Only time in the focus phase while the timer is running counts. Pauses and breaks never count.
- If the tab is hidden for more than 60 seconds, auto-pause and show "Paused while you were away" with Resume. The hidden time is not counted. Up to 60 seconds of switching away counts.
- A session is saved when it completes or is stopped, if it has at least 1 minute of focus. Record: `id` (uuid), `startedAt`, `endedAt`, `plannedMinutes`, `focusedSeconds`, `completed`, `section` (first path segment where the session started).

## Per-user storage
- Signed out: localStorage only (`nm_focus_sessions`), wrapped in try/catch like the other contexts.
- Signed in: sync to Firestore the way `GamificationContext` does, reading its pattern first. Merge by session `id` so two devices never double count, and upload local sessions on sign-in. Keep stored data bounded, for example daily totals plus the last 500 sessions.
- Check `firestore.rules` if present. If rules must change, make the change in the repo and report that the owner must deploy it. Do not deploy anything.
- Include sessions in the JSON export and restore on /progress.

## Stats on /focus
Today, this week, all-time, current streak (days with at least one completed session), sessions completed, a 7-day bar chart and a 12-week heatmap, and time by section. Use only real numbers, with a plain empty state.

## Not in this version
Leaderboard, points, blocking other sites, and team features.

## Standards
- Follow AGENTS.md and the `ui-design`, `writing-voice` and `ship-gate` skills. Theme tokens only. Works at 375px and 1440px in light and dark, 44px touch targets, keyboard usable, aria-live for phase changes without announcing every second, reduced motion respected.
- Copy: plain and professional. No fine print, privacy notes, "free" or "no account" text, or marketing lines.
- Must not re-render the whole app every second: only the timer display subscribes to ticks.

## Tests
- Unit: pure timer (phase changes, long break, reload resume, pause, 60-second away rule), stats (day boundaries in local time, streak), and merge by id.
- Component: navbar control and /focus empty and filled states.
- Browser: `tests/focus-timer.spec.ts` with a fake clock: start, navigate between pages, reload, finish focus, break appears, session appears in stats.

## Delivery
Commit in small steps. Do not push; the lead reviews and ships. Run typecheck and targeted vitest plus only your new spec, workers=1. No `npm run build`, pagefind or full Playwright on this 8 GB laptop. Save screenshots of /focus and the navbar at 375px and 1440px, light and dark, in `docs/evidence/focus/`. Report only what you measured.
