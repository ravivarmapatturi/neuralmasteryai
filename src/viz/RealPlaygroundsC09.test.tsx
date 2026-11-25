import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '../theme/ThemeProvider';
import AlgorithmSelector from './AlgorithmSelector';
import EmbeddingSpaceExplorer from './EmbeddingSpaceExplorer';
import InferenceFlowVisualizer from './InferenceFlowVisualizer';
import AgentTraceWaterfallVisualizer from './diagrams/AgentTraceWaterfallVisualizer';
import HarnessAblationStudio from './diagrams/HarnessAblationStudio';
import { VOCAB } from './lib/embeddings';

function renderTool(tool: ReactNode) {
  return render(
    <ThemeProvider>
      <MemoryRouter>{tool}</MemoryRouter>
    </ThemeProvider>,
  );
}

describe('real playground batch C09', () => {
  it.each([
    ['agent trace', <AgentTraceWaterfallVisualizer />, 'Find the slow or expensive step in an agent run'],
    ['embedding space', <EmbeddingSpaceExplorer />, 'See why nearby vectors return related words'],
    ['algorithm selector', <AlgorithmSelector />, 'Choose a sensible first algorithm'],
    ['inference flow', <InferenceFlowVisualizer />, 'Follow one next token from prompt to output'],
    ['harness ablation', <HarnessAblationStudio />, 'See which harness part prevents a false success'],
  ])('renders the %s public component path', (_name, component, heading) => {
    renderTool(component);
    expect(screen.getByText(heading)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Step →' })).toBeDefined();
  });

  it('keeps compact mode to the core picture and two notes', () => {
    const { container } = renderTool(<EmbeddingSpaceExplorer compact />);
    expect(container.querySelectorAll('.nm-sticky')).toHaveLength(2);
    expect(screen.queryByText('Live playground')).toBeNull();
  });

  it('places every embedding word and the live query in a distinct in-plot label slot', () => {
    const { container } = renderTool(<EmbeddingSpaceExplorer />);
    const labels = Array.from(container.querySelectorAll<SVGTextElement>('[data-embedding-label]'));
    expect(labels).toHaveLength(VOCAB.length + 1);
    expect(new Set(labels.map((label) => `${label.getAttribute('x')}:${label.getAttribute('y')}`)).size).toBe(labels.length);
    expect(labels.find((label) => label.getAttribute('data-embedding-label') === 'query')).toBeDefined();
  });

  it('keeps the harness caption below its group labels and uses separated trace headings', () => {
    const harness = renderTool(<HarnessAblationStudio />);
    const groupLabel = screen.getByText('Prompt only');
    const caption = screen.getByText('Each group uses the same task and model assumptions; only the surrounding harness changes.');
    expect(Number(caption.getAttribute('y')) - Number(groupLabel.getAttribute('y'))).toBeGreaterThanOrEqual(40);
    harness.unmount();

    renderTool(<AgentTraceWaterfallVisualizer />);
    expect(screen.getByText('Span')).toBeDefined();
    expect(screen.getByText('Elapsed from trace start →')).toBeDefined();
    expect(screen.queryByText('Span (one timed piece of work)')).toBeNull();
  });
});
