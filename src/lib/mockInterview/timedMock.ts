// Timed Mock Interview logic: role profiles, question mix generation, session state, and criteria evaluation.
import practice from '../../data/interviewPractice.json';
import criteriaData from '../../data/interviewCriteria.json';
import { splitAnswer } from '../answerJudge';

export type MockRole = 'applied-ai' | 'agentic' | 'inference' | 'evaluation';
export type MockLength = 30 | 60;
export type MockRound = 'screen' | 'depth' | 'system-design' | 'debugging' | 'behavioral';
export type SelfRating = 'got-it' | 'partly' | 'missed-it';

export interface MockRoleDefinition {
  id: MockRole;
  label: string;
  tagline: string;
  roleTags: string[];
}

export const MOCK_ROLES: Record<MockRole, MockRoleDefinition> = {
  'applied-ai': {
    id: 'applied-ai',
    label: 'Applied AI',
    tagline: 'Fine-tuning, RAG pipelines, prompt engineering, evals, and production systems.',
    roleTags: ['applied-ai-engineer'],
  },
  'agentic': {
    id: 'agentic',
    label: 'Agentic',
    tagline: 'Tool calling, multi-step loops, sandboxing, memory compaction, and orchestration.',
    roleTags: ['agentic-ai-engineer', 'agent-engineer'],
  },
  'inference': {
    id: 'inference',
    label: 'Inference',
    tagline: 'KV caching, continuous batching, quantization, speculative decoding, and GPU serving.',
    roleTags: ['inference-engineer', 'inference-platform-engineer'],
  },
  'evaluation': {
    id: 'evaluation',
    label: 'Evaluation',
    tagline: 'Offline benchmarking, safety red-teaming, regression harnesses, and quality metrics.',
    roleTags: ['ai-evaluation-reliability-engineer', 'data-scientist-evals'],
  },
};

export const ROUND_LABELS: Record<MockRound, string> = {
  screen: 'Phone Screen',
  depth: 'Technical Depth',
  'system-design': 'System Design',
  debugging: 'Production Debugging',
  behavioral: 'Engineering Behavioral',
};

// Target minutes per question by round
export const ROUND_TARGET_SECONDS: Record<MockRound, number> = {
  screen: 4 * 60,         // 4 minutes
  depth: 6 * 60,          // 6 minutes
  'system-design': 7 * 60,// 7 minutes
  debugging: 6 * 60,      // 6 minutes
  behavioral: 5 * 60,     // 5 minutes
};

export interface MockQuestionPlan {
  id: string;
  title: string;
  answer: string;
  round: MockRound;
  roundLabel: string;
  softLimitSeconds: number;
  criteria: string[];
  topicId?: string;
  topicTitle?: string;
}

export interface QuestionAnswerRecord {
  questionId: string;
  transcript: string;
  seconds: number;
  selfRating?: SelfRating;
  evaluatedCriteria?: Array<{
    point: string;
    covered: boolean;
    evidence?: string;
  }>;
}

export interface ActiveMockSession {
  id: string;
  role: MockRole;
  roleLabel: string;
  targetMinutes: MockLength;
  startedAt: number;
  totalElapsedSeconds: number;
  currentQuestionIndex: number;
  isPaused: boolean;
  questions: MockQuestionPlan[];
  answers: QuestionAnswerRecord[];
  completedAt?: number;
}

export const ACTIVE_SESSION_STORAGE_KEY = 'nm-timed-mock-active-session';
export const RECENT_QUESTIONS_KEY = 'nm-timed-mock-recent-ids';
export const SESSION_HISTORY_KEY = 'nm-timed-mock-session-history';

interface RawQuestion {
  id: string;
  title: string;
  answer: string;
  roles?: string[];
  rounds?: string[];
  level?: string;
}

interface RawTopic {
  id: string;
  title: string;
  questions: RawQuestion[];
}

