# Visualization opportunity map

Based on the generated inventory and inspection of high-value curriculum pages. Priority reflects learning impact; existing diagrams may need explanatory upgrades rather than replacement.

| Route | Concept | Current opportunity | Recommended visual | Level | Priority | Benefit |
| --- | --- | --- | --- | --- | --- | --- |
| /docs/llms-genai/foundation-model-internals | KV cache | Contrast was fixed to five steps | Step count and memory model | B/C | P0 | Shows recomputation and memory trade-off |
| /docs/llms-genai/foundation-model-internals | Sampling | Tiny labels obscured results on phones | Computed distribution with readable values | C | P0 | Connects controls to probabilities |
| /docs/llms-genai/rag | Reciprocal rank fusion | Fixed damping hid sensitivity | Adjustable k and contribution breakdown | C | P0 | Shows ranks replacing incompatible raw scores |
| /docs/deep-learning/attention-transformers | Attention | Rich existing interaction | Caption audit for assumptions and computed values | C | P1 | Improves interpretation |
| /docs/machine-learning/linear-regression | Regression | Check current visual against residual intuition | Fitted line and residuals | C | P1 | Connects loss to parameters |
| /docs/agents/agent-fundamentals | Agent loop | Check state transitions in existing visual | Step-through tool loop | B | P1 | Makes control flow concrete |
| /docs/mlops/llm-inference-optimization | Serving | Several diagrams need consistent captions | Batch and latency trade-off | C | P1 | Explains throughput decisions |

Next pass should inspect each candidate at mobile width and check that the rendered visual actually changes understanding. Do not infer quality from component presence alone.
