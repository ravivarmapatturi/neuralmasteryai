/**
 * Study plans, research paper tracks and project sheets.
 *
 * Everything here is built from content that already exists: curated
 * practice problems (ids from practiceCatalog.ts) and Learn pages (routes).
 * Where a plan or track still needs a problem we have not written, the step
 * is listed with `todo` so the gap is visible on the page instead of hidden.
 * Only curated problems are used; hidden ones stay hidden until reviewed.
 */

export type PlanStep =
  | { kind: 'problem'; id: string; note?: string }
  | { kind: 'read'; route: string; note?: string }
  | { kind: 'todo'; title: string; note?: string };

export interface StudyPlan {
  slug: string;
  title: string;
  summary: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  steps: PlanStep[];
}

export const STUDY_PLANS: StudyPlan[] = [
  {
    slug: 'micrograd-from-scratch',
    title: 'Build Micrograd from Scratch',
    summary:
      'Build the pieces of a tiny autograd engine and train a small network with it: forward passes, local gradients, the chain rule and an optimiser step.',
    level: 'Intermediate',
    steps: [
      { kind: 'read', route: '/docs/deep-learning/neural-network-fundamentals' },
      { kind: 'problem', id: 'dl-nn-prob-1', note: 'The forward pass every node in the graph runs.' },
      { kind: 'problem', id: 'dl-nn-prob-2', note: 'A local gradient: what one operation passes back.' },
      { kind: 'problem', id: 'dl-nn-prob-5', note: 'Where backprop starts: the gradient of the loss.' },
      { kind: 'problem', id: 'math-num-prob-37', note: 'Numerical gradients, the check you run against your autograd.' },
      { kind: 'todo', title: 'A Value class that records its parents and operation', note: 'Planned with the autograd problem set (roadmap task 28).' },
      { kind: 'todo', title: 'Topological sort and backward() over the graph', note: 'Planned with the autograd problem set (roadmap task 28).' },
      { kind: 'problem', id: 'dl-nn-prob-11', note: 'The chain rule through a whole layer.' },
      { kind: 'problem', id: 'softmax-gradient' },
      { kind: 'problem', id: 'dl-nn-prob-9', note: 'Use the gradients to update the weights.' },
      { kind: 'problem', id: 'dl-nn-prob-23', note: 'Put it together: one full training step.' },
      { kind: 'read', route: '/docs/visual-lab/neural-network-playground' },
    ],
  },
  {
    slug: 'transformer-from-scratch',
    title: 'Build a Transformer from Scratch',
    summary:
      'Go from text to next-token predictions: tokenise, add positions, write attention with a causal mask, split heads, normalise, compute the loss and sample.',
    level: 'Intermediate',
    steps: [
      { kind: 'read', route: '/docs/deep-learning/attention-transformers' },
      { kind: 'problem', id: 'llm-internals-prob-43' },
      { kind: 'todo', title: 'Train a byte-pair encoding tokenizer', note: 'Planned with the tokenizer problem set (roadmap task 30).' },
      { kind: 'problem', id: 'llm-internals-prob-46' },
      { kind: 'problem', id: 'transformer-prob-1' },
      { kind: 'problem', id: 'llm-internals-prob-3' },
      { kind: 'problem', id: 'transformer-prob-6' },
      { kind: 'todo', title: 'Full multi-head attention forward pass', note: 'Planned with the attention problem set (roadmap task 29).' },
      { kind: 'problem', id: 'rms-normalization' },
      { kind: 'todo', title: 'One transformer block: attention, feed-forward and residuals', note: 'Planned with the attention problem set (roadmap task 29).' },
      { kind: 'problem', id: 'rotary-positional-embedding' },
      { kind: 'problem', id: 'llm-internals-prob-29' },
      { kind: 'problem', id: 'inference-prob-1' },
      { kind: 'problem', id: 'inference-prob-5' },
      { kind: 'problem', id: 'inference-prob-11' },
      { kind: 'read', route: '/docs/visual-lab/attention-step-through' },
    ],
  },
  {
    slug: 'rag-from-scratch',
    title: 'RAG from Scratch',
    summary:
      'Build retrieval-augmented generation piece by piece: chunk documents, embed and search them, fuse rankings, fit a context budget and check the answer is grounded.',
    level: 'Intermediate',
    steps: [
      { kind: 'read', route: '/docs/llms-genai/rag' },
      { kind: 'problem', id: 'rag-prod-prob-1' },
      { kind: 'problem', id: 'rag-prod-prob-2' },
      { kind: 'problem', id: 'vec-search-prob-3' },
      { kind: 'problem', id: 'vec-search-prob-6' },
      { kind: 'problem', id: 'vec-search-prob-7' },
      { kind: 'problem', id: 'vec-search-prob-10' },
      { kind: 'problem', id: 'rag-prod-prob-4' },
      { kind: 'problem', id: 'rag-prod-prob-25' },
      { kind: 'todo', title: 'Re-rank candidates with a cross-encoder score', note: 'Planned with the RAG problem set (roadmap task 34).' },
      { kind: 'problem', id: 'rag-prod-prob-3' },
      { kind: 'problem', id: 'rag-prod-prob-6' },
      { kind: 'problem', id: 'rag-prod-prob-19' },
      { kind: 'problem', id: 'rag-prod-prob-17' },
      { kind: 'todo', title: 'Capstone: one retrieval pipeline from query to cited answer', note: 'Planned with the RAG problem set (roadmap task 34).' },
      { kind: 'read', route: '/docs/visual-lab/rag-pipeline-simulator' },
    ],
  },
  {
    slug: 'agents-from-scratch',
    title: 'Agents from Scratch',
    summary:
      'Write a tool-using agent one piece at a time: parse tool calls, dispatch them, run the loop, recover from errors, add guardrails, memory, planning and an evaluation.',
    level: 'Intermediate',
    steps: [
      { kind: 'read', route: '/docs/agents/agent-fundamentals' },
      { kind: 'problem', id: 'agent-parse-tool-call' },
      { kind: 'problem', id: 'agent-validate-tool-arguments' },
      { kind: 'problem', id: 'agent-dispatch-tools' },
      { kind: 'problem', id: 'agent-loop' },
      { kind: 'problem', id: 'agent-error-recovery' },
      { kind: 'problem', id: 'agent-guardrails' },
      { kind: 'problem', id: 'agent-context-trimming' },
      { kind: 'problem', id: 'agent-parallel-tool-calls' },
      { kind: 'problem', id: 'agent-memory-recall' },
      { kind: 'read', route: '/docs/agents/plan-and-execute' },
      { kind: 'problem', id: 'agent-plan-and-execute' },
      { kind: 'problem', id: 'agent-eval-harness' },
      { kind: 'problem', id: 'agent-capstone' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Research paper tracks                                               */
/* ------------------------------------------------------------------ */

export interface ResearchStep {
  title: string;
  /** Index into the track's `blocks`: the part of the architecture this step builds. */
  block: number;
  step: PlanStep;
}

export interface ResearchTrack {
  slug: string;
  paper: string;
  authors: string;
  year: number;
  arxiv: string;
  summary: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  /** Architecture parts in data-flow order, drawn top to bottom. */
  blocks: string[];
  steps: ResearchStep[];
}

const p = (id: string, note?: string): PlanStep => ({ kind: 'problem', id, note });
const r = (route: string, note?: string): PlanStep => ({ kind: 'read', route, note });
const todo = (title: string, note?: string): PlanStep => ({ kind: 'todo', title, note });

export const RESEARCH_TRACKS: ResearchTrack[] = [
  {
    slug: 'attention-is-all-you-need',
    paper: 'Attention Is All You Need',
    authors: 'Vaswani et al.',
    year: 2017,
    arxiv: 'https://arxiv.org/abs/1706.03762',
    summary: 'The transformer: replace recurrence with attention so every token can look at every other token in one step.',
    level: 'Intermediate',
    blocks: ['Tokens', 'Embeddings + positions', 'Multi-head attention', 'Add & normalise', 'Feed-forward', 'Output softmax'],
    steps: [
      { title: 'Split text into tokens', block: 0, step: p('llm-internals-prob-43') },
      { title: 'Add sinusoidal positions', block: 1, step: p('llm-internals-prob-46') },
      { title: 'Scaled dot-product attention', block: 2, step: p('transformer-prob-1') },
      { title: 'Mask future tokens in the decoder', block: 2, step: p('llm-internals-prob-3') },
      { title: 'Split into attention heads', block: 2, step: p('transformer-prob-6') },
      { title: 'Normalise activations', block: 3, step: p('rms-normalization', 'The paper used LayerNorm; RMSNorm is the variant most current decoders use.') },
      { title: 'Position-wise feed-forward layer', block: 4, step: p('dl-nn-prob-1') },
      { title: 'Next-token loss from logits', block: 5, step: p('llm-internals-prob-29') },
    ],
  },
  {
    slug: 'resnet',
    paper: 'Deep Residual Learning for Image Recognition',
    authors: 'He et al.',
    year: 2015,
    arxiv: 'https://arxiv.org/abs/1512.03385',
    summary: 'Residual connections let a layer learn a correction to its input, so networks can go far deeper without training getting worse.',
    level: 'Intermediate',
    blocks: ['Input image', 'Convolution', 'Batch norm + ReLU', 'Residual add', 'Pooling', 'Classifier'],
    steps: [
      { title: 'A 2D convolution', block: 1, step: p('convolution-2d') },
      { title: 'Convolution over many channels', block: 1, step: p('cv-cnn-prob-11') },
      { title: 'He initialisation for ReLU layers', block: 1, step: p('dl-nn-prob-7') },
      { title: 'Batch normalisation', block: 2, step: p('dl-nn-prob-14') },
      { title: 'The residual block', block: 3, step: p('cv-cnn-prob-26') },
      { title: 'Max pooling', block: 4, step: p('cv-cnn-prob-2') },
      { title: 'Cross-entropy over classes', block: 5, step: p('dl-nn-prob-10') },
    ],
  },
  {
    slug: 'gpt-2',
    paper: 'Language Models are Unsupervised Multitask Learners (GPT-2)',
    authors: 'Radford et al.',
    year: 2019,
    arxiv: 'https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf',
    summary: 'A decoder-only transformer trained to predict the next token, then used to generate text one token at a time.',
    level: 'Intermediate',
    blocks: ['Tokens', 'Token + position embeddings', 'Masked self-attention', 'MLP', 'KV cache', 'Sampling'],
    steps: [
      { title: 'Subword tokenisation', block: 0, step: p('llm-internals-prob-43', 'GPT-2 uses byte-level BPE; this problem builds the same greedy subword idea.') },
      { title: 'Byte-level BPE merges', block: 0, step: todo('Byte-level BPE', 'Planned with the tokenizer problem set (roadmap task 30).') },
      { title: 'Causal attention mask', block: 2, step: p('llm-internals-prob-3') },
      { title: 'Split into heads', block: 2, step: p('transformer-prob-6') },
      { title: 'Two-layer MLP block', block: 3, step: p('dl-nn-prob-23') },
      { title: 'Cache keys and values', block: 4, step: p('inference-prob-11') },
      { title: 'Temperature', block: 5, step: p('inference-prob-2') },
      { title: 'Top-k filtering', block: 5, step: p('inference-prob-4') },
      { title: 'Perplexity', block: 5, step: p('transformer-prob-29') },
    ],
  },
  {
    slug: 'lora',
    paper: 'LoRA: Low-Rank Adaptation of Large Language Models',
    authors: 'Hu et al.',
    year: 2021,
    arxiv: 'https://arxiv.org/abs/2106.09685',
    summary: 'Freeze the model and learn a small low-rank update for each weight matrix, cutting trainable parameters by orders of magnitude.',
    level: 'Intermediate',
    blocks: ['Frozen weight W', 'Down-projection A', 'Up-projection B', 'Scale by α / r', 'Merged weight'],
    steps: [
      { title: 'Matrix multiplication', block: 0, step: p('matrix-multiplication') },
      { title: 'Why fine-tuning is expensive', block: 0, step: r('/docs/llms-genai/training-pipeline') },
      { title: 'LoRA forward pass: W x + B A x', block: 1, step: todo('LoRA forward pass', 'New problem needed.') },
      { title: 'Count trainable parameters for a given rank', block: 2, step: todo('LoRA parameter count', 'New problem needed.') },
      { title: 'Apply the α / r scale', block: 3, step: todo('LoRA scaling', 'New problem needed.') },
      { title: 'Merge the adapter into the base weight', block: 4, step: p('llm-internals-prob-49') },
    ],
  },
  {
    slug: 'dpo',
    paper: 'Direct Preference Optimization',
    authors: 'Rafailov et al.',
    year: 2023,
    arxiv: 'https://arxiv.org/abs/2305.18290',
    summary: 'Train on preference pairs directly with a classification-style loss, without a separate reward model or RL loop.',
    level: 'Advanced',
    blocks: ['Prompt + chosen / rejected', 'Policy log-probs', 'Reference log-probs', 'Log-ratio margin', 'Sigmoid loss'],
    steps: [
      { title: 'Where DPO fits next to RLHF', block: 0, step: r('/docs/ai-safety/alignment-and-rlhf') },
      { title: 'Log-probabilities from logits', block: 1, step: p('llm-internals-prob-29') },
      { title: 'KL divergence between two distributions', block: 2, step: p('math-num-prob-19') },
      { title: 'Sequence log-prob under policy and reference', block: 2, step: todo('Sequence log-probability', 'New problem needed.') },
      { title: 'The implicit reward margin', block: 3, step: todo('DPO reward margin', 'New problem needed.') },
      { title: 'The DPO loss', block: 4, step: todo('DPO loss', 'New problem needed.') },
    ],
  },
  {
    slug: 'vit',
    paper: 'An Image is Worth 16x16 Words (ViT)',
    authors: 'Dosovitskiy et al.',
    year: 2020,
    arxiv: 'https://arxiv.org/abs/2010.11929',
    summary: 'Cut an image into patches, treat each patch as a token and run a standard transformer encoder over them.',
    level: 'Intermediate',
    blocks: ['Image', 'Patches', 'Linear projection + [CLS]', 'Position embeddings', 'Transformer encoder', 'Class head'],
    steps: [
      { title: 'Vision architectures before ViT', block: 0, step: r('/docs/deep-learning/vision-architectures') },
      { title: 'Cut the image into patches', block: 1, step: todo('Patchify an image', 'A draft exists but has not passed review for the curated set.') },
      { title: 'Project each patch to a vector', block: 2, step: p('dl-nn-prob-1') },
      { title: 'Prepend the [CLS] token', block: 2, step: todo('Prepend a CLS token', 'A draft exists but has not passed review for the curated set.') },
      { title: 'Add position information', block: 3, step: p('llm-internals-prob-46') },
      { title: 'Self-attention over patches', block: 4, step: p('transformer-prob-1') },
      { title: 'Classify from the [CLS] output', block: 5, step: p('dl-nn-prob-10') },
    ],
  },
  {
    slug: 'word2vec',
    paper: 'Efficient Estimation of Word Representations (Word2Vec)',
    authors: 'Mikolov et al.',
    year: 2013,
    arxiv: 'https://arxiv.org/abs/1301.3781',
    summary: 'Learn a vector per word by predicting nearby words, so words used in similar contexts end up close together.',
    level: 'Beginner',
    blocks: ['Corpus', 'Context window', 'Embedding lookup', 'Dot-product score', 'Negative-sampling loss', 'Nearest words'],
    steps: [
      { title: 'What word embeddings capture', block: 0, step: r('/docs/nlp/word-embeddings') },
      { title: 'Build (centre, context) pairs', block: 1, step: todo('Skip-gram pairs', 'New problem needed.') },
      { title: 'Score a pair with a dot product', block: 3, step: p('dot-product') },
      { title: 'Negative-sampling loss', block: 4, step: todo('Negative-sampling loss', 'New problem needed.') },
      { title: 'Update the vectors with SGD', block: 4, step: p('dl-nn-prob-9') },
      { title: 'Find nearest words by cosine similarity', block: 5, step: p('vec-search-prob-3') },
      { title: 'Explore an embedding space', block: 5, step: r('/docs/visual-lab/embedding-space-explorer') },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Project sheets                                                      */
/* ------------------------------------------------------------------ */

export interface ProjectSheet {
  slug: string;
  field: string;
  title: string;
  summary: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  milestones: string[];
  doneWhen: string[];
  /** Plans, problems and Learn pages that cover the pieces. */
  prepare: PlanStep[];
  /** Study plan slug that builds the core pieces, if there is one. */
  plan?: string;
}

export const PROJECT_SHEETS: ProjectSheet[] = [
  {
    slug: 'rag-app',
    field: 'LLM applications',
    title: 'A question-answering app over your own documents',
    summary: 'Index a folder of documents and answer questions about them with citations, and say "I don\'t know" when the documents don\'t cover it.',
    level: 'Intermediate',
    plan: 'rag-from-scratch',
    milestones: [
      'Load and chunk 50 or more documents, keeping the source and position of every chunk.',
      'Embed the chunks and store them in a vector index; add keyword search beside it.',
      'Combine both result lists with reciprocal rank fusion and keep the top few chunks.',
      'Fit the chunks into a context budget and prompt the model to cite chunk ids.',
      'Refuse to answer when the best retrieval score is too low.',
      'Write 20 questions with known answers and measure recall@5 and answer accuracy.',
    ],
    doneWhen: ['Every answer cites a chunk you can open.', 'You can report recall@5 on your own question set.', 'Out-of-scope questions get a refusal, not a guess.'],
    prepare: [r('/docs/llms-genai/rag'), r('/docs/llms-genai/retrieval-and-reranking-architectures'), p('vec-search-prob-10'), p('rag-prod-prob-19')],
  },
  {
    slug: 'agent-with-tools',
    field: 'Agents',
    title: 'An agent that uses real tools',
    summary: 'A command-line agent that can search files, run a calculator and call one web API, with a step budget and a log of every action.',
    level: 'Intermediate',
    plan: 'agents-from-scratch',
    milestones: [
      'Define three tools with JSON schemas and validate every call against them.',
      'Write the loop: model call, tool dispatch, append result, repeat until a final answer.',
      'Return tool errors to the model as results instead of crashing.',
      'Stop on a step budget and on repeated identical calls.',
      'Log every step to a file you can replay.',
      'Run ten scripted tasks and record how many finish correctly.',
    ],
    doneWhen: ['A bad tool call never crashes the run.', 'Every run stops within its budget.', 'You have a success rate on ten tasks.'],
    prepare: [r('/docs/agents/react-agent-production'), p('agent-loop'), p('agent-guardrails'), p('agent-eval-harness')],
  },
  {
    slug: 'eval-harness',
    field: 'Evaluation',
    title: 'An evaluation harness for an LLM feature',
    summary: 'A script that runs a fixed test set against a prompt or model, scores the outputs and tells you whether a change made things better or worse.',
    level: 'Intermediate',
    milestones: [
      'Write 30 test cases with inputs and expected properties, not just exact answers.',
      'Score each output with simple checks first: format, required facts, length.',
      'Add an LLM judge for the cases simple checks cannot score, and spot-check it by hand.',
      'Store every run with its prompt version and scores.',
      'Compare two runs and list the cases that got worse.',
    ],
    doneWhen: ['One command runs the whole set.', 'A prompt change shows a before and after score.', 'You know how often the judge agrees with you.'],
    prepare: [r('/docs/ai-evaluation/llm-rag-agent-evaluation'), r('/docs/ai-evaluation/evaluation-fundamentals'), p('groundedness-check'), p('trust-the-judge')],
  },
  {
    slug: 'lora-fine-tune',
    field: 'Training',
    title: 'Fine-tune a small model with LoRA',
    summary: 'Fine-tune an open model of 1B parameters or smaller on one narrow task with LoRA, and show it beats the base model on a held-out set.',
    level: 'Advanced',
    milestones: [
      'Pick one narrow task and build 500 or more clean training examples.',
      'Hold out a test set before training and score the base model on it.',
      'Train a LoRA adapter; record rank, learning rate and loss curves.',
      'Score the fine-tuned model on the same test set.',
      'Merge the adapter and check the merged model gives the same outputs.',
    ],
    doneWhen: ['A held-out score for base and fine-tuned models.', 'Loss curves saved with the settings that produced them.', 'A merged model that matches the adapter version.'],
    prepare: [r('/docs/llms-genai/training-pipeline'), p('llm-internals-prob-49'), p('matrix-multiplication')],
  },
  {
    slug: 'batched-serving',
    field: 'Serving',
    title: 'Serve a model with batching',
    summary: 'Put a model behind an HTTP endpoint, batch concurrent requests together and measure what batching does to throughput and latency.',
    level: 'Advanced',
    milestones: [
      'Serve one request at a time and measure latency and requests per second.',
      'Queue incoming requests and run them in batches up to a size or time limit.',
      'Load-test both versions with the same traffic.',
      'Plot latency percentiles and throughput against batch size.',
      'Add a timeout so one slow request cannot hold up a batch.',
    ],
    doneWhen: ['A table of p50 and p95 latency and throughput for each batch size.', 'The endpoint stays up under a load test.'],
    prepare: [r('/docs/inference-engineering/continuous-batching-and-speculative-decoding'), r('/docs/mlops/model-serving'), p('inference-prob-21'), p('inference-prob-12')],
  },
  {
    slug: 'voice-assistant',
    field: 'Speech',
    title: 'A voice assistant',
    summary: 'Speak a question, transcribe it, answer it with an LLM and speak the answer back, and measure the delay at each stage.',
    level: 'Intermediate',
    milestones: [
      'Record audio and transcribe it with a speech-to-text model.',
      'Send the text to an LLM with a short system prompt.',
      'Turn the answer into speech with a text-to-speech model.',
      'Measure time spent in each stage and the total time to first audio.',
      'Stream the answer so speech starts before the full reply is ready.',
    ],
    doneWhen: ['A spoken question gets a spoken answer.', 'You can show where the delay goes, stage by stage.'],
    prepare: [r('/docs/speech-audio/audio-fundamentals'), r('/docs/speech-audio/speech-audio-tasks'), r('/docs/llms-genai/calling-the-llm-api')],
  },
];

export function findStudyPlan(slug: string): StudyPlan | undefined {
  return STUDY_PLANS.find((plan) => plan.slug === slug);
}

export function findResearchTrack(slug: string): ResearchTrack | undefined {
  return RESEARCH_TRACKS.find((track) => track.slug === slug);
}
