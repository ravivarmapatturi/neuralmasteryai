import { expect, it } from 'vitest';
import counts from './interviewCounts.generated.json';
import practice from './interviewPractice.json';
import senior from './interviewSeniorQuestions.json';
import { groundTruthPoints } from '../lib/answerJudgeV2';

it('shows the question count from the live practice data, including senior questions once', () => {
  const questions = (practice.topics as unknown as { questions: { id: string }[] }[]).flatMap(topic => topic.questions);
  expect(counts.questions).toBe(questions.length);
  expect(new Set(questions.map(q => q.id)).size).toBe(questions.length);
  for (const question of Object.values(senior).flat()) {
    expect(questions.some(q => q.id === `senior:${question[0]}`)).toBe(true);
  }
});

it('preserves all 79 authored senior rubrics alongside model-answer fallback questions', () => {
  const questions = (practice.topics as unknown as { questions: unknown[] }[]).flatMap(topic => topic.questions) as {id:string;answer:string;keyPoints?:string[];followUps?:string[]}[];
  const seniors = questions.filter(q=>q.id.startsWith('senior:'));
  expect(seniors).toHaveLength(Object.values(senior).flat().length);
  // The 79 rubrics authored in the senior file; later rubrics come from interviewKeyPoints.json.
  const authored = (q: { id: string }) => {
    const row = Object.values(senior).flat().find(row => row[0] === q.id.slice(7));
    return Boolean((row?.[3] as { keyPoints?: string[] } | undefined)?.keyPoints);
  };
  const rubricQuestions = seniors.filter(q => q.keyPoints && authored(q));
  expect(rubricQuestions).toHaveLength(79);
  for(const q of rubricQuestions){
    expect(q.keyPoints!.length).toBeGreaterThanOrEqual(3);
    expect(q.keyPoints!.length).toBeLessThanOrEqual(6);
    expect(new Set(q.keyPoints).size).toBe(q.keyPoints!.length);
    expect(q.keyPoints!.every(p=>p.length>0 && p.length<=200)).toBe(true);
    const row = Object.values(senior).flat().find(row=>row[0]===q.id.slice(7))!;
    expect((row[3] as {keyPoints:string[]}).keyPoints).toEqual(q.keyPoints);
  }
  expect(seniors.filter(q => !authored(q))).toHaveLength(Object.values(senior).flat().length - 79);
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
  expect(questions.some(q=>!q.keyPoints)).toBe(true);
});
