# Notebook fixes — phase 1 report

## Delivered

Phase 1a adds ruled paper, a red margin line, and a “Neural Mastery · date” header to Learn and blog pages. Shared notebook styles add pen-like borders for tables, callouts, ELI5 blocks, PredictFirst options, and visualization cards; eyebrow labels use Kalam sentence case, mobile footnotes are at least 14px, and widget formulas use KaTeX.

Phase 1b updates the `tf-idf`, `bm25`, and `recommendation-foundations` pages. It adds six pen-style diagrams: document arrows in vector space, the cosine angle between vectors, sparse-vector boxes, the vocabulary-mismatch pair, search and recommendation lanes, and a user-item matrix. The pilot pages replace the fake code/ASCII examples with prose or diagrams, move theory/history into GoDeeper sections, use real headings, and keep table fractions flat. An unsupported `|V| > 100,000` statement was removed during review.

The work is in local commits `9bd14720` (`feat(notebook): implement phase 1 global look and pilot pages`) and `55ef31d9` (`fix(notebook): validate phase 1 browser evidence`). Neither commit was pushed. This report is intentionally uncommitted, per the requested stop point.

## A7 audit

The AGENTS.md fence and ASCII flow are present on `harness-engineering/context-and-instruction-design.mdx`. The current `context-engineering/overview.mdx` route does not contain that AGENTS.md fence or the described flow, so the conditional A7 edit did not apply there. No other content pages were changed.

## Verification

All listed commands exited 0:

- `npm run check:tracker` — tracker valid.
- `flock /tmp/nm-heavy.lock npm run check:notebook` — 3 pilot pages, 0 violations.
- `flock /tmp/nm-heavy.lock npm run check:math` — 1,991 MDX files passed.
- `flock /tmp/nm-heavy.lock npm run check:mdx` — 2,019 MDX files compiled, 0 failed.
- `flock /tmp/nm-heavy.lock npm run check:links` — 2,147 valid routes, 0 broken prose or anchor links. The checker reported one existing heading with inline math whose computed ID is approximate; no broken anchors were found.
- `flock /tmp/nm-heavy.lock npm run typecheck` — `tsc -b` passed.
- `flock /tmp/nm-heavy.lock npx vitest run` — 226 files and 1,142 tests passed. The first review run exposed one assertion still expecting the old title-case label; the expected text was updated to the requested sentence-case “Simple explanation,” then the full suite passed.
- `flock /tmp/nm-heavy.lock node scripts/capture-notebook-phase1.mjs` — 20/20 screenshots captured after each route rendered its heading and article body. There were 0 console errors, 0 page errors, 0 capture failures, and 0 horizontal-overflow findings at 375px. `git diff --check` passed.

The first agy screenshot pass captured `Loading…` fallbacks on some pages. Those images were replaced after review. The capture script now waits for rendered article content and fails on incomplete pages; Vite also allows the real KaTeX package path used by this worktree’s symlinked dependencies, which removed browser font errors.

The screenshots are saved as `{tf-idf,bm25,recommendation-foundations,attention-transformers,blog-agent-skills-explained}-{light,dark}-{1440px,375px}.png`. The three pilot pages and two untouched pages are each captured at both viewport widths in both themes. They show the loaded page, diary header, ruled background, and margin line; mobile images also serve as the overflow evidence.

## Not run

`free -g` reported 4 GiB available. The production build was deferred because the repository requires at least 5 GiB available before `npm run build`; no build result is claimed.

After commit `9bd14720`, the agy CLI exited before returning its final response with a DNS failure resolving `daily-cloudcode-pa.googleapis.com` through `192.168.1.1`. Codex completed the review, validation, and this report. No push was made.
