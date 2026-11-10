# /interview audit and fix plan (10 November 2026)

Audited on the live site at 1024px, 1440px and 375px, dark and light theme, through the full flow: landing, topic list, question, typed answer, review, deep link, timed mock. Question data checked from `src/data/interviewPractice.json` on main (917 questions). The microphone and both speech models could not be exercised in the audit browser, so speech accuracy is not covered here.

Severity: P0 breaks or blocks the main job, P1 makes the page feel unprofessional or confusing, P2 polish.

## 1. What is wrong

### A. First impression and landing layout

| # | Sev | Issue | Evidence |
| --- | --- | --- | --- |
| A1 | P0 | The first thing on the page is a "Speech model" dropdown. A new visitor has no idea what it is, and it sits above the page title. | All widths |
| A2 | P0 | No clear starting point. The page opens with Today's 10, then Role readiness, then the graph, then filters. The one primary button ("Start this topic") is about 1,200px down on desktop. | 1024px |
| A3 | P0 | The question list is a 133px-high scroll box holding 14,927px of content. Two questions are visible out of 130. | `.si-list` clientHeight 133, scrollHeight 14927 |
| A4 | P0 | On a phone the list is not collapsed at all: the page is 17,624px tall, about 22 screens. The topic graph starts 1,340px down and the questions 2,700px down. | 375px |
| A5 | P1 | Role readiness for a new user is a wall of zeros ("0 of 388", "0 of 6 self-rated Got it"). It reads as a broken dashboard and pushes real content down. | Landing |
| A6 | P1 | Today's 10 has two equal-weight grey buttons. "Skip one question today" sits beside the main action with the same weight. It says "Continue" before anything was started. | Landing |
| A7 | P1 | Graph labels for unselected topics are dim grey rotated text, hard to read in both themes. Rotated labels are upside-down-ish on the left side. On a phone the labels are hidden, so it is 23 unlabeled dots. | 1024px, 375px |
| A8 | P1 | Five filter dropdowns stacked on mobile take a full screen before any question. Four in a 2x2 grid on desktop with no labels. | 375px |
| A9 | P1 | The "Timed mock interview" entry is a small 32px pill under the group chips. Coding questions, Debug this and the system design canvas have no entry point at all from the landing page. | Landing |
| A10 | P1 | Group chips wrap into an uneven 2-3-1 pyramid. | 1024px |
| A11 | P2 | The whole page is one big bordered card inside the page, which wastes width on phones (double gutter). | 375px |
| A12 | P2 | Fine print the owner has banned: "Reviews saved on this device.", "Attempt history saved on this device." | Landing, review |

### B. Question room

| # | Sev | Issue | Evidence |
| --- | --- | --- | --- |
| B1 | P0 | Opening a question link directly (shared link, refresh, search result) does not open the question. It shows the landing page with a "Start the linked question" button far down the page. On a phone that button is about 2,500px down. | `/interview/q/genai-chunking-strategies/` |
| B2 | P0 | Audio starts by itself: the question is read aloud on entry, and the model answer is read aloud on the review step. Surprising in an office or on a bus, and there is no remembered mute. | Question and review steps |
| B3 | P0 | The microphone permission prompt fires with no explanation first. If denied, the amber error box takes the top of the screen and stays. | Answer step |
| B4 | P1 | Too many controls before the question: Speech model row, Topics, tags, counters, progress bar, Previous/Next, then the question. The question itself starts about 230px down. | Question step |
| B5 | P1 | "Question 1 of 130" and "1 of 130 completed" sit side by side and look like the same number. | Header |
| B6 | P1 | Review order is wrong for learning: self-rating comes first, before the user has read the model answer or the key-point check. | Review step |
| B7 | P1 | "Mark complete (+10 points)" appears after the counter already says the question is completed. Unclear what it does. | Review step |
| B8 | P1 | The key-point check is squeezed inside the "Your answer" column in nested boxes three levels deep, while the model answer column is half empty. | 1024px |
| B9 | P1 | The checklist intro is two sentences of caveat. Labels "NOT DETECTED" read like an error. | Review step |
| B10 | P1 | No stable step indicator. The user cannot see that the flow is Listen, Answer, Review. | All steps |
| B11 | P1 | On phones the action buttons are at the end of a long page, not fixed at the bottom. | 375px |
| B12 | P2 | The Done button's accessible name is "Done I'm done, show the answer I'm done, show the answer Space" (duplicated text). | DOM |
| B13 | P2 | Follow-ups, trade-offs and common wrong answers exist in the data for 580 questions but need checking that they are visible and well placed on the review step. | Data |

