import { fireEvent, render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, describe, beforeEach, vi, afterEach } from 'vitest';
import MockInterviewPage from './MockInterviewPage';
import * as engine from '../../lib/mockInterview/engine';

vi.mock('../layout/Navbar', () => ({ default: () => <nav>Navigation</nav> }));
vi.mock('../../contexts/FocusMusicContext', () => ({ useFocusMusic: () => ({ pause: vi.fn() }) }));

vi.mock('../../lib/mockInterview/engine', () => ({
  speak: vi.fn(),
  stopSpeaking: vi.fn(),
  startRecording: vi.fn(),
  transcribe: vi.fn(async () => 'This is a test transcript with high variance and tree depth constraints.'),
}));

describe('MockInterviewPage Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders setup screen with 4 roles and 30/60m duration choices', () => {
    render(
      <MemoryRouter>
        <MockInterviewPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /Timed mock interview/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Applied AI/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Agentic/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Inference/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Evaluation/i })).toBeInTheDocument();

    expect(screen.getByRole('radio', { name: /30 minutes/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /60 minutes/i })).toBeInTheDocument();
  });

  it('starts an interview, hides model answers during questions, and shows per-question timer', () => {
    render(
      <MemoryRouter>
        <MockInterviewPage />
      </MemoryRouter>
    );

    // Click 30 min Applied AI
    fireEvent.click(screen.getByRole('button', { name: /Start 30-minute mock interview/i }));

    // Screen should now be in active interview mode
    expect(screen.getByText(/Question 1 of 5/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Phone Screen|Technical Depth|System Design|Production Debugging|Engineering Behavioral/i).length).toBeGreaterThan(0);

    // Per-question timer & suggested limit should be visible
    expect(screen.getByText(/\/ suggested/i)).toBeInTheDocument();

    // Model answers must NOT be visible during the question
    expect(screen.queryByText(/Model answer/i)).not.toBeInTheDocument();

    // Interviewer speaks question
    expect(engine.speak).toHaveBeenCalled();
  });

  it('allows pausing and resuming interview', () => {
    render(
      <MemoryRouter>
        <MockInterviewPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Start 30-minute mock interview/i }));

    // Click Pause
    const pauseBtn = screen.getByRole('button', { name: /⏸ Pause/i });
    fireEvent.click(pauseBtn);

    expect(screen.getByRole('heading', { name: /Interview paused/i })).toBeInTheDocument();
    expect(engine.stopSpeaking).toHaveBeenCalled();

    // Click Resume
    fireEvent.click(screen.getByRole('button', { name: /Resume interview →/i }));
    expect(screen.queryByRole('heading', { name: /Interview paused/i })).not.toBeInTheDocument();
  });

  it('persists in-progress interview to localStorage and shows resume prompt on reload', () => {
    const { unmount } = render(
      <MemoryRouter>
        <MockInterviewPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Start 30-minute mock interview/i }));
    expect(screen.getByText(/Question 1 of 5/i)).toBeInTheDocument();

    // Unmount simulates closing / reloading page
    unmount();

    // Remount on reload
    render(
      <MemoryRouter>
        <MockInterviewPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/In-progress interview found/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Resume session →/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Resume session →/i }));
    expect(screen.getByText(/Question 1 of 5/i)).toBeInTheDocument();
  });

  it('completes questions and displays scorecard with transcripts, criteria checklist, and self-ratings without percent grade or pass prediction', async () => {
    render(
      <MemoryRouter>
        <MockInterviewPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Start 30-minute mock interview/i }));

    // Answer questions 1 through 5 using typed answers or skip
    for (let q = 1; q <= 5; q++) {
      expect(screen.getByText(new RegExp(`Question ${q} of 5`, 'i'))).toBeInTheDocument();

      // Switch to typed mode
      fireEvent.click(screen.getByRole('tab', { name: /Type your answer/i }));

      const textarea = screen.getByPlaceholderText(/Type your response as you would explain it/i);
      fireEvent.change(textarea, {
        target: {
          value: 'This is my technical response explaining high variance, overfitting, and tree pruning.',
        },
      });

      const submitBtn = screen.getByRole('button', {
        name: q === 5 ? /Finish interview & see scorecard/i : /Submit answer & next question/i,
      });

      await act(async () => {
        fireEvent.click(submitBtn);
      });
    }

    // Now we are on the scorecard screen!
    expect(screen.getByRole('heading', { level: 1, name: /Interview scorecard/i })).toBeInTheDocument();
    expect(screen.getByText(/5 of 5/i)).toBeInTheDocument();
    expect(screen.getByText(/Questions answered/i)).toBeInTheDocument();

    // Strictly verify NO percent grade and NO pass prediction
    expect(screen.queryByText(/out of 100/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\/100/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/percent grade/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/percentage grade/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/pass prediction/i)).not.toBeInTheDocument();

    // Check candidate's answer is visible
    expect(screen.getAllByText(/This is my technical response explaining high variance/i).length).toBeGreaterThan(0);

    // Check model answer is now visible
    expect(screen.getAllByText(/Model answer/i).length).toBeGreaterThan(0);

    // Check Key points checklist (Covered or Not detected)
    expect(screen.getAllByText(/Key points checklist/i).length).toBeGreaterThan(0);
    const badges = screen.getAllByText(/✓ Covered|○ Not detected/i);
    expect(badges.length).toBeGreaterThan(0);

    // Test candidate self-assessment: Got it / Partly / Missed it
    const gotItButtons = screen.getAllByRole('radio', { name: /✓ Got it/i });
    expect(gotItButtons.length).toBeGreaterThan(0);

    fireEvent.click(gotItButtons[0]);
    expect(gotItButtons[0]).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText(/1 Got it/i)).toBeInTheDocument();
  });

  it('cleans up audio and speech on component unmount', () => {
    const mockCancel = vi.fn();
    (engine.startRecording as any).mockResolvedValueOnce({
      cancel: mockCancel,
      stop: vi.fn(),
    });

    const { unmount } = render(
      <MemoryRouter>
        <MockInterviewPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Start 30-minute mock interview/i }));

    unmount();
    expect(engine.stopSpeaking).toHaveBeenCalled();
  });
});
