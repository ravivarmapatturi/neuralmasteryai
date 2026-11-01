// Free, on-device mock interview evaluation. Pure functions only: the
// embedding model is passed in, so all of this is unit-testable without it.
import { ANSWER_MOVES, movesUsed } from '../../components/interview/AnswerShape';

export type Coverage = 'covered' | 'partial' | 'missed';
export interface CriterionResult { criterion: string; coverage: Coverage; similarity: number; evidence?: string }
export interface Delivery { words: number; seconds: number; wpm: number; fillers: Record<string, number>; fillerCount: number; lengthVerdict: 'too short' | 'good' | 'too long' }
export interface AnswerReport {
  questionId: string; title: string; transcript: string;
  criteria: CriterionResult[]; moves: { label: string; used: boolean }[];
  delivery: Delivery; contentScore: number; structureScore: number; overall: number;
  improvements: string[]; sourceRoute?: string;
}

// all-MiniLM-L6-v2 cosine similarity bands. Calibrated on a small hand-checked
// set; they are estimates, so the report says "likely covered", not "correct".
export const COVERED_AT = 0.5;
export const PARTIAL_AT = 0.35;

const FILLERS = ['um', 'uh', 'erm', 'like', 'you know', 'basically', 'actually', 'kind of', 'sort of', 'i mean'];

export function splitSentences(text: string): string[] {
  const parts = text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+|,\s+(?:and|but|so|then)\s+/i).map(s => s.trim()).filter(s => s.split(' ').length >= 3);
  // Speech transcripts often lack punctuation: fall back to ~20-word windows.
  if (parts.length <= 1) {
    const w = text.trim().split(/\s+/).filter(Boolean);
    const out: string[] = [];
    for (let i = 0; i < w.length; i += 15) out.push(w.slice(i, i + 20).join(' '));
    return out.length ? out : [text.trim()];
  }
  return parts;
}

export function cosine(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export function deliveryMetrics(transcript: string, seconds: number): Delivery {
  const lower = ` ${transcript.toLowerCase().replace(/[^a-z' ]/g, ' ')} `;
  const words = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
  const fillers: Record<string, number> = {};
  for (const f of FILLERS) {
    const n = lower.split(` ${f} `).length - 1;
    if (n) fillers[f] = n;
  }
  const fillerCount = Object.values(fillers).reduce((a, b) => a + b, 0);
  const wpm = seconds > 0 ? Math.round((words / seconds) * 60) : 0;
  const lengthVerdict = seconds < 45 || words < 60 ? 'too short' : seconds > 240 ? 'too long' : 'good';
  return { words, seconds: Math.round(seconds), wpm, fillers, fillerCount, lengthVerdict };
}

/** embed(texts) returns one normalised vector per text. */
export async function evaluateAnswer(
  q: { id: string; title: string; criteria: string[]; sourceRoute?: string },
  transcript: string, seconds: number,
  embed: (texts: string[]) => Promise<ArrayLike<number>[]>,
): Promise<AnswerReport> {
  const sentences = transcript.trim() ? splitSentences(transcript) : [];
  const vectors = sentences.length ? await embed([...q.criteria, ...sentences]) : [];
  const criteria: CriterionResult[] = q.criteria.map((criterion, i) => {
    if (!sentences.length) return { criterion, coverage: 'missed', similarity: 0 };
    let best = -1, at = 0;
    sentences.forEach((_, j) => { const s = cosine(vectors[i], vectors[q.criteria.length + j]); if (s > best) { best = s; at = j; } });
    const coverage: Coverage = best >= COVERED_AT ? 'covered' : best >= PARTIAL_AT ? 'partial' : 'missed';
    return { criterion, coverage, similarity: Math.round(best * 100) / 100, evidence: coverage === 'missed' ? undefined : sentences[at] };
  });
  const used = movesUsed(transcript);
  const moves = ANSWER_MOVES.map((m, i) => ({ label: m.label, used: used[i] }));
  const delivery = deliveryMetrics(transcript, seconds);
  const contentScore = Math.round((criteria.reduce((a, c) => a + (c.coverage === 'covered' ? 1 : c.coverage === 'partial' ? 0.5 : 0), 0) / Math.max(1, criteria.length)) * 100);
  const structureScore = Math.round((used.filter(Boolean).length / 4) * 100);
  const deliveryPenalty = (delivery.lengthVerdict === 'good' ? 0 : 10) + Math.min(10, delivery.fillerCount * 2);
  const overall = Math.max(0, Math.round(contentScore * 0.7 + structureScore * 0.3 - deliveryPenalty));
  return { questionId: q.id, title: q.title, transcript, criteria, moves, delivery, contentScore, structureScore, overall, improvements: improvementsFor(criteria, moves, delivery), sourceRoute: q.sourceRoute };
}

export function improvementsFor(criteria: CriterionResult[], moves: { label: string; used: boolean }[], d: Delivery): string[] {
  const out: string[] = [];
  for (const c of criteria.filter(c => c.coverage === 'missed').slice(0, 2)) out.push(`Cover this point: ${c.criterion.charAt(0).toLowerCase()}${c.criterion.slice(1)}.`);
  const missingMove = moves.find(m => !m.used);
  if (missingMove) out.push(`Add the "${missingMove.label}" move: ${ANSWER_MOVES.find(m => m.label === missingMove.label)!.hint.toLowerCase()}`);
  if (d.lengthVerdict === 'too short') out.push('Your answer was short. Aim for 1.5 to 3 minutes: state the answer, explain why, give a trade-off.');
  if (d.lengthVerdict === 'too long') out.push('Your answer ran over 4 minutes. Lead with the answer in one sentence, then add detail.');
  if (d.fillerCount >= 5) out.push(`You used ${d.fillerCount} filler words (${Object.keys(d.fillers).slice(0, 3).join(', ')}). Pause silently instead.`);
  if (d.wpm > 180) out.push(`You spoke at ${d.wpm} words per minute. Slow to about 130-160 so the interviewer can follow.`);
  return out.slice(0, 3);
}

export function sessionSummary(reports: AnswerReport[]) {
  const avg = (f: (r: AnswerReport) => number) => (reports.length ? Math.round(reports.reduce((a, r) => a + f(r), 0) / reports.length) : 0);
  const missed = reports.flatMap(r => r.criteria.filter(c => c.coverage === 'missed').map(c => ({ ...c, route: r.sourceRoute, question: r.title })));
  return { overall: avg(r => r.overall), content: avg(r => r.contentScore), structure: avg(r => r.structureScore), wpm: avg(r => r.delivery.wpm), fillers: reports.reduce((a, r) => a + r.delivery.fillerCount, 0), missed };
}
