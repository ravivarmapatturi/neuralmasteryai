# Sign-in nudge plan review

Plan reviewed: [signin-nudge-2026-11.md](signin-nudge-2026-11.md)

## Code and data check

- `AuthContext` already exposes `user`, `loading`, and `signInWithGoogle`; `AuthButton` owns the existing Google/email sign-in panel. The note should call the current Google method and open that panel for email through a small named browser event handled by `AuthButton`. No auth or backend changes are needed.
- `App.tsx` mounts shared components inside `BrowserRouter`, so the nudge can live globally beside `AnalyticsTracker` and use `useLocation`.
- The answering flow is `/interview` and `/interview/q/:questionId` (including nested stages). `/interview/mock` is a separate route. The practice editor is `/practice/:slug` and exposes `status !== 'idle'` as `isBusy`; the mock room exposes `isRecording`. Put these booleans on their existing root elements as data attributes so the global component can observe activity without coupling to those page components.
- The actual routes `/interview/questions` and `/interview/topics/*` are reference/browse pages, not answer flows, so they remain eligible. `/interview/mock` is eligible except during recording. The blog editor is `/blog/write` and `/blog/write/:slug`.
- There are no sign-in-specific routes in `App.tsx`; the existing sign-in UI is the `AuthButton` dialog. Block the current dialog by checking for open dialogs, and also exclude conventional `/signin`, `/sign-in`, and `/login` path segments for future route safety.
- `FocusTimerContext` exposes `isDistractionFree`. Existing modal and popover components use `role="dialog"`; observe the document for dialog changes so the note disappears if a dialog opens after the note appears.
- The app already sends page views and feature events to Firebase Analytics through `AnalyticsTracker`, but adding note-specific events would add tracking to this feature. Decision: do not record “note shown” or “signed in from note”; the plan expressly says to add no tracking. Record this decision here and in the handoff report.

## Decisions fixed for implementation

1. Mount `SignInNudge` once inside `BrowserRouter`, beside `AnalyticsTracker` in `App.tsx`.
2. Start a five-second page-load timer. If auth is still loading at five seconds, wait for auth to finish before evaluating eligibility. Route/activity/dialog eligibility is re-evaluated as state changes. Only consume the session's one-show allowance when the note is actually displayed.
3. Use local-storage keys `nm_signin_nudge_dismissed_at` (base-10 Unix milliseconds) and `nm_signin_nudge_converted` (`"1"`); use session-storage key `nm_signin_nudge_shown` (`"1"`). Treat a dismiss timestamp as active while `now - timestamp < 604800000`; ignore malformed timestamps and expired values. Wrap each storage read/write in `try/catch`; if storage is unavailable, use in-memory state for the current mounted session.
4. Escape has the same effect as × only while the note is visible. Neither opening nor focusing the note moves focus. If a dialog opens while it is visible, hide it; the session show key remains consumed.
5. A non-null auth user hides the note and writes the permanent converted key. Google click hides and writes that key immediately before calling `signInWithGoogle`. The email action hides and writes that key immediately, then dispatches the named event to open the existing `AuthButton` panel.
6. Define the email-open event in `src/lib/signInDialog.ts` as `nm:open-sign-in-dialog`. `AuthButton` listens for that event and opens its existing panel. Do not synthesize a click on a DOM element.
7. The desktop “Sign in” label is visible at min-width 900px; below 900px the existing 32px icon button stays icon-only. Use a span class and CSS rather than widening the mobile control.
8. Treat `/interview` and `/interview/q/*` as excluded answer flow paths; allow `/interview/questions` and `/interview/topics/*`. On `/interview/mock`, exclude only while `[data-nm-mock-recording="true"]` exists. On `/practice/*`, exclude only while `[data-nm-practice-running="true"]` exists. Exclude `/blog/write` and descendants, `/signin`, `/sign-in`, `/login` and descendants. Do not exclude `/interview/mock` merely because a mock session is active but not recording.
9. Do not add analytics events.
10. Add a dedicated Playwright config that runs only `tests/signin-nudge.spec.ts` against Vite dev server at `http://127.0.0.1:5173`, so this test does not depend on a production build or the shared `playwright.config.ts` static server. Use one worker. The test should stub Firebase auth network traffic so `AuthProvider` settles signed-out, install the Playwright clock before navigation, and test the 5-second display, dismiss, reload persistence, and 320px/375px document-width fit. Do not commit generated screenshots or test results.

## Batches

One implementation batch is sufficient. The exact file list, schema, commands, and acceptance checks are in [the agy brief](../briefs/signin-nudge-batch-1.md).
