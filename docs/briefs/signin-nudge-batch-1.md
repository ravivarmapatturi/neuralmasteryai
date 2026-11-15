# agy brief: sign-in nudge, batch 1

Read this brief and implement it literally. Do not add features, tracking, routes, or auth behavior beyond these instructions. If a requested file or API differs from the repository, stop and append a precise question to this brief rather than guessing.

## Source plan and Codex decisions

Implement `docs/plans/signin-nudge-2026-11.md`, using the route, timer, storage, event, analytics, and E2E decisions recorded in `docs/plans/signin-nudge-review.md`. The review is binding where it resolves ambiguity.

## Exact files

Modify:

- `src/App.tsx`
- `src/components/layout/AuthButton.tsx`
- `src/components/practice/PracticeWorkspace.tsx`
- `src/components/interview/MockInterviewPage.tsx`

Add:

- `src/components/layout/SignInNudge.tsx`
- `src/components/layout/signInNudge.css`
- `src/lib/signInDialog.ts`
- `src/components/layout/SignInNudge.test.tsx`
- `playwright.signin-nudge.config.ts`
- `tests/signin-nudge.spec.ts`

Append the implementation report to this brief as required under “Finish and commit”. No other source files should change. Update `AGENT_TRACKER.md` only if required by the repository tracker protocol; do not edit unrelated rows.

## Implementation schema

### `src/lib/signInDialog.ts`

Export one constant, `SIGN_IN_DIALOG_OPEN_EVENT`, whose value is exactly `nm:open-sign-in-dialog`. This is the only bridge between the nudge and the existing email sign-in panel.

### `SignInNudge.tsx`

- Export a default React component. Import `useAuth()` from `src/contexts/AuthContext`, `useFocusTimer()` from `src/contexts/FocusTimerContext`, `useLocation()` from `react-router-dom`, and the event constant above.
- Render `null` unless eligible and the five-second timer has elapsed.
- Mount once inside the router beside `AnalyticsTracker` in `src/App.tsx`.
- Start a 5000ms timeout on mount. If auth is still loading when it expires, show only after loading ends and eligibility is true. Do not restart the five-second timer for route changes.
- Evaluate eligibility on route changes, auth state, `isDistractionFree`, and mutations to the activity/dialog state described below.
- Storage schema and behavior (all storage operations individually guarded by `try/catch`):
  - local key `nm_signin_nudge_dismissed_at`: decimal Unix milliseconds. Suppress while age is less than `604800000` ms. Ignore unparsable, non-finite, future, or expired timestamps.
  - local key `nm_signin_nudge_converted`: exact value `"1"` means permanently suppressed.
  - session key `nm_signin_nudge_shown`: exact value `"1"` means already displayed this tab session.
  - Set the session key only when rendering the note for the first time. In the event that storage is unavailable, keep equivalent component-level in-memory suppression while mounted.
- Do not display when signed in, auth loading, dismissed within seven days, already shown in the session, or `isDistractionFree` is true.
- Exclude paths: `/interview` and `/interview/q/*`; `/blog/write` and descendants; `/signin`, `/sign-in`, `/login` and descendants. Use exact segment boundaries. Allow `/interview/questions`, `/interview/topics`, and their descendants. `/interview/mock` is eligible unless the mock is recording. `/practice/*` is eligible unless a practice run is active.
- Observe `document.body` subtree mutations for `role="dialog"`, `dialog[open]`, `data-nm-mock-recording`, and `data-nm-practice-running`. If any dialog exists, or if the current mock route has `[data-nm-mock-recording="true"]`, or if the current practice route has `[data-nm-practice-running="true"]`, suppress/hide the note. Reevaluate when the attributes or tree change. Disconnect the observer on unmount. The note itself must not be a dialog and must not match the modal selector.
- Escape hides only while the note is visible and has the same seven-day persistence as ×. Do not focus the card or any control automatically.
- Dismissal writes current Unix milliseconds to `nm_signin_nudge_dismissed_at` and hides.
- A non-null user writes `nm_signin_nudge_converted="1"` and hides. Clicking Google writes the converted key and hides immediately, then calls existing `signInWithGoogle`; handle a rejected promise without an uncaught exception and do not restore the note. Clicking email writes the converted key and hides immediately, then dispatches `new Event(SIGN_IN_DIALOG_OPEN_EVENT)` on `window`.
- Exact visible copy and accessible controls:
  - heading: `Save your progress`
  - paragraph: `Sign in to keep your points, streak and interview progress on every device.`
  - primary button: `Sign in with Google`
  - secondary button: `Use email`
  - close button: visible `×`, `aria-label="Close"`
- Use a semantic `aside` with an accessible label from its heading; no `role="dialog"`, no backdrop, no focus trap, no focus steal.

### `AuthButton.tsx`

- Add an effect that listens for `SIGN_IN_DIALOG_OPEN_EVENT`, sets existing `menuOpen` to true only when signed out and auth is loaded, and unregisters the listener on cleanup.
- Keep the existing panel and auth behavior.
- In the signed-out trigger, add visible `Sign in` text in a span with a new class. Use CSS in `signInNudge.css` (or existing global CSS if necessary; prefer the new stylesheet imported by `SignInNudge.tsx`) to show the label at min-width 900px and keep the button a 32px circle/icon only below 900px. At desktop, use a compact horizontal button with enough width for the label and icon; preserve `aria-label="Sign in"`.

