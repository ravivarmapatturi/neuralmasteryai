# The Neural Mastery page standard (v1, 18 Nov 2026)

Every Learn page, blog post and lab follows this standard. It has two halves: **what every page contains, in what order**, and **what every part looks like, with exact sizes**. Each rule names the check that enforces it, so a page that breaks it cannot be released.

Why this exists: on 18 Nov the owner found pages that each follow their own structure, look like dashboards rather than a notebook, use words like "cybernetic chassis", and have tiny, crowded text. A survey of 1,999 pages confirmed it: "Remember" sections appear on 98% of Software System Design pages and 0% of AI Evaluation pages; 40 widget files use small capital labels; prose runs 1,400 px wide on desktop.

---

## Part 1. One structure for every Learn page

Every Learn page has these sections, in this order. Headings use these exact words, so readers always know where they are.

| # | Section (exact heading) | What goes in it | Size |
|---|---|---|---|
| 0 | Title (`#`) | Plain topic name. No "Ultimate", "Complete", "Mastering". | 2–6 words |
| 1 | `<ELI5>` box, directly under the title | The idea with an everyday picture. No symbols, no jargon. | 3–6 sentences |
| 2 | `## Why it exists` | The problem the old way could not solve, with one concrete case. | 1–3 short paragraphs |
| 3 | `## The big picture` | **One overview drawing** of the whole idea, then 2–4 sentences on what to notice. | 1 drawing |
| 4 | `## <Mechanism name>` (1–5 of these) | One idea each: plain words → drawing → small numbers → formula (if any). Name the real thing ("Masking"), never "Details". | Each has ≥1 drawing |
| 5 | `## Worked example` | One small example (3 tokens, a 4×4 table) carried through drawing, text and code with **identical numbers**. | 1 drawing + numbers |
| 6 | `## Try it yourself` | `<RunnableCode>` with the same numbers, ending in `# Try it:` and one edit to make. | 1–2 code boxes |
| 7 | `## Common mistakes` | Real failure → why it happens → the fix. | Table, 3–6 rows |
| 8 | `## When not to use it` | Situation → better choice. | Table, 2–5 rows |
| 9 | `## Remember` | Idea → one line. The page in ten lines or fewer. | Table, ≤10 rows |
| 10 | `Next:` line | One link and one sentence on why it is next. | 1 line |
| 11 | `## Sources` | Primary papers and docs, with year and working link. | 3+ items |

Where things go:
- `<PredictFirst>` (1–3 per page) sits **just before** a surprising result, never after it.
- History, proofs and citations go in **one** `<GoDeeper>` per mechanism. The page must make sense with every GoDeeper closed.
- Hands-on topics (MLOps, infra, agents, inference) also need real commands or config that run.

Section landing pages (`overview`, `roadmap`) use a short version: title, ELI5, `## What you will learn` (one drawing of the path), `## The chapters` (one line per chapter), `## Start here`. No widgets with code inside.

Blog posts: title, one-paragraph summary, then the body with the same look rules (Part 2). Labs: the `lab` skill, with the same look rules.

**Checks:** `check:structure` (new) fails a page whose required headings are missing or out of order, or that has 0 or 2+ ELI5 boxes, more than 10 Remember rows, or PredictFirst after its answer.

---

## Part 2. One look for every page

### 2.1 Paper

- A plain white page (dark theme: its dark counterpart), with **only** the red margin line on the left. No ruled lines.
- Diary header at the top: "Neural Mastery · date".
- **Reading column: 720 px maximum** for text. Drawings, tables and widgets may go to 960 px. Today prose runs up to 1,400 px; lines that long are hard to read.

### 2.2 Writing (one font, one size per role)

All visible text is handwritten (Kalam). Only real program code uses the mono font.

| Role | Size (desktop / phone) | Weight | Colour |
|---|---|---|---|
| Page title (H1) | 36 / 30 px | 700 | dark ink |
| Section (H2) | 26 / 23 px | 700 | blue ink |
| Sub-section (H3) | 21 / 19 px | 700 | green ink |
| Small heading (H4) | 18 px | 700 | ink |
| Body text | 18 px, line height 1.75 | 400 | ink |
| Table text | 16 px | 400 (header 700) | ink |
| Captions, notes | 15 px | 400 | soft ink |
| Labels inside drawings and widgets | 14 px minimum at the real displayed size | 400–700 | as drawn |

- **Nothing on the page is smaller than 14 px**, including labels inside widgets and SVG drawings as they appear on screen.
- **Sentence case everywhere.** No SMALL CAPITAL labels ("HARNESS COMPONENT: VERIFIER" becomes "Harness part: verifier").
- These sizes are set once, as shared tokens. No page or component may set its own heading, body or table size.

