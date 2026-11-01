---
name: ship-gate
description: Definition of done for Neural Mastery (neuralmasteryai.com). Use before claiming any task is finished, before committing, and before pushing to main (which auto-deploys).
---

# Ship gate (Neural Mastery)

A task is done only when every check below was **run in this session** and you saw exit code 0. "Should work" is not done.

## 1. The four layers (all mandatory before push)

```bash
npm run typecheck
npm run check:links
npx vitest run
NODE_OPTIONS="--max-old-space-size=6144" npm run build
```

Run the **full** `npx vitest run`, not a single file. If a pre-existing test was already failing, record it in the tracker row; do not delete or loosen it.

## 2. Look at what you built

For any page, component or viz change: open it in the dev server (built-in browser preview), check light **and** dark theme, 375px and desktop width, and the console. A `<RunnableCode>` block counts as verified only after you pressed Run and saw output with no traceback.

## 3. Content quality bar (reviewer rejects otherwise)

- Narrative prose a human enjoys reading; not bullet-definition or FAQ templates.
- Hands-on topics include real commands/config/code, not just diagrams.
- Diagrams follow field-standard conventions (e.g. Colah-style LSTM), use `useVizTokens()`, no hardcoded hex, no invented branches in linear sequences, every element labelled and legible.
- No marketing superlatives ("premier", "world-class") and no competitor comparisons.
- Contact = https://x.com/NeuralMastery.

## 4. Commit hygiene

- Stage only task files. Never commit `scratch/`, `test-results/`, `dist/`, `helpers/*.md` scratch notes or screenshots.
- Conventional commit message. Push to `origin` only — never to the `newrepo` remote unless the user asks.
- Mark your `AGENT_TRACKER.md` row `COMPLETED` with commit SHA, or `BLOCKED` with the exact failing output.
