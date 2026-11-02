# Brief for Codex: one teaching figure per US healthcare post

Read AGENTS.md and skills blog-post, visualization, writing-voice. There are 18 posts: src/content/blog/us-healthcare-*.mdx. None has an in-article figure; they share only a series map. Pattern to copy: src/viz/diagrams/blog/AgentTurnCost.tsx and how it is imported in its post.

For EACH post, read the whole post, then build one figure in src/viz/diagrams/blog/ that answers the post's central question, placed right after the paragraph it explains. Each must teach that post's own mechanism, for example a claim moving through adjudication edits, a prior authorization path, money flow through a PBM. No generic template repeated 18 times, no reused 4-box stepper.

Rules: use only facts and numbers from that post. Any example value not in the post is labelled illustrative in the caption. Real interaction where it answers a question (step, toggle, slider). useVizTokens, VisualizationContainer, full-sentence caption, role="img" with an aria-label stating the conclusion, labels readable at 375px, no hardcoded colours, no emoji. Do not edit post prose except the import and component line.
Add a vitest render test per figure, and test any calculation against the post's numbers.

Work one post at a time, in order, and commit after each: feat(blog): figure for healthcare part N. Do not write a script that generates figures. Do not run npm run build. Run npm run typecheck and the new tests after each. Finish with npm run check:links and npx vitest run --maxWorkers=2. Push branch healthcare-figures. Do not push to main. Write docs/briefs/healthcare-figures-notes.md: for each part, the figure, its question, and anything illustrative. If you stop early, say exactly which parts are not done.
