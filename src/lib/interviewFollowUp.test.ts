import { expect, it } from 'vitest';
import { selectInterviewFollowUp } from './interviewFollowUp';
it('prefers a follow-up related to an undetected point, keeping bank order on ties', () => {
  const choices = ['How does training work?', 'What happens to dropout masks at inference?'];
  const points = [{point:'Dropout masks are disabled at inference.',verdict:'missed' as const,confidence:0}];
  expect(selectInterviewFollowUp(choices,points)).toBe(choices[1]);
  expect(selectInterviewFollowUp(choices,[{...points[0],verdict:'covered'}])).toBe(choices[0]);
  expect(selectInterviewFollowUp(choices)).toBe(choices[0]);
  expect(selectInterviewFollowUp([])).toBeUndefined();
});
it('strips source-bank level labels and expected answers from the spoken question', () => {
  expect(selectInterviewFollowUp(['Level 2: Why does this work? Expected: Because of scaling.'])).toBe('Why does this work?');
});
