import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import practice from '../../data/interviewPractice.json';
import { LearnLinks, learnLinksFor } from './LearnLinks';

const questions = practice.topics.flatMap(t => t.questions.map(q => ({ id: q.id, topic: t.questions.map(x => x.id) })));

it('gives every interview question at least one learn page', () => {
  const missing = questions.filter(q => learnLinksFor(q.id, q.topic).length === 0);
  expect(missing).toEqual([]);
});

it('opens learn pages in a new tab when the learner does not know the answer', () => {
  const q = questions[0];
  render(<LearnLinks questionId={q.id} topicQuestionIds={q.topic} />);
  fireEvent.click(screen.getByRole('button', { name: "I don't know this yet" }));
  const link = screen.getAllByRole('link')[0];
  expect(link.getAttribute('href')).toMatch(/^\/docs\//);
  expect(link).toHaveAttribute('target', '_blank');
});
