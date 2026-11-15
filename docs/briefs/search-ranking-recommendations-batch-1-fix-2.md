# Batch 1 review fix 2 — label pipeline figures as illustrative

## Objective

Make every stage volume, latency, score and candidate example in `SearchRecommendationPipelineDiagram.tsx` unambiguously an illustrative example, consistent with the page's explicitly labeled toy lifecycle. No unsupported benchmark or service-level claim may be inferred from the diagram.

## Required changes

1. Label the stage figures and candidate lifecycle as an illustrative example in the visual itself, in a prominent location visible with the pipeline. Make clear that the counts and latency figures vary by system and workload.
2. Update descriptive text/footer if needed so the labeling remains clear when the viewer changes pipeline mode or stage. Keep the numerical walkthrough values as given; do not invent replacements.
3. Recapture `overview-light-desktop.png`, `overview-dark-desktop.png`, `overview-light-mobile.png`, and `overview-dark-mobile.png` only after the visual is rendered. Confirm the illustrative label is visible in both viewport sizes and themes.
4. Do not edit other app files. Preserve theme tokens and existing interactions.

## Allowed files

- `AGENT_TRACKER.md`
- This fix brief
- `src/viz/diagrams/SearchRecommendationPipelineDiagram.tsx`
- Four existing overview screenshot PNGs under `docs/evidence/search-ranking-recommendations/batch-1/`

## Verification

- Inspect all four screenshots at desktop 1200px/mobile 375px, light/dark.
- Heavy commands, if needed, only through `flock /tmp/nm-heavy.lock` and one at a time. No build unless `free -g` reports at least 5 GiB available.
- Review the final diff against the allowed-file list and commit the result. Never push.

## Report from agy

### 1. Summary of Changes
1. **Labeled Pipeline Figures & Lifecycle as Illustrative**:
   - Added a prominent illustrative notice banner directly above the stage selection tabs in `SearchRecommendationPipelineDiagram.tsx` displaying `ILLUSTRATIVE EXAMPLE` badge and explicit text: *"Stage volume, latency, and candidate lifecycle values are illustrative walkthrough figures. Actual counts and latency vary by system and workload."*
   - Updated `VisualizationHeader` eyebrow to `Architectural Pattern · Illustrative Funnel` and description to make explicit that all stage item counts and latency figures are illustrative examples that vary by system architecture, corpus scale, and workload.
   - Labeled the stage volume and latency badges in the stage detail card as `Illustrative Volume: {activeStage.volume}` and `Illustrative Latency: {activeStage.latency}`.
   - Labeled candidate lifecycle callout header as `Illustrative Item Lifecycle & Scores (Candidate H1)`.
   - Updated `VisualizationContainer` dynamic footer so the illustrative qualification remains explicit when switching pipeline mode (`search` vs `recommendation`) or selecting any stage (`1` through `5`).
   - Kept all original numerical walkthrough values (`1M → 1,000 items`, `~10–20 ms`, `0.94`, `0.88`, etc.) intact without inventing replacements.
   - Preserved all theme tokens and existing interactions.

2. **Recaptured Screenshot Evidence**:
   - Recaptured all four overview screenshots at desktop (1200×900) and mobile (375×812) in both light and dark modes:
     - `overview-light-desktop.png`: [overview-light-desktop.png](file:///home/ravivarma/Documents/DREAM_PROJECT/neuralmastery/platform-vite-srr/docs/evidence/search-ranking-recommendations/batch-1/overview-light-desktop.png)
     - `overview-dark-desktop.png`: [overview-dark-desktop.png](file:///home/ravivarma/Documents/DREAM_PROJECT/neuralmastery/platform-vite-srr/docs/evidence/search-ranking-recommendations/batch-1/overview-dark-desktop.png)
     - `overview-light-mobile.png`: [overview-light-mobile.png](file:///home/ravivarma/Documents/DREAM_PROJECT/neuralmastery/platform-vite-srr/docs/evidence/search-ranking-recommendations/batch-1/overview-light-mobile.png)
     - `overview-dark-mobile.png`: [overview-dark-mobile.png](file:///home/ravivarma/Documents/DREAM_PROJECT/neuralmastery/platform-vite-srr/docs/evidence/search-ranking-recommendations/batch-1/overview-dark-mobile.png)
   - Verified that the prominent illustrative example label is clearly rendered and visible in both viewport sizes and both themes.

### 2. Exact Commands and Pass/Fail Output
1. **Diagram Unit & Interaction Tests**:
   - Command: `flock /tmp/nm-heavy.lock npx vitest run src/viz/diagrams/SearchRecommendationPipelineDiagram.test.tsx`
   - Exit code: `0`
   - Output: `Test Files 1 passed (1), Tests 3 passed (3), Duration 2.57s`

2. **TypeScript Compilation (Layer 1 Gate)**:
   - Command: `flock /tmp/nm-heavy.lock npm run typecheck`
   - Exit code: `0`
   - Output: `tsc -b` (zero errors).

3. **Internal & Anchor Links (Layer 2 Gate)**:
   - Command: `npm run check:links`
   - Exit code: `0`
   - Output: `check-internal-links: scanned 1981 MDX file(s), found 2137 valid route(s). No broken internal prose links found. check-anchor-links: no broken anchor links found.`

4. **Agent Tracker Validation**:
   - Command: `npm run check:tracker`
   - Exit code: `0`
   - Output: `check-agent-tracker: AGENT_TRACKER.md is valid, structured, and properly maintained.`

5. **Banned-Phrase Grep**:
   - Command: `grep -inE "delve|deep dive|unleash|unlock|harness the power|game.?changer|revolutioniz|cutting.edge|seamless|in today's|it's (important|worth) not|in conclusion|tapestry|testament|elevate|empower|supercharg|effortless|premier|world.class|ultimate guide|let's dive" src/viz/diagrams/SearchRecommendationPipelineDiagram.tsx`
   - Exit code: `1` (0 matches found, clean pass).

6. **Memory Measurement & Build Guard**:
   - Command: `free -h`
   - Output: `Mem total: 7.2Gi, used: 5.5Gi, available: 1.2Gi`
   - Result: Available memory (1.2 GiB) is below the 5 GiB threshold required for safe in-memory Rollup compilation. Full static build is left to CI per AGENTS.md 8GB RAM rule.

### 3. Commits on `search-rank-rec`
- `98b29ab9` — `fix(viz): label pipeline stage figures and candidate lifecycle as illustrative walkthrough examples`
- `94f389f0` — `docs(evidence): recapture overview desktop and mobile screenshots with prominent illustrative pipeline labels`

### 4. Incomplete Work, Limitations or Questions
- Full static production build (`npm run build`) omitted locally due to the machine memory guard (`available: 1.2Gi < 5Gi`); will be run on CI.
- No questions or design decisions made; all changes executed strictly per instructions. Zero push was performed.
