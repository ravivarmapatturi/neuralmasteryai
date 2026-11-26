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

import ReturnDiscountingDiagram from './diagrams/ReturnDiscountingDiagram';
import SpecificationGamingDiagram from './diagrams/SpecificationGamingDiagram';
import StagedDeploymentDiagram from './diagrams/StagedDeploymentDiagram';
import SuperpositionDiagram from './diagrams/SuperpositionDiagram';
import TcpVsUdpDiagram from './diagrams/TcpVsUdpDiagram';

function renderWithVisibility(ui: React.ReactElement, visible = true) {
  return render(
    <ThemeProvider>
      <VizVisibleContext.Provider value={visible}>{ui}</VizVisibleContext.Provider>
    </ThemeProvider>,
  );
}

function assertPlaygroundShape(container: HTMLElement, minKatex: number, minClips = 1) {
  const outer = container.querySelector('.nm-viz-frame');
  expect(outer).not.toBeNull();
  expect(outer!.querySelectorAll('.nm-viz-frame, .nm-pg__panel')).toHaveLength(0);
  expect(container.querySelectorAll('.nm-sticky').length).toBeGreaterThanOrEqual(4);
  expect(container.querySelectorAll('.katex').length).toBeGreaterThanOrEqual(minKatex);
  expect(container.querySelectorAll('.katex-error')).toHaveLength(0);
  expect(container.querySelectorAll('clipPath').length).toBeGreaterThanOrEqual(minClips);
  const svg = container.querySelector('svg[viewBox]');
  expect(svg?.getAttribute('viewBox')).toMatch(/^0 0 760 /);
  for (const text of Array.from(container.querySelectorAll('svg text'))) {
    const size = Number(text.getAttribute('font-size'));
    expect(size).toBeGreaterThanOrEqual(14);
    expect(size).toBeLessThanOrEqual(16);
  }
}

function rerenderOffscreen(view: ReturnType<typeof renderWithVisibility>, ui: React.ReactElement) {
  view.rerender(
    <ThemeProvider>
      <VizVisibleContext.Provider value={false}>{ui}</VizVisibleContext.Provider>
    </ThemeProvider>,
  );
}

