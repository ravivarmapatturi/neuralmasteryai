import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ThemeProvider } from '../../theme/ThemeProvider';
import PreDispatchInterceptorDiagram from './PreDispatchInterceptorDiagram';
import TwoPassCompactionFlowDiagram from './TwoPassCompactionFlowDiagram';
import VerificationFunnelDiagram from './VerificationFunnelDiagram';
import AutonomousGoalLoopDiagram from './AutonomousGoalLoopDiagram';
import TreeAttentionDraftDiagram from './TreeAttentionDraftDiagram';
import DisaggregatedServingArchDiagram from './DisaggregatedServingArchDiagram';
import RadixTreePrefixDiagram from './RadixTreePrefixDiagram';
import HarnessCurriculumDiagram from './HarnessCurriculumDiagram';
import InferenceCurriculumDiagram from './InferenceCurriculumDiagram';

describe('Fix Pass Diagram Components', () => {
  it('renders PreDispatchInterceptorDiagram without throwing', () => {
    const { container } = render(
      <ThemeProvider>
        <PreDispatchInterceptorDiagram />
      </ThemeProvider>
    );
    expect(container.querySelector('svg')).toBeDefined();
    expect(container.textContent).toContain('Pre-Dispatch');
  });

  it('renders TwoPassCompactionFlowDiagram without throwing', () => {
    const { container } = render(
      <ThemeProvider>
        <TwoPassCompactionFlowDiagram />
      </ThemeProvider>
    );
    expect(container.querySelector('svg')).toBeDefined();
    expect(container.textContent).toContain('Two-Pass Compaction');
  });

  it('renders VerificationFunnelDiagram without throwing', () => {
    const { container } = render(
      <ThemeProvider>
        <VerificationFunnelDiagram />
      </ThemeProvider>
    );
    expect(container.querySelector('svg')).toBeDefined();
    expect(container.textContent).toContain('LAYER 1: STATIC AUDIT');
  });

  it('renders AutonomousGoalLoopDiagram without throwing', () => {
    const { container } = render(
      <ThemeProvider>
        <AutonomousGoalLoopDiagram />
      </ThemeProvider>
    );
    expect(container.querySelector('svg')).toBeDefined();
    expect(container.textContent).toContain('Goal Loop');
  });

  it('renders TreeAttentionDraftDiagram without throwing', () => {
    const { container } = render(
      <ThemeProvider>
        <TreeAttentionDraftDiagram />
      </ThemeProvider>
    );
    expect(container.querySelector('svg')).toBeDefined();
    expect(container.textContent).toContain('Tree Attention');
  });

  it('renders DisaggregatedServingArchDiagram without throwing', () => {
    const { container } = render(
      <ThemeProvider>
        <DisaggregatedServingArchDiagram />
      </ThemeProvider>
    );
    expect(container.querySelector('svg')).toBeDefined();
    expect(container.textContent).toContain('Prefill Worker Pool');
  });

  it('renders RadixTreePrefixDiagram without throwing', () => {
    const { container } = render(
      <ThemeProvider>
        <RadixTreePrefixDiagram />
      </ThemeProvider>
    );
    expect(container.querySelector('svg')).toBeDefined();
    expect(container.textContent).toContain('Radix Tree');
  });

  it('renders HarnessCurriculumDiagram without throwing', () => {
    const { container } = render(
      <ThemeProvider>
        <HarnessCurriculumDiagram />
      </ThemeProvider>
    );
    expect(container.querySelector('svg')).toBeDefined();
    expect(container.textContent).toContain('Foundations');
  });

  it('renders InferenceCurriculumDiagram without throwing', () => {
    const { container } = render(
      <ThemeProvider>
        <InferenceCurriculumDiagram />
      </ThemeProvider>
    );
    expect(container.querySelector('svg')).toBeDefined();
    expect(container.textContent).toContain('Roofline & KV');
  });
});
