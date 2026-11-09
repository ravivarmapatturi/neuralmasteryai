import { fireEvent, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useState } from 'react';
import { beforeAll, beforeEach, expect, it, vi } from 'vitest';
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

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '/interview');
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

it('supports text search across questions and filters by level and status', async () => {
  renderWithTheme(
    <MemoryRouter initialEntries={['/interview']}>
      <SimpleInterviewPage />
    </MemoryRouter>
  );

  // Search input is rendered
  const searchInput = await screen.findByLabelText(/Search all questions/i);
  expect(searchInput).toBeInTheDocument();

  // Search for "RoPE"
  fireEvent.change(searchInput, { target: { value: 'RoPE' } });

  // Count updates to show matching questions
  const count = await screen.findByText(/questions ·/i, { selector: '.si-count' });
  expect(count).toBeInTheDocument();

  // Filter by level "senior"
  const levelSelect = screen.getByLabelText(/Experience level/i);
  fireEvent.change(levelSelect, { target: { value: 'senior' } });

  // Filter by status "unanswered"
  const statusSelect = screen.getByLabelText(/Question status/i);
  fireEvent.change(statusSelect, { target: { value: 'unanswered' } });

  // Exactly one primary action on the topics screen
  const primaryButtons = screen.getAllByRole('button', { name: /Start|Resume|Next/i }).filter((b) => b.classList.contains('si-primary'));
  expect(primaryButtons.length).toBe(1);
});

it('allows bookmarking questions and filtering to bookmarked questions', async () => {
  localStorage.clear();
  renderWithTheme(
    <MemoryRouter initialEntries={['/interview']}>
      <SimpleInterviewPage />
    </MemoryRouter>
  );

  // Find a bookmark button in the question list
  const bookmarkButtons = await screen.findAllByRole('button', { name: /Bookmark/i });
  expect(bookmarkButtons.length).toBeGreaterThan(0);

  // Click the first bookmark button
  fireEvent.click(bookmarkButtons[0]);

  // localStorage should contain the bookmarked question ID
  const stored = JSON.parse(localStorage.getItem('nm-interview-bookmarks') || '[]');
  expect(stored.length).toBe(1);

  // Filter by bookmarked
  const statusSelect = screen.getByLabelText(/Question status/i);
  fireEvent.change(statusSelect, { target: { value: 'bookmarked' } });

  // The bookmarked question should remain visible
  const activeBookmarks = screen.getAllByRole('button', { name: /Remove bookmark/i });
  expect(activeBookmarks.length).toBe(1);
});

it('follows the filtered list when navigating with Previous and Next', async () => {
  renderWithTheme(
    <MemoryRouter initialEntries={['/interview?search=LoRA&level=senior']}>
      <SimpleInterviewPage />
    </MemoryRouter>
  );

  // Click start practicing
  const startBtn = await screen.findByRole('button', { name: /Start practicing|Start this topic|Next unsolved question/i });
  expect(startBtn).toBeInTheDocument();
  fireEvent.click(startBtn);

  // We are now on the asking stage with question counter reflecting filtered list
  expect(await screen.findByText(/Question 1 of/i)).toBeInTheDocument();

  // Header should contain Next question button and Previous question button (disabled at start)
  const prevBtn = screen.getByRole('button', { name: /Previous question/i });
  const nextBtn = screen.getByRole('button', { name: /Next question/i });
  expect(prevBtn).toBeDisabled();
  expect(nextBtn).toBeEnabled();

  // Click Next question
  fireEvent.click(nextBtn);

  // Counter advances to Question 2
  expect(await screen.findByText(/Question 2 of/i)).toBeInTheDocument();
  expect(prevBtn).toBeEnabled();
});

it('renders clear error banner when microphone access is denied', async () => {
  // Mock getUserMedia rejection
  const mediaDevicesMock = {
    getUserMedia: vi.fn().mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError')),
  };
  Object.defineProperty(navigator, 'mediaDevices', {
    value: mediaDevicesMock,
    configurable: true,
  });

  renderWithTheme(
    <MemoryRouter initialEntries={['/interview?topic=rag']}>
      <SimpleInterviewPage />
    </MemoryRouter>
  );

  const startBtn = await screen.findByRole('button', { name: /Start this topic|Start practicing|Next unsolved/i });
  fireEvent.click(startBtn);

  // Skip to answering
  const skipBtn = await screen.findByRole('button', { name: /Skip to answering/i });
  fireEvent.click(skipBtn);

  // Error banner should appear with clear explanation and try again button
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(screen.getByText(/Microphone unavailable/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Try microphone again/i })).toBeInTheDocument();
});

