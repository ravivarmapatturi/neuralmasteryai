---
name: notebook-page
description: MANDATORY for every agent touching any Learn page, blog post, lab or visual (src/content/**, src/viz/**, src/components/notebook/**). Every page must look and feel like a handwritten notebook page: plain white paper in light theme (dark counterpart in dark theme), vertical red side ruler retained, no horizontal ruled lines, pen writing, pen-drawn boxes and diagrams, highlighter. Strict rules, enforced by `npm run check:notebook` in CI. Load this before writing a single line of page content.
---

# The notebook page (strict rules, owner-mandated 16 Nov 2026)

The owner's words: "We have a notebook. In it we are writing the content, formulas, drawings and videos. That awesome feeling is what we have to bring." Every Neural Mastery page is **one page of a learner's notebook**, written by hand, explained simply, drawn with a pen. If a page looks like a clean technical document, it is wrong, even if every fact is right.

These rules are not suggestions. `npm run check:notebook` fails CI on rule violations, and Claude rejects any batch that breaks them. If a rule seems impossible for your case, **stop and ask in your report**; do not work around it.

## The look (what the reader must feel)

- A plain white notebook page in light theme (dark counterpart in dark theme) with the vertical red side ruler/margin line retained, and no horizontal ruled lines; "Neural Mastery" and the date at the top like a diary entry.
- Everything is written by hand (Kalam). Only real program code and maths are exempt.
- Boxes, tables, callouts and widgets are **drawn by pen**: sketchy irregular borders (`SketchBox`, `RoughShape`), never perfect rectangles.
- Key terms get a pen underline (`<Key>`); key results get a yellow highlighter (`<Mark>`); important numbers are circled or boxed.
- Diagrams are **pen drawings**: rough strokes, hand-drawn arrows, Kalam labels, pen colours (blue ink, red, green, yellow highlighter). Never ASCII art, never stock clip-art.
- Short tips live as sticky notes in the margin (inline on phones).

## Hard rules (each one is checked)

1. **No fake code.** A fenced block (```` ``` ````) is only for real, runnable or copy-pasteable program code, and it must name its language (```` ```python ````, ```` ```bash ````, …). Values, parameter lists, inputs, worked-example givens, formulas, file trees and outputs are **written on the page**, not put in a code box:
   - parameter lists → a handwritten "Given:" list or a pen-drawn table;
   - formulas → KaTeX (rule 3);
   - program output → inside `RunnableCode` or a labelled output box, not a bare fence.
   Bad: a ```` ``` ```` block listing `Corpus Size (N) = 1,000 documents`. Good: "**Given:** N = 1,000 documents, df = 100, …" written as a pen list with the numbers circled.
2. **No ASCII-art diagrams**, ever: no `──`, `│`, `├`, `└`, `-->`, `+---+`, box-drawing or arrow art in any block. Draw it as a pen-style SVG component.
3. **Display maths on its own lines.** `$$` alone on a line, the formula, `$$` alone on a line. Never `$$…$$` on one line (it renders inline and gets cut). No stacked `\frac` inside table cells; write `a/b` flat in tables. Every display formula sits in a hand-drawn frame.
4. **Real headings only.** A section title is `##`/`###`/`####`, never a bold-only line, never plain text.
5. **Every concept gets a picture.** Each H2 section that explains a mechanism has a pen-style diagram, an interactive visual, or a short video clip. A page over 1,500 words with fewer than 3 visuals fails.
6. **Simple first.** Plain words before jargon; one idea per paragraph (2–5 sentences); theory, proofs and history go inside one `<GoDeeper>`. No headings like "Architectural Dimension". Write like the owner explains on his whiteboard.
7. **Same numbers everywhere.** A worked example uses identical numbers in the prose, the visual, the table and the code. Recompute them; never copy them.
8. **Nothing cut, nothing overflowing.** No horizontal page overflow at 320 and 375 px; wide formulas and tables scroll inside their own frame; nothing clipped on desktop or phone.
9. **No plain document chrome.** No unstyled HTML tables, `<pre>` blocks or raw `<hr>` as decoration; use the notebook components.
10. **Verify in a real browser** at 1440 and 375 px, light and dark, before you report. Screenshots in your report must be real page captures (not element overlays).

## Components to use

- `NotebookCallout` (amber warning, cobalt takeaway, green heuristic), `SketchBox`, `RoughShape`, `Mark`, `Key` from `src/components/notebook/` and `src/components/content/NoteMarks.tsx`.
- `ELI5`, `PredictFirst`, `GoDeeper`, `Remember`, `RunnableCode` as described in `learn-page`.
- Visuals: `useVizTokens()`, `VisualizationContainer`, pen-style strokes (see `visualization`).

## Before you say done

```bash
npm run check:notebook   # notebook rules 1–5, 9
npm run check:math       # rule 3
npm run check:mdx && npm run check:links && npm run typecheck
```

Then the real-browser check (rule 10). Report which rules you checked and how.
