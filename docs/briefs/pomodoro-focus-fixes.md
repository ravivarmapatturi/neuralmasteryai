# Pomodoro review fixes

Fix all of these, commit, do not push. Same limits as docs/briefs/pomodoro-focus.md.

1. Lost focus time across devices. In `recordSession` (`src/contexts/FocusTimerContext.tsx`), a save writes this device's list over the `focusSessions` field. If another device added a session since this one loaded, that session is deleted. Read the remote list and merge by id immediately before every write, using a transaction if the existing Firestore loader allows it. A failed save must be retried on the next sign-in or next save, not dropped; the comment says "will re-sync next cycle" but nothing does. Add a test: two devices each save a session and both survive.
2. Dark mode contrast. On /focus in dark theme, the selected preset (green on beige), the toggle tracks and the navbar Focus music button render as light beige. Find the cause, likely a global button rule or a light-only value. Check that the Focus button matches how it looks on origin/main. Selected states must meet 4.5:1 in both themes. Measure and report the ratios.
3. Colours. Replace hard-coded #10b981 and #f59e0b in focusPage.css and focusTimer.css with theme tokens.
4. Copy. Replace the /focus subtitle with: "Work in focused intervals and take real breaks." Remove "momentum".
5. The chime, the session save and the notification must happen once if the phase-end timeout fires and the tab also reloads or regains visibility at the same moment. Test a reload after `endsAt` has passed: the session is saved exactly once, with the focused time up to `endsAt` only.
6. Stats must count only time from saved sessions and use local-time day boundaries. Test a session crossing midnight and state the rule you chose.

Re-capture the screenshots in docs/evidence/focus/, including /focus with real stats in light and dark. Report what you measured.
