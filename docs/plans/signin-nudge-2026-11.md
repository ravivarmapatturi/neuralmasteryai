# Plan: a gentle "save your progress" sign-in note

Owner: Claude (plan, final review, ship). Senior engineer: Codex (check against code, write the agy brief, review). Implementer: agy.
Worktree: `neuralmastery/platform-vite-signin`, branch `signin-nudge`. Only Claude pushes.

## Why

About 1,550 visits a week and very few sign-ins. Everything works without an account, the sign-in control is an unlabeled icon, and nothing ever asks. Owner approved (2026-11-15): show non-signed-in visitors a small note offering to save their progress, easy to close, never shown to signed-in users.

## What to build

1. **The note.** A small card in the bottom-right corner (bottom sheet across the width on phones under 640 px), not a modal: no backdrop, page stays usable, focus is not stolen.
   - Text: title "Save your progress", one line "Sign in to keep your points, streak and interview progress on every device.", a primary "Sign in with Google" button, a secondary "Use email" link that opens the existing sign-in dialog, and a × close button (aria-label "Close").
   - Same notebook look as the rest of the site (white notebook, Kalam, existing tokens). Light and dark.
2. **When it shows.** 5 seconds after page load, only if all are true:
   - auth has finished loading and there is no signed-in user;
   - the visitor has not dismissed it in the last 7 days and has not been shown it more than once in this browser session;
   - not on these routes: the interview answering/recording flow and mock room while recording, practice editor while running, blog editor, sign-in pages;
   - distraction-free mode is off and no other dialog or the sign-in dialog is open.
3. **Dismiss.** × or Esc hides it and remembers for 7 days (localStorage, wrapped in try/catch). Signing in from anywhere hides it immediately and for good.
4. **Sign in from the note** reuses the existing `useAuth().signInWithGoogle` / email dialog. No new auth code.
5. **Label the existing navbar control** with the word "Sign in" next to the icon on desktop (≥ 900 px); keep icon-only on phones.
6. **Measuring.** Add no new tracking or third-party analytics. If the site already has an event endpoint, Codex decides whether to record "note shown" and "signed in from note"; otherwise skip it and say so in the review.

## Not in scope

No forced sign-in, no feature gating, no email capture forms, no new backend.

## Done when

Unit tests cover: not shown when signed in; shown after 5 s when signed out; not shown again within 7 days after dismiss; not shown in distraction-free; hidden on sign-in. One Playwright test with the clock: signed-out visitor sees the card after 5 s, closes it, reloads and does not see it; no horizontal overflow at 320 and 375 px. Typecheck, the touched vitest files and `check:links` pass. Claude checks it in the browser on desktop and phone, light and dark.
