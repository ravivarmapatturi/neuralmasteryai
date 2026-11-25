import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { VizVisibleContext } from '../primitives';

vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});

import QLearningVsSarsaCliffDiagram from './QLearningVsSarsaCliffDiagram';
import AdaptiveBatchingQueueDiagram from './AdaptiveBatchingQueueDiagram';
import RandomWalkEmbeddingDiagram from './RandomWalkEmbeddingDiagram';
import ParallelAgentSpeedupDiagram from './ParallelAgentSpeedupDiagram';
import TransEDiagram from './TransEDiagram';

function renderWithVis(ui: React.ReactElement, visible = true) {
  return render(
    <ThemeProvider>
      <VizVisibleContext.Provider value={visible}>{ui}</VizVisibleContext.Provider>
    </ThemeProvider>,
  );
}

function assertCleanPlayground(container: HTMLElement, minKatexCount: number, minClipCount = 1) {
  const outer = container.querySelector('.nm-viz-frame');
  expect(outer).not.toBeNull();
  expect(outer!.querySelectorAll('.nm-viz-frame, .nm-pg__panel')).toHaveLength(0);

  const stickyNotes = container.querySelectorAll('.nm-sticky');
  expect(stickyNotes.length).toBeGreaterThanOrEqual(4);
  expect(container.querySelectorAll('.katex').length).toBeGreaterThanOrEqual(minKatexCount);
  expect(container.querySelectorAll('.katex-error')).toHaveLength(0);
  expect(container.querySelectorAll('clipPath').length).toBeGreaterThanOrEqual(minClipCount);

  const svg = container.querySelector('svg[viewBox]');
  expect(svg).not.toBeNull();
  expect(svg!.getAttribute('viewBox')).toMatch(/^0 0 760 /);

  const svgTexts = Array.from(container.querySelectorAll('svg text'));
  expect(svgTexts.length).toBeGreaterThan(4);
  for (const node of svgTexts) {
    const fs = Number(node.getAttribute('font-size'));
    expect(fs).toBeGreaterThanOrEqual(14);
    expect(fs).toBeLessThanOrEqual(16);
  }
}

