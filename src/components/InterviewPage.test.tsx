import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import InterviewPage from './InterviewPage';
vi.mock('./layout/Navbar', () => ({ default: () => <nav>Navigation</nav> }));
it('lets a learner answer, review criteria, and start a new question cleanly', () => {
  render(<MemoryRouter><InterviewPage /></MemoryRouter>);
  expect(screen.getByRole('button',{name:'Review my answer →'})).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Your answer'),{target:{value:'I would index approved sources and test grounded answers.'}});
  fireEvent.click(screen.getByRole('button',{name:'Review my answer →'}));
  expect(screen.getByText('One strong way to answer')).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText(/Clarify the users/)); expect(screen.getByText('1 of 4 points reviewed')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:/A larger model/})); expect(screen.getByLabelText('Your answer')).toHaveValue(''); expect(screen.queryByText('One strong way to answer')).not.toBeInTheDocument();
});
it('gives a typing fallback when speech recognition is unavailable', () => {
  render(<MemoryRouter><InterviewPage /></MemoryRouter>);
  fireEvent.click(screen.getByText('Answer with microphone'));
  expect(screen.getByRole('status')).toHaveTextContent('Voice input is unavailable');
});
