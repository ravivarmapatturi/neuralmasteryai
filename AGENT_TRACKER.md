# NeuralMastery Agent Work Tracker & Dispatch Sheet

> **MANDATORY INVARIANT FOR ALL AGENTS**:
> Before starting ANY work in this repository, you **MUST**:
> 1. Read this tracker sheet (`AGENT_TRACKER.md`) and check active work to avoid collisions.
> 2. Register your agent name, your session timestamp, the exact task you are executing, and set status to `IN_PROGRESS`.
> 3. Verify that no other agent is actively modifying the same files or features.
> 4. Once your work passes the 4-layer verification gate (`npm run typecheck`, `npm run check:links`, `vitest`, `build`), update your row with `COMPLETED`, execution duration, and summary comments.
> 5. Never leave stale or untracked work in this codebase.

---

## Active & Historical Task Board

| Timestamp (ISO) | Agent Name | Session ID / Branch | Target Files / Feature Area | Task Objective | Status | Verification Gate | Summary & Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `2026-10-29T23:03:39+05:30` | `Antigravity` | `main` | `src/content/docs/harness-engineering/`, `src/viz/` | Build new Python Harness Engineering track with OpenAI/Anthropic patterns | `COMPLETED` | Typecheck, Links, Vitest, Build (Passed) | 6 deep-dive chapters + 4 interactive diagrams committed in `8a376fe8`. |
| `2026-10-29T23:44:30+05:30` | `Antigravity` | `main` | `src/viz/diagrams/`, `src/content/docs/harness-engineering/` | Elevate Harness Engineering visual density to Attention & Transformers benchmark | `COMPLETED` | Typecheck, Links, Vitest, Build (Passed) | Added SubprocessSandbox, InstructionBudget, AnthropicTriad, and OpenAIEntropy visualizers (`488887b0`). |
| `2026-10-29T23:49:31+05:30` | `Antigravity` | `main` | `AGENTS.md`, `src/content/docs/harness-engineering/` | Create root AGENTS.md contract and enforce first-party authoring standards | `COMPLETED` | Typecheck, Links (Passed) | Established repository-wide operating invariants and purged meta-commentary (`005c6316`). |
| `2026-10-30T00:18:04+05:30` | `Antigravity` | `main` | `AGENTS.md`, `overview.mdx`, `context-and-instruction-design.mdx` | Fix Pyodide worker multi-line string IndentationError with textwrap.dedent | `COMPLETED` | Typecheck, Links, Vitest (Passed) | Documented Section 8 in AGENTS.md; tested in Pyodide WASM runtime (`4137fedf`). |
| `2026-10-30T10:38:00+05:30` | `Antigravity` | `main` | `AGENT_TRACKER.md`, `.agent/skills/`, `scripts/` | Create automated agent tracker harness, validation CLI, and mandatory check skill | `COMPLETED` | Typecheck, Links, Vitest, Build (Passed) | Established repository-wide agent tracker sheet, validation script, and .agents skill. |
| `2026-10-30T11:05:00+05:30` | `Antigravity` | `main` | `src/content/docs/inference-engineering/`, `src/viz/` | Build Inference Engineering & Edge AI track with interactive visualizers | `COMPLETED` | Typecheck, Links, Vitest, Build (Passed) | 8 deep-dive chapters + 5 interactive visualizers (Roofline, PagedAttention, SpeculativeDecoding, TensorArena, QuantizationScale) + PD Disaggregation & Radix prefix caching. |
| `2026-10-30T12:23:00+05:30` | `Antigravity` | `main` | `index.html` | Embed Google AdSense publisher code for monetization verification | `COMPLETED` | AdSense snippet verified in <head> | Integrated client ca-pub-4080476661803295 with async and crossorigin attributes. |
| `2026-10-30T15:45:00+05:30` | `Antigravity` | `main` | `PracticeListPage.tsx`, `ChooserPage.tsx`, `BlogListPage.tsx`, `NetflixSeriesCarousel.tsx`, `BlogCover.tsx`, `theme.css` | Redesign Practice for AI era, update Homepage pitch to visualization-first, implement Netflix 5s series carousel with progress dashes, and create innovative profile covers for all blogs | `COMPLETED` | Typecheck, Build (Passed) | Completed full redesign of `/practice` with 4 Human Metaskills, updated home pitch, Netflix 5s carousel with dash fill, and 19 custom SVG blog profile covers. |
| `2026-10-30T16:15:00+05:30` | `Antigravity` | `main` | `ChooserPage.tsx`, `LearningLoopVisualizer.tsx`, `PracticeListPage.tsx`, `DecisionLab.tsx`, `FailureLab.tsx`, `WouldYouShipThis.tsx`, `SkillsMapVisualizer.tsx`, `AiEraSkillsComparison.tsx`, `ProgressRadar.tsx`, `BlogSeriesPage.tsx`, `FocusMusicContext.tsx`, `FocusMusicControl.tsx`, `FocusMusicPopover.tsx`, `Navbar.tsx`, `App.tsx`, `theme.css` | End-to-end AI-Era Product Redesign & Persistent Focus Music System | `COMPLETED` | Typecheck, Build (Passed) | Complete redesign of Home, Engineering Lab, 3 Paths, Decision Lab, Failure Lab, Review Lab, Series Landing Page, and Persistent Focus Music System with autoplay fallback, volume control, and equalizer. |

