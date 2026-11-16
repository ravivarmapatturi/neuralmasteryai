# Plan: Learn pages that feel handwritten in a notebook (pilot on BM25, then sitewide)

Owner: Claude. Senior engineer: Codex. Implementer: agy. Worktree `platform-vite-srr`. Only Claude pushes.
Order: after Part A of `math-and-clarity-fix-2026-11.md` (sitewide formula fix). **Pilot first, owner approves, then roll out.**

## Why

The owner (16 Nov 2026): "I'm not getting the feeling of handwritten style on this page." Today the default `pure-white` theme turns ruled lines off (`theme.css`: `background-image: none !important` for `.nb-ruled`), and Learn pages are a clean white document with Kalam text, crisp rectangular cards, tables and code boxes. Notebook components already exist but no Learn page uses them: `src/components/notebook/SketchBox.tsx`, `RoughShape.tsx`, `NotebookCallout.tsx`, `src/components/content/NoteMarks.tsx` (`Mark`, `Key`). The same look the owner approved for videos (white ruled page, red margin line, "Neural Mastery" + date header, pen-drawn boxes and arrows, highlighter) should be the look of the pages.

## The notebook page (design spec)

1. **Paper:** the reading column becomes a notebook page: white paper, faint blue ruled lines aligned to the body line-height, a red margin line on the left, subtle page edge/shadow. Sidebars stay plain so the page stands out. Dark theme: dark-paper equivalent with dim rules (keep contrast ≥ 4.5:1).
2. **Page header:** small handwritten "Neural Mastery" with the logo and the page's last-updated date top-right, like a diary entry.
3. **Headings:** pen-coloured (already), plus a hand-drawn underline/highlighter stroke under H2 (SVG squiggle or rough stroke), not a straight CSS border.
4. **Boxes drawn by hand:** callouts, ELI5, PredictFirst, GoDeeper, tables, code blocks, RunnableCode, and every interactive widget get a sketchy hand-drawn border (`SketchBox`/`RoughShape`, slightly irregular corners, no perfect rectangles), deterministic (seeded) so it does not wiggle on re-render. Tables: hand-drawn rules between rows instead of a grid.
5. **Margin notes:** short tips and "Remember" items can sit as sticky notes (pale yellow, slight tilt) in the right margin on wide screens, inline on phones.
6. **Highlighter and pen marks:** key terms use `Key` (pen underline) and important results use `Mark` (yellow highlighter); numbers in worked examples circled or boxed by pen.
7. **Diagrams:** drawn in the same pen style (rough strokes, hand-drawn arrows, Kalam labels) instead of clean geometric SVG; colours = pen colours (blue ink, red, green, yellow highlighter).
8. **Maths:** KaTeX stays (exempt from the handwriting rule) but sits inside a hand-drawn box when it is a display formula; simple formulas in prose may be written as text in Kalam.
9. Must stay readable: body text size unchanged, no animation by default (respect reduced motion), no horizontal overflow at 320/375 px, print-friendly.

## Pilot

Apply 1–8 to `search-ranking-recommendations/bm25.mdx` (after Part B content simplification) using shared CSS/components so the rollout is mostly global CSS + component swaps, not per-page rewrites. Produce screenshots: top of page, a worked example, the calculator, a table, a diagram, code block; desktop 1440 and phone 375; light and dark. **Stop and report**: Claude shows the owner before any rollout.

## Rollout (after owner approval)

Global CSS for the reading column and shared components (`NotebookCallout`, ELI5, PredictFirst, GoDeeper, tables, code, `VisualizationContainer`) so every Learn page gets the paper, boxes and marks; then convert the most-visited pages' diagrams to the pen style in batches. Keep the existing Kalam Playwright guard passing.

## Done when (pilot)

Report `docs/plans/notebook-page-redesign-report.md` with the screenshots, the list of components changed, contrast check results, and overflow results.
