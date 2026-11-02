# Training Atlas Delivery Notes

## Scope

- Branch: `technique-atlas`
- Owned implementation: `src/data/trainingAtlas.ts`, `src/components/atlas/training/`, and `src/content/docs/deep-learning/training-technique-atlas.mdx`.
- The inference atlas is intentionally untouched.
- `AGENT_TRACKER.md` is the sole coordination-file exception required by the repository operating contract.

## Coverage and chronology

All 39 techniques named in the training brief ship in the first delivery. The default view is sorted by publication year inside five eras; filtering never changes that order. Each era has a narrative opening, and every expanded entry states the preceding limitation, what came before, and what followed.

The brief used two compound phrases that hide materially different mechanisms, so they are separate entries:

- Adam and AdamW: adaptive moments versus decoupled weight decay.
- Batch normalization and layer normalization: cross-example channel statistics versus within-example feature statistics.

“Reasoning RL such as GRPO” is represented by GRPO with the DeepSeekMath paper. “Regularization” is represented by weight decay/L2 regularization; dropout and early stopping remain separate entries. No listed training technique was omitted.

## Sources and dates

Every entry links to a primary paper or, for broad historical practices, the closest authoritative paper used to define the entry. Each URL was opened during implementation. Several DOI publishers denied automated page extraction, but the DOI resolved or is retained as the stable primary identifier; no claim depends on a search-result snippet. Years use the linked work’s first publication or preprint year.

The transfer-learning URL in an early draft used a stale NeurIPS hash. Source validation found the error, and the delivered entry uses the current NeurIPS paper URL for Yosinski et al.

## Figures and examples

The 39 SVG mechanisms are hand-authored switch cases, not a generated node template. They share only theme tokens, arrow definitions, and typography. Each expanded row pairs its figure with a data-preparation description and a concrete toy row or calculation. Toy values are explanatory, not benchmark claims.

## Verification record

The final verification commands and visual checks are recorded here before handoff. The owner explicitly prohibited a local production build, so the repository’s Layer 4 build is not run for this branch.