### C. Visual consistency and professional look

| # | Sev | Issue | Evidence |
| --- | --- | --- | --- |
| C1 | P1 | Fonts jump after load: headings render in a system serif, then the nav swaps to a handwritten font. Three families on one page (Fraunces, Source Sans 3, handwritten nav), plus system fallback flashes. | Screenshots 1 and 2 |
| C2 | P1 | The timed mock page uses a different design language (sans headings, numbered uppercase section labels, green selection cards) from the main page (serif headings, teal section titles). | `/interview/mock` |
| C3 | P1 | Light theme: default buttons are flat grey and look disabled. The Focus control in the nav is a grey block. | 1440px light |
| C4 | P1 | Native `<select>` elements everywhere, each styled slightly differently in height and padding. | Landing |
| C5 | P1 | Heading colours are inconsistent: cream H1, teal section titles, blue topic links, teal topic name. No clear hierarchy. | Landing |
| C6 | P2 | At 1440px the content is one narrow column on the left of a wide card for the top half, then two columns for the bottom half. | 1440px |
| C7 | P2 | Level badge says "Mid-Level" in a tiny pill on every row; 114 of 130 RAG rows carry the same badge, so it is noise. | List |

### D. Performance

| # | Sev | Issue | Evidence |
| --- | --- | --- | --- |
| D1 | P1 | Landing loads 1.87 MB over the wire: 713 KB main bundle, 577 KB question bank, 168 KB Firebase, 169 KB ads script. The full bank with every model answer is downloaded to show a list of titles. | Resource timing |
| D2 | P1 | An ads script loads on the interview page. | `show_ads_impl` |
| D3 | P1 | 309 buttons and every question row for the topic are in the DOM at once. | DOM count |
| D4 | P1 | Every page has the same browser title, "Neural Mastery: Learn AI from First Principles", including each question and the mock page. Bad for tabs, history, sharing and search. | `document.title` |
| D5 | P2 | One 404 in the console on the question page. | Console |
| D6 | P2 | Speech model download starts on entering a question even if the user is going to type. | "Loading 5%" on entry |

### E. Answer checking

| # | Sev | Issue | Evidence |
| --- | --- | --- | --- |
| E1 | P1 | False "not detected". The test answer said "I start from the queries and the documents… split on structure like headings" and the point "Choose chunking from document structure and user questions" was marked not detected. Known recall is about 43 to 51%. | Review step |
| E2 | P1 | Two key points matched the same user sentence, so the evidence quote repeats. | Review step |
| E3 | P2 | "Checking key points against the model answer on your device…" is implementation detail shown to the user. | Review step |

### F. Questions

