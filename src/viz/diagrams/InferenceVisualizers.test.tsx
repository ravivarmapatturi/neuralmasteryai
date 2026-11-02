import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ThemeProvider } from '../../theme/ThemeProvider';
import DisaggregationPrefixCachingVisualizer from './DisaggregationPrefixCachingVisualizer';
import KernelMemoryHierarchyVisualizer from './KernelMemoryHierarchyVisualizer';

describe('Inference Visualizers', () => {
  it('renders DisaggregationPrefixCachingVisualizer and switches modes', () => {
    render(
      <ThemeProvider>
        <DisaggregationPrefixCachingVisualizer />
      </ThemeProvider>
    );
    expect(screen.getByText('Decoupling Prefill Compute from Decode Bandwidth')).toBeDefined();
    const radixBtn = screen.getByRole('button', { name: /2\. Radix Tree Prefix Cache/i });
    fireEvent.click(radixBtn);
    expect(screen.getByText(/Shared System Prefix/i)).toBeDefined();
  });

  it('renders KernelMemoryHierarchyVisualizer and switches modes', () => {
    render(
      <ThemeProvider>
        <KernelMemoryHierarchyVisualizer />
      </ThemeProvider>
    );
    expect(screen.getByText('Why Memory Bandwidth Governs Transformer Execution')).toBeDefined();
    const flashBtn = screen.getByRole('button', { name: /2\. FlashAttention SRAM Tiling/i });
    fireEvent.click(flashBtn);
    expect(screen.getAllByText(/Online Softmax Rescaling/i).length).toBeGreaterThan(0);
  });
});
