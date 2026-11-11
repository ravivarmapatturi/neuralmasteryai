import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BlogCover, {
  variantFor,
  getDeterministicColors,
  COVER_PALETTE_LIGHT,
  COVER_PALETTE_DARK,
} from './BlogCover';
import blogMeta from '../data/blogMeta.generated.json';

describe('BlogCover topic to motif mapping', () => {
  it('maps topic families by tags correctly', () => {
    // 1. Transformers and Attention
    expect(
      variantFor('kimi-k3-linear-attention', null, ['LLM architecture', 'linear attention'])
    ).toBe('transformers-attention');

    // 2. RAG and Retrieval
    expect(
      variantFor('do-agents-need-a-memory-system', null, ['agents', 'agent memory', 'retrieval'])
    ).toBe('rag-retrieval');

    // 3. Agents and Tool Use
    expect(
      variantFor('agent-skills-explained', null, ['agents', 'agent skills', 'MCP'])
    ).toBe('agents');

    // 4. Training and Optimization
    expect(
      variantFor('from-classifiers-to-jepa', null, ['self-supervised learning', 'JEPA'])
    ).toBe('training-optimization');

    // 5. Evaluation, Safety & Cryptographic Proofs
    expect(
      variantFor('flashprove-provable-inference', null, ['AI security', 'inference', 'provable'])
    ).toBe('evaluation-safety');

    // 6. System Design and Decision Models
    expect(
      variantFor('jeva-decision-models', null, ['decision models', 'text classification'])
    ).toBe('system-design');

    // 7. Careers, Disciplines and What to Learn Next
    expect(
      variantFor('what-is-changing-in-ai-engineering-and-what-to-learn-next', null, [
        'ai engineering',
        'agents',
      ])
    ).toBe('careers-interviews');

    // 8. News & Model Announcements
    expect(
      variantFor('claude-fable-5-2-what-anthropic-announced', null, ['anthropic', 'claude', 'news'])
    ).toBe('news');
  });

  it('maps healthcare series posts to their respective part motifs', () => {
    expect(variantFor('us-healthcare-1-the-map', 'us-healthcare')).toBe('healthcare-map');
    expect(variantFor('us-healthcare-2-public-and-private-coverage', 'us-healthcare')).toBe('healthcare-coverage');
    expect(variantFor('us-healthcare-4-the-code-systems', 'us-healthcare')).toBe('healthcare-codes');
    expect(variantFor('us-healthcare-10-prior-authorization', 'us-healthcare')).toBe('healthcare-priorauth');
    expect(variantFor('us-healthcare-18-data-rules-and-ai', 'us-healthcare')).toBe('healthcare-ai');
  });

  it('provides deterministic color variations so two posts on the same topic differ', () => {
    const col1 = getDeterministicColors('world-models-verify-gui-agents');
    const col2 = getDeterministicColors('agent-skills-explained');

    expect(col1.light).toMatch(/^#[0-9a-f]{6}$/i);
    expect(col2.light).toMatch(/^#[0-9a-f]{6}$/i);
    expect(COVER_PALETTE_LIGHT).toContain(col1.light);
    expect(COVER_PALETTE_DARK).toContain(col1.dark);

    // Repeated calls with same slug yield identical color
    expect(getDeterministicColors('agent-skills-explained')).toEqual(col2);
  });

  it('verifies that in the live catalog, no more than three posts share the same motif and color pair', () => {
    const pairCounts: Record<string, number> = {};
    const motifCounts: Record<string, number> = {};

    for (const post of blogMeta) {
      const motif = variantFor(post.slug, post.series, post.tags);
      const color = getDeterministicColors(post.slug);
      const key = `${motif} + ${color.light}`;

      pairCounts[key] = (pairCounts[key] || 0) + 1;
      motifCounts[motif] = (motifCounts[motif] || 0) + 1;
    }

    // No more than three posts share the same motif and colour pair
    for (const [pair, count] of Object.entries(pairCounts)) {
      expect(
        count,
        `Pair "${pair}" has ${count} posts, which exceeds the limit of 3`
      ).toBeLessThanOrEqual(3);
    }

    // Generic fallback 'default' should be rare (0 in catalog)
    expect(motifCounts['default'] ?? 0).toBe(0);
  });

  it('renders BlogCover with accessible label, hand-drawn typography and SVG content', () => {
    render(<BlogCover slug="kimi-k3-linear-attention" />);

    const cover = screen.getByRole('img', { name: /Editorial visual: ATTENTION/i });
    expect(cover).toBeInTheDocument();
    expect(cover).toHaveTextContent(/ATTENTION\s+×\s+KV CACHE/);

    const svg = cover.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveStyle({ fontFamily: 'var(--font-hand)' });
  });
});
