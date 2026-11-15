import { expect, it } from 'vitest';
import counts from './interviewCounts.generated.json';
import practice from './interviewPractice.json';
import senior from './interviewSeniorQuestions.json';
import { groundTruthPoints } from '../lib/answerJudgeV2';

type SeniorTuple = [string, string, string, { keyPoints?: string[] }?, ...unknown[]];
type SeniorDict = { id: string; keyPoints?: string[]; [key: string]: unknown };
type SeniorRow = SeniorTuple | SeniorDict;

function getRowId(row: SeniorRow): string {
  return Array.isArray(row) ? row[0] : row.id;
}

function getRowKeyPoints(row: SeniorRow): string[] | undefined {
  if (Array.isArray(row)) {
    const meta = row[3] as { keyPoints?: string[] } | undefined;
    return meta?.keyPoints;
  }
  return row.keyPoints;
}

it('shows the question count from the live practice data, including senior questions once', () => {
  const questions = (practice.topics as unknown as { questions: { id: string }[] }[]).flatMap(topic => topic.questions);
  expect(counts.questions).toBe(questions.length);
  expect(new Set(questions.map(q => q.id)).size).toBe(questions.length);
  for (const question of Object.values(senior).flat() as SeniorRow[]) {
    expect(questions.some(q => q.id === `senior:${getRowId(question)}`)).toBe(true);
  }
});

it('preserves all 79 authored senior rubrics alongside model-answer fallback questions', () => {
  const questions = (practice.topics as unknown as { questions: unknown[] }[]).flatMap(topic => topic.questions) as {id:string;answer:string;keyPoints?:string[];followUps?:string[]}[];
  const seniors = questions.filter(q=>q.id.startsWith('senior:'));
  const seniorRows = Object.values(senior).flat() as SeniorRow[];
  expect(seniors).toHaveLength(seniorRows.length);

  const findRow = (qid: string) => seniorRows.find(row => getRowId(row) === qid);

  // The 79 rubrics authored in legacy senior tuples; later rubrics come from interviewKeyPoints.json.
  const legacyAuthored = (q: { id: string }) => {
    const row = findRow(q.id.slice(7));
    return Boolean(row && Array.isArray(row) && getRowKeyPoints(row));
  };
  const legacyRubricQuestions = seniors.filter(q => q.keyPoints && legacyAuthored(q));
  expect(legacyRubricQuestions).toHaveLength(79);
  for (const q of legacyRubricQuestions) {
    expect(q.keyPoints!.length).toBeGreaterThanOrEqual(3);
    expect(q.keyPoints!.length).toBeLessThanOrEqual(6);
    expect(new Set(q.keyPoints).size).toBe(q.keyPoints!.length);
    expect(q.keyPoints!.every(p => p.length > 0 && p.length <= 200)).toBe(true);
    const row = findRow(q.id.slice(7))!;
    expect(getRowKeyPoints(row)).toEqual(q.keyPoints);
  }

  // All 25 new gap records are present exactly once with their authored rubrics.
  const gapAuthored = (q: { id: string }) => {
    const row = findRow(q.id.slice(7));
    return Boolean(row && !Array.isArray(row) && getRowKeyPoints(row));
  };
  const gapRubricQuestions = seniors.filter(q => q.keyPoints && gapAuthored(q));
  expect(gapRubricQuestions).toHaveLength(25);
  for (const q of gapRubricQuestions) {
    expect(q.keyPoints!.length).toBeGreaterThanOrEqual(3);
    expect(q.keyPoints!.length).toBeLessThanOrEqual(6);
    expect(new Set(q.keyPoints).size).toBe(q.keyPoints!.length);
    expect(q.keyPoints!.every(p => p.length > 0 && p.length <= 200)).toBe(true);
    const row = findRow(q.id.slice(7))!;
    expect(getRowKeyPoints(row)).toEqual(q.keyPoints);
  }

  const sourceAuthored = (q: { id: string }) => {
    const row = findRow(q.id.slice(7));
    return Boolean(row && getRowKeyPoints(row));
  };
  expect(seniors.filter(q => !sourceAuthored(q))).toHaveLength(seniorRows.length - (79 + 25));

  // Questions with no rubric at all fall back to sentences from their own model answer.
  const fallbackQuestions = seniors.filter(q => !q.keyPoints);
  for (const q of fallbackQuestions) {
    expect(q.answer.length).toBeGreaterThan(40);
    expect(q.followUps?.length).toBeGreaterThan(0);
    const points = groundTruthPoints(q);
    expect(points.length).toBeGreaterThan(0);
    expect(points.length).toBeLessThanOrEqual(6);
    expect(points.every(point => q.answer.replace(/\s+/g, ' ').includes(point))).toBe(true);
  }
  // Every question now has a rubric, so the checklist never falls back to answer sentences.
  expect(questions.every(q => q.keyPoints?.length)).toBe(true);
});
