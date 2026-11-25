import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});

import BrowserLmLab from './BrowserLmLab';

class MockWorker {
  static instances: MockWorker[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();

  constructor() {
    MockWorker.instances.push(this);
  }
}

describe('BrowserLmLab', () => {
  beforeEach(() => {
    MockWorker.instances = [];
    vi.stubGlobal('Worker', MockWorker);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not create a worker or request a model during render', () => {
    render(<BrowserLmLab />);

    expect(screen.getByRole('group', { name: 'Run a real language model' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load model (~280 MB, once)' })).toBeInTheDocument();
    expect(MockWorker.instances).toHaveLength(0);
  });

  it('creates the worker only after the explicit load click', () => {
    render(<BrowserLmLab />);

    fireEvent.click(screen.getByRole('button', { name: 'Load model (~280 MB, once)' }));

    expect(MockWorker.instances).toHaveLength(1);
    expect(MockWorker.instances[0].postMessage).toHaveBeenCalledWith({ type: 'load' });
  });

  it('offers all four predict-first experiments and decoding controls', () => {
    render(<BrowserLmLab />);

    expect(screen.getAllByRole('tab')).toHaveLength(4);
    expect(screen.getByRole('tab', { name: 'Greedy repetition loop' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Temperature 0 vs. 1.5' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Confident wrong fact' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Non-English token boundaries' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Greedy decoding' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Token-ID view' })).toBeInTheDocument();
  });
});
