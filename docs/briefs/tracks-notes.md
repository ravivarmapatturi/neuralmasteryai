# Track Deepening & AI Engineering Progress Notes

This document records the pages deepened, new tracks added, primary sources verified with active URLs, and execution verification notes in compliance with `AGENTS.md` and the task brief `docs/briefs/agy-tracks-and-blog.md`.

---

## 1. Blog Post

- **Path**: `src/content/blog/what-is-changing-in-ai-engineering-and-what-to-learn-next.mdx`
- **Slug**: `what-is-changing-in-ai-engineering-and-what-to-learn-next`
- **Title**: What Is Changing in AI Engineering and What to Learn Next
- **Word count**: 2,094 words
- **Diagram Component**: `src/viz/diagrams/AiEngineeringLearningLadder.tsx` (tested via `AiEngineeringLearningLadder.test.tsx`)
- **Primary Sources & Attributions**:
  - Hoang Nguyen, *A Practical Roadmap to Learn Agentic Engineering*, Codeaholicguy (June 10, 2026): [https://codeaholicguy.com/2026/06/10/a-practical-roadmap-to-learn-agentic-engineering/](https://codeaholicguy.com/2026/06/10/a-practical-roadmap-to-learn-agentic-engineering/)
  - Wes Reisz with Karthik Ramgopal & Prince Valluri (LinkedIn), *Platform Engineering for AI: Scaling Agents and MCP at LinkedIn*, InfoQ Podcast (December 10, 2025): [https://www.infoq.com/podcasts/platform-engineering-scaling-agents/](https://www.infoq.com/podcasts/platform-engineering-scaling-agents/)
  - Matt Tanner, *Context Engineering for AI Agents: Complete 2026 Guide*, Sourcegraph (September 15, 2026): [https://sourcegraph.com/blog/context-engineering](https://sourcegraph.com/blog/context-engineering)
  - Aron Schuhmann & Sam Bhagwat, *Context Engineering for AI Agents: A Practical Guide*, Mastra [vendor article] (August 7, 2026): [https://mastra.ai/articles/context-engineering](https://mastra.ai/articles/context-engineering)
  - OMC Cloud press release citing Gartner cloud forecast, *Inference Overtakes Training: 2026 Is the Year AI Moved Into Production*, EIN Presswire [press release citing Gartner] (October 12, 2026): [https://www.einpresswire.com/article/949027583/inference-overtakes-training-2026-is-the-year-ai-moved-into-production](https://www.einpresswire.com/article/949027583/inference-overtakes-training-2026-is-the-year-ai-moved-into-production)
  - Gnana, *AI Engineer Skills Companies Want in 2026: 3,449-Posting Analysis*, DEV Community [analysis of 3,449 active postings on the InterviewStack.io job board] (May 12, 2026): [https://dev.to/gnana_6392e836fd500a957dc/ai-engineer-skills-companies-want-in-2026-3449-posting-analysis-5f9l](https://dev.to/gnana_6392e836fd500a957dc/ai-engineer-skills-companies-want-in-2026-3449-posting-analysis-5f9l)
- **Artifact Tested**: In-browser Python context management harness executed directly in Python 3.12 with assertions passing.
- **Commit**: `d9014de6`

---

## 2. Deepened Tracks

### Track A: `harness-engineering`
Target bar: 2,000-5,000 words, worked example carried through diagram/prose/code, real commands/config, When Not to Use It, Remember table, Sources with real opened URLs, zero banned phrases, verified python3 execution.

*(Entries logged per page)*

### Track B: `inference-engineering`
Target bar: 2,000-5,000 words, worked example carried through diagram/prose/code, real commands/config, When Not to Use It, Remember table, Sources with real opened URLs, zero banned phrases, verified python3 execution.
Required new diagrams:
- `disaggregation-prefix-caching-and-production` -> `src/viz/diagrams/DisaggregationPrefixCachingVisualizer.tsx`
- `hardware-acceleration-and-kernels` -> `src/viz/diagrams/KernelMemoryHierarchyVisualizer.tsx`

*(Entries logged per page)*

---

## 3. New Tracks Added

### Track 1: `context-engineering`
- Location: `src/content/docs/context-engineering/`
- Target: 4-6 pages, registered in `src/data/sectionMeta.ts`

### Track 2: `agent-observability`
- Location: `src/content/docs/agent-observability/`
- Target: 4-6 pages, registered in `src/data/sectionMeta.ts`
