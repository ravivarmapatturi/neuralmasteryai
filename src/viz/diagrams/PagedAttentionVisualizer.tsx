import { useId, useMemo, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../../theme/vizTokens';
import {
  PillSelect,
  Slider,
  StickyNote,
  StickyRow,
  useVizVisible,
  VisualizationContainer,
  VisualizationHeader,
  VizButton,
} from '../primitives';
import {
  analyzePagedAttention,
  DEFAULT_BASE_TOKENS,
  tokensAtStep,
  TOTAL_STEPS,
  type AllocationMode,
} from '../lib/pagedAttention';
import { PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

type FormulaTab = 'paged' | 'contiguous' | 'blocks';

const FORMULA_LATEX: Record<FormulaTab, string> = {
  paged: String.raw`\text{Tail waste} \le (B - 1)\text{ per req}`,
  contiguous: String.raw`\text{Waste} = \sum_i (L_{\max} - L_i)`,
  blocks: String.raw`\text{Pages}_i = \lceil L_i / B \rceil`,
};

const PREDICT_OPTIONS = [
  'No — A and B locked all 32 blocks (512 slots), blocking C with 79% idle VRAM',
  'Yes — Req C automatically borrows the 406 unused slots inside A and B',
  'Yes — contiguous reservations shrink down to actual length immediately',
] as const;

function PagedAttentionPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipLeftId = useId();
  const clipRightId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [mode, setMode] = useState<AllocationMode>('paged');
  const [blockSize, setBlockSize] = useState<number>(16);
  const [maxSeqLen, setMaxSeqLen] = useState<number>(256);
  const [baseTokens, setBaseTokens] = useState<[number, number, number]>([...DEFAULT_BASE_TOKENS]);
  const [activeFormula, setActiveFormula] = useState<FormulaTab>('paged');
  const [prediction, setPrediction] = useState<number | null>(null);

  const playback = useStepPlayback(TOTAL_STEPS, 2000, 0, outerVisible);
  const liveTokens = useMemo(() => tokensAtStep(baseTokens, playback.step), [baseTokens, playback.step]);

  const analysis = useMemo(
    () =>
      analyzePagedAttention({
        mode,
        blockSize,
        maxSeqLen,
        totalBlocks: 32,
        requestTokens: liveTokens,
      }),
    [mode, blockSize, maxSeqLen, liveTokens],
  );

  const reqColors: Record<'A' | 'B' | 'C', string> = {
    A: t.accentPurple,
    B: t.accentTeal,
    C: t.accentPrimary,
  };
  const wasteColor = t.accentDanger;
  const activeColor = t.accentSecondary;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    minHeight: 34,
    padding: '4px 8px',
    font: 'inherit',
    fontSize: 15,
    fontVariantNumeric: 'tabular-nums',
    border: `1.5px solid ${t.border}`,
    borderRadius: RADIUS.sm,
    background: t.background,
    color: t.textPrimary,
  };

  const selectMode = (nextMode: AllocationMode) => {
    setMode(nextMode);
    setActiveFormula(nextMode);
  };

  const updateReqToken = (idx: 0 | 1 | 2, val: number) => {
    const clamped = Math.max(1, Math.min(200, Math.round(val)));
    setBaseTokens((prev) => {
      const next: [number, number, number] = [...prev] as [number, number, number];
      next[idx] = clamped;
      return next;
    });
    playback.setStep(0);
  };

  // Kwon et al. (2023) Fig. 2 convention: Logical KV blocks + Block Table -> Physical memory pool
  const renderLogicalPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 10;
    const plotY = 34;
    const plotW = panelW - 20;
    const plotH = 226;

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          1. Logical pages &amp; block table ({analysis.mode === 'paged' ? 'vLLM' : 'fixed'})
        </text>
        <defs>
          <clipPath id={`${clipLeftId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipLeftId}-${offsetX})`}>
          {analysis.requests.map((req, rIdx) => {
            const ry = plotY + 12 + rIdx * 70;
            const col = reqColors[req.id];
            const neededBlocks = Math.ceil(req.usedTokens / analysis.blockSize);
            const shownMap = req.physicalBlocks.slice(0, 4);
            const extraCount = req.physicalBlocks.length - shownMap.length;

            return (
              <g key={req.id}>
                <text x={plotX + 10} y={ry + 16} fontSize={14} fontWeight={700} fill={req.admitted ? col : wasteColor}>
                  {req.label}: {req.usedTokens} tok ({neededBlocks} pg{neededBlocks === 1 ? '' : 's'})
                </text>
                <text x={plotX + plotW - 10} y={ry + 16} textAnchor="end" fontSize={14} fontWeight={700} fill={req.admitted ? t.textSecondary : wasteColor}>
                  {req.admitted
                    ? analysis.mode === 'paged'
                      ? `${req.wastedSlots} tail idle`
                      : `locks ${req.allocatedSlots} slots`
                    : 'Blocked (OOM!)'}
                </text>

                {!req.admitted ? (
                  <g>
                    <rect x={plotX + 10} y={ry + 24} width={plotW - 20} height={28} rx={4} fill={`${wasteColor}18`} stroke={wasteColor} strokeWidth={1.5} strokeDasharray="4 3" />
                    <text x={plotX + plotW / 2} y={ry + 43} textAnchor="middle" fontSize={14} fontWeight={700} fill={wasteColor}>
                      Needs {analysis.contiguousBlocksPerReq} blocks — 0 left!
                    </text>
                  </g>
                ) : analysis.mode === 'paged' ? (
                  <g>
                    {shownMap.map((pid, lIdx) => {
                      const chipW = Math.floor((plotW - 20 - 4 * 4) / (extraCount > 0 ? 5 : 4));
                      const cx = plotX + 10 + lIdx * (chipW + 4);
                      return (
                        <g key={`${req.id}-m-${lIdx}`}>
                          <rect x={cx} y={ry + 24} width={chipW} height={28} rx={4} fill={`${col}18`} stroke={col} strokeWidth={1.3} />
                          <text x={cx + chipW / 2} y={ry + 43} textAnchor="middle" fontSize={14} fontWeight={700} fill={col}>
                            L{lIdx}→P{pid}
                          </text>
                        </g>
                      );
                    })}
                    {extraCount > 0 && (
                      <text x={plotX + plotW - 14} y={ry + 43} textAnchor="end" fontSize={14} fontWeight={700} fill={col}>
                        +{extraCount}
                      </text>
                    )}
                  </g>
                ) : (
                  <g>
                    {(() => {
                      const barW = plotW - 20;
                      const usedW = Math.max(8, (req.usedTokens / req.allocatedSlots) * barW);
                      return (
                        <>
                          <rect x={plotX + 10} y={ry + 24} width={barW} height={28} rx={4} fill={`${wasteColor}20`} stroke={wasteColor} strokeWidth={1.4} />
                          <rect x={plotX + 10} y={ry + 24} width={usedW} height={28} rx={4} fill={col} fillOpacity={0.85} />
                          <text x={plotX + 18} y={ry + 43} fontSize={14} fontWeight={700} fill={t.background}>
                            {req.usedTokens} used
                          </text>
                          <text x={plotX + barW} y={ry + 43} textAnchor="end" fontSize={14} fontWeight={700} fill={wasteColor}>
                            {req.wastedSlots} empty
                          </text>
                        </>
                      );
                    })()}
                  </g>
                )}
              </g>
            );
          })}
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 20} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          {analysis.mode === 'paged' ? 'L = logical page · P = physical GPU frame' : `Each slot locks ${analysis.maxSeqLen} tokens upfront`}
        </text>
      </g>
    );
  };

  const renderPhysicalPoolPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 10;
    const plotY = 34;
    const plotW = panelW - 20;
    const plotH = 226;

    const cols = 8;
    const gap = 4;
    const gridPadX = 10;
    const cellW = Math.floor((plotW - gridPadX * 2 - (cols - 1) * gap) / cols);
    const cellH = 34;
    const gridStartX = plotX + gridPadX;
    const gridStartY = plotY + 12;

    const summaryBarW = plotW - 20;
    const usedRatio = analysis.usedTokensAdmitted / analysis.totalPoolTokens;
    const wasteRatio = analysis.wastedSlotsAdmitted / analysis.totalPoolTokens;

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2. Physical GPU pool ({analysis.totalBlocks} × {analysis.blockSize} = {analysis.totalPoolTokens})
        </text>
        <defs>
          <clipPath id={`${clipRightId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipRightId}-${offsetX})`}>
          {analysis.cells.map((cell, idx) => {
            const c = idx % cols;
            const r = Math.floor(idx / cols);
            const x = gridStartX + c * (cellW + gap);
            const y = gridStartY + r * (cellH + gap);

            const ownerCol = cell.ownerId ? reqColors[cell.ownerId] : t.border;
            const isReservedIdle = cell.state === 'reserved-idle';
            const isFree = cell.state === 'free';
            const fill = isFree
              ? t.surfaceAlt
              : isReservedIdle
                ? `${wasteColor}24`
                : ownerCol;
            const stroke = isFree ? t.border : isReservedIdle ? wasteColor : ownerCol;
            const textColor = isFree ? t.textMuted : isReservedIdle ? wasteColor : t.background;
            const cellLabel = isFree ? `${idx}` : isReservedIdle ? `${cell.ownerId}×` : `${cell.ownerId}${idx}`;

            return (
              <g key={idx}>
                <rect
                  x={x}
                  y={y}
                  width={cellW}
                  height={cellH}
                  rx={4}
                  fill={fill}
                  fillOpacity={cell.state === 'tail-waste' ? 0.72 : 1}
                  stroke={stroke}
                  strokeWidth={isReservedIdle ? 1.4 : 1}
                  strokeDasharray={isReservedIdle ? '3 2' : undefined}
                />
                <text x={x + cellW / 2} y={y + 22} textAnchor="middle" fontSize={14} fontWeight={700} fill={textColor}>
                  {cellLabel}
                </text>
              </g>
            );
          })}

          {/* Bottom summary meter inside pool panel */}
          <text x={plotX + 10} y={plotY + 184} fontSize={14} fontWeight={700} fill={t.textPrimary}>
            Pool waste: {analysis.wastePct.toFixed(1)}% ({analysis.wastedSlotsAdmitted} idle slots)
          </text>
          <text x={plotX + plotW - 10} y={plotY + 184} textAnchor="end" fontSize={14} fontWeight={700} fill={analysis.freeBlocksTotal > 0 ? activeColor : wasteColor}>
            {analysis.freeBlocksTotal} free
          </text>
          <rect x={plotX + 10} y={plotY + 193} width={summaryBarW} height={14} rx={3} fill={t.surfaceAlt} />
          <rect x={plotX + 10} y={plotY + 193} width={Math.max(2, usedRatio * summaryBarW)} height={14} rx={3} fill={activeColor} />
          <rect
            x={plotX + 10 + usedRatio * summaryBarW}
            y={plotY + 193}
            width={Math.max(0, wasteRatio * summaryBarW)}
            height={14}
            fill={wasteColor}
            fillOpacity={0.75}
          />
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 20} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          {analysis.admittedCount}/3 serving ({analysis.usedTokensAdmitted}/{analysis.allocatedSlotsTotal} slots used)
        </text>
      </g>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!compact && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ flex: '1 1 320px', minWidth: 0, marginBottom: -8 }}>
              <VisualizationHeader
                eyebrow="Live playground"
                title="Why virtual memory pages pack far more LLM requests into GPU memory"
                description="Each active answer stores past Keys & Values in GPU memory. Reserving each request's maximum possible length upfront locks huge empty slabs; PagedAttention splits memory into small pages allocated only as tokens arrive."
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingTop: 2 }}>
              <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
              <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
              <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<AllocationMode>
                label="Memory rule (how GPU blocks are allocated)"
                value={mode}
                onChange={(val) => {
                  const nextMode = typeof val === 'function' ? val(mode) : val;
                  selectMode(nextMode);
                }}
                options={[
                  { value: 'paged', label: 'PagedAttention (on-demand pages)' },
                  { value: 'contiguous', label: 'Contiguous (reserve max_seq_len)' },
                ]}
              />
            </div>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<number>
                label="Page size B (tokens per physical block)"
                value={blockSize}
                onChange={(val) => setBlockSize(typeof val === 'function' ? val(blockSize) : val)}
                options={[
                  { value: 8, label: 'B = 8' },
                  { value: 16, label: 'B = 16 (vLLM std)' },
                  { value: 32, label: 'B = 32' },
                ]}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 155px), 1fr))', gap: 12, alignItems: 'end' }}>
            <div>
              <Slider
                label="Max length L_max (contiguous slab)"
                value={maxSeqLen}
                onChange={(v) => setMaxSeqLen(v)}
                min={64}
                max={256}
                step={16}
                format={(v) => `${v} tok`}
              />
              <input
                aria-label="Exact max sequence length"
                type="number"
                min={64}
                max={256}
                step={16}
                value={maxSeqLen}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setMaxSeqLen(Math.max(64, Math.min(256, Math.round(v))));
                }}
                style={inputStyle}
              />
            </div>

            {(['A', 'B', 'C'] as const).map((id, idx) => (
              <label key={id} style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
                <span style={{ display: 'block', marginBottom: 4, fontWeight: 700, color: reqColors[id] }}>
                  Req {id} start tokens
                </span>
                <input
                  aria-label={`Request ${id} tokens`}
                  type="number"
                  min={1}
                  max={200}
                  step={4}
                  value={baseTokens[idx]}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) updateReqToken(idx as 0 | 1 | 2, v);
                  }}
                  style={{ ...inputStyle, borderColor: reqColors[id] }}
                />
              </label>
            ))}
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 15 }} aria-label="Memory block colours">
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: reqColors.A, verticalAlign: 'middle', marginRight: 6 }} />
          Req A ({analysis.requests[0].usedTokens} tok)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: reqColors.B, verticalAlign: 'middle', marginRight: 6 }} />
          Req B ({analysis.requests[1].usedTokens} tok)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: reqColors.C, verticalAlign: 'middle', marginRight: 6 }} />
          Req C ({analysis.requests[2].usedTokens} tok)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: `${wasteColor}40`, border: `1.5px dashed ${wasteColor}`, verticalAlign: 'middle', marginRight: 6 }} />
          Idle / wasted slots
        </span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 298"
            role="img"
            aria-label={`${analysis.mode} allocation: ${analysis.admittedCount} of 3 requests fit, ${analysis.wastePct.toFixed(1)}% waste`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderLogicalPanel(0, 396)}
            {renderPhysicalPoolPanel(406, 354)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 298" role="img" aria-label="Logical blocks and page table" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderLogicalPanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 298" role="img" aria-label="Physical GPU KV block pool" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderPhysicalPoolPanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title="PagedAttention tail bound" latex={FORMULA_LATEX.paged} color="yellow" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              Serving: <strong>{analysis.admittedCount}/3</strong> · Waste: <strong>{analysis.wastePct.toFixed(1)}%</strong> ({analysis.wastedSlotsAdmitted} slots)
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${TOTAL_STEPS}`} color="blue" tilt={1} live>
            <p>{analysis.explain}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="1. Paged tail waste"
              latex={FORMULA_LATEX.paged}
              color="yellow"
              tilt={-1}
              active={activeFormula === 'paged'}
              onSelect={() => selectMode('paged')}
            >
              <p style={{ textAlign: 'center' }}>B = page size. Only each request's last page can have empty tail slots.</p>
            </StickyNote>
            <StickyNote
              title="2. Contiguous reservation waste"
              latex={FORMULA_LATEX.contiguous}
              color="pink"
              tilt={1}
              active={activeFormula === 'contiguous'}
              onSelect={() => selectMode('contiguous')}
            >
              <p style={{ textAlign: 'center' }}>L_max = reserved limit, L_i = used tokens; empty slots block others.</p>
            </StickyNote>
            <StickyNote
              title="3. Pages per sequence"
              latex={FORMULA_LATEX.blocks}
              color="orange"
              tilt={-1}
              active={activeFormula === 'blocks'}
              onSelect={() => setActiveFormula('blocks')}
            >
              <p style={{ textAlign: 'center' }}>L_i = tokens used, B = page size. Pages sit anywhere via a block table.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · ${analysis.mode === 'paged' ? 'PagedAttention' : 'Contiguous'}`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                Active: <strong>{analysis.admittedCount}/3</strong> · Blocks used: <strong>{analysis.allocatedBlocksTotal}/{analysis.totalBlocks}</strong> ({analysis.freeBlocksTotal} free)
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                Used: <strong>{analysis.usedTokensAdmitted}</strong> / Allocated: <strong>{analysis.allocatedSlotsTotal}</strong> slots → Waste: <strong>{analysis.wastedSlotsAdmitted} ({analysis.wastePct.toFixed(1)}%)</strong>
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${TOTAL_STEPS} · What just happened`} color="blue" tilt={-1} live>
              <p>{analysis.explain}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="A 32-block GPU pool (B = 16, 512 total slots) uses Contiguous mode with max length L_max = 256. Req A (60 tok) and Req B (46 tok) start. Can Req C (78 tok) start too?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="At L_max = 256, A and B each lock 16 blocks (32 total = 100% of the pool), leaving 0 blocks for Req C even though 406 of 512 slots (79.3%) are empty."
            actionLabel="Run Contiguous 256-limit now"
            onAction={() => {
              selectMode('contiguous');
              setBlockSize(16);
              setMaxSeqLen(256);
              setBaseTokens([...DEFAULT_BASE_TOKENS]);
              playback.setStep(0);
            }}
          />
        </>
      )}
    </div>
  );
}

export default function PagedAttentionVisualizer({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="PagedAttention KV memory playground"
      footer="Exact block-table and physical VRAM page simulation following Kwon et al. (2023): non-contiguous fixed-size pages eliminate external fragmentation and reservation waste."
    >
      <PagedAttentionPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
