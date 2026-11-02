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
    expect(screen.getByText('Token Budgeting & Allocation Breakdown')).toBeDefined();
    const unmanagedBtn = screen.getByRole('button', { name: /2\. Unmanaged Context/i });
    fireEvent.click(unmanagedBtn);
    expect(screen.getByText(/40 Inlined Tool Schemas/i)).toBeDefined();
  });

  it('renders AgentTraceWaterfallVisualizer and switches views', () => {
    render(
      <ThemeProvider>
        <AgentTraceWaterfallVisualizer />
      </ThemeProvider>
    );
    expect(screen.getByText('Distributed Span Trees & Execution Telemetry')).toBeDefined();
    const costBtn = screen.getByRole('button', { name: /2\. Step Token & Cost Attribution/i });
    fireEvent.click(costBtn);
    expect(screen.getByText(/Step 3: Patch Gen/i)).toBeDefined();
  });
});
