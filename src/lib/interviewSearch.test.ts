import { describe, expect, it } from 'vitest';
import { interviewQuestionRoute, searchInterviewQuestions } from './interviewSearch';

describe('searchInterviewQuestions', () => {
  it('matches every query word against the title and area', async () => {
    const hits = await searchInterviewQuestions('decision tree');
    expect(hits.length).toBeGreaterThan(0);
    for (const h of hits) expect(`${h.title} ${h.area}`.toLowerCase()).toMatch(/decision/);
    expect(await searchInterviewQuestions('zzzz-no-such-thing')).toEqual([]);
  });
  it('links to the question on the interview page', () => {
    expect(interviewQuestionRoute('a:b')).toBe('/interview/questions?id=a%3Ab');
  });
});
