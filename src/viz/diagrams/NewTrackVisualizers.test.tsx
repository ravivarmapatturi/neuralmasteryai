import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ThemeProvider } from '../../theme/ThemeProvider';
import ContextBudgetWaterfallVisualizer from './ContextBudgetWaterfallVisualizer';
import AgentTraceWaterfallVisualizer from './AgentTraceWaterfallVisualizer';

describe('New Track Visualizers', () => {
  it('renders ContextBudgetWaterfallVisualizer and switches scenarios', () => {
    render(
      <ThemeProvider>
        <ContextBudgetWaterfallVisualizer />
      </ThemeProvider>
    );
    expect(screen.getByText(/Why pasting everything into a prompt breaks an AI's working memory/i)).toBeDefined();
    const unmanagedBtn = screen.getByRole('button', { name: /2\. Unmanaged Context/i });
    fireEvent.click(unmanagedBtn);
    expect(screen.getByText(/40 pasted tool schemas/i)).toBeDefined();
  });

  it('renders AgentTraceWaterfallVisualizer and switches views', () => {
    render(
      <ThemeProvider>
        <AgentTraceWaterfallVisualizer />
      </ThemeProvider>
    );
    expect(screen.getByText('Find the slow or expensive step in an agent run')).toBeDefined();
    const stepButton = screen.getByRole('button', { name: /Step →/i });
    fireEvent.click(stepButton);
    expect(screen.getByText(/What just happened · step 2/i)).toBeDefined();
  });
});
