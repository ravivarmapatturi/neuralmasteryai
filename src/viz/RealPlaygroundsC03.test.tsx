import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../theme/ThemeProvider';
import { VizVisibleContext } from './primitives';

vi.mock('../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../theme/vizTokens')>('../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});

import DiffusionForwardProcessDiagram from './diagrams/DiffusionForwardProcessDiagram';
import GeneratorMemoryDiagram from './diagrams/GeneratorMemoryDiagram';
import AsyncEventLoopDiagram from './diagrams/AsyncEventLoopDiagram';
import ConsensusQuorumDiagram from './diagrams/ConsensusQuorumDiagram';
import AdversarialPerturbationDiagram from './diagrams/AdversarialPerturbationDiagram';

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

describe('C03 real live playgrounds', () => {
  it('DiffusionForwardProcessDiagram: autoplays steps, pauses off-screen, switches schedules, jumps to t=500, compact mode', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<DiffusionForwardProcessDiagram />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(view.container.textContent).toContain('Step 0 of 1000');

    act(() => vi.advanceTimersByTime(700));
    expect(view.container.textContent).toContain('Step 50 of 1000');

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <DiffusionForwardProcessDiagram />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(3000));
    expect(view.container.textContent).toContain('Step 50 of 1000');

    fireEvent.click(screen.getByRole('button', { name: /2\. Cosine schedule/i }));
    expect(screen.getByRole('button', { name: /2\. Cosine schedule/i })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: /Under 10%/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Jump to t = 500 \(Linear\) now/i }));
    expect(view.container.textContent).toContain('Step 500 of 1000');
    expect(view.container.textContent).toContain('0.079');

    cleanup();
    const compactView = renderWithVis(<DiffusionForwardProcessDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
    expect(screen.queryByLabelText('Noise seed')).not.toBeInTheDocument();
  });

  it('GeneratorMemoryDiagram: autoplays 6-item trace, pauses off-screen, hits 976.6 MB vs 0.049 MB on N=20,000, compact mode', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<GeneratorMemoryDiagram />, true);
    assertCleanPlayground(view.container, 2, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(view.container.textContent).toContain('step 1 of 7');

    act(() => vi.advanceTimersByTime(1350));
    expect(view.container.textContent).toContain('step 2 of 7');

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <GeneratorMemoryDiagram />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(4000));
    expect(view.container.textContent).toContain('step 2 of 7');

    fireEvent.click(screen.getByRole('button', { name: /1\. List memory: O\(N\)/i }));
    expect(screen.getByRole('button', { name: /1\. List memory: O\(N\)/i })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: /Generator stays at 0\.049 MB/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Test N = 20,000 with 512 MB limit now/i }));
    expect(view.container.textContent).toContain('976.6 MB');
    expect(view.container.textContent).toContain('0.049 MB');

    cleanup();
    const compactView = renderWithVis(<GeneratorMemoryDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
    expect(screen.queryByLabelText('Item size (KB each)')).not.toBeInTheDocument();
  });

  it('AsyncEventLoopDiagram: autoplays timeline, pauses off-screen, shows 380 ms vs 140 ms and 240 ms starvation, compact mode', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<AsyncEventLoopDiagram />, true);
    assertCleanPlayground(view.container, 2, 2);

    expect(view.container.textContent).toContain('380 ms');
    expect(view.container.textContent).toContain('140 ms');

    act(() => vi.advanceTimersByTime(1150));
    expect(view.container.textContent).toContain('t = 15 ms');

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <AsyncEventLoopDiagram />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(4000));
    expect(view.container.textContent).toContain('t = 15 ms');

    fireEvent.click(screen.getByRole('button', { name: /Total async time jumps from 140 ms to 240 ms/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Add 100 ms CPU blocker to r1 now/i }));
    expect(view.container.textContent).toContain('240 ms');
    expect(view.container.textContent).toContain('CPU hog');

    cleanup();
    const compactView = renderWithVis(<AsyncEventLoopDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
    expect(screen.queryByLabelText('I/O wait W (ms)')).not.toBeInTheDocument();
  });

  it('ConsensusQuorumDiagram: autoplays Raft vote, pauses off-screen, toggles N=4 with 2 crashes to halt, compact mode', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<ConsensusQuorumDiagram />, true);
    assertCleanPlayground(view.container, 2, 2);

    expect(view.container.textContent).toContain('step 1 of 4');

    act(() => vi.advanceTimersByTime(1650));
    expect(view.container.textContent).toContain('step 2 of 4');

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <ConsensusQuorumDiagram />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(4000));
    expect(view.container.textContent).toContain('step 2 of 4');

    fireEvent.change(screen.getByLabelText('Proposed write'), { target: { value: 'set lock = true' } });
    expect(view.container.textContent).toContain('set lock = true');

    fireEvent.click(screen.getByRole('button', { name: /Still only 1 crash/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Test N = 4 with 2 crashes now/i }));
    expect(view.container.textContent).toContain('2/4 (< 3) — HALTED');

    cleanup();
    const compactView = renderWithVis(<ConsensusQuorumDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
    expect(screen.queryByLabelText('Proposed write')).not.toBeInTheDocument();
  });

  it('AdversarialPerturbationDiagram: autoplays epsilon sweep, pauses off-screen, tests eps=0.10 flip vs random, compact mode', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<AdversarialPerturbationDiagram />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(view.container.textContent).toContain('ε = 0.00');

    act(() => vi.advanceTimersByTime(1350));
    expect(view.container.textContent).toContain('ε = 0.05');

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <AdversarialPerturbationDiagram />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(4000));
    expect(view.container.textContent).toContain('ε = 0.05');

    fireEvent.click(screen.getByRole('button', { name: /2\. FGSM/i }));
    expect(screen.getByRole('button', { name: /2\. FGSM/i })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: /About ε = 0\.10/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Test L2 step ε = 0\.10 now/i }));
    expect(view.container.textContent).toContain('FLIPPED!');
    expect(view.container.textContent).toContain('-0.012');

    cleanup();
    const compactView = renderWithVis(<AdversarialPerturbationDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
    expect(screen.queryByLabelText('Start x₁')).not.toBeInTheDocument();
  });

  it('respects prefers-reduced-motion and obeys font, hex-color, and raw LaTeX rules across all 5 files', () => {
    withReducedMotion(() => {
      for (const node of [
        <DiffusionForwardProcessDiagram key="diff" />,
        <GeneratorMemoryDiagram key="gen" />,
        <AsyncEventLoopDiagram key="async" />,
        <ConsensusQuorumDiagram key="cons" />,
        <AdversarialPerturbationDiagram key="adv" />,
      ]) {
        const view = renderWithVis(node, true);
        expect(screen.getAllByRole('button', { name: 'Play' }).length).toBeGreaterThanOrEqual(1);
        view.unmount();
      }
    });

    for (const relPath of [
      'diagrams/DiffusionForwardProcessDiagram.tsx',
      'diagrams/GeneratorMemoryDiagram.tsx',
      'diagrams/AsyncEventLoopDiagram.tsx',
      'diagrams/ConsensusQuorumDiagram.tsx',
      'diagrams/AdversarialPerturbationDiagram.tsx',
    ]) {
      const src = readFileSync(join(__dirname, relPath), 'utf8');
      expect(src).not.toMatch(/monospace/i);
      expect(src).not.toMatch(/textTransform:\s*['"]uppercase['"]/);
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}/);
      // Every StickyNote latex prop uses String.raw`...`
      const latexProps = Array.from(src.matchAll(/latex=\{([^}]+)\}/g)).map((m) => m[1]);
      expect(latexProps.length).toBeGreaterThanOrEqual(2);
      for (const expr of latexProps) {
        expect(expr).toMatch(/^String\.raw`/);
      }
    }
  });
});
