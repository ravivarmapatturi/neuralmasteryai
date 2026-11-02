export type InferenceAtlasCategory =
  | 'Decoding'
  | 'Runtime'
  | 'Compression'
  | 'Kernel'
  | 'Serving'
  | 'Deployment'
  | 'Measurement';

export type InferenceAtlasEra = 'Choosing the next token' | 'Portable, smaller execution' | 'Memory-aware transformers' | 'Production serving systems';

export interface InferenceAtlasEntry {
  id: string;
  name: string;
  year: number;
  era: InferenceAtlasEra;
  category: InferenceAtlasCategory;
  source: { label: string; url: string };
  learnPath: string;
  whatItIs: string;
  previousLimit: string;
  requestState: string;
  example: string;
  metrics: string;
  avoid: string;
  replacedBy: string;
  cameBefore: string;
  ledTo: string;
  diagram: string;
}

export interface InferenceAtlasEraDefinition {
  id: InferenceAtlasEra;
  years: string;
  narrative: string;
}

export const inferenceAtlasEras: InferenceAtlasEraDefinition[] = [
  {
    id: 'Choosing the next token',
    years: '1977–2020',
    narrative: 'Inference first meant choosing a path through a model’s output space. Deterministic search made results repeatable, then sampling controls restored variety without surrendering every constraint.',
  },
  {
    id: 'Portable, smaller execution',
    years: '1989–2023',
    narrative: 'As models moved beyond one research framework, the bottleneck became representation: fewer weights, lower precision, and a graph or file format a different runtime could execute.',
  },
  {
    id: 'Memory-aware transformers',
    years: '2009–2023',
    narrative: 'Transformers shifted inference from a pure arithmetic problem to a data-movement problem. Caches, fused attention, shared key/value heads, and paged allocation each remove a different trip through scarce memory.',
  },
  {
    id: 'Production serving systems',
    years: '2022–2024',
    narrative: 'Once many users shared accelerators, the unit of design became the request fleet. Schedulers, speculative execution, caches, routers, autoscalers, and phase-specific workers coordinate latency and cost.',
  },
];

