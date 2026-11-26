export type OrchestrationMode = 'router' | 'supervisor';

export type TopicId = 'weather' | 'advice' | 'billing' | 'technical';

export interface SpecialistSpec {
  id: TopicId;
  name: string;
  shortName: string;
  role: string;
  keywords: readonly { term: string; weight: number }[];
  sampleReply: string;
}

export const SPECIALISTS: readonly SpecialistSpec[] = [
  {
    id: 'weather',
    name: 'Weather agent',
    shortName: 'Weather',
    role: 'Checks forecast & rain',
    keywords: [
      { term: 'weather', weight: 1.0 },
      { term: 'rain', weight: 0.9 },
      { term: 'forecast', weight: 0.9 },
      { term: 'temperature', weight: 0.8 },
      { term: 'paris', weight: 0.6 },
      { term: 'tokyo', weight: 0.6 },
      { term: 'tomorrow', weight: 0.5 },
      { term: 'cold', weight: 0.7 },
      { term: 'warm', weight: 0.6 },
      { term: 'snow', weight: 0.8 },
    ],
    sampleReply: '14°C, light afternoon rain expected.',
  },
  {
    id: 'advice',
    name: 'Advice agent',
    shortName: 'Advice',
    role: 'Recommends what to pack',
    keywords: [
      { term: 'pack', weight: 0.9 },
      { term: 'coat', weight: 0.9 },
      { term: 'jacket', weight: 0.85 },
      { term: 'umbrella', weight: 0.85 },
      { term: 'wear', weight: 0.8 },
      { term: 'bring', weight: 0.55 },
      { term: 'clothes', weight: 0.7 },
    ],
    sampleReply: 'Yes — pack a light waterproof coat.',
  },
  {
    id: 'billing',
    name: 'Billing agent',
    shortName: 'Billing',
    role: 'Handles charges & refunds',
    keywords: [
      { term: 'charged', weight: 1.0 },
      { term: 'charge', weight: 1.0 },
      { term: 'invoice', weight: 1.0 },
      { term: 'refund', weight: 1.0 },
      { term: 'billing', weight: 1.0 },
      { term: 'payment', weight: 0.9 },
      { term: 'card', weight: 0.75 },
      { term: 'subscription', weight: 0.8 },
      { term: 'twice', weight: 0.45 },
    ],
    sampleReply: 'Duplicate $49 charge found and refunded.',
  },
  {
    id: 'technical',
    name: 'Tech agent',
    shortName: 'Tech',
    role: 'Debugs crashes & bugs',
    keywords: [
      { term: 'crash', weight: 1.0 },
      { term: 'crashes', weight: 1.0 },
      { term: 'error', weight: 0.95 },
      { term: 'bug', weight: 0.95 },
      { term: 'export', weight: 0.75 },
      { term: 'login', weight: 0.8 },
      { term: 'broken', weight: 0.85 },
      { term: 'blank', weight: 0.75 },
      { term: 'sync', weight: 0.8 },
      { term: 'button', weight: 0.55 },
    ],
    sampleReply: 'Export crash traced to v2.4.0; patch 2.4.1 ready.',
  },
];

export interface RequestPreset {
  id: string;
  label: string;
  text: string;
}

export const REQUEST_PRESETS: readonly RequestPreset[] = [
  {
    id: 'paris-coat',
    label: 'Paris weather + coat (2 parts)',
    text: 'What is the weather in Paris tomorrow, and should I pack a coat?',
  },
  {
    id: 'billing-crash',
    label: 'Charged + export crash (2 parts)',
    text: 'I was charged twice, and now the export button crashes',
  },
  {
    id: 'tokyo-weather',
    label: 'Single weather question (1 part)',
    text: 'What is the weather forecast in Tokyo tomorrow?',
  },
  {
    id: 'off-topic',
    label: 'Unknown topic (hits fallback)',
    text: 'Can you help me organize my desk drawer?',
  },
];

export interface TopicScore {
  id: TopicId;
  name: string;
  shortName: string;
  score: number;
  matchedTerms: string[];
  needed: boolean;
}

export interface TraceStep {
  actor: 'User' | 'Router' | 'Supervisor' | 'Fallback' | TopicId | 'Answer';
  actorLabel: string;
  kind: 'input' | 'decide' | 'worker' | 'finish' | 'miss';
  activeTarget?: TopicId | 'fallback' | 'finish';
  answeredSoFar: TopicId[];
  missedAfterFinish: TopicId[];
  detail: string;
}

