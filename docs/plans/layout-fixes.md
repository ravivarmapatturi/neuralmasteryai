# Layout fixes: crowded or cut-off labels (found during the live-visuals rollout, 18 Nov 2026)

Every item below already existed on the live site before the rollout. Fix each so no label overlaps another and no text runs past its drawing edge. Check with the in-browser overlap/clip script used in the rollout.

- docs/graph-ml/graph-ml-fundamentals: "1" over "Graph A (2 neighbors)"; "born_in" over "Curie + born_in"
- docs/llms-genai/foundation-model-internals: "⊙" over "elementwise"
- docs/llms-genai/rag: word labels in the embedding plot overlap (king/queen, man/woman, ...)
- docs/software-system-design/autoscaling: y-axis label "Queued jobs (0–240,000)" under the "Peak" label
- docs/machine-learning/recommender-systems: rating numbers in the matrix collide
- docs/software-system-design/vertical-vs-horizontal-scaling: "Common axis: 0–16,000 requests/s" sits at the bottom edge
- docs/ai-evaluation/evaluation-fundamentals: "ceiling" over "spread 0.00x"
- docs/ai-security/owasp-llm-top-10-and-prompt-attacks: "Attacker" label sits on Poisoned/Innocent/Model/Output
- docs/cs-fundamentals/operating-systems-and-concurrency: "200 cycles" runs off the edge
- docs/cs-fundamentals/software-engineering-practices: "backward()" runs off the edge
- docs/computer-vision/modern-vision-and-multimodal: "camera" runs off the edge
- docs/computer-vision/vision-tasks-and-models: stereo "left cam"/"right cam" run off the edge
- docs/mathematics-for-ai/linear-algebra: matrix numbers overlap (2.13 / 1.13 ...)
- docs/nlp/classical-nlp: POS tags DET/NOUN/VERB/root run off the edge
- docs/nlp/word-embeddings: word labels overlap in the embedding plot (same component as rag)
- docs/speech-audio/audio-fundamentals: "0 Hz", "Mel →" run off the edge
- docs/speech-audio/overview: sample-rate number runs off the edge
- docs/interpretability/classical-interpretability: feature-combination label runs off the edge
- docs/interpretability/deep-learning-and-llm-interpretability: "-0.00" values overlap
- docs/reinforcement-learning/rl-fundamentals: value-grid numbers overlap
- inference-engineering roofline chart (overview, roadmap, roofline pages): "Knee" over "Peak Compute"; y-axis label cut off
- docs/inference-engineering/hardware-acceleration-and-kernels: "Registers" line over "Zero-cycle latency"