function withReducedMotion(fn: () => void) {
  const orig = window.matchMedia;
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
  try {
    fn();
  } finally {
    window.matchMedia = orig;
  }
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('real playgrounds batch C07', () => {
  it('QLearningVsSarsaCliffDiagram: autoplays checkpoints, pauses off-screen, computes eps=0 collapse & predict challenge', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<QLearningVsSarsaCliffDiagram />, true);
    assertCleanPlayground(view.container, 2, 1);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 6/i)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2250));
    expect(screen.getByText(/Step 2 of 6/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <QLearningVsSarsaCliffDiagram />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(/Step 2 of 6/i)).toBeInTheDocument();

    // Predict challenge + Run ε = 0.00 collapses SARSA to the 13-step optimal path
    fireEvent.click(screen.getByRole('button', { name: /Drops down to hug the cliff edge/i }));
    expect(screen.getByText(/Correct —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Run ε = 0\.00 now/i }));
    expect(screen.getByText(/SARSA path \(13 steps\)/i)).toBeInTheDocument();

    const compactView = renderWithVis(<QLearningVsSarsaCliffDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('AdaptiveBatchingQueueDiagram: autoplays batches, pauses off-screen, updates cost/capacity on free inputs & predict challenge', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<AdaptiveBatchingQueueDiagram />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of /i)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2150));
    expect(screen.getByText(/Step 2 of /i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <AdaptiveBatchingQueueDiagram />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(/Step 2 of /i)).toBeInTheDocument();

    // Edit fixed setup cost t0 = 10 -> unbatched capacity = 1000/11 = 91 req/s
    fireEvent.change(screen.getByLabelText('Fixed GPU setup t0 (ms)'), { target: { value: '10' } });
    expect(screen.getByText(/unbatched: 91 req\/s/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Gets ~20 ms slower/i }));
    expect(screen.getByText(/Correct —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Run light traffic \(20 req\/s, 20 ms wait\) now/i }));
    expect(screen.getByText(/waited the full 20 ms timer/i)).toBeInTheDocument();

    const compactView = renderWithVis(<AdaptiveBatchingQueueDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('RandomWalkEmbeddingDiagram: autoplays walk hops, pauses off-screen, recomputes 1/q odds & predict challenge', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<RandomWalkEmbeddingDiagram />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 8/i)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1900));
    expect(screen.getByText(/Step 2 of 8/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <RandomWalkEmbeddingDiagram />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(/Step 2 of 8/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Stepping outward to bridge node 3/i }));
    expect(screen.getByText(/Correct —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Test p = 1\.0, q = 0\.25 now/i }));
    expect(screen.getByText(/3:4\.00 \(67%\)/)).toBeInTheDocument();

    const compactView = renderWithVis(<RandomWalkEmbeddingDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('ParallelAgentSpeedupDiagram: autoplays slot counts, pauses off-screen, parses custom task durations & predict challenge', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<ParallelAgentSpeedupDiagram />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 8/i)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1800));
    expect(screen.getByText(/Step 2 of 8/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <ParallelAgentSpeedupDiagram />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(/Step 2 of 8/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Zero speedup — stuck at 22s/i }));
    expect(screen.getByText(/Correct —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Run 20s straggler with 8 slots now/i }));
    expect(screen.getAllByText(/22\.0s/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/1\.64×/).length).toBeGreaterThanOrEqual(1);

    // Free task list edit: 4 x 10s + 2s serial = 42.0s sequential
    fireEvent.change(screen.getByLabelText('Sub-task durations'), { target: { value: '10, 10, 10, 10' } });
    expect(screen.getAllByText(/42\.0s/).length).toBeGreaterThanOrEqual(1);

    const compactView = renderWithVis(<ParallelAgentSpeedupDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('TransEDiagram: autoplays training updates, pauses off-screen, switches L1/L2, edits r vector & predict challenge', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<TransEDiagram />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 6/i)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2050));
    expect(screen.getByText(/Step 2 of 6/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <TransEDiagram />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(/Step 2 of 6/i)).toBeInTheDocument();

    // Switch metric to L1 & edit relation r1
    fireEvent.click(screen.getByRole('button', { name: 'L1 (Manhattan)' }));
    expect(screen.getByText(/Step 1 \(L1\)/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Relation step r1'), { target: { value: '1.6' } });
    expect(screen.getByText(/\(2\.00, 0\.85\)/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Both are pulled toward the exact same point/i }));
    expect(screen.getByText(/Correct —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Test 1-to-many collapse now/i }));
    expect(screen.getByText(/collapse onto the same point/i)).toBeInTheDocument();

    const compactView = renderWithVis(<TransEDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('respects prefers-reduced-motion across all 5 playgrounds and never uses monospace fonts or uppercase CSS', () => {
    withReducedMotion(() => {
      for (const node of [
        <QLearningVsSarsaCliffDiagram key="q" />,
        <AdaptiveBatchingQueueDiagram key="a" />,
        <RandomWalkEmbeddingDiagram key="r" />,
        <ParallelAgentSpeedupDiagram key="p" />,
        <TransEDiagram key="t" />,
      ]) {
        const view = renderWithVis(node, true);
        expect(screen.getAllByRole('button', { name: 'Play' }).length).toBeGreaterThanOrEqual(1);
        view.unmount();
      }
    });

    for (const file of [
      'QLearningVsSarsaCliffDiagram.tsx',
      'AdaptiveBatchingQueueDiagram.tsx',
      'RandomWalkEmbeddingDiagram.tsx',
      'ParallelAgentSpeedupDiagram.tsx',
      'TransEDiagram.tsx',
    ]) {
      const src = readFileSync(join(__dirname, file), 'utf8');
      expect(src).not.toMatch(/monospace/i);
      expect(src).not.toMatch(/textTransform:\s*['"]uppercase['"]/);
    }
  });
});