| # | Sev | Issue | Evidence |
| --- | --- | --- | --- |
| F1 | P0 | 94 questions are leftover multiple-choice quiz items (they carry `options`). In a spoken interview "Which of these lets you…" makes no sense without the options, and arithmetic items ("What is its precision?", "fused score to four decimals") are not interview answers. | 94 with `options`; 31 in RAG |
| F2 | P1 | 287 questions are longer than 45 words and 8 are longer than 80 (longest 127). Read aloud, that is 20 to 50 seconds before the user can answer. | Title word counts |
| F3 | P1 | 337 questions have no rounds, roles or follow-ups, so the round and role filters silently hide them. | Field counts |
| F4 | P1 | Round tags are a mess: 29 distinct values, with topic names used as rounds and both `system-design` and `systems-design`. Role tags have 19 values but the filter shows 7. | Tag counts |
| F5 | P1 | Level skew: RAG is 114 mid, 12 senior, 4 staff. Classical ML is 48 mid, 6 senior. Only 95 staff questions overall. | Level counts |
| F6 | P1 | RAG has 130 questions while Evidence has 14 and Sandboxes 17. A topic with 130 questions needs sub-sections. | Topic counts |
| F7 | P1 | 125 model answers are under 60 words, too thin for a senior answer. Only 142 questions have trade-offs. | Answer word counts |
| F8 | P1 | Thin or missing areas for senior AI roles: behavioural (23 total, 3 "tell me about a time"), project deep-dive on the candidate's own work (1), frameworks such as LangGraph, LlamaIndex, DSPy (0 by title), PyTorch hands-on (3), SQL and data (3), reasoning models (1), agent memory (2), guardrails (3), leadership and stakeholder questions (8). | Title keyword screen, a rough check |
| F9 | P2 | 64 questions are bare "What is X?" definitions. Fine as warm-ups, but they should be marked as such and not counted as senior practice. | Title screen |

### G. Owner report, 10 November (top priority)

| # | Sev | Issue |
| --- | --- | --- |
| G1 | P0 | Background and text colours are bad. Dark theme is navy on navy with dim grey secondary text and cream headings; light theme is beige with grey buttons. Text does not stand out from its background. |
| G2 | P0 | The interview screen does not fit the device screen. The question room should fill exactly one viewport at every size, with the action always visible and no page scroll during Listen and Answer. |

Fix for G1: a new palette for the interview pages in both themes. Dark: near-black neutral background (not blue), one raised surface, near-white primary text, secondary text at 4.5:1 or better, one accent colour for actions. Light: white or very light neutral background, near-black text, the same accent. Every text and background pair measured at 4.5:1 or better (3:1 for large headings), with the measured ratios listed in the evidence.

Fix for G2: the question room uses the dynamic viewport height (100dvh minus the site header) as a column: header, question, answer area that flexes, fixed action bar. Only the Review step scrolls. Checked at 320x568, 375x667, 375x812, 414x896, 768x1024, 1024x768, 1366x768, 1440x900, 1920x1080, and with the phone keyboard open.

## 2. The fix: what the page becomes

One idea drives the design: **a visitor should be answering a question within one click, and should always know what to do next.**

### Landing: "practice home" in one screen

1. **Header row.** Title, a single progress line, and one primary button: "Start practising" for a new user, "Continue: <topic>" for a returning one. A secondary "Timed mock" button beside it. Nothing else above the fold.
2. **First visit only: a 3-tap setup.** Role (Applied AI, Agentic, Inference, Evaluation), level (mid, senior, staff), interview date (optional). This sets the default filters and Today's 10, and replaces the wall of zeros. It can be changed later from a small "Preparing for: Senior Applied AI" chip.
3. **Four ways in, as equal cards:** Today's 10, Browse by topic, Timed mock, Coding and debugging. Each card has one line of status and one button.
4. **Topic browser.** Desktop: graph on the left, a full-height question list on the right (same height as the graph, about 560px, virtualised). Labels on the graph are horizontal and readable; unselected labels use the normal secondary text colour. Phone and tablet under 900px: the graph is replaced by a grid of 23 topic cards with a progress ring and count, two per row; tapping one opens that topic's list on its own screen.
5. **Question list.** Shows 10 rows, then "Show more". Search plus one "Filters" button that opens a sheet with level, round, role and status as chips; active filters show as removable chips. Level shown as a small coloured dot with a legend, not a pill on every row. RAG and other large topics get sub-section headings.
6. **Readiness** moves below the browser as a compact strip, and only appears after 5 answered questions.
7. Speech model setting moves into the question room behind a settings button. Fine-print lines are removed.

### Question room: one focused column