const decodingEntries: InferenceAtlasEntry[] = [
  {
    id: 'beam-search', name: 'Beam search', year: 1977, era: 'Choosing the next token', category: 'Decoding', diagram: 'beam',
    source: { label: 'Lowerre, The Harpy Speech Recognition System', url: 'https://www.cs.cmu.edu/afs/cs/project/cmt-55/lti/Courses/731/homework/HW2/071117.pdf' }, learnPath: '/docs/llms-genai/foundation-model-internals',
    whatItIs: 'Beam search keeps the best b partial sequences after every step and expands each one. It solved greedy decoding’s inability to recover after a locally attractive token leads to a poor whole sequence.',
    previousLimit: 'A single retained path cannot revisit its first choice.', requestState: 'The request supplies a beam width and stopping rule; runtime state is b token prefixes with cumulative log-probabilities.',
    example: 'For “The cat …”, width 2 retains “sat” (−0.4) and “slept” (−0.7), then compares both continuations.', metrics: 'Measure sequence score, task accuracy, latency, and peak state memory. Wider beams explore more paths but multiply decoder work and do not guarantee better open-ended text.',
    avoid: 'Avoid for conversational sampling where diversity matters or where beam width makes latency unacceptable.', replacedBy: 'Sampling became the default for open-ended generation; constrained or diverse beam variants remain useful for structured sequence tasks.', cameBefore: 'Exhaustive tree search and single-path decoding.', ledTo: 'Greedy decoding as its width-one special case and later constrained search.',
  },
  {
    id: 'greedy-decoding', name: 'Greedy decoding', year: 1986, era: 'Choosing the next token', category: 'Decoding', diagram: 'greedy',
    source: { label: 'Rumelhart et al., Learning Representations by Back-propagating Errors', url: 'https://www.nature.com/articles/323533a0' }, learnPath: '/docs/llms-genai/foundation-model-internals',
    whatItIs: 'Greedy decoding emits the highest-probability token at every step. It makes beam width one cheap and deterministic, but it optimizes each choice rather than the probability of the final sequence.',
    previousLimit: 'Beam search stores and scores several live hypotheses.', requestState: 'The request needs a maximum length and stop tokens; state is one prefix plus its cached activations.',
    example: 'With {sat: .55, slept: .30, ran: .15}, the next token is always “sat”.', metrics: 'Measure exact-match quality, latency, and tokens per second. A stable result does not imply the globally most probable sequence.',
    avoid: 'Avoid when several valid answers exist or local choices create repetitive text.', replacedBy: 'Temperature and truncated sampling for open-ended output; beam search for sequence-level search.', cameBefore: 'Beam search with multiple hypotheses.', ledTo: 'A deterministic baseline for every later decoder.',
  },
  {
    id: 'temperature', name: 'Temperature sampling', year: 2015, era: 'Choosing the next token', category: 'Decoding', diagram: 'temperature',
    source: { label: 'Sutskever et al., Sequence to Sequence Learning', url: 'https://arxiv.org/abs/1409.3215' }, learnPath: '/docs/llms-genai/foundation-model-internals',
    whatItIs: 'Temperature divides logits before softmax: values below one sharpen the distribution and values above one flatten it. It solved the all-or-nothing choice between greedy output and unconstrained sampling.',
    previousLimit: 'Greedy decoding cannot express controlled randomness.', requestState: 'The request supplies temperature T; runtime holds the current logits and a random-number-generator state.',
    example: 'Logits [2, 1, 0] become more peaked at T=.5 and flatter at T=2 before a token is sampled.', metrics: 'Track entropy, diversity, task success, and invalid-output rate. Temperature changes relative probabilities; it does not remove low-probability tokens.',
    avoid: 'Avoid treating high temperature as a quality control or using temperature zero in formulas that divide by T.', replacedBy: 'Usually combined with top-k or top-p truncation; greedy decoding handles deterministic paths.', cameBefore: 'Greedy or full-distribution sampling.', ledTo: 'Truncated sampling controls.',
  },
  {
    id: 'top-k', name: 'Top-k sampling', year: 2018, era: 'Choosing the next token', category: 'Decoding', diagram: 'topk',
    source: { label: 'Fan et al., Hierarchical Neural Story Generation', url: 'https://arxiv.org/abs/1805.04833' }, learnPath: '/docs/llms-genai/foundation-model-internals',
    whatItIs: 'Top-k keeps the k highest-probability tokens, renormalizes them, and samples. It prevents the unreliable probability tail from contributing while preserving more than one possible next token.',
    previousLimit: 'Temperature still assigns some mass to every vocabulary item.', requestState: 'The request supplies k and usually temperature; state is a sorted or selected logit vector plus RNG state.',
    example: 'For probabilities [.50, .25, .15, .07, .03] and k=3, the last two tokens are masked, then [.50, .25, .15] is renormalized.', metrics: 'Measure diversity, repetition, task success, and the retained probability mass. Fixed k can be too broad for a sharp distribution and too narrow for a flat one.',
    avoid: 'Avoid one fixed k across contexts with very different uncertainty.', replacedBy: 'Top-p adapts the candidate count to cumulative probability mass.', cameBefore: 'Temperature sampling over the full vocabulary.', ledTo: 'Nucleus sampling and combined top-k/top-p controls.',
  },
  {
    id: 'top-p', name: 'Top-p (nucleus) sampling', year: 2019, era: 'Choosing the next token', category: 'Decoding', diagram: 'topp',
    source: { label: 'Holtzman et al., The Curious Case of Neural Text Degeneration', url: 'https://arxiv.org/abs/1904.09751' }, learnPath: '/docs/llms-genai/foundation-model-internals',
    whatItIs: 'Top-p chooses the smallest sorted token set whose cumulative probability reaches p, then samples inside it. It fixed top-k’s context-blind candidate count by letting sharp distributions retain fewer tokens and flat ones retain more.',
    previousLimit: 'Top-k retains exactly k tokens regardless of distribution shape.', requestState: 'The request supplies p; runtime sorts probabilities, finds the cumulative cutoff, masks the tail, and samples.',
    example: 'For [.50, .25, .15, .07, .03] and p=.90, the nucleus is the first three tokens because their cumulative mass is .90.', metrics: 'Track nucleus size, entropy, diversity, factual or task success, and repetition. The same p can yield a different number of candidates at every step.',
    avoid: 'Avoid assuming p=.9 retains 90% of the vocabulary or guarantees factuality.', replacedBy: 'It remains common, often combined with temperature; task-specific constrained decoding replaces it when validity is mandatory.', cameBefore: 'Fixed-width top-k truncation.', ledTo: 'Adaptive decoding and production sampling stacks.',
  },
  {
    id: 'repetition-penalty', name: 'Repetition penalty', year: 2019, era: 'Choosing the next token', category: 'Decoding', diagram: 'repetition',
    source: { label: 'Keskar et al., CTRL', url: 'https://arxiv.org/abs/1909.05858' }, learnPath: '/docs/llms-genai/foundation-model-internals',
    whatItIs: 'A repetition penalty lowers the logits of tokens already present in the generated prefix before sampling. It addressed loops that temperature and truncation could still repeatedly select.',
    previousLimit: 'Top-k and top-p control the candidate tail, not repeated use of a high-probability token.', requestState: 'The request supplies a penalty; state includes the generated token IDs or their recent frequency counts.',
    example: 'If token 42 appeared and its positive logit is 3.0, penalty 1.2 changes it to 2.5 before softmax in the CTRL rule.', metrics: 'Measure repeated n-gram rate alongside quality and coherence. Too much penalty suppresses legitimate repeated names, syntax, and code symbols.',
    avoid: 'Avoid aggressive penalties in code, tables, extraction, or any task that must repeat exact terms.', replacedBy: 'Frequency/presence penalties and model-specific anti-repetition processors refine the same idea.', cameBefore: 'Sampling controls without prefix-aware adjustment.', ledTo: 'Composable logit processors and constrained generation.',
  },
];

