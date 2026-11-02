# Fix pass for branch tracks-depth (reviewer findings)

Stay on tracks-depth. No build locally. Commit and push the branch when done. Do not merge.
1. Add `## When *Not* to Use It` (table) to every deepened harness-engineering and inference-engineering page and context-engineering/overview.mdx. Specific to that page, no filler.
2. Replace ASCII box diagrams (`┌──`) with real components per the visualization skill, on all 6 pages that have them.
3. Remove or relabel unsupported claims. Example: harness-engineering/verification-loops.mdx states as fact that premature victory comes from politeness in training data, and gives layer timings (~200ms, ~2s, ~8s). Either cite evidence, or label as hypothesis or illustrative. Check all deepened pages for invented numbers and confident causal claims the same way.
4. Remove the dead source https://docs.datadoghq.com/llm_observability/troubleshooting/ or replace it with a page you opened.
5. Cut padding: delete sentences that repeat earlier content or exist only for length. Falling below 2,000 words on a page is better than padding; note it in tracks-notes.md.
Gate: npm run typecheck, npm run check:links, npx vitest run --maxWorkers=2. Add results to docs/briefs/tracks-notes.md.
