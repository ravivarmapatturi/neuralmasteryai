import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ThemeProvider } from '../../theme/ThemeProvider';
import AiEngineeringLearningLadder from './AiEngineeringLearningLadder';

describe('AiEngineeringLearningLadder', () => {
  it('renders correctly and switches stages upon user interaction', () => {
    render(
      <ThemeProvider>
        <AiEngineeringLearningLadder />
      </ThemeProvider>
    );
    expect(screen.getByText('What to Master Before Moving to the Next Layer')).toBeDefined();
    expect(screen.getByRole('button', { name: /1\. One Agent & Context/i })).toBeDefined();

    const evalsButton = screen.getByRole('button', { name: /2\. Tracing & Evals/i });
    fireEvent.click(evalsButton);
    expect(screen.getByText(/Deterministic assertion suites/i)).toBeDefined();
  });
});
