# Brief for agy: AI landscape post, deepen two tracks, add two tracks

Read AGENTS.md and skills learn-page, blog-post, visualization, writing-voice, ship-gate. Work on branch `tracks-depth`. Do not merge or push to main. This laptop has 8 GB RAM: run no `npm run build`; push the branch and let CI build. Commit after every page.

## 1. Blog post (do first)
Title idea: what is changing in AI engineering and what to learn next. For someone deciding what to study. Order of advice: one reliable agent with good context, tracing and evals early, MCP once there is a real integration, inference cost.
Start from these, open each, and only use what the page says; prefer primary sources and label the rest:
- https://codeaholicguy.com/2026/06/10/a-practical-roadmap-to-learn-agentic-engineering/
- https://www.infoq.com/podcasts/platform-engineering-scaling-agents/
- https://sourcegraph.com/blog/context-engineering
- https://mastra.ai/articles/context-engineering (vendor)
- https://www.einpresswire.com/article/949027583/inference-overtakes-training-2026-is-the-year-ai-moved-into-production (press release citing Gartner: say so)
- https://dev.to/gnana_6392e836fd500a957dc/ai-engineer-skills-companies-want-in-2026-3449-posting-analysis-5f9l (one job board; say so)
Include one interactive figure beside its mechanism, and links into Learn pages. Never present a press-release or blog figure as established fact.

## 2. Deepen harness-engineering and inference-engineering
Audit: pages are about 1,000-1,300 words (the bar is 2,000-5,000) and none has `## Sources`. disaggregation-prefix-caching-and-production and hardware-acceleration-and-kernels have no diagram. For each page, apply learn-page: worked example carried through diagram, prose and code; real commands and config; When Not to Use It; Remember; Sources with real opened URLs. Do not pad; add substance. Remove any banned phrases. Press Run mentally is not enough: execute each Python snippet with python3 and note it.

## 3. Add two tracks
Check existing docs first and do not duplicate; link to them. Candidates: `context-engineering` and `agent-observability`. If agents/ or ai-evaluation/ already cover one fully, say so in notes and pick the next gap. 4-6 real pages each, same bar. Register in src/data/sectionMeta.ts and run node scripts/generate-page-meta.mjs.

## Done when
`npm run typecheck`, `npm run check:links`, and affected vitest tests pass; CI green on the branch; docs/briefs/tracks-notes.md lists pages, sources and anything unverified. Never invent numbers or citations.
