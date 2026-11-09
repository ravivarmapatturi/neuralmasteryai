# Focus timer CI repair

Merged origin/main at f1cee85d. CI run 42579232631 failed both focus tests with ERR_CONNECTION_REFUSED at localhost:5173; CI serves dist through scripts/static-server.cjs at 4173. The spec now defaults to that port and accepts PLAYWRIGHT_BASE_URL for development.

The navbar overflow was a product issue. On narrow screens idle timer, music and Labs are available in the site menu; the running/paused countdown remains in the row. Mobile timer popovers now stay within the viewport and scroll vertically. The 320px progress grid also needed its 340px minimum column width capped to its container.

Measured on Vite, Chromium, one worker:

- Four focus tests passed (52.1s).
- Six routes: /focus, /learn, /labs, /interview, /progress, /docs/deep-learning/attention-transformers.
- At 320px and 375px, document scrollWidth equals viewport width, with navbar bounds inside viewport, in idle/running/paused states.
- Real expired reload: change wall clock without firing timer callbacks, assert no saved sessions, reload document, assert one session with 1500 seconds, reload again, assert still one session.
- Typecheck, internal links, MDX compile (1993 files), and 30 focused unit tests (including ProgressPage) passed.
- Updated 375px light/dark focus and navbar screenshots; desktop screenshots unchanged.

No fresh build, Pagefind, production-server browser checks or full unit suite: free -g showed 2 GB available (later 1 GB), below the required 5 GB build threshold. There was no dist in this worktree. The Pomodoro brief was read from ../platform-vite-interview/docs/briefs/pomodoro-focus.md because this worktree does not contain it; its delivery section requests targeted tests only. No push.

Final regression pass: mobile popover bounds at both widths and the unchanged mobile-navigation smoke test all passed (3 tests, 33.7s).
