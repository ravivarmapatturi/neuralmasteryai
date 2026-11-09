// Free, on-device answer review. Pure logic: the two models are passed in, so
// this is testable without them. MiniLM finds which sentence is about a point;
// an entailment model decides whether that sentence agrees or conflicts.
export type PointVerdict = 'covered' | 'partial' | 'conflict' | 'missed';
export type SentenceVerdict = 'supported' | 'conflict' | 'unchecked';
export type NliScore = { entails: number; conflicts: number };
export interface PointResult { point: string; verdict: PointVerdict; confidence: number; evidence?: string }
export interface SentenceResult { text: string; verdict: SentenceVerdict; against?: string }
export interface AnswerJudgement { score: number; points: PointResult[]; sentences: SentenceResult[]; improvements: string[] }
export interface JudgeModels {
  embed: (texts: string[]) => Promise<ArrayLike<number>[]>;
  nli: (pairs: [string, string][]) => Promise<NliScore[]>;
}

export const ABOUT_POINT = 0.35;
export const COVERS_POINT = 0.5;
export const CONFLICTS = 0.8;

const dot = (a: ArrayLike<number>, b: ArrayLike<number>) => { let t = 0; for (let i = 0; i < a.length; i++) t += a[i] * b[i]; return t; };
const clamp = (v: number) => Math.min(1, Math.max(0, v));

/** Criteria are written about the answer ("Explains that X"); the models need the claim ("X"). */
export function toClaim(criterion: string) {
  const claim = criterion.replace(/^(Defines|Explains(?: that| why| how)?|States(?: that)?|Contrasts|Identifies|Describes|Names|Notes(?: that)?|Mentions(?: that)?|Covers|Gives|Recognizes(?: that)?|Compares)\s+/i, '');
  return claim.charAt(0).toUpperCase() + claim.slice(1);
}

export function splitAnswer(text: string): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const parts = clean.split(/(?<=[.!?;])\s+/).map(s => s.trim()).filter(s => s.split(' ').length >= 3);
  if (parts.length > 1 || clean.split(' ').length <= 25) return parts.length ? parts : [clean];
  // Speech transcripts often have no punctuation
  const words = clean.split(' ');
  const windows: string[] = [];
  for (let i = 0; i < words.length; i += 15) windows.push(words.slice(i, i + 20).join(' '));
  return windows;
}

