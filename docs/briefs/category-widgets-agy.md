# Brief: category widgets with small visuals

Start with `git fetch origin && git merge origin/main`. Owner's request: pages list categories as plain text, and people can't see what each category is. Use proper widgets with fitting small visuals on the pages where it helps.

Pages, in order: /study-plans, /research, /projects, /labs, the interview question list in /interview (and /interview/topics), /atlas cards, /learn sections.

Each category becomes a widget card: a small visual that actually represents that topic (for example a tiny attention grid for Transformers, a retrieve-then-generate flow for RAG, a loss curve for Deep learning), its name, one short line, its count, and real progress if the user has any. Build them from small inline SVGs using useVizTokens, in one reusable component. Each visual must be specific and correct, with no generic icons, no emoji and no repeated decoration. Cards need real hierarchy: a responsive grid, one column at 375px, and 44px targets.

Rules from the owner: no fine print, notes or marketing phrases such as "free" or "no account"; look like a professional product; text colours come from theme tokens so light and dark both work; do not change the graph on /interview or the timeline on /atlas.

Do /study-plans first, commit, and stop. Save 1440px and 375px screenshots in light and dark to docs/evidence/widgets/ and report. I will review and show the owner before you continue.

8 GB laptop: use port 5201 only, no npm run build or full Playwright. Run typecheck and targeted vitest. Do NOT push.
