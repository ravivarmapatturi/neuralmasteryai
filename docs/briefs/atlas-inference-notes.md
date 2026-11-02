# Inference atlas implementation notes

## Scope

- Branch: `inference-atlas`
- Owned implementation: `src/data/inferenceAtlas.ts`, `src/components/atlas/inference/`, `src/content/docs/inference-engineering/technique-atlas.mdx`, and this note.
- The training atlas is intentionally untouched.

## Coverage and grouping decisions

All techniques listed in `technique-atlas.md` are present. Closely related phrases were merged only where the brief names one operational unit:

- “Autoscaling and cold start” is one entry because cold-start capacity is the principal scale-up state the controller must manage.
- “TTFT, TPS and p99 metrics” is one measurement entry because the three values are interpreted together on one request timeline and load distribution.
- “Edge and browser inference (WebGPU, WASM)” is represented by separate WebGPU and WebAssembly entries so their GPU and CPU execution mechanisms remain distinct.
- “Quantization” is represented by the five requested forms: dynamic, static, GPTQ, AWQ, and GGUF. GGUF is identified precisely as a model container that can carry quantized tensors, not as a quantization algorithm.
- “Paged KV cache” is the entry name; its primary source is the PagedAttention paper because PagedAttention is the attention algorithm built over that block allocator.

## Chronology

The default view is grouped into four eras. Years refer to the cited paper, specification, documentation milestone, or the first representative primary source used by the entry; they do not claim the idea had no precursor. Static batching and greedy decoding are anchored to representative neural-network literature rather than presented as inventions of those papers.

## Diagram method

Each entry has a hand-authored SVG specification with its own labelled state transition. A shared renderer supplies only accessible SVG primitives and theme tokens. The mechanism, labels, arrows, values, and layout are specified entry by entry. No diagram generator or generic network template was used.

## Verification record

- `npm run typecheck`: passed.
- `npm run check:links`: passed across 1,852 MDX files.
- `npx vitest run --maxWorkers=2`: 85 files and 534 tests passed.
- Targeted atlas tests: data completeness, source URL shape, search, category filter, expansion, and accessible mechanism diagram passed.
- Render review: passed at 375×900 and 1440×1000 in light and dark themes; zero horizontal overflow and zero page/console errors.
- Banned-phrase scan and `git diff --check`: passed.
- Production build: intentionally not run because the atlas brief explicitly prohibits a local build on this 8 GB machine.