const portableEntries: InferenceAtlasEntry[] = [
  {
    id: 'pruning', name: 'Weight pruning', year: 1989, era: 'Portable, smaller execution', category: 'Compression', diagram: 'pruning',
    source: { label: 'LeCun et al., Optimal Brain Damage', url: 'https://proceedings.neurips.cc/paper/1989/hash/6c9882bbac1c7093bd25041881277658-Abstract.html' }, learnPath: '/docs/inference-engineering/quantization-and-compression',
    whatItIs: 'Pruning removes weights, channels, or blocks judged unimportant. It attacked model size directly, where decoding changes only how an unchanged model selects outputs.', previousLimit: 'Sampling controls do not reduce parameter memory or arithmetic.',
    requestState: 'The request is unchanged; runtime loads a sparse or structurally smaller weight tensor plus any sparse index metadata.', example: 'A 2×3 matrix with one near-zero column becomes a 2×2 dense matrix after structured column pruning.',
    metrics: 'Measure sparsity, model bytes, task quality, latency, and realized hardware speedup. Unstructured sparsity can shrink files without accelerating dense kernels.', avoid: 'Avoid unstructured pruning when the target accelerator lacks an efficient sparse kernel.', replacedBy: 'Structured pruning, distillation, and low-bit quantization are easier to realize on common hardware.', cameBefore: 'Dense networks with every trained parameter retained.', ledTo: 'Hardware-aware structured sparsity and compression stacks.',
  },
  {
    id: 'static-quantization', name: 'Static quantization', year: 2017, era: 'Portable, smaller execution', category: 'Compression', diagram: 'static-quant',
    source: { label: 'Jacob et al., Integer-Arithmetic-Only Inference', url: 'https://arxiv.org/abs/1712.05877' }, learnPath: '/docs/inference-engineering/quantization-and-compression',
    whatItIs: 'Static quantization chooses activation ranges from representative calibration data and stores fixed scales for integer execution. It removed the per-request range calculation of dynamic schemes and enabled integer-only operator pipelines.', previousLimit: 'Floating-point models consume more memory bandwidth and may not run efficiently on integer accelerators.',
    requestState: 'The request is ordinary input; runtime uses precomputed weight and activation scales from a calibration set such as 500 representative images.', example: 'Calibration observes x∈[−1,3], derives one scale and zero-point, then maps x=.5 to an INT8 code.',
    metrics: 'Compare task quality, calibration coverage, model bytes, latency, and integer-kernel coverage. Poor calibration clips real requests outside the observed range.', avoid: 'Avoid when representative calibration data is unavailable or input ranges drift sharply.', replacedBy: 'Quantization-aware training improves difficult models; weight-only methods fit LLM deployment better.', cameBefore: 'Floating-point inference and runtime-selected ranges.', ledTo: 'Quantization-aware training and calibrated LLM activation quantization.',
  },
  {
    id: 'onnx', name: 'ONNX graph exchange', year: 2017, era: 'Portable, smaller execution', category: 'Runtime', diagram: 'onnx',
    source: { label: 'ONNX documentation', url: 'https://onnx.ai/onnx/intro/' }, learnPath: '/docs/inference-engineering/hardware-acceleration-and-kernels',
    whatItIs: 'ONNX serializes a typed operator graph, parameters, and opset version independently of the training framework. It solved the need to rebuild a model by hand for each inference runtime.', previousLimit: 'Framework-native checkpoints bind execution to one framework’s operators and serialization.',
    requestState: 'A request provides named tensors; runtime state is an optimized graph, initializers, provider-specific kernels, and allocated tensor buffers.', example: 'input[1,3,224,224] → Conv → Relu → output[1,64,112,112], with weights stored as graph initializers.',
    metrics: 'Check numerical parity, unsupported or fallback operators, load time, latency, and provider coverage.', avoid: 'Avoid exporting models whose custom or dynamic operators have no faithful ONNX representation.', replacedBy: 'ONNX remains active; specialized compiler IRs and runtime-native formats may outperform it on one target.', cameBefore: 'Training-framework checkpoints as deployment artifacts.', ledTo: 'Portable graph optimization and execution providers.',
  },
  {
    id: 'wasm', name: 'WebAssembly inference', year: 2019, era: 'Portable, smaller execution', category: 'Deployment', diagram: 'wasm',
    source: { label: 'W3C WebAssembly Core Specification 1.0', url: 'https://www.w3.org/TR/wasm-core-1/' }, learnPath: '/docs/inference-engineering/edge-and-tinyml-architecture',
    whatItIs: 'WebAssembly executes a validated binary module inside a browser sandbox with linear memory. It brought portable CPU inference to clients without a native install or server round trip.', previousLimit: 'ONNX describes a graph but still needs an execution target available on the device.',
    requestState: 'The page passes typed arrays into module memory; state includes compiled code, a linear-memory buffer, model weights, and reusable tensor arenas.', example: 'A 224×224 RGB image becomes a Float32Array copied into linear memory before calling infer(ptr).',
    metrics: 'Measure module download and compile time, peak linear memory, warm latency, and output parity.', avoid: 'Avoid for models whose weights exceed practical download or client-memory budgets.', replacedBy: 'WebGPU handles parallel accelerator work; WASM remains a CPU fallback and preprocessing runtime.', cameBefore: 'JavaScript kernels and server-only inference.', ledTo: 'Browser runtimes with WASM fallback and WebGPU acceleration.',
  },
  {
    id: 'dynamic-quantization', name: 'Dynamic quantization', year: 2020, era: 'Portable, smaller execution', category: 'Compression', diagram: 'dynamic-quant',
    source: { label: 'PyTorch dynamic quantization tutorial', url: 'https://docs.pytorch.org/tutorials/advanced/dynamic_quantization_tutorial.html' }, learnPath: '/docs/inference-engineering/quantization-and-compression',
    whatItIs: 'Dynamic quantization stores weights in low precision but computes activation scales from each runtime input. It removes calibration-data preparation while still reducing weight traffic.', previousLimit: 'Static quantization needs a representative calibration set and fixed activation ranges.',
    requestState: 'The request supplies floating activations; runtime scans the current tensor for a range, quantizes it, runs the integer operator, then dequantizes as needed.', example: 'A request vector [−.2,.4,1.6] determines its activation scale immediately before a quantized linear layer.',
    metrics: 'Measure weight bytes, range-computation overhead, operator coverage, latency, and task quality.', avoid: 'Avoid when per-input quantization overhead dominates small operators or integer kernels are missing.', replacedBy: 'Static calibration for stable high-throughput paths; weight-only LLM quantization for memory-bound decoding.', cameBefore: 'Static calibrated integer inference.', ledTo: 'Easy post-training CPU compression workflows.',
  },
  {
    id: 'gptq', name: 'GPTQ', year: 2022, era: 'Portable, smaller execution', category: 'Compression', diagram: 'gptq',
    source: { label: 'Frantar et al., GPTQ', url: 'https://arxiv.org/abs/2210.17323' }, learnPath: '/docs/inference-engineering/quantization-and-compression',
    whatItIs: 'GPTQ quantizes a pretrained transformer layer by layer, using approximate second-order information to compensate remaining weights as each weight is rounded. It made accurate 3–4 bit weight-only post-training quantization practical for very large models.', previousLimit: 'Independent rounding ignores how weight errors interact through layer inputs.',
    requestState: 'Requests remain token IDs; runtime loads packed low-bit weights plus group scales while activations stay at higher precision.', example: 'A calibration matrix X guides whether weight .38 rounds up or down and how the unquantized neighbors are adjusted.',
    metrics: 'Measure perplexity or task quality, bits per weight, calibration time, model bytes, kernel latency, and tokens per second.', avoid: 'Avoid when no matching packed-weight kernel exists or rapid conversion matters more than final quality.', replacedBy: 'AWQ uses activation salience; newer formats and kernels package several weight-only recipes.', cameBefore: 'Naive per-weight low-bit rounding.', ledTo: 'Widely deployed 4-bit weight-only LLM inference.',
  },
  {
    id: 'awq', name: 'AWQ', year: 2023, era: 'Portable, smaller execution', category: 'Compression', diagram: 'awq',
    source: { label: 'Lin et al., AWQ', url: 'https://arxiv.org/abs/2306.00978' }, learnPath: '/docs/inference-engineering/quantization-and-compression',
    whatItIs: 'AWQ identifies channels whose weights are salient under observed activations and protects them through per-channel scaling before low-bit rounding. It addressed weight-only quantization error without reconstructing every weight through a second-order solve.', previousLimit: 'GPTQ’s reconstruction is effective but more involved, while naive rounding treats every channel alike.',
    requestState: 'Requests are unchanged; runtime holds packed weights, per-group scales, and higher-precision activations.', example: 'If one input channel has consistently large activations, its weights receive a protective scale before 4-bit quantization.',
    metrics: 'Measure task quality, bits per weight, calibration cost, kernel throughput, and end-to-end memory use.', avoid: 'Avoid assuming a quantized checkpoint accelerates hardware without an AWQ-compatible kernel.', replacedBy: 'AWQ remains active alongside GPTQ and hardware-specific low-bit formats.', cameBefore: 'Second-order and uniform weight-only quantization.', ledTo: 'Activation-aware low-bit serving kernels.',
  },
  {
    id: 'gguf', name: 'GGUF model format', year: 2023, era: 'Portable, smaller execution', category: 'Runtime', diagram: 'gguf',
    source: { label: 'GGUF specification', url: 'https://github.com/ggml-org/ggml/blob/master/docs/gguf.md' }, learnPath: '/docs/inference-engineering/edge-and-tinyml-architecture',
    whatItIs: 'GGUF stores model tensors together with typed metadata in one file designed for efficient loading and memory mapping. It solved the brittle separation of quantized tensor files, tokenizer metadata, and architecture settings in local inference.', previousLimit: 'A quantization algorithm does not by itself define a portable, self-describing deployment artifact.',
    requestState: 'The request is tokenized locally; runtime memory-maps tensor blocks and reads tokenizer, architecture, and quantization metadata from the same file.', example: 'One file contains Q4_K tensor blocks plus context length, vocabulary, and tokenizer fields.',
    metrics: 'Check file size, load time, resident memory, supported metadata, output parity, and tokens per second.', avoid: 'Avoid when the serving runtime or accelerator expects a different native format.', replacedBy: 'GGUF superseded earlier GGML-family files and continues to evolve through versioned metadata.', cameBefore: 'Separate or weakly versioned local-model artifacts.', ledTo: 'Single-file local CPU/GPU inference distribution.',
  },
  {
    id: 'webgpu', name: 'WebGPU inference', year: 2023, era: 'Portable, smaller execution', category: 'Deployment', diagram: 'webgpu',
    source: { label: 'W3C WebGPU specification', url: 'https://www.w3.org/TR/webgpu/' }, learnPath: '/docs/inference-engineering/edge-and-tinyml-architecture',
    whatItIs: 'WebGPU exposes portable GPU compute pipelines, buffers, and command submission to the web platform. It moves parallel tensor operations off the CPU where WASM alone cannot efficiently saturate the client GPU.', previousLimit: 'WASM offers portable CPU execution but no standard direct GPU compute model.',
    requestState: 'A browser request becomes GPU buffers; runtime holds compiled shader pipelines, bind groups, weight buffers, and command encoders.', example: 'Token embeddings and a weight tile enter storage buffers; a WGSL matrix kernel writes the next activation buffer.',
    metrics: 'Measure first-run pipeline compilation, upload time, warm latency, memory, battery use, and browser coverage.', avoid: 'Avoid when client GPU support, memory, privacy policy, or download size cannot meet the application envelope.', replacedBy: 'WebGPU complements rather than replaces WASM: runtimes use WASM for control/CPU fallback and WebGPU for parallel kernels.', cameBefore: 'WASM CPU inference and vendor-specific browser GPU paths.', ledTo: 'Private, offline-capable browser model execution.',
  },
];

