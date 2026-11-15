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