### Activity markers

- In `PracticeWorkspace.tsx`, add `data-nm-practice-running={isBusy ? 'true' : 'false'}` to the existing `.nm-practice-workspace` root element. Do not change run behavior.
- In `MockInterviewPage.tsx`, add `data-nm-mock-recording={isRecording ? 'true' : 'false'}` to the existing `.nb-theme` root element. Do not change recording behavior.

### Styling

- Import the new CSS from `SignInNudge.tsx`.
- Use existing `--nm-*` theme tokens and Kalam notebook face. Must work in light and dark themes.
- Desktop (min-width 640px): fixed bottom-right card, width at most 360px, with safe viewport margins. Phones (<640px): fixed bottom full-width sheet, `box-sizing:border-box`, safe-area bottom padding, no horizontal overflow at 320px or 375px.
- Keep it non-modal with no backdrop; use a z-index below modal overlays (use 80). Maintain readable contrast and visible keyboard focus. Buttons must wrap safely on narrow screens. Do not hardcode theme colors where tokens exist.
- Desktop navbar label breakpoint is separately min-width 900px as above.

### Unit tests

In `SignInNudge.test.tsx`, use the project’s existing Vitest/Testing Library setup. Mock `useAuth`, `useFocusTimer`, and router location as needed; use fake timers and storage reset between tests. At minimum verify:

1. Signed-in user never sees the nudge.
2. Signed-out user sees it only after advancing 5000ms.
3. Clicking close stores dismissal time; remount within 7 days does not show it.
4. `isDistractionFree=true` prevents it from showing.
5. `/signin` does not show it.
6. `/interview` is excluded but `/interview/questions` is allowed.
7. Open dialog hides/suppresses the note.
8. `/practice/example` is suppressed only with the running marker; `/interview/mock` is suppressed only with the recording marker.
9. Google calls the existing mock `signInWithGoogle`; email dispatches the event and hides.
10. Escape dismisses only while visible.

Keep tests focused on this feature; do not weaken existing tests.

### Playwright test and command

`playwright.signin-nudge.config.ts` must define one Chromium project, one worker, `testDir: './tests'`, `testMatch: 'signin-nudge.spec.ts'`, base URL `http://127.0.0.1:5173`, and a `webServer` running `npm run dev -- --host 127.0.0.1` at that URL with reuse enabled outside CI. This dedicated config must not inherit or start the production static server.

`tests/signin-nudge.spec.ts` must:

- Install `page.clock` before navigation.
- Stub Firebase Auth/Google network calls so the app settles signed out without real network/authentication.
- Clear local and session storage before each case.
- Assert there is no nudge before 5000ms, then the exact heading and copy, both actions, and close control after advancing 5000ms.
- Click close, reload, advance 5000ms, and assert the note stays hidden.
- At viewport widths 320 and 375, after it appears, assert `document.documentElement.scrollWidth <= document.documentElement.clientWidth`.
- Close pages and stop any test-started browser/server after the run.

## Exact commands

Run every command that may consume substantial CPU or memory one at a time through the shared lock. Before each command, inspect `free -g`; do not run a production build unless at least 5 GB is available. Do not run the production build for this task if that guard is not met; record the reading and skip reason in the report.

1. `npm run check:tracker`
2. `flock /tmp/nm-heavy.lock npm run typecheck`
3. `flock /tmp/nm-heavy.lock npm run check:links`
4. `flock /tmp/nm-heavy.lock npx vitest run src/components/layout/SignInNudge.test.tsx src/components/layout/AuthButton.test.tsx`
5. `flock /tmp/nm-heavy.lock npx playwright test --config=playwright.signin-nudge.config.ts tests/signin-nudge.spec.ts --workers=1`
6. If and only if `free -g` reports at least 5 GB available: `flock /tmp/nm-heavy.lock env NODE_OPTIONS=--max-old-space-size=6144 npm run build`. If run, follow with `flock /tmp/nm-heavy.lock npx playwright test --config=playwright.signin-nudge.config.ts tests/signin-nudge.spec.ts --workers=1` only if needed; otherwise no production build is required by this brief.
7. `git diff --check`

Do not start a second server, browser suite, build, or agy process while one is active. Do not push.

## Acceptance checks

- Exact copy and all triggers/actions match the plan.
- No auth is added; Google uses the existing method and email opens the existing dialog through the named event.
- All specified route and runtime exclusions behave as written.
- Seven-day dismissal and permanent sign-in suppression use only the specified storage schema and safely handle storage exceptions.
- Desktop label appears at 900px+, mobile navbar remains icon-only and does not overflow.
- Nudge is accessible, non-modal, does not steal focus, fits 320px/375px, and follows light/dark notebook tokens.
- The specified unit and Playwright cases pass. Typecheck and check:links pass. Report if build was skipped by the 5GB rule.
- No note-specific analytics, backend changes, feature gates, question/content changes, or unrelated modifications.
- `git status` contains only files authorized above (plus tracker and this brief report); commits are on `signin-nudge`, with no push.

## Finish and commit

After implementation and checks, append a concise report here with: files changed, commit hash(es), each command and result, `free -g` value and whether build ran, any visual/browser checks, and open questions. Commit source changes and this brief report in one or more conventional commits on `signin-nudge`; do not push. If anything cannot be verified, state the exact limitation instead of claiming it passed.
