# Verification Report: Find, Filter and Polish (Plan C9 & C10)

This report documents the verification, measurements, and evidence for the implementation of Plan C9 and C10 per `docs/briefs/find-and-polish.md`.

---

## 1. Plan C9: Search, Bookmarks & URL Filter Synchronization

### Features Verified
1. **Full-Catalog Text Search (`#interview-search`)**:
   - Searches across all 917 questions in the catalog, matching question titles, topic names, and answer text.
   - Live query input with instant result filtering and result count updates (`.si-count`).
   - Quick clear button (`×`) and `Escape` key shortcut to clear queries.
   - When searching across topics, question rows display their parent topic pill (`.si-topic-tag`).
2. **Persistent Question Bookmarks**:
   - Star/bookmark button (`.si-bookmark-btn`) on every question item in the list and in the question stage header (`#bookmark-question`).
   - Persisted across browser sessions in `localStorage` under `nm-interview-bookmarks`.
   - Accessible `aria-label` ("Bookmark [Title]" / "Remove bookmark for [Title]") and `aria-pressed` state.
   - When bookmarked, questions display a gold highlight in both light (`#e7b65c`) and dark (`#f5c76b`) modes.
3. **Filter State in the URL**:
   - Filter query parameters: `?search=<term>`, `?topic=<topicId>`, `?level=<mid|senior|staff>`, `?status=<unanswered|bookmarked|unanswered-bookmarked>`, `?round=<round>`, `?role=<role>`.
   - Direct links load and immediately hydrate all filters, search inputs, and question lists.
   - State persists seamlessly during question navigation (`/interview/q/<id>?search=...&level=...`).
4. **Previous & Next Following the Filtered List**:
   - Navigation (`#previous-question` and `#next-question`) strictly cycles through matching questions in the active filtered set.
   - Progress counter accurately reports position within the filtered set (`Question X of Y`).
   - Returning to topics preserves the active search and filter state without reset.

### Measurements & Unit Tests
- Vitest unit tests in `src/components/interview/SimpleInterviewPage.test.tsx`:
  - `supports text search across questions and filters by level and status` (Passed)
  - `allows bookmarking questions and filtering to bookmarked questions` (Passed)
  - `follows the filtered list when navigating with Previous and Next` (Passed)
- Playwright E2E tests in `tests/interview-find-polish.spec.ts`:
  - `C9: text search over all questions, bookmarks, and URL filter synchronization` (Passed, 3.2s)
  - `C9 & C10: Filter state in URL, Previous & Next follow filtered list, one primary action per screen` (Passed, 2.6s)

---

## 2. Plan C10: Polish & Ergonomics

### Polish Invariants Verified
1. **One Primary Action Per Screen**:
   - **Topics landing**: exactly 1 primary action (`#start-topic`, `.si-primary`). All filter dropdowns and bookmark actions are secondary.
   - **Asking stage**: exactly 1 primary action ("Skip to answering", `.si-primary`). Code editor is secondary.
   - **Answering stage**: exactly 1 primary action (`#done`, "I'm done, show the answer", `.si-primary`).
   - **Answer stage**: exactly 1 primary action (`#next`, "Next question", `.si-primary`). Practice again and Mark complete are secondary.
   - **Done stage**: exactly 1 primary action ("Choose another topic", `.si-primary`).
2. **Zero Layout Jump Between Steps**:
   - Unified card width constraint: `.si-card`, `.si-card-stage`, and `.si-card-wide` all share `max-width: min(1240px, 100%)`.
   - Measured card bounding box width across stages in Playwright:
     - Topics step: `1240px`
     - Asking step: `1240px`
     - Answering step: `1240px`
     - Answer step: `1240px`
     - Width differential across transitions: `0px` (zero horizontal snap).
   - `.si-speaker-card` min-height: standardized to `min-height: 290px` for both asking and answering stages, ensuring the bottom action buttons maintain a stable vertical offset.
3. **Clear Error States for Microphone & Model Loading**:
   - Immediate microphone permission check before heavy model downloads: if access is denied (`NotAllowedError`), an accessible alert banner (`.si-error-banner`, `role="alert"`) displays an explanation:
     *"Microphone access was denied. Please allow microphone permissions in your browser address bar to speak your answers, or type below."*
   - Includes a dedicated [Try microphone again] action button (`.si-error-action`).
   - Non-blocking speech model download notices (`.si-notice-banner`, `role="status"`) with dismiss capability.
4. **Keyboard & Screen Reader Accessibility Pass**:
   - `Escape` key clears search input.
   - `Space` key skips asking and finishes answering.
   - `N` key advances to next question.
   - `aria-live="polite"` on result count and active stages.
   - Visible high-contrast focus rings on all interactive elements (`:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }`).
5. **320px and 375px Viewport Pass in Both Themes**:
   - Measured `document.documentElement.scrollWidth` across viewports:
     - At `375px` viewport: `scrollWidth = 375px` (0 horizontal overflow) in both Light and Dark themes.
     - At `320px` viewport: `scrollWidth = 320px` (0 horizontal overflow) in both Light and Dark themes.
   - All interactive touch targets satisfy WCAG minimums (`min-height: 44px; min-width: 44px`).
   - Zero console errors observed.

---

## 3. Rewrite of 30 "Debug this" Answers in Natural Spoken Voice

### Changes Made
- Identified all 30 questions in the "Debug this" topic (`scripts/interview/build_debug_questions.py`).
- Eliminated the repetitive, robotic "First... Second... Third... Test hypothesis one by... Test hypothesis two by..." template across all 30 answers.
- Rewrote each answer in authoritative, conversational senior-engineer spoken voice.
- Preserved every single technical metric, parameter name, and order of thought:
  - Initial diagnosis & hypothesis generation
  - Empirical testing & telemetry metrics
  - Exact underlying root cause
  - Concrete engineering fix
  - CI/CD regression guardrail
- Verified compliance with `writing-voice` rules:
  - Zero banned phrases (`delve`, `deep dive`, `unleash`, `game-changer`, `cutting-edge`, `seamless`, etc.).
  - Grep test: 0 hits in questions and answers.

---

## 4. Evidence Artifacts

The following screenshot evidence has been captured and saved to `docs/evidence/interview/`:
- `bookmarks-filtered-1440-dark.png` (Desktop dark mode: bookmarked questions filter)
- `bookmarks-filtered-375-dark.png` (Mobile 375px dark mode: bookmarked questions filter)
- `find-search-1440-light.png` (Desktop light mode: search results across topics)
- `find-search-1440-dark.png` (Desktop dark mode: search results across topics)
- `find-search-375-light.png` (Mobile 375px light mode: search results)
- `find-search-375-dark.png` (Mobile 375px dark mode: search results)
- `find-search-320-light.png` (Small mobile 320px light mode: search results, scrollWidth=320)
- `find-search-320-dark.png` (Small mobile 320px dark mode: search results, scrollWidth=320)
- `polish-asking-1440-light.png` (Desktop light mode: asking stage with stable card width)
- `polish-answering-1440-light.png` (Desktop light mode: answering stage with stable card width)
- `polish-answer-1440-light.png` (Desktop light mode: answer comparison stage)
- `polish-mic-error-1440-dark.png` (Desktop dark mode: clear microphone error state banner)
- `polish-mic-error-375-light.png` (Mobile 375px light mode: clear microphone error state banner)
