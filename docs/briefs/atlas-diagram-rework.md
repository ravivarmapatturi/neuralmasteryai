# Reviewer rejection: diagrams are one template

InferenceTechniqueDiagram.tsx renders almost every technique as a row of three labelled boxes from a shared spec. Tests pass but this fails the brief. Rework.

Delete the shared Node/Edge spec renderer. Write one small hand-drawn SVG component per technique, in the form practitioners use. Minimum forms:
- beam: expanding tree with scores, pruned branches crossed out. greedy: probability bars with the max highlighted.
- temperature: the same distribution drawn at two temperatures. top-k and top-p: sorted probability bars with the cut line and cumulative value. repetition penalty: bars before and after.
- KV cache: growing K and V grid per token, with recomputed vs reused cells. GQA: query heads fanning into shared K/V heads. paged KV: logical blocks pointing into scattered physical blocks. FlashAttention: Q tile and K/V tiles with the SRAM boundary.
- static batching and continuous batching: slot-by-time Gantt charts showing idle waste vs refilling slots. speculative decoding: draft tokens with accepted and rejected marks, drafter vs verifier.
- prefix caching: request bars with shared cached prefix and fresh suffix. disaggregation: prefill and decode pools with KV transfer.
- quantization: number line mapping float values to integer levels. GPTQ, AWQ, dynamic and static must each show what differs. GGUF: file layout. pruning: weight matrix with removed column.
- roofline: log-log curve with the sloped bandwidth region, flat compute region and knee.
- TTFT, TPS, p99: a request timeline plus a latency distribution with p50 and p99 marked.
- autoscaling: queue and replica counts over time with cold-start delay. semantic caching: similarity threshold on a line with hit and miss, including a false hit. model routing, structured output, ONNX, WebGPU, WASM: their real mechanism, e.g. the state machine masking invalid tokens.
Fewer than 3 techniques may use boxes-and-arrows, and only where that is the field-standard form.

Facts: re-verify every year against the source you cite. KV cache listed as 2017 looks wrong as an origin date: cite precisely or state what the date refers to. Fix any similar entry.

Also expand each entry where it is thin: at least the fields in the brief, with real substance, not one clause. Commit per era, gate: typecheck, check:links, vitest --maxWorkers=2. Push branch inference-atlas. Do not push to main. Do not build.
