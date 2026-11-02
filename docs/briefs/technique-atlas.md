# Brief: Training and Inference Technique Atlases

Read AGENTS.md and skills learn-page, visualization, writing-voice, ship-gate. Branch technique-atlas. No npm run build locally (8 GB RAM). Do not merge or push to main; push the branch. Commit in small batches.

Build two filterable reference sheets, one page each: a training atlas and an inference atlas in the fitting docs section. Data lives in typed files (src/data/trainingAtlas.ts, inferenceAtlas.ts), rendered by one sheet component: a compact table in chronological order with year, filter by category and search, and each row expanding to the full entry. Must work at 375px and in both themes. Link each entry to its existing Learn page; check links exist.

## Every entry has
- Name, year, primary paper or doc (real URL you opened)
- What it is: 2-3 plain sentences, and the problem it solved that the previous technique could not
- Diagram: a small labelled SVG showing that technique's real mechanism, not a shared template. Field-standard form, useVizTokens.
- Data preparation: exactly what the input looks like and how it is prepared, with a tiny concrete example row. For inference techniques, what the request and runtime state look like.
- Metrics: what to measure and how to read it
- When not to use it, and what replaced it

## Training coverage, from the start
Foundations: perceptron, backprop, SGD, momentum, Adam/AdamW, regularization, dropout, batch and layer norm, early stopping, LR schedules, initialization. Sequence and vision: BPTT, CNN training, transfer learning, data augmentation. Transformers: pretraining on next-token prediction, teacher forcing, mixed precision, gradient checkpointing, gradient accumulation, distributed training. Self-supervised: contrastive, MAE, JEPA. Post-training: supervised fine-tuning, LoRA and QLoRA, prefix tuning, instruction tuning, RLHF with PPO, DPO, Constitutional AI, KTO, reasoning RL such as GRPO, distillation, curriculum and active learning.
## Inference coverage, from the start
Greedy, beam, top-k, top-p, temperature, repetition penalty, KV cache, static and continuous batching, speculative decoding, prefix caching, disaggregated prefill and decode, quantization (dynamic, static, GPTQ, AWQ, GGUF), pruning, ONNX, FlashAttention, GQA, paged KV cache, structured output, model routing, semantic caching, autoscaling and cold start, edge and browser inference (WebGPU, WASM), roofline analysis, TTFT, TPS and p99 metrics.
Merge or adjust an item only where that is more accurate, and list changes in notes. Do not invent any fact, number, year or paper. If unsure, leave it out and say so.

## Quality
Depth over speed: every diagram written by hand and specific. Do not generate diagrams with a generic script. If you cannot finish everything, ship fewer complete entries and list exactly what is missing. Render test for the sheet, and data tests that each entry has all fields and a URL.
Gate: npm run typecheck, npm run check:links, npx vitest run --maxWorkers=2. Write docs/briefs/atlas-notes.md.

## Added requirement from the owner: read as a chronological story
Style reference: Sebastian Raschka, "Language Models for Text Classification: From Bag-of-Words to Jev" (Ahead of AI, 2026): https://magazine.sebastianraschka.com/p/classifier-history-and-jev
Use it only as a reference for structure: strictly chronological, grouped into eras, a short narrative opening each era, and each technique presented as the answer to the previous one's limit, with a concrete small example and a figure. Do not copy its text or figures; write and draw everything originally. Default view of each atlas is this chronological story; the filter and search stay available. Every entry states what came before it and what it led to.
Coverage is mandatory: every listed technique must ship in the first delivery unless no real source can verify it; name any exception.
