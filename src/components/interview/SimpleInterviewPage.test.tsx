import { fireEvent, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useState } from 'react';
import { beforeAll, expect, it, vi } from 'vitest';
import { renderWithTheme } from '../../../tests/unit/renderWithProviders';
import SimpleInterviewPage from './SimpleInterviewPage';

vi.mock('../layout/Navbar', () => ({ default: () => <nav>Navigation</nav> }));
vi.mock('../../contexts/FocusMusicContext', () => ({ useFocusMusic: () => ({ pause: () => {} }) }));
vi.mock('../../contexts/GamificationContext', () => {
  return {
    useGamification: () => {
      const [events, setEvents] = useState<any[]>([]);
      return {
        events,
        awardInterviewCompleted: vi.fn((id: string) => {
          setEvents((prev) => [...prev, { kind: 'interview', permalink: `/interview#${id}`, at: new Date().toISOString(), points: 15 }]);
        }),
      };
    },
  };
});
vi.mock('../practice/PracticeWorkspace', () => ({
  default: ({ onReturn, onSolve, returnLabel }: { onReturn?: () => void; onSolve?: () => void; returnLabel?: string }) => (
    <div data-testid="practice-workspace">
      <span>Mocked Practice Workspace</span>
      <button onClick={onSolve}>Solve in Editor</button>
      <button onClick={onReturn}>{returnLabel || 'Return to Interview'}</button>
    </div>
  ),
}));
vi.mock('../../lib/mockInterview/engine', () => ({
  loadJudge: vi.fn(async () => true),
  embed: vi.fn(async () => [[1, 0]]),
  nli: vi.fn(async () => 'entailment'),
}));

beforeAll(() => {
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  HTMLMediaElement.prototype.pause = vi.fn();
});

it('renders coding questions with Open code editor button and switches to code step', async () => {
  renderWithTheme(
    <MemoryRouter initialEntries={[{ pathname: '/interview', search: '?q=senior:coding-reciprocal-rank-fusion' }]}>
      <SimpleInterviewPage />
    </MemoryRouter>
  );

  // The topics list should show the linked question banner and Python badges
  expect(await screen.findByText(/Start the linked question/i)).toBeInTheDocument();
  const pills = screen.getAllByText('Python', { selector: '.si-coding-pill' });
  expect(pills.length).toBeGreaterThan(0);

  // Click start the linked question
  fireEvent.click(screen.getByText(/Start the linked question/i));

  // Now we are on the question stage
  expect(await screen.findByText(/Implement Reciprocal Rank Fusion/i)).toBeInTheDocument();

  // The "Open code editor" button should be rendered
  const openEditorButtons = screen.getAllByRole('button', { name: /Open code editor/i });
  expect(openEditorButtons.length).toBeGreaterThan(0);

  // Click "Open code editor"
  fireEvent.click(openEditorButtons[0]);

  // Should show the PracticeWorkspace overlay
  expect(await screen.findByTestId('practice-workspace')).toBeInTheDocument();

  // Simulate solving the problem
  fireEvent.click(screen.getByRole('button', { name: /Solve in Editor/i }));

  // Return to interview
  fireEvent.click(screen.getByRole('button', { name: /Return to interview question/i }));

  // Should have returned to the question and displayed the solved badge
  expect(await screen.findByText(/Solved in editor/i)).toBeInTheDocument();
  expect(screen.queryByTestId('practice-workspace')).not.toBeInTheDocument();
});
