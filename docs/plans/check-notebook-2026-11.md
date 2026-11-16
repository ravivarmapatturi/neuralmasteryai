# Plan: `npm run check:notebook`, the enforcer for the notebook-page skill

Owner: Claude. Senior engineer: Codex. Implementer: agy. Worktree `platform-vite-srr`. Priority: **before** the BM25 pilot's content work continues, because the pilot must pass it.

## Why

Agents did not follow page rules (owner, 16 Nov 2026): parameter lists typed into bare code fences, ASCII diagrams, single-line display maths, bold pseudo-headings. Rules in a skill file are not enough; CI must fail.

## Build

`scripts/check-notebook.mjs` + `"check:notebook"` in package.json + a CI step next to `check:math`. Scans `src/content/docs/**/*.mdx` and `src/content/blog/**/*.mdx`, skipping JSX string props and `RunnableCode` code. Reports file:line and the rule number from `.agents/skills/notebook-page/SKILL.md`:

1. Fenced block with no language, or whose language is `text`/`txt`/`plain`, or whose content is not program code (heuristics: lines of the form `Name (x) = value`, mostly prose, no code tokens) → rule 1.
2. Any block or paragraph containing box-drawing/arrow art (`─│├└┌┐┘┬┴┼`, `-->`, `<--`, `+---`, `|---`) → rule 2.
3. Single-line `$$…$$`; `\frac` inside a Markdown table row → rule 3.
4. A line that is only bold text (`**…**` / `__…__`) acting as a heading (followed by a blank line or a paragraph) → rule 4.
5. Pages over 1,500 words with fewer than 3 visuals (imported viz/diagram components, `<img>`, video, `RunnableCode` does not count) → rule 5.
6. Raw `<table>`, `<pre>` in MDX → rule 9.

Allowlist file `scripts/check-notebook.allow.json` for deliberate exceptions (path + rule + reason), empty by default; adding to it requires Claude's approval in the report.

## Rollout of the check

The check will fail on hundreds of existing pages. Run it in **report mode** first (`--report`) to write `docs/evidence/site-audit/notebook-violations.json` and a per-page count; CI enforces it only on **changed files** (`git diff --name-only origin/main`) until the full-site fix batches (notebook-page-redesign plan) bring each page to zero, then switch to the whole site. Unit tests for every rule with good/bad fixtures (including the exact owner example: a bare fence listing `Corpus Size (N) = 1,000 documents`).

## Done when

Tests pass; report mode lists violations per page; changed-files mode is in CI; report `docs/plans/check-notebook-report.md`.
