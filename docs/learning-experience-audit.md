# Learning experience audit

## Architecture

The 255 Learn MDX pages live in `src/content/docs`; practice problems are stored separately under `src/content/docs/practice-problems`. `scripts/generate-page-meta.mjs` extracts frontmatter into generated metadata. `src/lib/contentTree.ts` builds lazy routes, sidebar sections, and previous/next order. `DocLayout` provides the navbar, curriculum sidebar, heading TOC, mobile drawer, feedback, progress action, and previous/next links. MDX embeds reusable React diagrams from `src/viz`, whose shared primitives and tokens live in `src/viz/primitives` and `src/theme/vizTokens.ts`. The Blog is file MDX plus stored posts and has a separate template; links between Blog and Learn are mostly authored manually. Search uses Pagefind after prerendering. Theme tokens cover light and dark modes. GitHub Actions builds and deploys the Vite site to Pages.

## Representative source review

The full automated inventory is in `learning-page-inventory.md`. Detailed manual review of 15 Learn pages and eight Blog articles remains open. Source counts are imperfect: an embedded visualization may be imported under a name without `Diagram`, and prose quality cannot be inferred from word count.

## Strengths

- Ordered curriculum, responsive navigation, persistent TOC, and previous/next already exist.
- Page-specific MDX chunks avoid loading the curriculum at once.
- Existing diagrams often compute real values; RRF has tested scoring logic.
- Practice and progress are integrated with the same product.

## Weaknesses and priorities

- P1: Lesson quality varies across a large curriculum; missing summaries, explicit failure modes, and practice links need editorial review. The inventory provides triage, not automatic grading.
- P1: Visual captions do not consistently disclose what is calculated or simplified. Improve three high-value examples first, then extend the convention.
- P1: Blog and Learn connections depend on hand-authored links. A metadata relationship would scale better.
- P2: Some charts use text below comfortable mobile sizes. Check every flagship visual at 390px.
- P2: The full curriculum has little automated educational-quality enforcement beyond build and code tests.

## Ten shared improvements to prioritize

1. Maintain a generated inventory with explicit source indicators.
2. Adopt a lesson review rubric, including correctness and failure cases.
3. Make visualization captions state computation and simplifications.
4. Give all chart controls accessible labels and visible output.
5. Keep chart labels readable on 390px screens with internal scrolling where needed.
6. Add prerequisite metadata where pedagogically useful.
7. Add metadata-driven Blog to Learn relations.
8. Add direct practice links to major conceptual lessons.
9. Review weak pages by importance and source evidence, not score alone.
10. Add flagship browser regression checks for mobile, theme, math, and code.

## Current progress

Inventory and rubric are in place. Three existing learning experiences were improved: KV cache step count and technical caveat, RRF damping control, and sampling probability accessibility/mobile labels. A repository-wide content remediation and complete browser QA remain open.
