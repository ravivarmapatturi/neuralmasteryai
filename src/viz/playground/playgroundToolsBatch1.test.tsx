import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fromPretrainedMock = vi.fn();

vi.mock('@huggingface/transformers', () => ({
  AutoTokenizer: {
    from_pretrained: fromPretrainedMock,
  },
  env: {
    allowLocalModels: true,
    useBrowserCache: false,
  },
}));

vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});

import AiStackMapTour from './AiStackMapTour';
import AnomalyLoopAlarmLab from './AnomalyLoopAlarmLab';
import RolePathBuilder from './RolePathBuilder';
import ServingVramEstimator from './ServingVramEstimator';
import TechniqueTradeoffComparator from './TechniqueTradeoffComparator';
import TokenizerPrefixCacheInspector from './TokenizerPrefixCacheInspector';
import { computeStackTrace } from './aiStackMapData';
import {
  orderSortedSignature,
  evaluateAgentSuite,
  SAMPLE_AGENT_TRACES,
} from './anomalyLoopDetector';
import { computePrefixCacheDiff, preTokenizePreview } from './prefixCacheDiff';
import { buildPrunedSkillPath } from './rolePathBuilder';
import { computeServingVram } from './servingVramMath';
import { computeRadarPolygonPoints } from './techniqueTradeoffs';

describe('Commit 1 pure logic & numeric formulas', () => {
  it('computes AI stack trace differences across chat, rag, and agent modes', () => {
    const chat = computeStackTrace('chat', false, false);
    const agent = computeStackTrace('agent', false, true);
    expect(chat.modelCalls).toBe(1);
    expect(agent.modelCalls).toBe(4);
    expect(agent.totalLatencyMs).toBeGreaterThan(chat.totalLatencyMs);
    expect(agent.activeLayers).toContain('evals');
  });

  it('prunes known prerequisites from Role-Based Skill Gap DAG and estimates weeks', () => {
    const emptyPlan = buildPrunedSkillPath('ai-engineer', new Set(), 10);
    const prunedPlan = buildPrunedSkillPath('ai-engineer', new Set(['cs', 'python', 'math']), 10);

    expect(prunedPlan.savedHours).toBe(6 + 5 + 7);
    expect(prunedPlan.remainingHours).toBe(emptyPlan.remainingHours - 18);
    expect(prunedPlan.estimatedWeeks).toBe(Math.ceil(prunedPlan.remainingHours / 10));

    const allKnown = buildPrunedSkillPath(
      'ai-engineer',
      new Set(['cs', 'python', 'math', 'ml', 'dl', 'llm-rag', 'agents', 'eval-safety']),
      8,
    );
    expect(allKnown.remainingHours).toBe(0);
    expect(allKnown.estimatedWeeks).toBe(0);
  });

  it('computes prefix cache break index and block-aligned reuse accurately', () => {
    const t1 = preTokenizePreview('System rule one. User asks alpha');
    const t2 = preTokenizePreview('System rule one. User asks beta');
    const exactDiff = computePrefixCacheDiff(t1, t2, 1);

    expect(exactDiff.commonPrefixTokens).toBe(6);
    expect(exactDiff.breakIndex).toBe(6);
    expect(exactDiff.cachedPrefixTokens).toBe(6);
    expect(exactDiff.recomputedTurn2Tokens).toBe(1);

    // With 16-token KV blocks, a 6-token common prefix aligns to 0 full blocks
    const pagedDiff = computePrefixCacheDiff(t1, t2, 16);
    expect(pagedDiff.cachedPrefixTokens).toBe(0);
    expect(pagedDiff.recomputedTurn2Tokens).toBe(7);
  });

  it('produces order-invariant sorted signatures and detects loops, ping-pong, and cost spikes', () => {
    const s1 = orderSortedSignature('edit_file', { path: 'a.py', mode: 'replace' });
    const s2 = orderSortedSignature('edit_file', { mode: 'replace', path: 'a.py' });
    expect(s1).toBe(s2);

    const suite = evaluateAgentSuite(SAMPLE_AGENT_TRACES, {
      maxRepeatFailures: 3,
      pingPongEnabled: true,
      costSpikeZScore: 2.5,
      windowSize: 6,
    });
    expect(suite.tp).toBe(6);
    expect(suite.fp).toBe(0);
    expect(suite.precision).toBe(1);
    expect(suite.recall).toBe(1);

    const relaxedSuite = evaluateAgentSuite(SAMPLE_AGENT_TRACES, {
      maxRepeatFailures: 3,
      pingPongEnabled: true,
      costSpikeZScore: 4.0,
      windowSize: 6,
    });
    expect(relaxedSuite.recall).toBeLessThan(1);
  });

  it('matches hand-checked VRAM sizing and decode ceiling formulas from the Learn chapters', () => {
    // Case 1: Llama-3.1-8B-like: 8.03B BF16 weights, 32 layers, 8 kv heads, 128 headDim, BF16 KV
    const llama8b = computeServingVram({
      paramsB: 8.03,
      weightBytes: 2,
      layers: 32,
      kvHeads: 8,
      headDim: 128,
      kvBytes: 2,
      contextLength: 8192,
      batchSize: 32,
      overheadGiB: 2,
      gpuVramGiB: 80,
      gpuBandwidthGBs: 2039,
      gpuCount: 1,
    });
    // 8.03 * 1e9 * 2 / 1024^3 = 14.957 GiB
    expect(llama8b.weightsGiB).toBeCloseTo(14.957, 2);
    // 2 * 32 * 8 * 128 * 2 / 1024 = 128 KiB/token
    expect(llama8b.kvKiBPerToken).toBe(128);
    // 8192 * 128 KiB = 1.0 GiB/seq -> 32 seqs = 32.0 GiB
    expect(llama8b.kvPerSeqGiB).toBeCloseTo(1.0, 5);
    expect(llama8b.totalKvGiB).toBeCloseTo(32.0, 5);
    // Total VRAM = 14.957 + 32.0 + 2.0 = 48.957 GiB -> fits in 1x 80 GiB GPU
    expect(llama8b.totalVramNeededGiB).toBeCloseTo(48.957, 2);
    expect(llama8b.minGpusNeeded).toBe(1);

    // Case 2: 7B model BF16 (14 GB) and INT4 (3.5 GB) on 2,000 GB/s (2 TB/s) GPU
    const bf16Ceiling = computeServingVram({
      paramsB: 7,
      weightBytes: 2,
      layers: 32,
      kvHeads: 8,
      headDim: 128,
      kvBytes: 2,
      contextLength: 8192,
      batchSize: 1,
      overheadGiB: 2,
      gpuVramGiB: 80,
      gpuBandwidthGBs: 2000,
      gpuCount: 1,
    });
    expect(bf16Ceiling.singleSeqDecodeCeilingTokS).toBeCloseTo(142.857, 2);

    const int4Ceiling = computeServingVram({
      paramsB: 7,
      weightBytes: 0.5,
      layers: 32,
      kvHeads: 8,
      headDim: 128,
      kvBytes: 2,
      contextLength: 8192,
      batchSize: 1,
      overheadGiB: 2,
      gpuVramGiB: 80,
      gpuBandwidthGBs: 2000,
      gpuCount: 1,
    });
    expect(int4Ceiling.singleSeqDecodeCeilingTokS).toBeCloseTo(571.429, 2);
  });

  it('computes 5 vertices for the trade-off radar polygon', () => {
    const pts = computeRadarPolygonPoints(
      { throughput: 5, memory: 4, simplicity: 3, fidelity: 5, robustness: 2 },
      240,
      185,
      120,
    );
    expect(pts.split(' ')).toHaveLength(5);
  });
});