1. Deep links open the question directly, with the page title set to the question.
2. One slim header: back, topic, "3 / 130", settings. Previous and Next move to the bottom bar.
3. A three-step indicator: Listen, Answer, Review.
4. First time only, a short primer before the mic prompt: "Speak your answer or type it", with two buttons. The choice is remembered. A denied mic falls back to typing with a one-line note, not a large warning box.
5. Read-aloud is a remembered toggle. The question is read on entry only if the user chose voice; the model answer is never read automatically.
6. Review order: key points first (what you covered, what you missed), then the model answer with trade-offs, follow-ups and common wrong answers as tabs or sections, then self-rating as the last step, which also completes the question. "Mark complete" is removed.
7. Key-point check gets the full width: two short lists, "Covered" with the quoted sentence and "Not heard". One short heading, no caveat paragraph.
8. Phones: a fixed bottom bar holds the single primary action for the step.
9. Max width about 860px, centred, at every desktop size.

### One visual system

One heading font and one body font loaded with `font-display: swap` and preloaded, so nothing jumps. The mock page, canvas and coding overlay use the same tokens as the main page. Custom select and chip components replace native selects. Light theme buttons get a real outlined style. Checked at 320, 375, 414, 768, 1024, 1280, 1440 and 1920px in both themes.

### Performance

Split the bank into a small index (id, title, level, topic, tags) for the landing page and per-topic answer files loaded on demand. Lazy-load Firebase, the graph and the mock page. No ads script on `/interview`. Speech models load only after the user chooses voice. Per-page titles and descriptions. Target: landing under 500 KB transferred.

### Questions

1. Rewrite the 94 quiz leftovers as open spoken questions, or move the arithmetic ones to a separate "Quick checks" set that is typed, not spoken.
2. Every question longer than 45 words gets a short spoken version (under 35 words) with the full scenario shown on screen as context. Take-home prompts are shown, not read.
3. One fixed vocabulary: 10 rounds and 7 roles, the ones in the filter. Every question tagged. A test fails on unknown tags.
4. Fill tags, follow-ups and wrong answers for the 337 untagged questions.
5. Bring every model answer to at least 80 words with a trade-off where one exists.
6. New questions for the thin areas in F8, about 120, with senior and staff levels favoured. Behavioural answers follow situation, action, result.
7. Rebalance levels by adding senior and staff variants to RAG and classical ML instead of relabelling.

### Answer checking

Split user answers into clauses as well as sentences before matching, allow one user sentence to cover two points only when both pass on their own, and re-measure on the held-out sets. Ship only if recall rises and false positives do not.

## 3. Who does what

Two lanes with no shared files.

**agy (design and layout), worktree `platform-vite-interview`**
1. B1 deep link, D4 titles, B2 autoplay, B12 (the P0 fixes that are small). Ship first.
2. Question room redesign (section 2, question room).
3. Landing redesign (section 2, landing), including phone topic grid and filter sheet.
4. One visual system: mock page, canvas, light theme, fonts.
5. Screenshots at all eight widths in both themes, taken from the running page, as evidence.

**Codex (data, speed, checking), worktree `platform-vite-stt`**
1. F3, F4 tag vocabulary and test.
2. D1, D2, D3, D6 bundle split and lazy loading.
3. F1, F2 quiz leftovers and spoken versions.
4. F7, F8, F5 answers and new questions.
5. E1, E2 clause matching with measurement.

Codex is out of usage until 15 November. Until then agy takes Codex items 1 and 2 after its own item 1, and the question-writing waits for Codex or is done by agy after the redesign.

**Lead**: review each commit on the running page at 375 and 1280px before shipping, merge, watch CI and Deploy, check the live site.

## 4. Done means

- A new visitor reaches a question in one click from the landing page, at every width.
- A question link opens that question.
- No sound plays unless the user chose voice.
- Landing is at most 3 screens tall on a 375px phone.
- No horizontal scroll and no control under 44px at 320 to 1920px.
- Landing transfers under 500 KB.
- Every question has round, role and level from the fixed vocabulary; none carries hidden options; every spoken prompt is under 35 words.
- CI green, and each item verified on the live site.
