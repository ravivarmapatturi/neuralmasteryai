export type RoleId = 'ai-engineer' | 'ml-engineer' | 'inference-infra' | 'safety-eval';

export interface SkillModule {
  id: string;
  label: string;
  hours: number;
  prereqs: string[];
  learnPath: string;
  learnTitle: string;
}

export interface RoleSpec {
  id: RoleId;
  label: string;
  summary: string;
  targetModules: string[];
}

export const SKILL_MODULES: SkillModule[] = [
  {
    id: 'cs',
    label: 'CS & Systems',
    hours: 6,
    prereqs: [],
    learnPath: '/docs/cs-fundamentals/networking-and-distributed-systems',
    learnTitle: 'Networking & Distributed Systems',
  },
  {
    id: 'python',
    label: 'Python Engineering',
    hours: 5,
    prereqs: [],
    learnPath: '/docs/python-engineering/concurrency-memory-and-performance',
    learnTitle: 'Concurrency, Memory & Performance',
  },
  {
    id: 'math',
    label: 'Math for AI',
    hours: 7,
    prereqs: [],
    learnPath: '/docs/mathematics-for-ai/linear-algebra',
    learnTitle: 'Linear Algebra for AI',
  },
  {
    id: 'ml',
    label: 'Classical ML',
    hours: 8,
    prereqs: ['math', 'python'],
    learnPath: '/docs/machine-learning/ml-workflow-fundamentals',
    learnTitle: 'ML Workflow Fundamentals',
  },
  {
    id: 'dl',
    label: 'Deep Learning',
    hours: 10,
    prereqs: ['math', 'python'],
    learnPath: '/docs/deep-learning/attention-transformers',
    learnTitle: 'Attention and Transformers',
  },
  {
    id: 'llm-rag',
    label: 'LLMs, APIs & RAG',
    hours: 9,
    prereqs: ['dl', 'python'],
    learnPath: '/docs/llms-genai/rag',
    learnTitle: 'Retrieval-Augmented Generation (RAG)',
  },
  {
    id: 'agents',
    label: 'Agents & Harnesses',
    hours: 8,
    prereqs: ['llm-rag', 'cs'],
    learnPath: '/docs/agents/agent-architectures',
    learnTitle: 'Agent Architectures',
  },
  {
    id: 'serving',
    label: 'Inference & MLOps',
    hours: 9,
    prereqs: ['dl', 'cs'],
    learnPath: '/docs/inference-engineering/roofline-and-kv-cache',
    learnTitle: 'The Roofline Model & KV Cache Mechanics',
  },
  {
    id: 'eval-safety',
    label: 'Eval & AI Safety',
    hours: 7,
    prereqs: ['llm-rag', 'ml'],
    learnPath: '/docs/ai-evaluation/llm-rag-agent-evaluation',
    learnTitle: 'LLM, RAG & Agent Evaluation',
  },
];

export const ROLES: RoleSpec[] = [
  {
    id: 'ai-engineer',
    label: 'AI Engineer (RAG & Agents)',
    summary: 'Focuses on production retrieval, tool-using agents, context budgets, and automated evaluation harnesses.',
    targetModules: ['agents', 'eval-safety'],
  },
  {
    id: 'ml-engineer',
    label: 'ML Engineer (Core Modeling)',
    summary: 'Focuses on tabular features, loss diagnostics, transformers, and rigorous offline-to-online validation.',
    targetModules: ['ml', 'dl', 'eval-safety'],
  },
  {
    id: 'inference-infra',
    label: 'Inference & Serving Engineer',
    summary: 'Focuses on roofline bounds, paged KV caches, continuous batching, quantization, and cost efficiency.',
    targetModules: ['serving', 'llm-rag'],
  },
  {
    id: 'safety-eval',
    label: 'Evaluation & Safety Engineer',
    summary: 'Focuses on judge calibration, prompt injection defenses, reward-hacking limits, and staged rollouts.',
    targetModules: ['eval-safety', 'agents'],
  },
];

export interface PrunedPathNode {
  module: SkillModule;
  status: 'known' | 'ready' | 'queued';
  inTargetClosure: boolean;
}

export interface PrunedPathPlan {
  role: RoleSpec;
  nodes: PrunedPathNode[];
  remainingModules: SkillModule[];
  totalHoursForRole: number;
  remainingHours: number;
  savedHours: number;
  estimatedWeeks: number;
}

/**
 * Computes the transitive prerequisite closure for a target role, then
 * marks known modules as satisfied and determines which remaining modules
 * are immediately ready to study next.
 */
export function buildPrunedSkillPath(
  roleId: RoleId,
  knownIds: ReadonlySet<string>,
  weeklyHours: number,
): PrunedPathPlan {
  const role = ROLES.find((r) => r.id === roleId) ?? ROLES[0];
  const byId = new Map(SKILL_MODULES.map((m) => [m.id, m]));

  const required = new Set<string>();
  const visit = (id: string) => {
    if (required.has(id)) return;
    const mod = byId.get(id);
    if (!mod) return;
    required.add(id);
    for (const p of mod.prereqs) visit(p);
  };
  for (const target of role.targetModules) visit(target);

  // Preserve topological declaration order from SKILL_MODULES
  const orderedRequired = SKILL_MODULES.filter((m) => required.has(m.id));
  const totalHoursForRole = orderedRequired.reduce((sum, m) => sum + m.hours, 0);

  const nodes: PrunedPathNode[] = orderedRequired.map((mod) => {
    if (knownIds.has(mod.id)) {
      return { module: mod, status: 'known', inTargetClosure: true };
    }
    const prereqsMet = mod.prereqs.every((p) => knownIds.has(p));
    return {
      module: mod,
      status: prereqsMet ? 'ready' : 'queued',
      inTargetClosure: true,
    };
  });

  const remainingModules = nodes.filter((n) => n.status !== 'known').map((n) => n.module);
  const remainingHours = remainingModules.reduce((sum, m) => sum + m.hours, 0);
  const savedHours = totalHoursForRole - remainingHours;
  const safeHoursPerWeek = Math.max(1, weeklyHours);
  const estimatedWeeks = remainingHours === 0 ? 0 : Math.ceil(remainingHours / safeHoursPerWeek);

  return {
    role,
    nodes,
    remainingModules,
    totalHoursForRole,
    remainingHours,
    savedHours,
    estimatedWeeks,
  };
}
