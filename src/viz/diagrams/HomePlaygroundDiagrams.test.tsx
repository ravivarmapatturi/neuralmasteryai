import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});
import EmbeddingSimilaritySearchDiagram from './EmbeddingSimilaritySearchDiagram';
import KvCacheDiagram from './KvCacheDiagram';

describe('home-page real playgrounds', () => {
  it('switches vector metrics and replaces both the general and worked formula', () => {
    render(<EmbeddingSimilaritySearchDiagram />);

    // All three formulas are on sticky notes; the one in use is pressed.
    expect(screen.getByRole('button', { name: /Cosine similarity/ })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'L2' }));
    expect(screen.getByRole('button', { name: /Euclidean distance/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/= sqrt\(\(0\.80−0\.60\)²/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dot' }));
    expect(screen.getByRole('button', { name: /Dot product/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/= 0\.80×1\.70 \+ 0\.60×0\.40/)).toBeInTheDocument();
  });

  it('lets the learner step through ranked documents and edit the query vector', () => {
    render(<EmbeddingSimilaritySearchDiagram />);

    fireEvent.click(screen.getByRole('button', { name: 'Step →' }));
    expect(screen.getByText(/Step 2 of 5/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Query dim 1'), { target: { value: '1.25' } });
    expect(screen.getByText(/Step 1 of 5/)).toBeInTheDocument();
    expect(screen.getByText(/\(1\.25×/)).toBeInTheDocument();
  });

  it('shows the real KV append trace and advances one generated token at a time', () => {
    render(<KvCacheDiagram />);

    expect(screen.getByRole('img', { name: /Generated token sat appends key/i })).toBeInTheDocument();
    expect(screen.getByText(/Step 1\/3: We appended K\/V for “sat”/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Step →' }));
    expect(screen.getByText(/Step 2\/3: We appended K\/V for “softly”/)).toBeInTheDocument();
  });

  it('recomputes KV memory from editable model dimensions', () => {
    render(<KvCacheDiagram />);

    expect(screen.getByText(/1,073,741,824 bytes \(1\.00 GiB\)/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Sequence tokens'), { target: { value: '4096' } });
    expect(screen.getByText(/536,870,912 bytes \(0\.50 GiB\)/)).toBeInTheDocument();
  });
});
