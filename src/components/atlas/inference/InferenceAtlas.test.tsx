import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { inferenceAtlasEntries } from '../../../data/inferenceAtlas';
import InferenceAtlas from './InferenceAtlas';

function renderAtlas() {
  return render(<MemoryRouter><ThemeProvider><InferenceAtlas /></ThemeProvider></MemoryRouter>);
}

describe('inference atlas data', () => {
  it('covers every required technique with complete fields and an HTTPS source', () => {
    const required = ['greedy-decoding','beam-search','top-k','top-p','temperature','repetition-penalty','kv-cache','static-batching','continuous-batching','speculative-decoding','prefix-caching','disaggregated-prefill-decode','dynamic-quantization','static-quantization','gptq','awq','gguf','pruning','onnx','flash-attention','gqa','paged-kv-cache','structured-output','model-routing','semantic-caching','autoscaling-cold-start','webgpu','wasm','roofline','ttft-tps-p99'];
    expect(inferenceAtlasEntries.map((entry) => entry.id)).toEqual(expect.arrayContaining(required));
    expect(inferenceAtlasEntries).toHaveLength(required.length);
    for (const entry of inferenceAtlasEntries) {
      expect(entry.source.url).toMatch(/^https:\/\//);
      expect(entry.learnPath).toMatch(/^\/docs\//);
      expect(entry.whatItIs.length).toBeGreaterThan(80);
      expect(entry.requestState.length).toBeGreaterThan(40);
      expect(entry.example.length).toBeGreaterThan(30);
      expect(entry.metrics.length).toBeGreaterThan(40);
      expect(entry.avoid.length).toBeGreaterThan(20);
      expect(entry.cameBefore).toBeTruthy();
      expect(entry.ledTo).toBeTruthy();
      expect(entry.diagram).toBeTruthy();
    }
  });
});

describe('InferenceAtlas', () => {
  it('filters, searches, and expands a technique', () => {
    renderAtlas();
    expect(screen.getByText('Beam search')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Filter by category'), { target: { value: 'Kernel' } });
    expect(screen.queryByText('Beam search')).not.toBeInTheDocument();
    expect(screen.getByText('FlashAttention')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search techniques'), { target: { value: 'shared key' } });
    fireEvent.click(screen.getByRole('button', { name: /GQA/ }));
    expect(screen.getAllByText('Eight query heads form two groups of four, so the cache stores two K heads and two V heads rather than eight of each.')).toHaveLength(2);
    expect(screen.getByRole('img', { name: /Query heads fan into two shared/ })).toBeInTheDocument();
  });
});

it('gives every entry its own hand-drawn diagram', async () => {
  const { inferenceDiagramKinds } = await import('./InferenceTechniqueDiagram');
  const { inferenceAtlasEntries } = await import('../../../data/inferenceAtlas');
  const kinds = inferenceAtlasEntries.map(entry => entry.diagram);
  expect(new Set(kinds).size).toBe(kinds.length);
  for (const kind of kinds) expect(inferenceDiagramKinds).toContain(kind);
});
