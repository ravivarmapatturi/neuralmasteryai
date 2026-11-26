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

import GraphTreeTraversalExplorer from './GraphTreeTraversalExplorer';
import Bm25SaturationExplorer from './diagrams/Bm25SaturationExplorer';

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

describe('C18 real playgrounds', () => {
  it('GraphTreeTraversalExplorer: autoplays BFS/DFS, pauses off-screen, supports free graph input, tree LCA, compact mode, predict', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<GraphTreeTraversalExplorer />, true);
    assertCleanPlayground(view.container, 2, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/What just happened · step 1 of 5/i)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1500));
    expect(screen.getByText(/What just happened · step 2 of 5/i)).toBeInTheDocument();

    // Off-screen pauses playback
    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <GraphTreeTraversalExplorer />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.getByText(/What just happened · step 2 of 5/i)).toBeInTheDocument();

    // Switch to DFS via clickable formula sticky note and check stack duplicate C on step 3
    fireEvent.click(screen.getByRole('button', { name: /DFS · Stack/i }));
    expect(screen.getByText(/What just happened · step 1 of 6/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Step →' }));
    fireEvent.click(screen.getByRole('button', { name: 'Step →' }));
    expect(view.container.textContent).toContain('[C, E, C]');

    // Free graph editing recomputes traversal live
    fireEvent.change(screen.getByLabelText('Graph connections'), {
      target: { value: 'X: Y\nY: X, Z\nZ: Y' },
    });
    expect(view.container.textContent).toContain('Start X');

    // Tree LCA mode: p=6, q=7 skips node 7
    fireEvent.click(screen.getByRole('button', { name: /Tree: Find the LCA/i }));
    fireEvent.click(screen.getByRole('button', { name: /Ancestor & child \(6, 7\)/i }));
    expect(view.container.textContent).toContain('Targets p = 6, q = 7');

    // Predict challenge jumps directly to node 6 matching p
    fireEvent.click(screen.getByRole('button', { name: /Node 7 is never visited/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Run p = 6, q = 7 now/i }));
    expect(view.container.textContent).toContain('Node 6 matches target p');

    // Compact mode renders picture + 2 sticky notes and hides full controls
    cleanup();
    const compactView = renderWithVis(<GraphTreeTraversalExplorer compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
    expect(screen.queryByLabelText('Graph connections')).not.toBeInTheDocument();
  });

  it('Bm25SaturationExplorer: clean notebook layout, KaTeX notes, SVG bounds, and compact mode', () => {
    const view = renderWithVis(<Bm25SaturationExplorer />, true);
    assertCleanPlayground(view.container, 3, 2);

    // Click formula sticky note to switch highlighted note
    fireEvent.click(screen.getByRole('button', { name: /1\. Rarity weight \(IDF\)/i }));
    expect(screen.getByRole('button', { name: /1\. Rarity weight \(IDF\)/i })).toHaveAttribute('aria-pressed', 'true');

    cleanup();
    const compactView = renderWithVis(<Bm25SaturationExplorer compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
    expect(screen.queryByLabelText('Docs with word df')).not.toBeInTheDocument();
  });

  it('respects prefers-reduced-motion and obeys font/color/latex rules across both C18 files', () => {
    withReducedMotion(() => {
      for (const node of [
        <GraphTreeTraversalExplorer key="gtt" />,
        <Bm25SaturationExplorer key="bm25" />,
      ]) {
        const view = renderWithVis(node, true);
        expect(screen.getAllByRole('button', { name: 'Play' }).length).toBeGreaterThanOrEqual(1);
        view.unmount();
      }
    });

    for (const relPath of ['GraphTreeTraversalExplorer.tsx', 'diagrams/Bm25SaturationExplorer.tsx']) {
      const src = readFileSync(join(__dirname, relPath), 'utf8');
      expect(src).not.toMatch(/monospace/i);
      expect(src).not.toMatch(/textTransform:\s*['"]uppercase['"]/);
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    }
  });
});
