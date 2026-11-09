import type { PointResult } from './answerJudge';

export const ATTEMPTS_KEY = 'nm-interview-attempts-v1';
export const MAX_ATTEMPTS = 100;
export const MAX_ATTEMPTS_PER_QUESTION = 10;
export const MAX_ATTEMPT_BYTES = 200_000;
export interface InterviewAttempt {
  id: string;
  questionId: string;
  time: number;
  transcript: string;
  points: PointResult[];
  source: 'rubric' | 'reference';
  status: 'unchecked' | 'checked' | 'failed';
  score?: number;
  revision?: number;
}
export const attemptsKey = (uid?: string) => `${ATTEMPTS_KEY}:${uid ?? 'guest'}`;
const byteSize = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).length;

function normalize(value: unknown): InterviewAttempt | null {
  if (!value || typeof value !== 'object') return null;
  const a = value as InterviewAttempt;
  if (typeof a.id !== 'string' || !a.id || a.id.length > 100 || typeof a.questionId !== 'string' || a.questionId.length > 200
    || !Number.isSafeInteger(a.time) || a.time < 0 || a.time > 8_640_000_000_000_000 || typeof a.transcript !== 'string'
    || !['rubric', 'reference'].includes(a.source) || !['unchecked', 'checked', 'failed'].includes(a.status) || !Array.isArray(a.points)) return null;
  const points = a.points.slice(0, 6).filter(p => p && typeof p.point === 'string' && ['covered', 'partial', 'conflict', 'missed'].includes(p.verdict))
    .map(p => ({ point: p.point.slice(0, 200), verdict: p.verdict, confidence: Number.isFinite(p.confidence) ? Math.max(0, Math.min(100, p.confidence)) : 0 }));
  return { id: a.id, questionId: a.questionId, time: a.time, ...(a.revision !== undefined ? { revision: Math.max(0, Math.min(2, Math.trunc(a.revision) || 0)) } : {}), transcript: a.transcript.slice(0, 4000), points, source: a.source, status: a.status,
    ...(Number.isFinite(a.score) && a.score! >= 0 && a.score! <= 100 && a.source === 'reference' ? { score: a.score } : {}) };
}

/** Stable, commutative merge by immutable attempt ID. A completed review wins over
 * its unchecked draft; deterministic ties make listener echoes harmless. */
export function mergeInterviewAttempts(...lists: unknown[]): InterviewAttempt[] {
  const byId = new Map<string, InterviewAttempt>();
  const rank = (a: InterviewAttempt) => `${a.revision ?? (a.status === 'checked' || a.status === 'failed' ? 2 : 1)}:${a.status === 'checked' ? 2 : a.status === 'failed' ? 1 : 0}:${JSON.stringify(a)}`;
  for (const list of lists) if (Array.isArray(list)) for (const value of list) {
    const a = normalize(value);
    if (a && (!byId.has(a.id) || rank(a) > rank(byId.get(a.id)!))) byId.set(a.id, a);
  }
  const counts = new Map<string, number>();
  const result = [...byId.values()].sort((a, b) => b.time - a.time || b.id.localeCompare(a.id)).filter(a => {
    const count = counts.get(a.questionId) ?? 0;
    counts.set(a.questionId, count + 1);
    return count < MAX_ATTEMPTS_PER_QUESTION;
  }).slice(0, MAX_ATTEMPTS);
  while (byteSize(result) > MAX_ATTEMPT_BYTES) result.pop();
  return result.reverse();
}
export function readInterviewAttempts(uid?: string, storage: Storage = localStorage): InterviewAttempt[] {
  try { return mergeInterviewAttempts(JSON.parse(storage.getItem(attemptsKey(uid)) ?? '[]')); } catch { return []; }
}
export function compareAttempts(previous: InterviewAttempt, current: InterviewAttempt) {
  const before = new Set(previous.points.filter(p => p.verdict === 'covered').map(p => p.point));
  const after = new Set(current.points.filter(p => p.verdict === 'covered').map(p => p.point));
  const comparable = previous.status === 'checked' && current.status === 'checked' && previous.source === current.source
    && previous.points.map(p => p.point).join('\n') === current.points.map(p => p.point).join('\n');
  return { comparable, gained: [...after].filter(p => !before.has(p)) };
}
