# Codex brief: roll the signed-off page standard out to every Learn page (18 Nov 2026)

The owner signed off the TF-IDF pilot. The standard is `docs/standards/page-standard.md` (read it fully). The reference page is `src/content/docs/search-ranking-recommendations/tf-idf.mdx`. Every page in `src/content/docs/**` except `practice-problems/` must follow it. Shared look (desk, margin, coloured tables, light code, tabs, sizes, watermark) is already live in commit 4fd455c3; this brief is the per-page work.

Roles: you (Codex) verify, write agy briefs in `docs/briefs/`, run agy, review. If agy fails or stalls, implement yourself. Do NOT push; Claude reviews and pushes. Work in this worktree (`platform-vite-pilot`, branch `pilot/page-standard`, rebased on origin/main). One heavy job at a time: wrap builds/Playwright/vitest in `flock /tmp/nm-heavy.lock` (a video render may hold it). Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Part 1 — the coin celebration (do first, it is small)
Replace the "Page understood +10 XP" toast + confetti (see `MarkUnderstoodButton` and its celebration/toast code) with: a gold coin showing "+10" that flips (3D rotateY, ~900 ms) in the centre of the screen, a short sparkle ring, then shrinks and flies to the XP/streak counter in the navbar, which pulses once. No confetti over text. `prefers-reduced-motion`: no flip/flight, just a calm "+10" badge fade. Handwritten font, standard pen colours, ≥14 px. Unit test + Playwright check that the old toast is gone and the coin appears. Commit.

## Part 2 — pages, in batches of 8
For each page, apply the full standard: Part 1 structure with the exact headings in order (ELI5 → Why it exists → The big picture → mechanisms → Worked example → Try it yourself → Common mistakes → When not to use it → Remember → Next → Sources; landing pages `overview`/`roadmap` use the short variant); a `Worksheet` in The big picture when the topic has numbers; `PenFlow` for every flow (no ASCII, no fake code fences); formulas after the picture with a "where" list; plain words and no banned words; real copyable code only; RunnableCode ends with `# Try it:`; every widget header in sentence case plain words; no text < 14 px; no label overlaps (run the in-page overlap script from the pilot; add pages with SVG drawings to `tests/notebook-label-overlap.spec.ts`). Recompute every number.

Order: Search & Recommendation (rest of section), Harness Engineering, then most-read chapters (deep-learning/attention-transformers, neural-network-fundamentals, llms-genai/rag, prompt-engineering, mlops/llm-inference-optimization), then sections by size: MLOps, Machine Learning, Deep Learning, Agents, LLMs & GenAI, then the rest.

Per batch gates: `npm run check:notebook`, `check:math`, `check:mdx`, `check:links`, `typecheck`, full `npx vitest run`, real-browser check at 1440 and 375 light/dark of 2 pages (Playwright full-page screenshots saved in `docs/evidence/rollout/<batch>/`). Commit one batch per commit and append to `docs/evidence/rollout/PROGRESS.md` (pages done, checks, anything skipped and why). Then continue with the next batch without waiting; Claude pushes reviewed batches.

Stop only if you hit something you must ask about; write the question at the end of PROGRESS.md.