| `2026-10-31T12:00:00+05:30` | `Codex` | `main` | `src/components/`, `src/contexts/FocusMusicContext.tsx`, `src/App.tsx`, `.agents/skills/`, `AGENTS.md`, `scripts/`, `server/interview_judge.py`, `public/audio/` | Improve labs, interviews, blog visuals, focus audio, sign in and information pages | `COMPLETED` | Typecheck, Links, 39 frontend tests, 2 Python tests, Build (Passed) | Commit `3219adc7`. Completed 2026-10-31 12:37 IST; about 37 minutes since registration. Visual labs and blog diagrams, interviews, full provided bamboo audio, compact controls, sign in modal, handwritten information pages. Jeva GPU inference not verified; no production deployment. Unrelated scratch work preserved. |

| `2026-10-31T12:42:55+05:30` | `Codex` | `main` | `InterviewPage.tsx`, `Markdown.tsx`, `src/data/interview*`, `scripts/interview/`, `src/content/docs/interview-prep/overview.mdx`, `src/styles/learning-experiences.css` | Integrate existing Interview Prep question banks into Interview and deploy verified changes | `VERIFYING` | Typecheck, Links, 502 unit tests, Build, workspace smoke (Passed) | 241 questions and 13 guides integrated from MDX; deployment pending. |
| `2026-11-02T13:15:00+05:30` | `Antigravity` | `tracks-depth` | `src/content/blog/`, `src/content/docs/harness-engineering/`, `src/content/docs/inference-engineering/`, `src/content/docs/context-engineering/`, `src/content/docs/agent-observability/`, `src/viz/` | Deepen harness & inference engineering, create context-engineering and agent-observability tracks, and author AI engineering blog post | `COMPLETED` | Typecheck, Links, Vitest (Passed, 16/16 tests) | Authored blog post (2,094w), deepened 5 harness chapters (10,392w) and 6 inference chapters (13,182w), added 4 context-engineering chapters (9,401w) and 4 agent-observability chapters (8,856w). Added 4 interactive visualizers with unit tests. Zero banned words, real verified URLs. |

---

## Status Definitions

- `CLAIMED`: Agent has reserved the task; preparing environment and inspecting files.
- `IN_PROGRESS`: Agent is actively writing code, tests, or content.
- `VERIFYING`: Agent is executing the 4-layer verification gate (`npm run typecheck`, `npm run check:links`, `vitest`, `build`).
- `BLOCKED`: Task encountered an obstacle (e.g. missing dependency or user question).
- `COMPLETED`: 100% of verification gates passed, changes committed, and summary logged.
- `ABORTED`: Task cancelled or rolled back.

---

## Agent Pre-Flight Checklist

Before writing any code or making edits:
- [ ] Read `AGENT_TRACKER.md` to ensure your target feature is not locked by another agent.
- [ ] Add your entry to the table above with status `IN_PROGRESS`.
- [ ] Read `AGENTS.md` to ensure full compliance with coding and content invariants.
- [ ] Run `node scripts/check-agent-tracker.mjs` to validate tracker format integrity.
| `2026-11-01T16:30:00+05:30` | `Claude-Code` | `main` | `AGENTS.md`, `.agents/skills/`, `src/styles/theme.css`, `index.html`, `scripts/prerender-for-pagefind.mjs`, 3 MDX callouts | Shared agent harness + skills; fix mobile navbar overflow, AdSense console errors, invalid callout colour, prerender RAM | `COMPLETED` | Typecheck, Links, 502 Tests, Build, Pagefind, Smoke 11/11 (Passed) | New skills: learn-page, blog-post, lab, interview-question, visualization, ui-design, writing-voice, ship-gate. |
| `2026-11-01T14:41:13+05:30` | `Codex` | `main` | `src/data/interviewCriteria.json`, `AGENT_TRACKER.md` | Replace generic interview grading criteria and follow-ups for all 241 questions, one bank per commit | `COMPLETED` | Typecheck, Links, 513 Tests (Passed); Build omitted by user | 241/241 questions covered. Bank commits: `b02183ad`, `a8355ea9`, `3a6734cc`, `a2b4a5e8`, `3c916335`. No push. |
| `2026-11-02T10:11:44+05:30` | `Codex` | `main` | `src/data/interviewCriteria.json`, `AGENT_TRACKER.md` | Rewrite all 117 RAG interview criteria by hand from their model answers | `COMPLETED` | `check:criteria` 241/241, Typecheck, Links, 518 Tests (Passed); Build omitted by user | RAG batches completed in `285b586e`, `2bd9dc45`, `604546f1`, `87b22866`, and `13a46a4d`; existing entries preserved; no push. |
| `2026-11-02T13:40:00+05:30` | `Antigravity` | `tracks-depth` | `src/content/docs/`, `src/viz/` | Execute docs/briefs/agy-tracks-fixes.md: When Not to Use tables, ASCII replacement, claim precision, remove dead link, cut padding | `COMPLETED` | Typecheck, Links, Vitest 532/532 (Passed) | Completed reviewer findings: When Not to Use tables added, ASCII box diagrams replaced with 9 React/SVG components, claims/timings relabeled, dead Datadog link fixed, padding removed. |
