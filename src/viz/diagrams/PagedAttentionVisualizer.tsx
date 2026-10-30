import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, VizButton } from '../primitives';

type Mode = 'contiguous' | 'paged';

interface Request {
  id: string;
  name: string;
  tokensGenerated: number;
  maxTokens: number;
  color: string;
  // For contiguous: index in buffer
  contiguousSlot: number;
  // For paged: list of physical page IDs (each page = 16 tokens)
  physicalBlocks: number[];
}

export default function PagedAttentionVisualizer() {
  const t = useVizTokens();
  const [mode, setMode] = useState<Mode>('paged');
  const [tokenStep, setTokenStep] = useState<number>(0);

  // Total GPU KV Cache Pool = 32 blocks (16 tokens per block = 512 tokens capacity)
  const TOTAL_BLOCKS = 32;
  const TOKENS_PER_BLOCK = 16;
  const TOTAL_TOKEN_CAPACITY = TOTAL_BLOCKS * TOKENS_PER_BLOCK;

  // Requests currently active
  const baseRequests: Request[] = [
    {
      id: 'req_a',
      name: 'Req A ("Translate code")',
      tokensGenerated: 48 + tokenStep * 8,
      maxTokens: 256,
      color: t.accentPurple,
      contiguousSlot: 0,
      physicalBlocks: [0, 4, 11, 15, 23].slice(0, Math.ceil((48 + tokenStep * 8) / TOKENS_PER_BLOCK)),
    },
    {
      id: 'req_b',
      name: 'Req B ("Summarize paper")',
      tokensGenerated: 32 + tokenStep * 4,
      maxTokens: 256,
      color: t.accentTeal,
      contiguousSlot: 1,
      physicalBlocks: [2, 7, 18, 26].slice(0, Math.ceil((32 + tokenStep * 4) / TOKENS_PER_BLOCK)),
    },
    {
      id: 'req_c',
      name: 'Req C ("Write PyTorch test")',
      tokensGenerated: 64 + tokenStep * 12,
      maxTokens: 256,
      color: t.accentPrimary,
      contiguousSlot: 2, // In contiguous mode, slot 2 would overcommit 3x256=768 > 512, failing to fit!
      physicalBlocks: [1, 5, 8, 12, 19, 27].slice(0, Math.ceil((64 + tokenStep * 12) / TOKENS_PER_BLOCK)),
    },
  ];

  const handleStep = () => {
    setTokenStep((s) => (s + 1) % 5);
  };

  const handleReset = () => {
    setTokenStep(0);
  };

  // Contiguous Mode Math:
  // Each request pre-allocates 256 tokens = 16 blocks regardless of actual length!
  // Request A takes blocks 0..15. Request B takes blocks 16..31.
  // Request C CANNOT BE SCHEDULED (OOM) because only 2 slots exist!
  const contiguousAllocatedTokens = mode === 'contiguous' ? 2 * 256 : 0;
  const contiguousUsedTokens = mode === 'contiguous' ? baseRequests[0].tokensGenerated + baseRequests[1].tokensGenerated : 0;
  const contiguousWastePercent = mode === 'contiguous' ? Math.round(((contiguousAllocatedTokens - contiguousUsedTokens) / contiguousAllocatedTokens) * 100) : 0;

  // Paged Mode Math:
  // Dynamically allocate 1 block (16 tokens) on demand.
  const pagedUsedBlocks = baseRequests.reduce((acc, r) => acc + Math.ceil(r.tokensGenerated / TOKENS_PER_BLOCK), 0);
  const pagedUsedTokens = baseRequests.reduce((acc, r) => acc + r.tokensGenerated, 0);
  const pagedAllocatedTokens = pagedUsedBlocks * TOKENS_PER_BLOCK;
  const pagedWastePercent = Math.round(((pagedAllocatedTokens - pagedUsedTokens) / pagedAllocatedTokens) * 100);

  return (
    <VisualizationContainer footer="PagedAttention (vLLM, Kwon et al.) brings virtual memory paging to LLM serving. In traditional contiguous allocation, 60% to 80% of VRAM is wasted on over-reservation and external fragmentation. PagedAttention eliminates external fragmentation completely, enabling 2x to 4x higher serving throughput.">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.accentPrimary }}>
            vLLM & High-Throughput Serving Architecture
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary }}>
            PagedAttention vs Contiguous KV Cache Allocation
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <VizButton onClick={handleStep}>+ Generate Next Tokens</VizButton>
          <VizButton variant="secondary" onClick={handleReset}>Reset</VizButton>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <PillSelect<Mode>
          label="Memory Allocation Strategy"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'paged', label: '1. PagedAttention (vLLM Virtual Memory)' },
            { value: 'contiguous', label: '2. Naive Contiguous Allocation (Pre-allocated max_seq_len)' },
          ]}
        />
      </div>

      {/* Comparison Metrics Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>Active Concurrent Requests</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: mode === 'paged' ? t.accentPrimary : t.accentDanger, marginTop: 2 }}>
            {mode === 'paged' ? '3 of 3 Serving' : '2 of 3 (Req C Queued/OOM)'}
          </div>
          <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 2 }}>
            {mode === 'paged' ? 'Near-zero memory fragmentation' : 'Cannot fit Req C (needs 256 contiguous tokens)'}
          </div>
        </div>

        <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>Memory Waste / Fragmentation</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: mode === 'paged' ? t.accentPrimary : t.accentDanger, marginTop: 2 }}>
            {mode === 'paged' ? `${pagedWastePercent}% (Internal tail only)` : `${contiguousWastePercent}% (Unused Reservation)`}
          </div>
          <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 2 }}>
            {mode === 'paged' ? 'Only partial last block is unused' : 'Pre-reserved max_seq_len sits idle'}
          </div>
        </div>

        <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>Serving Throughput Gain</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: mode === 'paged' ? t.accentTeal : t.textMuted, marginTop: 2 }}>
            {mode === 'paged' ? '2.4x - 3.8x Speedup' : '1.0x (Baseline)'}
          </div>
          <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 2 }}>
            Batches more requests into the same VRAM
          </div>
        </div>
      </div>

      {/* Visual Memory Grid */}
      <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary }}>
            Physical GPU KV Cache Memory ({TOTAL_BLOCKS} Blocks = {TOTAL_TOKEN_CAPACITY} Tokens)
          </span>
          <span style={{ fontSize: 11, color: t.textMuted }}>Each cell = 1 Physical Block (16 Tokens)</span>
        </div>

        {/* 32 Physical Blocks Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6, marginBottom: 16 }}>
          {Array.from({ length: TOTAL_BLOCKS }).map((_, idx) => {
            let blockOwner: Request | undefined;
            let isWastedContiguous = false;

            if (mode === 'paged') {
              blockOwner = baseRequests.find((r) => r.physicalBlocks.includes(idx));
            } else {
              // Contiguous slots: 0..15 belongs to Req A, 16..31 belongs to Req B
              if (idx < 16) {
                blockOwner = baseRequests[0];
                if (idx >= Math.ceil(baseRequests[0].tokensGenerated / TOKENS_PER_BLOCK)) {
                  isWastedContiguous = true;
                }
              } else {
                blockOwner = baseRequests[1];
                if (idx - 16 >= Math.ceil(baseRequests[1].tokensGenerated / TOKENS_PER_BLOCK)) {
                  isWastedContiguous = true;
                }
              }
            }

            const isAllocated = !!blockOwner;
            const bg = isWastedContiguous
              ? `${t.accentDanger}33`
              : isAllocated
              ? blockOwner.color
              : t.background;
            const borderColor = isWastedContiguous ? t.accentDanger : isAllocated ? blockOwner.color : t.border;

            return (
              <div
                key={idx}
                style={{
                  height: 38,
                  borderRadius: 4,
                  background: bg,
                  border: `1px solid ${borderColor}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontFamily: 'monospace',
                  color: isWastedContiguous ? t.accentDanger : isAllocated ? '#000' : t.textMuted,
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                }}
              >
                <span>B#{idx}</span>
                <span style={{ fontSize: 9 }}>
                  {isWastedContiguous ? 'WASTED' : isAllocated ? blockOwner.id.replace('req_', '').toUpperCase() : 'FREE'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', borderTop: `1px solid ${t.border}`, paddingTop: 10 }}>
          {baseRequests.map((r) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{ width: 12, height: 12, borderRadius: 2, background: r.color }} />
              <strong style={{ color: t.textPrimary }}>{r.name}:</strong>
              <span style={{ color: t.textSecondary }}>{r.tokensGenerated} tokens</span>
            </div>
          ))}
          {mode === 'contiguous' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{ width: 12, height: 12, borderRadius: 2, background: `${t.accentDanger}33`, border: `1px solid ${t.accentDanger}` }} />
              <strong style={{ color: t.accentDanger }}>Over-Reserved Idle Space</strong>
            </div>
          )}
        </div>
      </div>
    </VisualizationContainer>
  );
}
