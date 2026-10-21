/**
 * The curated Practice catalogue: which problems are visible, in which
 * track, in what order.
 *
 * Practice used to show every generated problem file (1,549 of them across
 * 54 overlapping topics). This list is the editorial layer on top: each
 * problem was picked by hand for teaching value, duplicates across the old
 * topics were dropped, and each track runs easy -> hard. A problem that
 * isn't listed here still exists and its URL still works, but it's out of
 * the catalogue, out of the counts and out of the sitemap.
 *
 * Problem ids are the original file ids. Their public URLs come from
 * practiceSlugs.generated.json (descriptive slugs, built by
 * scripts/practice/build-catalog.mjs), and old /practice/<id> URLs redirect.
 */

export type TrackKind = 'project' | 'set';

export interface CatalogTrack {
  slug: string;
  title: string;
  /** One sentence, plain words: what you'll be able to do afterwards. */
  summary: string;
  /** 'project' = every problem builds on the previous one (a real build).
   * 'set' = a curated, ordered set of standalone problems. */
  kind: TrackKind;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  learnRoute: string;
  /** Replaces the default "one program built in stages" note on a project track's page. */
  note?: string;
  problems: string[];
}

export const CATALOG: CatalogTrack[] = [
  {
    slug: 'build-an-agent',
    title: 'Build an Agent',
    summary:
      'Write a tool-using agent from scratch, one piece per problem: parsing, dispatch, the loop, guardrails, memory, planning, evals.',
    kind: 'project',
    level: 'Intermediate',
    learnRoute: '/docs/agents/react-agent-production',
    problems: [
      'agent-parse-tool-call',
      'agent-validate-tool-arguments',
      'agent-dispatch-tools',
      'agent-loop',
      'agent-error-recovery',
      'agent-guardrails',
      'agent-context-trimming',
      'agent-parallel-tool-calls',
      'agent-memory-recall',
      'agent-plan-and-execute',
      'agent-eval-harness',
      'agent-capstone',
    ],
  },
  {
    slug: 'specify-verify-debug',
    title: 'Specify, Verify, Debug',
    summary:
      'The work left when an agent writes the code: turn requests into tests, debug production failures, measure LLM output, and decide what ships.',
    kind: 'project',
    level: 'Intermediate',
    learnRoute: '/docs/ai-evaluation/llm-rag-agent-evaluation',
    note:
      'One system, twelve situations. Helpdesk is a support bot whose code a coding agent wrote, and every stage is something that goes wrong with it, or a decision about it. Each stage stands on its own, and the capstone uses stage 3.',
    problems: [
      'request-to-tests',
      'timezone-refund-window',
      'first-failure-in-logs',
      'idempotent-refunds',
      'stale-rag-cache',
      'retrieval-report',
      'groundedness-check',
      'trust-the-judge',
      'capacity-plan',
      'injection-tool-permissions',
      'canary-decision',
      'incident-review',
    ],
  },
  {
    slug: 'python-for-ai',
    title: 'Python for AI',
    summary: 'The everyday Python behind data and model code: dicts, nesting, text, caches and small parsers.',
    kind: 'set',
    level: 'Beginner',
    learnRoute: '/docs/python-engineering/overview',
    problems: [
      'py-foundations-prob-1', 'py-foundations-prob-8', 'py-foundations-prob-3', 'py-foundations-prob-12',
      'py-foundations-prob-5', 'py-foundations-prob-4', 'py-foundations-prob-17', 'py-foundations-prob-15',
      'py-foundations-prob-24', 'py-foundations-prob-26', 'py-foundations-prob-22', 'py-foundations-prob-23',
      'py-foundations-prob-37', 'py-foundations-prob-27', 'py-foundations-prob-46',
      'py-foundations-prob-49', 'py-foundations-prob-50', 'py-fund-prob-25', 'py-foundations-prob-59',
    ],
  },
  {
    slug: 'numpy-and-data',
    title: 'NumPy & Data Wrangling',
    summary: 'Scaling, encoding, splitting and reshaping data the way training pipelines actually need it.',
    kind: 'set',
    level: 'Beginner',
    learnRoute: '/docs/python-engineering/overview',
    problems: [
      'numpy-pandas-prob-1', 'numpy-pandas-prob-4', 'numpy-pandas-prob-7', 'numpy-pandas-prob-16',
      'numpy-pandas-prob-13', 'numpy-pandas-prob-5', 'numpy-pandas-prob-2', 'numpy-pandas-prob-55',
      'numpy-pandas-prob-52', 'numpy-pandas-prob-20', 'numpy-pandas-prob-36', 'numpy-vec-prob-16',
      'numpy-vec-prob-21', 'pandas-proc-prob-13', 'pandas-proc-prob-17', 'numpy-vec-prob-23',
      'numpy-vec-prob-24', 'numpy-vec-prob-30',
    ],
  },
  {
    slug: 'math-for-ml',
    title: 'Math for ML',
    summary: 'Vectors, matrices, probability and optimisation, each implemented by hand so the formulas stop being abstract.',
    kind: 'set',
    level: 'Beginner',
    learnRoute: '/docs/mathematics-for-ai/linear-algebra',
    problems: [
      'dot-product', 'matrix-multiplication', 'math-num-prob-1', 'math-num-prob-3', 'math-num-prob-8',
      'sample-mean-variance', 'math-num-prob-16', 'math-num-prob-18', 'math-num-prob-19', 'math-num-prob-37',
      'math-num-prob-12', 'math-num-prob-21', 'math-num-prob-38', 'math-num-prob-10', 'math-num-prob-9',
      'math-num-prob-5', 'math-num-prob-26', 'math-num-prob-30',
    ],
  },
  {
    slug: 'classical-ml',
    title: 'Classical ML from Scratch',
    summary: 'Regression, trees, k-means, naive Bayes, SVMs and the metrics that tell you whether any of it worked.',
    kind: 'set',
    level: 'Intermediate',
    learnRoute: '/docs/machine-learning/roadmap',
    problems: [
      'class-ml-prob-1', 'classical-ml-prob-11', 'classical-ml-prob-23', 'classical-ml-prob-25',
      'class-ml-prob-11', 'class-ml-prob-18', 'class-ml-prob-12', 'class-ml-prob-17', 'class-ml-prob-14',
      'class-ml-prob-19', 'classical-ml-prob-28', 'class-ml-prob-16', 'class-ml-prob-15', 'classical-ml-prob-41',
      'classical-ml-prob-39', 'cluster-rec-prob-12', 'class-ml-prob-26', 'class-ml-prob-24', 'class-ml-prob-25',
      'class-ml-prob-23', 'class-ml-prob-30',
    ],
  },
  {
    slug: 'neural-networks',
    title: 'Neural Networks by Hand',
    summary: 'Forward passes, backprop, optimisers, convolutions and recurrent cells, the pieces inside every framework.',
    kind: 'set',
    level: 'Intermediate',
    learnRoute: '/docs/deep-learning/neural-network-fundamentals',
    problems: [
      'dl-nn-prob-1', 'dl-nn-prob-2', 'dl-nn-prob-4', 'dl-nn-prob-10', 'dl-nn-prob-5', 'dl-nn-prob-7',
      'cv-cnn-prob-1', 'cv-cnn-prob-2', 'cv-cnn-prob-7', 'dl-nn-prob-11', 'softmax-gradient', 'dl-nn-prob-9',
      'dl-nn-prob-12', 'dl-nn-prob-8', 'dl-nn-prob-14', 'dl-nn-prob-17', 'convolution-2d', 'cv-cnn-prob-11',
      'cv-cnn-prob-24', 'cv-cnn-prob-26', 'dl-nn-prob-26', 'dl-nn-prob-27', 'cv-cnn-prob-23', 'dl-nn-prob-23',
    ],
  },
  {
    slug: 'llm-internals',
    title: 'Inside an LLM',
    summary: 'Attention, masks, positional encodings, sampling, the KV cache and the tricks that make inference fast.',
    kind: 'set',
    level: 'Intermediate',
    learnRoute: '/docs/deep-learning/attention-transformers',
    problems: [
      'transformer-prob-1', 'llm-internals-prob-3', 'inference-prob-2', 'inference-prob-1', 'inference-prob-4',
      'inference-prob-5', 'llm-internals-prob-29', 'transformer-prob-6', 'rms-normalization',
      'llm-internals-prob-46', 'rotary-positional-embedding', 'transformer-prob-29', 'llm-internals-prob-11',
      'llm-internals-prob-63', 'inference-prob-11', 'inference-prob-15', 'llm-internals-prob-49',
      'llm-internals-prob-43', 'inference-prob-14', 'inference-prob-12', 'inference-prob-21',
      'llm-internals-prob-52',
    ],
  },
  {
    slug: 'rag-and-retrieval',
    title: 'RAG & Retrieval',
    summary: 'Chunking, vector search, hybrid ranking, re-ranking and the checks that catch an ungrounded answer.',
    kind: 'set',
    level: 'Intermediate',
    learnRoute: '/docs/llms-genai/rag',
    problems: [
      'rag-prod-prob-1', 'vec-search-prob-3', 'rag-prod-prob-2', 'vec-search-prob-6', 'vec-search-prob-7',
      'vec-search-prob-10', 'rag-prod-prob-4', 'rag-prod-prob-3', 'rag-prod-prob-19', 'vec-search-prob-9',
      'vec-search-prob-15', 'vec-search-prob-21', 'vec-search-prob-22', 'vec-search-prob-23', 'rag-prod-prob-6',
      'rag-prod-prob-17', 'agentic-rag-prob-2', 'agentic-rag-prob-6', 'graphrag-prob-3', 'rag-prod-prob-25',
      'graphrag-prob-13',
    ],
  },
  {
    slug: 'agents-in-production',
    title: 'Agents in Production',
    summary: 'What surrounds the loop: MCP plumbing, caching, fallbacks, security checks, graphs and observability.',
    kind: 'set',
    level: 'Advanced',
    learnRoute: '/docs/agents/roadmap',
    problems: [
      'mcp-core-prob-8', 'agents-mcp-systems-prob-38', 'mcp-adv-prob-11', 'llm-app-prob-9', 'mcp-core-prob-2',
      'mcp-core-prob-10', 'mcp-core-prob-11', 'mcp-adv-prob-15', 'mcp-adv-prob-6', 'llm-app-prob-12',
      'llm-app-prob-21', 'production-prob-6', 'security-prob-1', 'security-prob-16', 'security-prob-2',
      'agent-graph-prob-3', 'agent-graph-prob-20', 'agent-graph-prob-16', 'security-prob-22', 'eval-obs-prob-9',
      'eval-obs-prob-3', 'eval-obs-prob-18', 'multi-agent-prob-10', 'mcp-core-prob-29',
    ],
  },
  {
    slug: 'ml-systems',
    title: 'ML Systems & MLOps',
    summary: 'Training schedules, drift, rollouts, experiments and the arithmetic of serving models.',
    kind: 'set',
    level: 'Advanced',
    learnRoute: '/docs/mlops/roadmap',
    problems: [
      'mlops-sys-prob-8', 'mlops-sys-prob-13', 'mlops-sys-prob-14', 'mlops-sys-prob-15', 'mlops-sys-prob-12',
      'mlops-sys-prob-1', 'mlops-sys-prob-30', 'mlops-sys-prob-3', 'int8-quantization', 'parallel-sum-reduction',
      'dist-sys-prob-1', 'mlops-sys-prob-22', 'mlops-sys-prob-29', 'mlops-sys-prob-19',
    ],
  },
  {
    slug: 'coding-interview',
    title: 'Coding Interview Patterns',
    summary: 'The classic patterns interviews still test: hashing, two pointers, windows, stacks, trees, graphs and DP.',
    kind: 'set',
    level: 'Intermediate',
    learnRoute: '/docs/interview-prep/dsa-coding',
    problems: [
      'arr-hash-prob-1', 'arr-hash-prob-3', 'arr-hash-prob-6', 'ds-algo-prob-5', 'll-queue-prob-1',
      'll-queue-prob-4', 'tree-bs-prob-4', 'tree-bs-prob-1', 'graph-algo-prob-2', 'ds-algo-prob-9',
      'arr-hash-prob-11', 'arr-hash-prob-18', 'arr-hash-prob-12', 'arr-hash-prob-13', 'arr-hash-prob-17',
      'arr-hash-prob-14', 'arr-hash-prob-19', 'arr-hash-prob-15', 'll-queue-prob-13', 'tree-bs-prob-8',
      'tree-bs-prob-14', 'tree-bs-prob-16', 'tree-bs-prob-18', 'tree-bs-prob-17', 'graph-algo-prob-13',
      'graph-algo-prob-11', 'graph-algo-prob-12', 'graph-algo-prob-15', 'dp-greedy-prob-14', 'dp-greedy-prob-17',
      'dp-greedy-prob-21', 'dp-greedy-prob-18', 'arr-hash-prob-21', 'arr-hash-prob-25', 'arr-hash-prob-26',
      'll-queue-prob-29', 'tree-bs-prob-24', 'arr-hash-prob-24',
    ],
  },
];

