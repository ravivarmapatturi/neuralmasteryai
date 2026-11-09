import { expect, it } from 'vitest';
import counts from './interviewCounts.generated.json';
import practice from './interviewPractice.json';
import senior from './interviewSeniorQuestions.json';

it('shows the question count from the live practice data, including senior questions once', () => {
  const questions = practice.topics.flatMap(topic => topic.questions);
  expect(counts.questions).toBe(questions.length);
  expect(new Set(questions.map(q => q.id)).size).toBe(questions.length);
  for (const question of Object.values(senior).flat()) {
    expect(questions.some(q => q.id === `senior:${question[0]}`)).toBe(true);
  }
});

it('ships 3 to 6 unique short key points for every senior question, preserving legacy questions', () => {
  const questions = practice.topics.flatMap(topic => topic.questions) as {id:string;keyPoints?:string[]}[];
  const seniors = questions.filter(q=>q.id.startsWith('senior:'));
  expect(seniors).toHaveLength(79);
  for(const q of seniors){
    expect(q.keyPoints!.length).toBeGreaterThanOrEqual(3);
    expect(q.keyPoints!.length).toBeLessThanOrEqual(6);
    expect(new Set(q.keyPoints).size).toBe(q.keyPoints!.length);
    expect(q.keyPoints!.every(p=>p.length>0 && p.length<=200)).toBe(true);
    const row = Object.values(senior).flat().find(row=>row[0]===q.id.slice(7))!;
    expect((row[3] as {keyPoints:string[]}).keyPoints).toEqual(q.keyPoints);
  }
  expect(questions.some(q=>!q.keyPoints)).toBe(true);
});
