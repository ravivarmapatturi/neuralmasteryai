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

import SpeculativeDecodingSimulator from './diagrams/SpeculativeDecodingSimulator';
import RagPipelineSimulator from './RagPipelineSimulator';
import AgentControlFlowGraphDiagram from './diagrams/AgentControlFlowGraphDiagram';
import NeuralNetworkPlayground from './NeuralNetworkPlayground';
import RooflineModelVisualizer from './diagrams/RooflineModelVisualizer';

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

describe('real playgrounds batch C16', () => {
  it('SpeculativeDecodingSimulator: autoplays draft->verify, pauses off-screen, matches K=4 alpha=0.75 (2.18x), compact mode, predict', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<SpeculativeDecodingSimulator />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 5/i)).toBeInTheDocument();
    // Hand-checked Learn page example: E[N] = 3.05, 42.0 ms step, 2.18x
    expect(view.container.textContent).toContain('3.05');
    expect(view.container.textContent).toContain('42.0 ms');
    expect(view.container.textContent).toContain('2.18×');

    act(() => vi.advanceTimersByTime(1550));
    expect(screen.getByText(/Step 2 of 5/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <SpeculativeDecodingSimulator />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.getByText(/Step 2 of 5/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Draft guesses'), { target: { value: 'hello world again soon' } });
    expect(view.container.textContent).toContain('hello');

    fireEvent.click(screen.getByRole('button', { name: /speedup drops to 0\.83×/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Run α = 0\.20, K = 5 now/i }));
    expect(screen.getByText(/Step 6 of 6/i)).toBeInTheDocument();
    expect(view.container.textContent).toContain('0.83×');

    const compactView = renderWithVis(<SpeculativeDecodingSimulator compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('RagPipelineSimulator: autoplays stages, pauses off-screen, updates chunks on 30 words & query, compact mode, predict', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<RagPipelineSimulator />, true);
    assertCleanPlayground(view.container, 2, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 5/i)).toBeInTheDocument();
    expect(view.container.textContent).toContain('chunks indexed');

    act(() => vi.advanceTimersByTime(2050));
    expect(screen.getByText(/Step 2 of 5/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <RagPipelineSimulator />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(/Step 2 of 5/i)).toBeInTheDocument();

    const beforeText = view.container.textContent ?? '';
    fireEvent.click(screen.getByRole('button', { name: '30 words' }));
    expect(view.container.textContent).not.toBe(beforeText);

    fireEvent.change(screen.getByLabelText('RAG question'), { target: { value: 'KV cache GPU memory' } });
    expect(view.container.textContent).toContain('KV cache');

    fireEvent.click(screen.getByRole('button', { name: /More chunks are indexed/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Test 8-word chunks, 0 overlap now/i }));
    expect(view.container.textContent).toContain('40 chunks indexed');

    const compactView = renderWithVis(<RagPipelineSimulator compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('AgentControlFlowGraphDiagram: autoplays transitions, pauses off-screen, matches c_3=0.834, edits cap & threshold, compact mode, predict', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<AgentControlFlowGraphDiagram />, true);
    assertCleanPlayground(view.container, 2, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 10/i)).toBeInTheDocument();
    expect(view.container.textContent).toContain('Confidence threshold');

    act(() => vi.advanceTimersByTime(1350));
    expect(screen.getByText(/Step 2 of 10/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <AgentControlFlowGraphDiagram />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.getByText(/Step 2 of 10/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Agent task goal'), { target: { value: 'Check API billing' } });
    fireEvent.change(screen.getByLabelText('Max attempts guard'), { target: { value: '2' } });
    expect(view.container.textContent).toContain('M = 2');

    fireEvent.click(screen.getByRole('button', { name: /3 attempts \(c₁ = 0\.450/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Jump to Check after 3 Acts now/i }));
    expect(view.container.textContent).toContain('0.834');

    const compactView = renderWithVis(<AgentControlFlowGraphDiagram compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('NeuralNetworkPlayground: autoplays training, pauses off-screen, switches datasets & Linear, compact mode, predict', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<NeuralNetworkPlayground />, true);
    assertCleanPlayground(view.container, 3, 3);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(view.container.textContent).toContain('Epoch 0');

    act(() => vi.advanceTimersByTime(220));
    expect(view.container.textContent).toContain('Epoch 4');

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <NeuralNetworkPlayground />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(1000));
    expect(view.container.textContent).toContain('Epoch 4');

    fireEvent.change(screen.getByLabelText('L2 regularization penalty'), { target: { value: '0.01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Spiral' }));
    expect(view.container.textContent).toContain('Spiral');

    fireEvent.click(screen.getByRole('button', { name: /Only a single straight line/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Run XOR \+ Linear now/i }));
    expect(view.container.textContent).toContain('Linear');

    const compactView = renderWithVis(<NeuralNetworkPlayground compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('RooflineModelVisualizer: autoplays batch sweep, pauses off-screen, matches A100 B=1 (2.04 TFLOP/s), compact mode, predict', () => {
    vi.useFakeTimers();
    const view = renderWithVis(<RooflineModelVisualizer />, true);
    assertCleanPlayground(view.container, 3, 2);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 5/i)).toBeInTheDocument();
    expect(view.container.textContent).toContain('2.04 TFLOP/s');

    act(() => vi.advanceTimersByTime(1850));
    expect(screen.getByText(/Step 2 of 5/i)).toBeInTheDocument();

    view.rerender(
      <ThemeProvider>
        <VizVisibleContext.Provider value={false}>
          <RooflineModelVisualizer />
        </VizVisibleContext.Provider>
      </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.getByText(/Step 2 of 5/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'NVIDIA H100' }));
    expect(view.container.textContent).toContain('590.7 FLOP/B');

    fireEvent.click(screen.getByRole('button', { name: /Speed stays at 2\.04 TFLOP\/s/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Test 2× A100 compute at B = 1 now/i }));
    expect(view.container.textContent).toContain('2.04 TFLOP/s');
    expect(view.container.textContent).toContain('1.00×');

    const compactView = renderWithVis(<RooflineModelVisualizer compact />, true);
    expect(compactView.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
  });

  it('respects prefers-reduced-motion across all 5 playgrounds and obeys notebook font/color/latex rules', () => {
    withReducedMotion(() => {
      for (const node of [
        <SpeculativeDecodingSimulator key="spec" />,
        <RagPipelineSimulator key="rag" />,
        <AgentControlFlowGraphDiagram key="acfg" />,
        <NeuralNetworkPlayground key="mlp" />,
        <RooflineModelVisualizer key="roof" />,
      ]) {
        const view = renderWithVis(node, true);
        expect(screen.getAllByRole('button', { name: 'Play' }).length).toBeGreaterThanOrEqual(1);
        view.unmount();
      }
    });

    for (const relPath of [
      'diagrams/SpeculativeDecodingSimulator.tsx',
      'RagPipelineSimulator.tsx',
      'diagrams/AgentControlFlowGraphDiagram.tsx',
      'NeuralNetworkPlayground.tsx',
      'diagrams/RooflineModelVisualizer.tsx',
    ]) {
      const src = readFileSync(join(__dirname, relPath), 'utf8');
      expect(src).not.toMatch(/monospace/i);
      expect(src).not.toMatch(/textTransform:\s*['"]uppercase['"]/);
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    }
  });
});
