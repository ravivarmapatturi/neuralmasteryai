import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});

import Bm25SaturationExplorer from './Bm25SaturationExplorer';

describe('Bm25SaturationExplorer', () => {
  it('renders default one-term calculator with exact fixture values (IDF 2.299, TF factor 1.571, score 3.612)', () => {
    render(<Bm25SaturationExplorer />);

    expect(screen.getByRole('group', { name: /Interactive BM25 Saturation & Calculator/i })).toBeInTheDocument();
    expect(screen.getByText(/BM25 vs. TF-IDF: Saturation Curve & Score Calculator/i)).toBeInTheDocument();

    // Default fixture cards:
    // N=1000, df=100, avgdl=100, tf=3, docLength=100, k1=1.2, b=0.75
    // Smoothed IDF: 2.299
    expect(screen.getByText('2.299')).toBeInTheDocument();
    // Length Factor B: 1.000
    expect(screen.getByText('1.000')).toBeInTheDocument();
    // TF Factor: 1.571
    expect(screen.getByText('1.571')).toBeInTheDocument();
    // BM25 Term Score: 3.612
    expect(screen.getByText('3.612')).toBeInTheDocument();
  });

  it('updates calculator output when preset button "Keyword Saturation (tf=30)" is clicked', () => {
    render(<Bm25SaturationExplorer />);

    const satPresetBtn = screen.getByRole('button', { name: /Keyword Saturation \(tf=30\)/i });
    fireEvent.click(satPresetBtn);

    // Score increases to approx 4.862 due to diminishing returns
    expect(screen.getByText('4.862')).toBeInTheDocument();
  });

  it('updates calculator output when preset button "Long Document (|D|=500)" is clicked', () => {
    render(<Bm25SaturationExplorer />);

    const longDocBtn = screen.getByRole('button', { name: /Long Document \(\|D\|=500\)/i });
    fireEvent.click(longDocBtn);

    // Score penalized down from 3.612 to approx 1.945
    expect(screen.getByText('1.945')).toBeInTheDocument();
  });

  it('switches to TF vs BM25 Saturation Chart tab and responds to k1 slider', () => {
    render(<Bm25SaturationExplorer />);

    const chartTabBtn = screen.getByRole('button', { name: /2\. TF vs\. BM25 Saturation Chart/i });
    fireEvent.click(chartTabBtn);

    // Chart elements rendered
    expect(screen.getByRole('img', { name: /BM25 term frequency saturation curve/i })).toBeInTheDocument();
    expect(screen.getByText(/Asymptote ceiling: k1 \+ 1 = 2.2/i)).toBeInTheDocument();

    // Adjust k1 slider
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '2.0' } });

    // Asymptote ceiling updates to 3.0
    expect(screen.getByText(/Asymptote ceiling: k1 \+ 1 = 3.0/i)).toBeInTheDocument();
  });
});
