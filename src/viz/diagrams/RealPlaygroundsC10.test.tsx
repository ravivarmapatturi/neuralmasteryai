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

import WriteSkewExplorer from './WriteSkewExplorer';
import JudgePositionBiasDiagram from './JudgePositionBiasDiagram';
import NeuralOperatorDiagram from './NeuralOperatorDiagram';
import TokenBucketAdmissionExplorer from './TokenBucketAdmissionExplorer';
import ConsistentHashMembershipExplorer from './ConsistentHashMembershipExplorer';

function renderWithVis(ui: React.ReactElement, visible = true) {
  return render(
    <ThemeProvider>
      <VizVisibleContext.Provider value={visible}>{ui}</VizVisibleContext.Provider>
    </ThemeProvider>,
  );
}

function assertCleanPlayground(container: HTMLElement, minKatexCount: number, minClipCount = 2) {
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

describe('real playgrounds batch C10', () => {
  it('WriteSkewExplorer: autoplays steps, pauses off-screen, edits N/M, switches isolation modes, compact mode, predict', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<WriteSkewExplorer />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 4/i)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2150));
    expect(screen.getByText(/Step 2 of 4/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <WriteSkewExplorer />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(4500));
    expect(screen.getByText(/Step 2 of 4/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Doctors starting on call N'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Minimum doctors required M'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lock all read rows' }));
    expect(screen.getByRole('status')).toHaveTextContent(/Invariant preserved: 2 clinicians remain on call/i);

    fireEvent.click(screen.getByRole('button', { name: /Both rows commit cleanly and 0 doctors stay on call/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Run Snapshot skew now/i }));
    expect(screen.getByRole('status')).toHaveTextContent(/invariant fails/i);

    const compactView = renderWithVis(<WriteSkewExplorer compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
    expect(view.container.textContent).toContain('Write overlap: ∅ (separate rows)');
    const wsTimelineLabels = Array.from(view.container.querySelectorAll('svg text')).filter((n) =>
      /→off$|stays$|^saw |^retry:/.test(n.textContent ?? ''),
    );
    expect(wsTimelineLabels.length).toBeGreaterThan(0);
    for (const lbl of wsTimelineLabels) {
      expect(lbl.getAttribute('text-anchor')).toBe('middle');
    }
  });

  it('JudgePositionBiasDiagram: autoplays AB/BA/swap, pauses off-screen, edits scores & bias, compact mode, predict', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<JudgePositionBiasDiagram />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 3/i)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2350));
    expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <JudgePositionBiasDiagram />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(4800));
    expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('True quality of Response A'), { target: { value: '8.5' } });
    fireEvent.change(screen.getByLabelText('True quality of Response B'), { target: { value: '6.5' } });
    expect(screen.getByText(/Swap avg: A = 8\.75 vs B = 6\.75/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /the verdict flips/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Run \+0\.50 swap check now/i }));
    expect(screen.getByText(/Flips on swap!/i)).toBeInTheDocument();

    const compactView = renderWithVis(<JudgePositionBiasDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('NeuralOperatorDiagram: autoplays diffusion time, pauses off-screen, edits shape/D/N_x, compact mode, predict', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<NeuralOperatorDiagram />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 6/i)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByText(/Step 2 of 6/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <NeuralOperatorDiagram />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(4500));
    expect(screen.getByText(/Step 2 of 6/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '80 pts (fine)' }));
    expect(screen.getByText(/80 grid points/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Thermal diffusivity D'), { target: { value: '0.6' } });
    fireEvent.change(screen.getByLabelText('Exact diffusion time t'), { target: { value: '1.5' } });
    expect(screen.getByText(/Worked numbers · t = 1\.5, D = 0\.60/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /high-frequency modes decay fastest/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Test Square pulse at t = 0\.2 now/i }));
    expect(screen.getByText(/Worked numbers · t = 0\.2, D = 0\.60/i)).toBeInTheDocument();

    const compactView = renderWithVis(<NeuralOperatorDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('TokenBucketAdmissionExplorer: starts on informative burst, autoplays, pauses off-screen, edits C/r/burst, compact mode, predict', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<TokenBucketAdmissionExplorer />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 2 of 4/i)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Accepted 5 · rejected 2 · tokens 0');

    act(() => vi.advanceTimersByTime(2200));
    expect(screen.getByText(/Step 3 of 4/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <TokenBucketAdmissionExplorer />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(4500));
    expect(screen.getByText(/Step 3 of 4/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Refill rate tokens per second'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next request' }));
    expect(screen.getByRole('status')).toHaveTextContent('Accepted 5 · rejected 3 · tokens 0.5');

    fireEvent.click(screen.getByRole('button', { name: /Only 1 passes and 1 rejects/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Test 2 follow-ups now/i }));
    expect(screen.getByRole('status')).toHaveTextContent('Accepted 6 · rejected 3 · tokens 0');

    const compactView = renderWithVis(<TokenBucketAdmissionExplorer compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
    const bucketClipRect = view.container.querySelector('svg clipPath rect');
    const clipRight = Number(bucketClipRect?.getAttribute('x') ?? 0) + Number(bucketClipRect?.getAttribute('width') ?? 0);
    const droppedLabel = Array.from(view.container.querySelectorAll('svg text')).find((n) =>
      /dropped$/.test(n.textContent ?? ''),
    );
    expect(droppedLabel).toBeDefined();
    expect(clipRight - Number(droppedLabel!.getAttribute('x'))).toBeGreaterThanOrEqual(120);
  });

  it('ConsistentHashMembershipExplorer: autoplays keys, pauses off-screen, moves D=70 & edits keys/vnodes, compact mode, predict', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<ConsistentHashMembershipExplorer />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 5/i)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2150));
    expect(screen.getByText(/Step 2 of 5/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <ConsistentHashMembershipExplorer />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(4500));
    expect(screen.getByText(/Step 2 of 5/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Exact node D position'), { target: { value: '70' } });
    expect(screen.getByRole('status')).toHaveTextContent('key 60, C → D');

    fireEvent.click(screen.getByRole('button', { name: '2 tokens' }));
    expect(screen.getByText(/Worked numbers · D at 70, 2 tokens\/server/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Key 60 moves from C to D/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Place D at 70 now/i }));
    expect(screen.getByRole('status')).toHaveTextContent('key 60, C → D');

    const compactView = renderWithVis(<ConsistentHashMembershipExplorer compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('respects prefers-reduced-motion across all 5 playgrounds and obeys notebook font/color/latex rules', () => {
    withReducedMotion(() => {
      for (const node of [
        <WriteSkewExplorer key="w" />,
        <JudgePositionBiasDiagram key="j" />,
        <NeuralOperatorDiagram key="n" />,
        <TokenBucketAdmissionExplorer key="t" />,
        <ConsistentHashMembershipExplorer key="c" />,
      ]) {
        const view = renderWithVis(node, true);
        expect(screen.getAllByRole('button', { name: 'Play' }).length).toBeGreaterThanOrEqual(1);
        view.unmount();
      }
    });

    for (const file of [
      'WriteSkewExplorer.tsx',
      'JudgePositionBiasDiagram.tsx',
      'NeuralOperatorDiagram.tsx',
      'TokenBucketAdmissionExplorer.tsx',
      'ConsistentHashMembershipExplorer.tsx',
    ]) {
      const src = readFileSync(join(__dirname, file), 'utf8');
      expect(src).not.toMatch(/monospace/i);
      expect(src).not.toMatch(/textTransform:\s*['"]uppercase['"]/);
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    }
  });
});