export function getAllQuestions(): Array<RawQuestion & { topicId: string; topicTitle: string }> {
  const result: Array<RawQuestion & { topicId: string; topicTitle: string }> = [];
  const topics = (practice.topics || []) as RawTopic[];
  for (const topic of topics) {
    for (const q of topic.questions) {
      result.push({
        ...q,
        topicId: topic.id,
        topicTitle: topic.title,
      });
    }
  }
  return result;
}

export function getQuestionCriteria(questionId: string, answer: string): string[] {
  const allCriteria = criteriaData as Record<string, { criteria?: string[] } | undefined>;
  const explicit = allCriteria[questionId]?.criteria;
  if (Array.isArray(explicit) && explicit.length > 0) {
    return explicit;
  }
  // Derive 2-4 clean points from answer sentences if no manual criteria
  const sentences = splitAnswer(answer);
  if (sentences.length <= 4) {
    return sentences;
  }
  return sentences.slice(0, 4);
}

export function isRoundMatch(q: RawQuestion, round: MockRound): boolean {
  const rounds = q.rounds || [];
  switch (round) {
    case 'screen':
      return rounds.includes('screen');
    case 'depth':
      return rounds.some(r => r === 'ml-depth' || r === 'depth');
    case 'system-design':
      return rounds.some(r => r === 'system-design' || r === 'systems-design' || r === 'design-review');
    case 'debugging':
      return rounds.includes('debugging');
    case 'behavioral':
      return rounds.includes('behavioral');
    default:
      return false;
  }
}

export function isRoleMatch(q: RawQuestion, roleDef: MockRoleDefinition): boolean {
  const roles = q.roles || [];
  return roles.some(r => roleDef.roleTags.includes(r));
}

function shuffleArray<T>(array: T[], rng = Math.random): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface BuildMockPlanOptions {
  recentQuestionIds?: string[];
  rng?: () => number;
}

/**
 * Builds a realistic mix of questions for the chosen role and length.
 * 30 min: 1 screen, 1 depth, 1 system-design, 1 debugging, 1 behavioral (5 total)
 * 60 min: 2 screen, 2 depth, 2 system-design, 2 debugging, 2 behavioral (10 total)
 */
export function buildTimedMockPlan(
  role: MockRole,
  lengthMinutes: MockLength,
  options: BuildMockPlanOptions = {}
): MockQuestionPlan[] {
  const roleDef = MOCK_ROLES[role] || MOCK_ROLES['applied-ai'];
  const all = getAllQuestions();
  const recentSet = new Set(options.recentQuestionIds || []);
  const rng = options.rng || Math.random;

  const countPerRound = lengthMinutes === 60 ? 2 : 1;
  const roundOrder: MockRound[] = ['screen', 'depth', 'system-design', 'debugging', 'behavioral'];
  const roundsToPick: MockRound[] = [];
  for (let cycle = 0; cycle < countPerRound; cycle++) {
    for (const r of roundOrder) {
      roundsToPick.push(r);
    }
  }

  const selectedQuestions: MockQuestionPlan[] = [];
  const pickedIds = new Set<string>();

  for (const round of roundsToPick) {
    // 1. Role match + round match
    const roleAndRoundPool = all.filter(
      q => isRoleMatch(q, roleDef) && isRoundMatch(q, round) && !pickedIds.has(q.id)
    );

    // 2. Fallback pool: any question matching round (e.g. behavioral questions shared across roles)
    const fallbackRoundPool = all.filter(
      q => isRoundMatch(q, round) && !pickedIds.has(q.id)
    );

    const primaryPool = roleAndRoundPool.length > 0 ? roleAndRoundPool : fallbackRoundPool;

    // Prioritize questions not recently seen
    const unseen = primaryPool.filter(q => !recentSet.has(q.id));
    const pool = unseen.length > 0 ? unseen : primaryPool;

    if (pool.length === 0) {
      // Extreme fallback: any question not yet picked
      const anyRemaining = all.filter(q => !pickedIds.has(q.id));
      const fallbackQ = shuffleArray(anyRemaining, rng)[0];
      if (fallbackQ) {
        pickedIds.add(fallbackQ.id);
        selectedQuestions.push({
          id: fallbackQ.id,
          title: fallbackQ.title,
          answer: fallbackQ.answer,
          round,
          roundLabel: ROUND_LABELS[round],
          softLimitSeconds: ROUND_TARGET_SECONDS[round],
          criteria: getQuestionCriteria(fallbackQ.id, fallbackQ.answer),
          topicId: fallbackQ.topicId,
          topicTitle: fallbackQ.topicTitle,
        });
      }
      continue;
    }

    const chosen = shuffleArray(pool, rng)[0];
    pickedIds.add(chosen.id);
    selectedQuestions.push({
      id: chosen.id,
      title: chosen.title,
      answer: chosen.answer,
      round,
      roundLabel: ROUND_LABELS[round],
      softLimitSeconds: ROUND_TARGET_SECONDS[round],
      criteria: getQuestionCriteria(chosen.id, chosen.answer),
      topicId: chosen.topicId,
      topicTitle: chosen.topicTitle,
    });
  }

  return selectedQuestions;
}