describe('Commit 1 interactive components', () => {
  beforeEach(() => {
    fromPretrainedMock.mockReset();
  });

  it('renders AiStackMapTour and updates trace when toggling workload and cache', () => {
    render(<AiStackMapTour />);
    expect(screen.getByRole('group', { name: 'AI Stack Map Interactive Tour' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tool-using agent loop' }));
    expect(screen.getByText(/4 model calls/i)).toBeInTheDocument();
  });

  it('renders RolePathBuilder and updates remaining hours when toggling known modules', () => {
    render(<RolePathBuilder />);
    expect(screen.getByRole('group', { name: 'Role-Based Skill Gap & Path Builder' })).toBeInTheDocument();
    const mathBtn = screen.getByRole('button', { name: 'Math for AI' });
    fireEvent.click(mathBtn);
    expect(mathBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('TokenizerPrefixCacheInspector loads Xenova/gpt2 AutoTokenizer only on click', async () => {
    fromPretrainedMock.mockResolvedValue({
      encode: (text: string) => text.split(' ').map((_, i) => i + 100),
      decode: (ids: number[]) => `tok${ids[0]}`,
    });

    render(<TokenizerPrefixCacheInspector />);
    expect(fromPretrainedMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Load GPT-2 BPE tokenizer' }));
    await waitFor(() => {
      expect(fromPretrainedMock).toHaveBeenCalledWith('Xenova/gpt2');
    });
  });

  it('renders AnomalyLoopAlarmLab, ServingVramEstimator, and TechniqueTradeoffComparator', () => {
    render(<AnomalyLoopAlarmLab />);
    expect(screen.getByRole('group', { name: 'Anomaly & Loop Alarm Threshold Lab' })).toBeInTheDocument();

    render(<ServingVramEstimator />);
    expect(screen.getByRole('group', { name: 'Serving & VRAM Sizing Estimator' })).toBeInTheDocument();
    expect(screen.getByText(/128 KiB\/tok/i)).toBeInTheDocument();

    render(<TechniqueTradeoffComparator />);
    expect(screen.getByRole('group', { name: 'Technique Trade-Off Radar & Comparator' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Training Atlas' }));
    expect(screen.getByRole('button', { name: 'QLoRA' })).toBeInTheDocument();
  });
});