**Checks:** typography guard (exists, extend to these values and to widgets); new min-size guard (any visible text under 14 px fails, measured in the browser); static check rejects `textTransform: 'uppercase'` and `letter-spacing` caps styling in `src/viz` and `src/components`.

### 2.3 Pens

- Blue ink: main lines, links.
- Red pen: warnings, mistakes.
- Green pen: correct answers, takeaways.
- Yellow highlighter: one key result per section.
- Purple: a second thing being compared.
- At most 3 pen colours in one drawing.

### 2.4 Boxes and callouts

- Every box is pen-drawn (`SketchBox`, `NotebookCallout`), never a crisp rectangle.
- 4 callouts per page at most. Callout text uses the body size.

### 2.5 Drawings (the most important part)

- Only pen-style components: `PenFlow` for flows and pipelines, `SketchRect`, `SketchArrow` and `SketchEllipse` for custom drawings, and existing `src/viz` components restyled.
- No ASCII art. No stock images. No grid of identical cards.
- 9 boxes or fewer per drawing. If it needs more, split it.
- Every drawing has a one-sentence caption that says what to notice.
- **No label touches another label, a line, or the edge**, at 1440, 768 and 375 px.
- The numbers in a drawing match the text exactly.

**Checks:** label-overlap guard (exists; extend from 4 pages to every page with a drawing); check:notebook rules 2 and 5.

### 2.6 Tables

- Pen-drawn border, highlighted header row, 5 columns at most.
- No stacked fractions in cells; write `a/b`.
- On phones a wide table scrolls inside its own frame; the page never scrolls sideways.

### 2.7 Code

- Only real, runnable or copyable code goes in a code box, and it names its language.
- Code boxes are **light paper, not black**, with a pen border, the language written in hand at the top, and the mono font at 15 px.
- 25 lines at most per box; longer code goes in `RunnableCode` with a "show all" fold.
- Values, file trees, outputs and parameter lists are written on the page, not put in code boxes.

**Checks:** check:notebook rule 1; a style test that fenced code renders on a light background in the light theme.

### 2.8 Maths

- Every display formula sits in a hand-drawn frame.
- The formula comes **after** the picture and the plain-words version.
- Right under it, a "where" list explains each symbol in plain words.
- No maths in headings.

**Checks:** check:math (exists); check:structure flags a display formula with no "where" list within 6 lines.

### 2.9 Widgets (calculators, explorers)

All widgets use one frame, `NotebookWidget` (new), with:
- a handwritten title in sentence case;
- controls drawn as pen chips;
- results written large, with the key number circled;
- no inner code blocks and no dashboard card grids;
- the same text sizes as the page (14 px minimum).

The harness-engineering roadmap's architecture widget is the first one to convert.

---

## Part 3. Words

- Plain words before jargon. One idea per paragraph, 2–5 sentences.
- Write like explaining at a whiteboard to a smart friend.
- **Banned words** (they read as AI-written): cybernetic, chassis, principled, canonical, authoritative, leverage, robust, seamless, delve, holistic, synergy, paradigm (outside ML usage), "it is important to note", "in today's world", "unlock", "supercharge", "game-changer", "Production X Specification".
- Every number is either worked out on the page or cited.
- No citations in the running text; they go in GoDeeper or Sources.
- No sentence that would fit unchanged on any other page.

**Checks:** check:words (new) fails on banned words in prose (not in code), and warns on paragraphs over 120 words and sentences over 35 words.

---

## Part 4. Rollout

1. **Build the shared parts:** reading-column width, the type tokens above, light code boxes, `NotebookWidget`, and the min-size and uppercase checks. These fix the look of every page at once.
2. **Pilot: `harness-engineering/roadmap`** (the owner's example). Rebuild it fully to this standard. Show the owner screenshots (desktop and phone, light and dark) for approval **before** any other page.
3. **Template:** turn the approved pilot into `docs/standards/page-template.mdx` and update the `learn-page` and `notebook-page` skills to point here.
4. **Pages, in batches of 8**, scored against this standard:
   - Harness Engineering, then Search, then the most-read chapters, then section by section by size: MLOps, Machine Learning, Deep Learning, Agents, LLMs & GenAI, the rest. Blog last.
   - Each batch passes every check and gets a real-browser look in four views (desktop and phone, light and dark) before release.
   - A scorecard file records each page's pass or fail per rule.
5. **New checks start on changed pages only**, so CI stays green while the backlog is fixed. They become site-wide once a section is done.

Practice problems (1,633 files) follow only Part 2 and Part 3, not the Learn structure.