export function readRecentQuestionIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_QUESTIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordRecentQuestionIds(questionIds: string[]): void {
  try {
    const existing = readRecentQuestionIds();
    const updated = Array.from(new Set([...questionIds, ...existing])).slice(0, 50);
    localStorage.setItem(RECENT_QUESTIONS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota
  }
}

export function readActiveSession(): ActiveMockSession | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as ActiveMockSession;
    if (session && Array.isArray(session.questions) && session.questions.length > 0) {
      return session;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveActiveSession(session: ActiveMockSession): void {
  try {
    localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage fail safe
  }
}

export function clearActiveSession(): void {
  try {
    localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export function readSessionHistory(): ActiveMockSession[] {
  try {
    const raw = localStorage.getItem(SESSION_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCompletedSession(session: ActiveMockSession): void {
  try {
    const history = readSessionHistory();
    const updated = [session, ...history].slice(0, 20);
    localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // Ignore
  }
}

/**
 * Checks a transcript against a list of key points / criteria.
 * Returns checklist items with 'covered' true/false and matched evidence snippet.
 */
export function evaluateCriteriaChecklist(
  transcript: string,
  criteria: string[]
): Array<{ point: string; covered: boolean; evidence?: string }> {
  const cleanTranscript = (transcript || '').toLowerCase().trim();
  if (!cleanTranscript) {
    return criteria.map(point => ({ point, covered: false }));
  }

  return criteria.map(point => {
    // Extract keywords from point (ignore common stop words)
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'to', 'in', 'of', 'for', 'with', 'on', 'at', 'from', 'by',
      'that', 'this', 'is', 'are', 'was', 'were', 'be', 'been', 'has', 'have', 'had',
      'explains', 'names', 'states', 'identifies', 'describes', 'mentions', 'covers', 'gives', 'contrasts'
    ]);
    const words = point.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 3 && !stopWords.has(w));

    if (words.length === 0) {
      return { point, covered: false };
    }

    // Check how many keywords appear in transcript
    const matches = words.filter(word => cleanTranscript.includes(word));
    const coverageRatio = matches.length / words.length;

    // Direct phrase match or threshold match
    const phraseMatch = cleanTranscript.includes(point.toLowerCase().slice(0, 25));
    const isCovered = phraseMatch || coverageRatio >= 0.4 || (words.length >= 2 && matches.length >= 2);

    let evidence: string | undefined;
    if (isCovered && matches.length > 0) {
      // Find the sentence or window in transcript where the match occurs
      const sentences = cleanTranscript.split(/[.!?]+/);
      const matchedSentence = sentences.find(s => matches.some(m => s.includes(m)));
      if (matchedSentence) {
        evidence = matchedSentence.trim();
      }
    }

    return {
      point,
      covered: isCovered,
      evidence,
    };
  });
}

export function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function formatDurationHuman(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}
