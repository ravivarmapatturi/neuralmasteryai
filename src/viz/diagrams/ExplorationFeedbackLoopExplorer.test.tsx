import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});

import ExplorationFeedbackLoopExplorer from './ExplorationFeedbackLoopExplorer';

describe('ExplorationFeedbackLoopExplorer', () => {
  it('renders default Contextual LinUCB Decision view with arms and scores', () => {
    render(<ExplorationFeedbackLoopExplorer />);

    expect(
      screen.getByRole('group', { name: /Interactive Exploration & Feedback Loops Explorer/i })
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Exploration, Feedback Loops & Counterfactual Evaluation/i)
    ).toBeInTheDocument();

    expect(screen.getAllByText(/Blockbuster Trend \(Popular\)/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Fresh Topic \(Emerging\)/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Niche Long-Tail \(Uncertain\)/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/LinUCB Pick/i)).toBeInTheDocument();
  });

  it('switches to Counterfactual IPS Evaluator tab and updates estimators', () => {
    render(<ExplorationFeedbackLoopExplorer />);

    const ipsTab = screen.getByRole('button', { name: 'Counterfactual IPS Evaluator' });
    fireEvent.click(ipsTab);

    expect(screen.getByText(/Target Policy to Evaluate Offline:/i)).toBeInTheDocument();
    expect(screen.getByText(/Standard Unclipped IPS/i)).toBeInTheDocument();
    expect(screen.getByText(/Self-Normalized \(SNIPS\)/i)).toBeInTheDocument();
  });

  it('switches to Exposure Feedback Dynamics tab and displays popularity comparison', () => {
    render(<ExplorationFeedbackLoopExplorer />);

    const feedbackTab = screen.getByRole('button', { name: 'Exposure Feedback Dynamics' });
    fireEvent.click(feedbackTab);

    expect(screen.getByText(/Pure Greedy Exploitation \(No Exploration\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Contextual LinUCB \(With Exploration\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Feedback Simulation Horizon:/i)).toBeInTheDocument();
  });
});