function withReducedMotion(fn: () => void) {
  const original = window.matchMedia;
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
    window.matchMedia = original;
  }
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('C02 real live playgrounds', () => {
  it('return discounting autoplays, pauses off-screen, accepts free numbers, runs prediction, and compacts', () => {
    vi.useFakeTimers();
    const view = renderWithVisibility(<ReturnDiscountingDiagram />);
    assertPlaygroundShape(view.container, 2);
    expect(view.container.textContent).toContain('step 0 of 8');
    act(() => vi.advanceTimersByTime(900));
    expect(view.container.textContent).toContain('step 1 of 8');
    rerenderOffscreen(view, <ReturnDiscountingDiagram />);
    act(() => vi.advanceTimersByTime(3000));
    expect(view.container.textContent).toContain('step 1 of 8');

    fireEvent.change(screen.getByLabelText('Discount factor γ'), { target: { value: '0.5' } });
    fireEvent.change(screen.getByLabelText('Wait k (steps)'), { target: { value: '4' } });
    expect(view.container.textContent).toContain('2.500');
    fireEvent.click(screen.getByRole('button', { name: 'Take 2 points now' }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();

    cleanup();
    const compact = renderWithVisibility(<ReturnDiscountingDiagram compact />);
    expect(compact.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
    expect(screen.queryByLabelText('Discount factor γ')).not.toBeInTheDocument();
  });

  it('staged deployment autoplays gates, pauses off-screen, computes the 2.47% case, and compacts', () => {
    vi.useFakeTimers();
    const view = renderWithVisibility(<StagedDeploymentDiagram />);
    assertPlaygroundShape(view.container, 2, 2);
    expect(view.container.textContent).toContain('gate 1 of 4');
    act(() => vi.advanceTimersByTime(1700));
    expect(view.container.textContent).toContain('gate 2 of 4');
    rerenderOffscreen(view, <StagedDeploymentDiagram />);
    act(() => vi.advanceTimersByTime(4000));
    expect(view.container.textContent).toContain('gate 2 of 4');

    fireEvent.click(screen.getByRole('button', { name: 'Under 5%' }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Run the 1-in-2,000 rollout now/i }));
    expect(view.container.textContent).toContain('2.47%');

    cleanup();
    const compact = renderWithVisibility(<StagedDeploymentDiagram compact />);
    expect(compact.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
    expect(screen.queryByLabelText('Internal interactions')).not.toBeInTheDocument();
  });

  it('TCP versus UDP autoplays packets, pauses off-screen, exposes real network inputs, and compacts', () => {
    vi.useFakeTimers();
    const view = renderWithVisibility(<TcpVsUdpDiagram />);
    assertPlaygroundShape(view.container, 2, 2);
    expect(view.container.textContent).toContain('packet 1 of 6');
    act(() => vi.advanceTimersByTime(1200));
    expect(view.container.textContent).toContain('packet 2 of 6');
    rerenderOffscreen(view, <TcpVsUdpDiagram />);
    act(() => vi.advanceTimersByTime(4000));
    expect(view.container.textContent).toContain('packet 2 of 6');

    fireEvent.change(screen.getByLabelText('First-send loss (%)'), { target: { value: '100' } });
    expect(view.container.textContent).toContain('6 retries');
    fireEvent.click(screen.getByRole('button', { name: /TCP delivers all packets, but later/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();

    cleanup();
    const compact = renderWithVisibility(<TcpVsUdpDiagram compact />);
    expect(compact.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
    expect(screen.queryByLabelText('First-send loss (%)')).not.toBeInTheDocument();
  });

  it('specification gaming autoplays the reward trace, pauses off-screen, proves 10.8 beats 10, and compacts', () => {
    vi.useFakeTimers();
    const view = renderWithVisibility(<SpecificationGamingDiagram />);
    assertPlaygroundShape(view.container, 2);
    expect(view.container.textContent).toContain('step 0 of 40');
    act(() => vi.advanceTimersByTime(700));
    expect(view.container.textContent).toContain('step 2 of 40');
    rerenderOffscreen(view, <SpecificationGamingDiagram />);
    act(() => vi.advanceTimersByTime(3000));
    expect(view.container.textContent).toContain('step 2 of 40');

    fireEvent.click(screen.getByRole('button', { name: /Loop six times: 10.8 points/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Run the 20-step comparison now/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Step' }));
    expect(view.container.textContent).toContain('10.8');

    cleanup();
    const compact = renderWithVisibility(<SpecificationGamingDiagram compact />);
    expect(compact.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
    expect(screen.queryByLabelText('Training horizon H')).not.toBeInTheDocument();
  });

  it('superposition autoplays feature inspection, pauses off-screen, runs the 0.500 vs 0.000 case, and compacts', () => {
    vi.useFakeTimers();
    const view = renderWithVisibility(<SuperpositionDiagram />);
    assertPlaygroundShape(view.container, 3, 2);
    expect(view.container.textContent).toContain('feature 1 of 6');
    act(() => vi.advanceTimersByTime(1400));
    expect(view.container.textContent).toContain('feature 2 of 6');
    rerenderOffscreen(view, <SuperpositionDiagram />);
    act(() => vi.advanceTimersByTime(4000));
    expect(view.container.textContent).toContain('feature 2 of 6');

    fireEvent.click(screen.getByRole('button', { name: /The 4-neuron wide basis/i }));
    expect(screen.getByText(/Right —/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Run n=4, m=2, three active now/i }));
    expect(view.container.textContent).toContain('MSE 0.500');
    expect(view.container.textContent).toContain('MSE 0.000');

    cleanup();
    const compact = renderWithVisibility(<SuperpositionDiagram compact />);
    expect(compact.container.querySelectorAll('.nm-sticky')).toHaveLength(2);
    expect(screen.queryByLabelText('Features n')).not.toBeInTheDocument();
  });

  it('respects reduced motion and enforces notebook font, colour, and raw-LaTeX rules', () => {
    withReducedMotion(() => {
      for (const component of [
        <ReturnDiscountingDiagram key="return" />,
        <StagedDeploymentDiagram key="staged" />,
        <TcpVsUdpDiagram key="tcp" />,
        <SpecificationGamingDiagram key="spec" />,
        <SuperpositionDiagram key="super" />,
      ]) {
        const view = renderWithVisibility(component);
        expect(screen.getAllByRole('button', { name: 'Play' }).length).toBeGreaterThan(0);
        view.unmount();
      }
    });

    for (const relative of [
      'diagrams/ReturnDiscountingDiagram.tsx',
      'diagrams/StagedDeploymentDiagram.tsx',
      'diagrams/TcpVsUdpDiagram.tsx',
      'diagrams/SpecificationGamingDiagram.tsx',
      'diagrams/SuperpositionDiagram.tsx',
    ]) {
      const source = readFileSync(join(__dirname, relative), 'utf8');
      expect(source).not.toMatch(/monospace/i);
      expect(source).not.toMatch(/textTransform:\s*['"]uppercase['"]/);
      expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}/);
      expect(source).not.toMatch(/<text[^>]+fontSize=\{?(?:[0-9]|1[0-3]|1[7-9]|[2-9][0-9])\}?(?:\s|>)/);
      expect(source.match(/String\.raw`/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    }
  });
});
