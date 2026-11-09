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