export async function judgeAnswer(answer: string, criteria: string[], reference: string, models: JudgeModels): Promise<AnswerJudgement> {
  const sentences = splitAnswer(answer);
  const refSentences = splitAnswer(reference.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/See [^.]*\.?\s*$/, '').replace(/[`*]/g, ''));
  const claims = criteria.map(toClaim);
  if (!sentences.length) return { score: 0, sentences: [], points: criteria.map(point => ({ point, verdict: 'missed', confidence: 0 })), improvements: [] };

  const vectors = await models.embed([...claims, ...refSentences, ...sentences]);
  const claimVecs = vectors.slice(0, claims.length);
  const refVecs = vectors.slice(claims.length, claims.length + refSentences.length);
  const sentVecs = vectors.slice(claims.length + refSentences.length);
  const bestOf = (target: ArrayLike<number>, pool: ArrayLike<number>[]) => pool.reduce((best, v, i) => { const s = dot(target, v); return s > best.sim ? { sim: s, at: i } : best; }, { sim: -1, at: 0 });

  const pointMatches = claimVecs.map(v => bestOf(v, sentVecs));
  const pointScores = await models.nli(pointMatches.map((m, i) => [sentences[m.at], claims[i]]));
  const points: PointResult[] = criteria.map((point, i) => {
    const { sim, at } = pointMatches[i];
    const { entails, conflicts } = pointScores[i];
    const evidence = sentences[at];
    if (sim < ABOUT_POINT) return { point, verdict: 'missed', confidence: Math.round(clamp(sim / ABOUT_POINT) * 30) };
    if (conflicts >= CONFLICTS && entails < 0.3) return { point, verdict: 'conflict', confidence: Math.round(entails * 100), evidence };
    const confidence = Math.round(Math.max(entails, clamp((sim - 0.2) / 0.5)) * 100);
    return { point, verdict: sim >= COVERS_POINT || entails >= 0.6 ? 'covered' : 'partial', confidence, evidence };
  });

  const targets = [...claims, ...refSentences];
  const targetVecs = [...claimVecs, ...refVecs];
  const sentenceMatches = sentVecs.map(v => bestOf(v, targetVecs));
  const sentenceScores = await models.nli(sentenceMatches.map((m, i) => [targets[m.at], sentences[i]]));
  const results: SentenceResult[] = sentences.map((text, i) => {
    const { sim, at } = sentenceMatches[i];
    if (sim < ABOUT_POINT) return { text, verdict: 'unchecked' };
    if (sentenceScores[i].conflicts >= CONFLICTS && sentenceScores[i].entails < 0.3) return { text, verdict: 'conflict', against: targets[at] };
    return { text, verdict: sim >= COVERS_POINT || sentenceScores[i].entails >= 0.6 ? 'supported' : 'unchecked' };
  });

  const value: Record<PointVerdict, number> = { covered: 1, partial: 0.5, conflict: 0, missed: 0 };
  const score = Math.round(points.reduce((t, p) => t + value[p.verdict], 0) / Math.max(1, points.length) * 100);
  const improvements = [
    ...points.filter(p => p.verdict === 'conflict').map(p => `Recheck this: you said "${p.evidence}", which seems to conflict with: ${toClaim(p.point)}.`),
    ...points.filter(p => p.verdict === 'missed').map(p => `Add this point: ${toClaim(p.point)}.`),
    ...points.filter(p => p.verdict === 'partial').map(p => `Say this more directly: ${toClaim(p.point)}.`),
  ].slice(0, 3);
  return { score, points, sentences: results, improvements };
}

/** Rubric checks require entailment, not just related wording. Scores stay hidden
 * until a held-out evaluation supports presenting a numeric grade. */
export const SHOW_RUBRIC_SCORE = false;
export async function judgeKeyPoints(answer: string, keyPoints: string[], models: JudgeModels): Promise<AnswerJudgement> {
  const sentences = splitAnswer(answer);
  if (!sentences.length) return { score: 0, points: keyPoints.map(point => ({ point, verdict: 'missed', confidence: 0 })), sentences: [], improvements: [] };
  const vectors = await models.embed([...keyPoints, ...sentences]);
  // Check up to three related sentences: a paraphrase may not be the nearest match.
  const candidates = keyPoints.map((_, i) => sentences.map((text, j) => ({ text, sim: dot(vectors[i], vectors[keyPoints.length + j]) }))
    .sort((a, b) => b.sim - a.sim).slice(0, 3));
  const pairs: [string, string][] = candidates.flatMap((rows, i) => rows.map((row): [string, string] => [row.text, keyPoints[i]]));
  const scores = await models.nli(pairs);
  let offset = 0;
  const points: PointResult[] = keyPoints.map((point, i) => {
    const rows = candidates[i].map(row => ({ ...row, ...scores[offset++] }));
    const hit = rows.filter(row => row.sim >= ABOUT_POINT && row.entails >= 0.7 && row.conflicts < 0.3)
      .sort((a, b) => b.entails - a.entails)[0];
    const conflict = rows.find(row => row.sim >= ABOUT_POINT && row.conflicts >= CONFLICTS);
    // Contradicting a point elsewhere in an answer prevents claiming it was hit.
    const verdict: PointVerdict = conflict ? 'conflict' : hit ? 'covered' : 'missed';
    return { point, verdict, confidence: Math.round((hit?.entails ?? 0) * 100), ...((conflict ?? hit) ? { evidence: (conflict ?? hit)!.text } : {}) };
  });
  return { score: Math.round(100 * points.filter(p => p.verdict === 'covered').length / keyPoints.length), points, sentences: [],
    improvements: points.filter(p => p.verdict !== 'covered').map(p => `Review: ${p.point}`) };
}

export function judgePracticeAnswer(answer: string, question: { answer: string; keyPoints?: string[] }, models: JudgeModels) {
  return question.keyPoints?.length
    ? judgeKeyPoints(answer, question.keyPoints, models)
    : judgeAnswer(answer, splitAnswer(question.answer).slice(0, 6), question.answer, models);
}
