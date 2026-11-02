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

export const inferenceAtlasEntries: InferenceAtlasEntry[] = [...decodingEntries];

export const inferenceAtlasCategories: Array<'All' | InferenceAtlasCategory> = ['All', 'Decoding', 'Runtime', 'Compression', 'Kernel', 'Serving', 'Deployment', 'Measurement'];
