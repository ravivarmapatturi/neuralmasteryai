import { describe, expect, it } from 'vitest';
import { analyzePagedAttention, tokensAtStep } from './pagedAttention';

describe('pagedAttention pure calculations', () => {
  it('hand-checks PagedAttention vs Contiguous on [60, 46, 78] tokens with B=16, Lmax=256', () => {
    const paged = analyzePagedAttention({
      mode: 'paged',
      blockSize: 16,
      maxSeqLen: 256,
      totalBlocks: 32,
      requestTokens: [60, 46, 78],
    });
    // Blocks needed: ceil(60/16)=4, ceil(46/16)=3, ceil(78/16)=5 => 12 blocks (192 slots)
    expect(paged.admittedCount).toBe(3);
    expect(paged.rejectedCount).toBe(0);
    expect(paged.allocatedBlocksTotal).toBe(12);
    expect(paged.freeBlocksTotal).toBe(20);
    expect(paged.allocatedSlotsTotal).toBe(192);
    expect(paged.usedTokensAdmitted).toBe(184);
    expect(paged.wastedSlotsAdmitted).toBe(8);
    expect(paged.wastePct).toBeCloseTo((8 / 192) * 100, 4);

    const contiguous = analyzePagedAttention({
      mode: 'contiguous',
      blockSize: 16,
      maxSeqLen: 256,
      totalBlocks: 32,
      requestTokens: [60, 46, 78],
    });
    // Contiguous locks 16 blocks per request: Req A + Req B consume all 32 blocks; Req C is blocked
    expect(contiguous.contiguousBlocksPerReq).toBe(16);
    expect(contiguous.admittedCount).toBe(2);
    expect(contiguous.rejectedCount).toBe(1);
    expect(contiguous.requests[2].admitted).toBe(false);
    expect(contiguous.allocatedSlotsTotal).toBe(512);
    expect(contiguous.usedTokensAdmitted).toBe(106);
    expect(contiguous.wastedSlotsAdmitted).toBe(406);
    expect(contiguous.wastePct).toBeCloseTo((406 / 512) * 100, 4);
  });

  it('recomputes block counts cleanly when blockSize changes or generation advances', () => {
    const nextTokens = tokensAtStep([60, 46, 78], 4);
    expect(nextTokens).toEqual([92, 70, 118]);

    const resB8 = analyzePagedAttention({
      mode: 'paged',
      blockSize: 8,
      maxSeqLen: 128,
      totalBlocks: 32,
      requestTokens: [25, 16, 19],
    });
    // ceil(25/8)=4, ceil(16/8)=2, ceil(19/8)=3 => 9 blocks (72 slots), 60 used, 12 tail waste
    expect(resB8.allocatedBlocksTotal).toBe(9);
    expect(resB8.wastedSlotsAdmitted).toBe(12);
  });
});