/** Old topic labels/keys (from problem frontmatter) -> the new track that
 * absorbed them, so /practice/track/<old-slug> links keep working. */
export const LEGACY_TOPIC_TO_TRACK: Record<string, string> = {
  'Agent Loop Engineering': 'build-an-agent',
  'Agent Planning & Reasoning': 'build-an-agent',
  'python-fundamentals': 'python-for-ai',
  'Python & Programming Fundamentals': 'python-for-ai',
  'numpy-pandas': 'numpy-and-data',
  'NumPy & Vectorized Computation': 'numpy-and-data',
  'Pandas & Data Processing Pipelines': 'numpy-and-data',
  'math-numerical': 'math-for-ml',
  'Mathematics & Numerical Computing': 'math-for-ml',
  'mathematics-for-ai': 'math-for-ml',
  'classical-ml': 'classical-ml',
  'Classical Machine Learning': 'classical-ml',
  'Clustering & Recommender Systems': 'classical-ml',
  'machine-learning': 'classical-ml',
  'reinforcement-learning': 'classical-ml',
  'Deep Learning & Neural Networks': 'neural-networks',
  'deep-learning': 'neural-networks',
  'Computer Vision & CNN Architectures': 'neural-networks',
  'Deep Learning & Vision/NLP': 'neural-networks',
  'computer-vision': 'neural-networks',
  nlp: 'neural-networks',
  'transformers-llms': 'llm-internals',
  'Transformers & LLMs': 'llm-internals',
  'Transformer Internals': 'llm-internals',
  'LLM Inference & Decoding': 'llm-internals',
  'llms-genai': 'llm-internals',
  'RAG Fundamentals': 'rag-and-retrieval',
  'RAG Production Engineering': 'rag-and-retrieval',
  'Advanced RAG & Agentic RAG': 'rag-and-retrieval',
  'Knowledge Graph & GraphRAG': 'rag-and-retrieval',
  'Vector Search & Index Optimization': 'rag-and-retrieval',
  'MCP Core Engineering': 'agents-in-production',
  'MCP Advanced & Agent Integration': 'agents-in-production',
  'Multi-Agent Systems': 'agents-in-production',
  'Agent Memory & Context Engineering': 'agents-in-production',
  'Agent Graph Engineering': 'agents-in-production',
  'Agent Evaluation & Observability': 'agents-in-production',
  'Agent Security & Reliability': 'agents-in-production',
  'Agent Performance & Production': 'agents-in-production',
  'agents,-mcp-systems': 'agents-in-production',
  'LLM Application Engineering': 'agents-in-production',
  agents: 'agents-in-production',
  'MLOps & Data Systems': 'ml-systems',
  mlops: 'ml-systems',
  'ml-system-design': 'ml-systems',
  'Distributed AI Systems': 'ml-systems',
  'Arrays / Hashing / Two Pointers': 'coding-interview',
  'Linked Lists / Stacks / Queues': 'coding-interview',
  'Trees / Binary Search': 'coding-interview',
  'Graphs & Network Algorithms': 'coding-interview',
  'Dynamic Programming & Greedy': 'coding-interview',
  'data-structures-algorithms': 'coding-interview',
  'Advanced Data Structures for AI': 'coding-interview',
  'interview-prep': 'coding-interview',
  'Build an Agent': 'build-an-agent',
  'Specify, Verify, Debug': 'specify-verify-debug',
};

const TRACK_BY_PROBLEM = new Map<string, CatalogTrack>();
for (const track of CATALOG) for (const id of track.problems) TRACK_BY_PROBLEM.set(id, track);

export function trackForProblem(problemId: string): CatalogTrack | undefined {
  return TRACK_BY_PROBLEM.get(problemId);
}

export function isCurated(problemId: string): boolean {
  return TRACK_BY_PROBLEM.has(problemId);
}

export function findCatalogTrack(slug: string): CatalogTrack | undefined {
  return CATALOG.find((t) => t.slug === slug);
}