const memoryEntries: InferenceAtlasEntry[] = [
  {
    id: 'roofline', name: 'Roofline analysis', year: 2009, era: 'Memory-aware transformers', category: 'Measurement', diagram: 'roofline',
    source: { label: 'Williams et al., Roofline', url: 'https://crd.lbl.gov/assets/pubs_presos/roofline-ieee.pdf' }, learnPath: '/docs/inference-engineering/roofline-and-kv-cache',
    whatItIs: 'The roofline model bounds attainable performance by the lower of peak compute and memory bandwidth multiplied by arithmetic intensity. It explains why adding FLOPs hardware does not accelerate a workload that mostly moves bytes.', previousLimit: 'A peak-FLOPs number cannot identify whether a kernel waits on arithmetic units or memory.',
    requestState: 'Profile a representative request; runtime measurements need operation count, bytes moved, achieved throughput, peak compute, and peak bandwidth.', example: 'A kernel with 10 FLOP/byte on hardware with 1 TB/s bandwidth has a 10 TFLOP/s bandwidth roof even if peak compute is 100 TFLOP/s.',
    metrics: 'Plot achieved FLOP/s against FLOP/byte. Points below both roofs have additional inefficiency; moving right means more work per byte.', avoid: 'Avoid treating the bound as a latency prediction or ignoring cache hierarchy and communication.', replacedBy: 'Hierarchical and communication rooflines refine it; the original remains the first diagnostic.', cameBefore: 'Peak compute as the main performance headline.', ledTo: 'IO-aware attention and memory-bound decode analysis.',
  },
  {
    id: 'kv-cache', name: 'KV cache', year: 2017, era: 'Memory-aware transformers', category: 'Runtime', diagram: 'kv-cache',
    source: { label: 'Vaswani et al., Attention Is All You Need', url: 'https://arxiv.org/abs/1706.03762' }, learnPath: '/docs/inference-engineering/roofline-and-kv-cache',
    whatItIs: 'Autoregressive decoding stores each layer’s past key and value vectors and computes only the new token’s projections. It eliminates recomputing the full prefix at every generation step.', previousLimit: 'Without cached state, generating token t repeats attention projections for tokens 1…t−1.',
    requestState: 'The request starts with prompt tokens; state grows by one K row and one V row per layer for every generated token.', example: 'After “the cat”, each layer holds K₁,K₂ and V₁,V₂; decoding “sat” appends K₃,V₃ instead of rebuilding all six vectors.',
    metrics: 'Measure bytes per token, maximum concurrent sequences, time to first token, and inter-token latency. Cache memory grows with sequence length, layers, and KV heads.', avoid: 'Avoid retaining abandoned or completed request caches; tiny sequences may not justify complex cache management.', replacedBy: 'Paged allocation and shared-prefix caching manage the same cached tensors more efficiently.', cameBefore: 'Full-prefix recomputation at each step.', ledTo: 'GQA, paged KV caches, prefix caching, and phase disaggregation.',
  },
  {
    id: 'flash-attention', name: 'FlashAttention', year: 2022, era: 'Memory-aware transformers', category: 'Kernel', diagram: 'flash',
    source: { label: 'Dao et al., FlashAttention', url: 'https://arxiv.org/abs/2205.14135' }, learnPath: '/docs/inference-engineering/hardware-acceleration-and-kernels',
    whatItIs: 'FlashAttention tiles Q, K, and V through fast on-chip SRAM and performs an online softmax without materializing the full attention matrix in high-bandwidth memory. It computes exact attention while reducing expensive memory traffic.', previousLimit: 'Standard attention writes and rereads the N×N score and probability matrices.',
    requestState: 'The request supplies Q/K/V tensors; the kernel state is one query tile, streamed key/value tiles, running maxima, sums, and output accumulators.', example: 'A Q tile meets K/V block 1 then block 2; running softmax statistics rescale the partial output without storing the full score grid.',
    metrics: 'Measure wall-clock latency, HBM reads/writes, achieved bandwidth, memory footprint, and numerical error.', avoid: 'Avoid assuming it removes quadratic arithmetic; benefit depends on shapes and available optimized kernels.', replacedBy: 'FlashAttention-2/3 refine work partitioning and hardware use while preserving the IO-aware method.', cameBefore: 'Attention kernels that materialized intermediate matrices.', ledTo: 'Fused, tiled exact-attention kernels.',
  },
  {
    id: 'gqa', name: 'Grouped-query attention (GQA)', year: 2023, era: 'Memory-aware transformers', category: 'Kernel', diagram: 'gqa',
    source: { label: 'Ainslie et al., GQA', url: 'https://arxiv.org/abs/2305.13245' }, learnPath: '/docs/inference-engineering/roofline-and-kv-cache',
    whatItIs: 'GQA gives several query heads one shared key head and value head. It preserves more head diversity than multi-query attention while reducing KV-cache size and bandwidth relative to one KV pair per query head.', previousLimit: 'Multi-head attention duplicates K/V state for every query head; multi-query attention shares one pair across all heads.',
    requestState: 'Requests are unchanged; runtime maps each query-head group to one cached K/V head.', example: 'Eight query heads form two groups of four, so the cache stores two K heads and two V heads rather than eight of each.',
    metrics: 'Measure task quality, KV bytes per token, memory bandwidth, batch capacity, and tokens per second.', avoid: 'Avoid converting an existing model without training or uptraining support and quality evaluation.', replacedBy: 'GQA is a current middle ground; MHA or MQA may still fit quality or efficiency extremes.', cameBefore: 'Multi-head and multi-query attention.', ledTo: 'Smaller caches and higher-concurrency LLM serving.',
  },
  {
    id: 'paged-kv-cache', name: 'Paged KV cache', year: 2023, era: 'Memory-aware transformers', category: 'Runtime', diagram: 'paged-kv',
    source: { label: 'Kwon et al., PagedAttention', url: 'https://arxiv.org/abs/2309.06180' }, learnPath: '/docs/inference-engineering/roofline-and-kv-cache',
    whatItIs: 'Paged KV caching divides each request’s logical cache into fixed-size blocks mapped to non-contiguous physical blocks. It avoids reserving one maximum-length contiguous region and enables block sharing between related sequences.', previousLimit: 'A contiguous KV cache wastes reserved tail space and suffers fragmentation as request lengths vary.',
    requestState: 'Each request owns a logical block table; the shared allocator tracks free physical blocks and reference counts.', example: 'Logical blocks [0,1,2] map to physical blocks [7,3,11]; a forked beam can share [7,3] and allocate only its new tail.',
    metrics: 'Measure useful KV bytes versus reserved bytes, fragmentation, concurrent sequences, scheduler throughput, and lookup overhead.', avoid: 'Avoid for fixed-shape batches where simple contiguous buffers already fit and minimize indirection.', replacedBy: 'Paged caches remain standard; prefix-aware and tiered caches extend the block manager.', cameBefore: 'One contiguous cache allocation per sequence.', ledTo: 'High-occupancy continuous batching and prefix block reuse.',
  },
];

export const inferenceAtlasEntries: InferenceAtlasEntry[] = [...decodingEntries, ...portableEntries, ...memoryEntries];

export const inferenceAtlasCategories: Array<'All' | InferenceAtlasCategory> = ['All', 'Decoding', 'Runtime', 'Compression', 'Kernel', 'Serving', 'Deployment', 'Measurement'];