export interface RouterSupervisorAnalysis {
  mode: OrchestrationMode;
  requestText: string;
  threshold: number;
  topicScores: TopicScore[];
  neededTopics: TopicId[];
  topTopic: TopicScore;
  fallbackTriggered: boolean;
  answeredTopics: TopicId[];
  missedTopics: TopicId[];
  coveragePct: number;
  decisionCalls: number;
  specialistCalls: number;
  totalModelSteps: number;
  trace: TraceStep[];
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function tokenizeRequest(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Deterministic keyword-similarity scorer mirroring a lightweight embedding/rule router.
 * Single clear match yields ~0.45-0.85; two clear matches yield two needed specialists;
 * unrelated text stays near 0 so confidence gating triggers Fallback.
 */
export function scoreRequestTopics(requestText: string, threshold = 0.25): TopicScore[] {
  const words = new Set(tokenizeRequest(requestText));
  const cleanThresh = clamp(Number.isFinite(threshold) ? threshold : 0.25, 0.05, 0.95);

  const scored = SPECIALISTS.map((spec) => {
    const matchedTerms: string[] = [];
    let rawWeight = 0;
    for (const kw of spec.keywords) {
      if (words.has(kw.term)) {
        matchedTerms.push(kw.term);
        rawWeight += kw.weight;
      }
    }
    // Saturating transform: 1 strong keyword (~1.0) -> 0.50; 2 keywords (~1.9) -> 0.72; 3+ -> 0.86+
    const score = Number((1 - Math.exp(-0.7 * rawWeight)).toFixed(2));
    return {
      id: spec.id,
      name: spec.name,
      shortName: spec.shortName,
      score,
      matchedTerms,
      needed: score >= cleanThresh,
    };
  });

  // Keep deterministic tie-break ordering by score desc, then SPECIALISTS order
  return scored.sort((a, b) => b.score - a.score);
}

export function analyzeRouterVsSupervisor({
  mode,
  requestText,
  threshold = 0.25,
}: {
  mode: OrchestrationMode;
  requestText: string;
  threshold?: number;
}): RouterSupervisorAnalysis {
  const cleanMode: OrchestrationMode = mode === 'supervisor' ? 'supervisor' : 'router';
  const cleanText = requestText.trim() || REQUEST_PRESETS[0].text;
  const cleanThreshold = Math.round(clamp(Number.isFinite(threshold) ? threshold : 0.25, 0.05, 0.95) * 100) / 100;

  const topicScores = scoreRequestTopics(cleanText, cleanThreshold);
  const topTopic = topicScores[0];
  const neededTopics = topicScores.filter((s) => s.needed).map((s) => s.id);
  const fallbackTriggered = topTopic.score < cleanThreshold;

  const specById = (id: TopicId) => SPECIALISTS.find((s) => s.id === id)!;

  if (cleanMode === 'router') {
    const trace: TraceStep[] = [];
    const answeredTopics: TopicId[] = fallbackTriggered ? [] : [topTopic.id];
    const missedTopics = neededTopics.filter((id) => !answeredTopics.includes(id));

    trace.push({
      actor: 'Router',
      actorLabel: '1. Router classifies once',
      kind: 'decide',
      activeTarget: fallbackTriggered ? 'fallback' : topTopic.id,
      answeredSoFar: [],
      missedAfterFinish: [],
      detail: fallbackTriggered
        ? `Top score is ${topTopic.score.toFixed(2)} (< threshold ${cleanThreshold.toFixed(2)}), so Router sends the request to Fallback instead of guessing.`
        : `Router picks single top match: ${topTopic.name} (score ${topTopic.score.toFixed(2)} >= ${cleanThreshold.toFixed(2)}). This one-shot choice is final.`,
    });

    if (fallbackTriggered) {
      trace.push({
        actor: 'Fallback',
        actorLabel: '2. General fallback runs',
        kind: 'worker',
        activeTarget: 'fallback',
        answeredSoFar: [],
        missedAfterFinish: [],
        detail: `No specialist cleared threshold ${cleanThreshold.toFixed(2)}. A general assistant or human handles the request safely.`,
      });
      trace.push({
        actor: 'Answer',
        actorLabel: '3. Exits cleanly (fallback)',
        kind: 'finish',
        activeTarget: 'finish',
        answeredSoFar: [],
        missedAfterFinish: [],
        detail: 'Confidence gate prevented misrouting. 1 classification check + 1 fallback reply; no specialist loop.',
      });
    } else {
      const chosen = specById(topTopic.id);
      trace.push({
        actor: chosen.id,
        actorLabel: `2. ${chosen.name} runs`,
        kind: 'worker',
        activeTarget: chosen.id,
        answeredSoFar: [chosen.id],
        missedAfterFinish: [],
        detail: `${chosen.name} replies: "${chosen.sampleReply}" Control goes straight to output — Router has already exited.`,
      });
      const missedNames = missedTopics.map((id) => specById(id).shortName).join(', ');
      trace.push({
        actor: 'Answer',
        actorLabel: missedTopics.length > 0 ? '3. Done (missed parts!)' : '3. Done (fast 1-hop)',
        kind: missedTopics.length > 0 ? 'miss' : 'finish',
        activeTarget: 'finish',
        answeredSoFar: [chosen.id],
        missedAfterFinish: missedTopics,
        detail:
          missedTopics.length > 0
            ? `Router stopped after ${chosen.shortName}. Because nothing inspected the reply, ${missedNames} (${missedTopics.length} part${missedTopics.length > 1 ? 's' : ''}) went unanswered.`
            : `Single-topic request answered in 1 classification + 1 specialist call — faster and cheaper than running a supervisor loop.`,
      });
    }

    const coveragePct =
      neededTopics.length === 0
        ? 100
        : Math.round((answeredTopics.length / neededTopics.length) * 100);

    return {
      mode: cleanMode,
      requestText: cleanText,
      threshold: cleanThreshold,
      topicScores,
      neededTopics,
      topTopic,
      fallbackTriggered,
      answeredTopics,
      missedTopics,
      coveragePct,
      decisionCalls: 1,
      specialistCalls: 1,
      totalModelSteps: 2,
      trace,
    };
  }

  // Supervisor mode: loops back to Supervisor after EVERY worker result until all needed topics are covered.
  const trace: TraceStep[] = [];
  const answeredTopics: TopicId[] = [];

  if (fallbackTriggered) {
    trace.push({
      actor: 'Supervisor',
      actorLabel: '1. Supervisor inspects request',
      kind: 'decide',
      activeTarget: 'fallback',
      answeredSoFar: [],
      missedAfterFinish: [],
      detail: `No specialist clears threshold ${cleanThreshold.toFixed(2)} (top score ${topTopic.score.toFixed(2)}). Supervisor picks Fallback directly.`,
    });
    trace.push({
      actor: 'Fallback',
      actorLabel: '2. General fallback runs',
      kind: 'worker',
      activeTarget: 'fallback',
      answeredSoFar: [],
      missedAfterFinish: [],
      detail: 'Fallback handles the uncategorized request and returns control to Supervisor.',
    });
    trace.push({
      actor: 'Supervisor',
      actorLabel: '3. Supervisor verifies & finishes',
      kind: 'finish',
      activeTarget: 'finish',
      answeredSoFar: [],
      missedAfterFinish: [],
      detail: 'Supervisor sees the fallback answer satisfies the request and stops (2 decision calls + 1 worker).',
    });

    return {
      mode: cleanMode,
      requestText: cleanText,
      threshold: cleanThreshold,
      topicScores,
      neededTopics,
      topTopic,
      fallbackTriggered: true,
      answeredTopics: [],
      missedTopics: [],
      coveragePct: 100,
      decisionCalls: 2,
      specialistCalls: 1,
      totalModelSteps: 3,
      trace,
    };
  }

  for (let i = 0; i < neededTopics.length; i++) {
    const id = neededTopics[i];
    const spec = specById(id);
    const sc = topicScores.find((s) => s.id === id)!;
    const stepNum = trace.length + 1;
    trace.push({
      actor: 'Supervisor',
      actorLabel:
        i === 0
          ? `${stepNum}. Supervisor picks ${spec.shortName}`
          : `${stepNum}. Supervisor spots gap → ${spec.shortName}`,
      kind: 'decide',
      activeTarget: id,
      answeredSoFar: [...answeredTopics],
      missedAfterFinish: [],
      detail:
        i === 0
          ? `Supervisor reads the full request, finds ${neededTopics.length} topic(s), and calls ${spec.name} as a tool (score ${sc.score.toFixed(2)}).`
          : `Control returned to Supervisor! It sees "${neededTopics.slice(i).map((m) => specById(m).shortName).join(', ')}" still needs answering and calls ${spec.name}.`,
    });

    answeredTopics.push(id);
    trace.push({
      actor: id,
      actorLabel: `${trace.length + 1}. ${spec.name} replies`,
      kind: 'worker',
      activeTarget: id,
      answeredSoFar: [...answeredTopics],
      missedAfterFinish: [],
      detail: `${spec.name} returns "${spec.sampleReply}" back to Supervisor (not straight to the user).`,
    });
  }

  trace.push({
    actor: 'Supervisor',
    actorLabel: `${trace.length + 1}. Supervisor combines & finishes`,
    kind: 'finish',
    activeTarget: 'finish',
    answeredSoFar: [...answeredTopics],
    missedAfterFinish: [],
    detail: `All ${neededTopics.length} topic(s) answered! Supervisor combines the findings into one reply after ${neededTopics.length + 1} decision calls.`,
  });

  const decisionCalls = neededTopics.length + 1;
  const specialistCalls = neededTopics.length;

  return {
    mode: cleanMode,
    requestText: cleanText,
    threshold: cleanThreshold,
    topicScores,
    neededTopics,
    topTopic,
    fallbackTriggered: false,
    answeredTopics,
    missedTopics: [],
    coveragePct: 100,
    decisionCalls,
    specialistCalls,
    totalModelSteps: decisionCalls + specialistCalls,
    trace,
  };
}
