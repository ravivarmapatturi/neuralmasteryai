import { useId, useMemo, useState } from 'react';
import { FONT_FAMILY, useVizTokens } from '../../theme/vizTokens';
import {
  PillSelect,
  Slider,
  StickyNote,
  StickyRow,
  VisualizationContainer,
  VisualizationHeader,
  VizButton,
  useVizVisible,
} from '../primitives';
import {
  analyzeGeneratorMemory,
  MAX_DATASET_N,
  SAMPLE_STREAM_COUNT,
  type MemoryScaleMode,
  type PipelineMode,
} from '../lib/generatorMemory';
import { NumericField, PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const PREDICT_OPTIONS = [
  'Generator stays at 0.049 MB (1 item) while the list hits 976.6 MB and runs out of RAM',
  'Both use 976.6 MB because both process all 20,000 items eventually',
  'Generator uses half as much (~488 MB) by compressing items',
] as const;

function GeneratorMemoryPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipSlotsId = useId();
  const clipCurveId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [mode, setMode] = useState<PipelineMode>('generator');
  const [n, setN] = useState(8000);
  const [itemSizeKb, setItemSizeKb] = useState(50);
  const [ramBudgetMb, setRamBudgetMb] = useState(512);
  const [scaleMode, setScaleMode] = useState<MemoryScaleMode>('linear');
  const [prediction, setPrediction] = useState<number | null>(null);

  const analysis = useMemo(
    () => analyzeGeneratorMemory({ n, itemSizeKb, ramBudgetMb, mode, maxPlotN: MAX_DATASET_N }),
    [n, itemSizeKb, ramBudgetMb, mode],
  );

  // Reduced motion shows step 4 (mid-stream contrast: 1 active slot vs 3 freed slots or 4 stacked items).
  const playback = useStepPlayback(analysis.trace.length, 1300, 3, outerVisible);
  const traceStep = analysis.trace[playback.step] ?? analysis.trace[0];

  const listColor = t.accentDanger;
  const genColor = t.accentPrimary;
  const budgetColor = t.accentWarn;
  const loopColor = t.accentSecondary;

  const chooseMode = (next: PipelineMode) => {
    setMode(next);
    playback.reset();
  };

  const renderSlotsPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 12;
    const plotY = 44;
    const plotW = panelW - 24;
    const plotH = 198;
    const colW = (plotW - 36) / 3;
    const rowH = 54;
    const activeRamFrac = Math.min(1, traceStep.ramKb / (SAMPLE_STREAM_COUNT * itemSizeKb));
    const barW = plotW - 24;

    return (
      <g>
        <text x={offsetX + 8} y={20} fontSize={16} fontWeight={700} fill={t.textPrimary}>
          1. Items in RAM right now (6-item trace)
        </text>
        <defs>
          <clipPath id={`${clipSlotsId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} rx={4} />

        <g clipPath={`url(#${clipSlotsId}-${offsetX})`}>
          <text x={plotX + 12} y={plotY + 22} fontSize={14} fontWeight={700} fill={mode === 'list' ? listColor : genColor}>
            {mode === 'list' ? 'return [...] builds the whole list first' : 'yield pauses after 1 item at a time'}
          </text>

          {Array.from({ length: SAMPLE_STREAM_COUNT }, (_, idx) => {
            const id = idx + 1;
            const col = idx % 3;
            const row = Math.floor(idx / 3);
            const bx = plotX + 12 + col * (colW + 6);
            const by = plotY + 34 + row * (rowH + 8);
            const inRam = traceStep.itemsInRam.includes(id);
            const freed = traceStep.freedItems.includes(id);
            const isCurrent = traceStep.activeItem === id;
            const slotColor = inRam ? (mode === 'list' ? listColor : genColor) : freed ? t.textMuted : t.border;

            return (
              <g key={id} opacity={inRam || freed ? 1 : 0.35}>
                <rect
                  x={bx}
                  y={by}
                  width={colW}
                  height={rowH}
                  rx={5}
                  fill={inRam ? slotColor : t.surfaceAlt}
                  fillOpacity={inRam ? 0.16 : 0.7}
                  stroke={isCurrent ? loopColor : slotColor}
                  strokeWidth={isCurrent ? 2.4 : 1.5}
                  strokeDasharray={freed ? '4 3' : undefined}
                />
                <text x={bx + colW / 2} y={by + 22} textAnchor="middle" fontSize={14} fontWeight={700} fill={inRam ? slotColor : t.textSecondary}>
                  item {id}
                </text>
                <text x={bx + colW / 2} y={by + 42} textAnchor="middle" fontSize={14} fill={inRam ? t.textPrimary : t.textMuted}>
                  {inRam ? `${itemSizeKb} KB` : freed ? 'freed' : 'pending'}
                </text>
              </g>
            );
          })}

          <text x={plotX + 12} y={plotY + 168} fontSize={14} fontWeight={700} fill={t.textPrimary}>
            Working RAM: {traceStep.itemsInRam.length}/{SAMPLE_STREAM_COUNT} items ({traceStep.ramKb.toLocaleString('en-US')} KB)
          </text>
          <rect x={plotX + 12} y={plotY + 176} width={barW} height={14} rx={4} fill={t.surfaceAlt} />
          <rect
            x={plotX + 12}
            y={plotY + 176}
            width={Math.max(4, activeRamFrac * barW)}
            height={14}
            rx={4}
            fill={mode === 'list' ? listColor : genColor}
          />
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 26} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          {mode === 'list'
            ? 'List holds all N items together until finished'
            : 'Generator discards older items as you loop'}
        </text>
      </g>
    );
  };

  const renderCurvePanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 64;
    const plotY = 44;
    const plotW = panelW - 78;
    const plotH = 198;
    const maxCurveKb = Math.max(analysis.listKb, analysis.ramBudgetMb * 1024, itemSizeKb * MAX_DATASET_N);

    const xFor = (valN: number) => plotX + (Math.min(MAX_DATASET_N, valN) / MAX_DATASET_N) * plotW;
    const yFor = (kb: number) => {
      if (scaleMode === 'log') {
        const frac = Math.log(kb + 1) / Math.log(maxCurveKb + 1);
        return plotY + plotH - frac * plotH;
      }
      return plotY + plotH - (kb / maxCurveKb) * plotH;
    };

    const listPts = analysis.curve.map((pt) => `${xFor(pt.n).toFixed(1)},${yFor(pt.listKb).toFixed(1)}`).join(' ');
    const genY = yFor(analysis.generatorKb);
    const budgetKb = ramBudgetMb * 1024;
    const budgetY = yFor(budgetKb);
    const plotN = Math.min(MAX_DATASET_N, n);
    const curX = xFor(plotN);
    const curListY = yFor(analysis.listKb);
    const labelRight = plotN < MAX_DATASET_N * 0.55;

    return (
      <g>
        <text x={offsetX + 8} y={20} fontSize={16} fontWeight={700} fill={t.textPrimary}>
          2. Memory vs. dataset size ({scaleMode} scale)
        </text>
        <defs>
          <clipPath id={`${clipCurveId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} rx={4} />

        {[0, maxCurveKb / 2, maxCurveKb].map((kb, idx) => {
          const mb = kb / 1024;
          const label = mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(0)} MB`;
          return (
            <text key={idx} x={plotX - 8} y={yFor(kb) + 5} textAnchor="end" fontSize={14} fill={t.textMuted}>
              {label}
            </text>
          );
        })}
        {[0, 10000, 20000].map((tick) => (
          <text key={tick} x={xFor(tick)} y={plotY + plotH + 18} textAnchor="middle" fontSize={14} fill={t.textMuted}>
            {tick === 0 ? '0' : `${tick / 1000}k`}
          </text>
        ))}

        <g clipPath={`url(#${clipCurveId}-${offsetX})`}>
          {budgetY >= plotY && budgetY <= plotY + plotH && (
            <>
              <line x1={plotX} y1={budgetY} x2={plotX + plotW} y2={budgetY} stroke={budgetColor} strokeWidth={1.8} strokeDasharray="5 4" />
              <text
                x={plotX + 8}
                y={Math.max(plotY + 18, budgetY - 6)}
                fontSize={14}
                fontWeight={700}
                fill={budgetColor}
              >
                RAM limit {ramBudgetMb} MB
              </text>
            </>
          )}

          <polyline points={listPts} fill="none" stroke={listColor} strokeWidth={2.5} />
          <line x1={plotX} y1={genY} x2={plotX + plotW} y2={genY} stroke={genColor} strokeWidth={2.5} />

          <line x1={curX} y1={plotY} x2={curX} y2={plotY + plotH} stroke={t.textMuted} strokeDasharray="3 3" strokeWidth={1.3} />
          <circle cx={curX} cy={curListY} r={5} fill={listColor} stroke={t.background} strokeWidth={1.4} />
          <circle cx={curX} cy={genY} r={5} fill={genColor} stroke={t.background} strokeWidth={1.4} />

          {(() => {
            const genLabelY = Math.min(plotY + plotH - 6, genY - 8);
            const listLabelY = Math.min(genLabelY - 20, Math.max(plotY + 20, curListY - 8));
            return (
              <>
                <text
                  x={labelRight ? curX + 8 : curX - 8}
                  y={listLabelY}
                  textAnchor={labelRight ? 'start' : 'end'}
                  fontSize={14}
                  fontWeight={700}
                  fill={listColor}
                  stroke={t.background}
                  strokeWidth={4}
                  paintOrder="stroke"
                >
                  List: {analysis.listMb.toFixed(1)} MB
                </text>
                <text
                  x={labelRight ? curX + 8 : curX - 8}
                  y={genLabelY}
                  textAnchor={labelRight ? 'start' : 'end'}
                  fontSize={14}
                  fontWeight={700}
                  fill={genColor}
                  stroke={t.background}
                  strokeWidth={4}
                  paintOrder="stroke"
                >
                  Gen: {analysis.generatorMb.toFixed(3)} MB
                </text>
              </>
            );
          })()}
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 38} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Dataset size N (up to 20k items) →
        </text>
      </g>
    );
  };

  return (
    <>
      {!compact && (
        <>
          <VisualizationHeader
            eyebrow="Live playground"
            title="Why generators read huge datasets without running out of RAM"
            description="Loading a dataset into a Python list stores every example in RAM at once, while a generator with yield pauses after each item so memory stays flat no matter how large the dataset grows."
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <PillSelect<PipelineMode>
                label="Pipeline mode (how Python yields data)"
                value={mode}
                onChange={(v) => chooseMode(typeof v === 'function' ? v(mode) : v)}
                options={[
                  { value: 'generator', label: 'Generator (yield)' },
                  { value: 'list', label: 'List (load all)' },
                ]}
              />
              <PillSelect<MemoryScaleMode>
                label="Chart Y-axis scale"
                value={scaleMode}
                onChange={(v) => setScaleMode(typeof v === 'function' ? v(scaleMode) : v)}
                options={[
                  { value: 'linear', label: 'Linear scale' },
                  { value: 'log', label: 'Log scale' },
                ]}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
              <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
              <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 8 }}>
            <Slider
              label="Dataset size N (total examples)"
              value={n}
              onChange={setN}
              min={100}
              max={MAX_DATASET_N}
              step={100}
              format={(v) => v.toLocaleString('en-US')}
            />
            <Slider
              label="RAM limit (available memory)"
              value={ramBudgetMb}
              onChange={setRamBudgetMb}
              min={64}
              max={1500}
              step={32}
              format={(v) => `${v} MB`}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 10 }}>
            <NumericField
              label="Dataset size N"
              hint="100 to 20,000 items"
              value={n}
              min={100}
              max={MAX_DATASET_N}
              step={100}
              onChange={setN}
            />
            <NumericField
              label="Item size (KB each)"
              hint="10 to 500 KB"
              value={itemSizeKb}
              min={10}
              max={500}
              step={10}
              onChange={setItemSizeKb}
            />
            <NumericField
              label="RAM limit (MB)"
              hint={`list OOM after ${analysis.oomThresholdN.toLocaleString('en-US')}`}
              value={ramBudgetMb}
              min={64}
              max={2048}
              step={32}
              onChange={setRamBudgetMb}
            />
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 15, marginBottom: 4 }} aria-label="Memory chart legend">
        <span style={{ color: listColor }}>● List RAM (all N items held together)</span>
        <span style={{ color: genColor }}>● Generator RAM (only 1 yielded item)</span>
        <span style={{ color: budgetColor }}>● RAM limit ({ramBudgetMb} MB)</span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 294"
            role="img"
            aria-label={`At N=${n.toLocaleString('en-US')} items (${itemSizeKb} KB each): list holds ${analysis.listMb.toFixed(1)} MB while generator holds ${analysis.generatorMb.toFixed(3)} MB`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderSlotsPanel(0, 368)}
            <line x1={376} y1={14} x2={376} y2={280} stroke={t.border} strokeDasharray="4 4" strokeWidth={1.2} />
            {renderCurvePanel(384, 376)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 380 284" role="img" aria-label="6-item RAM slots step trace" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderSlotsPanel(0, 380)}
            </svg>
            <svg width="100%" viewBox="0 0 380 294" role="img" aria-label="List vs generator RAM scaling curve" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderCurvePanel(0, 380)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote
            title="Generator O(1) vs List O(N)"
            latex={String.raw`\text{RAM}_{\text{list}} = N \cdot s, \quad \text{RAM}_{\text{gen}} = 1 \cdot s`}
            color="green"
            tilt={-1}
          >
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              List = <strong>{analysis.listMb.toFixed(1)} MB</strong> vs Gen = <strong>{analysis.generatorMb.toFixed(3)} MB</strong> ({n.toLocaleString('en-US')}× less)
            </p>
          </StickyNote>
          <StickyNote title={`What just happened · step ${playback.step + 1} of ${analysis.trace.length}`} color="blue" tilt={1} live>
            <p>{traceStep.explain}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="1. List memory: O(N)"
              latex={String.raw`\text{RAM}_{\text{list}} = N \times s_{\text{item}}`}
              color="pink"
              tilt={-1}
              active={mode === 'list'}
              onSelect={() => chooseMode('list')}
            >
              <p>Grows linearly with N items of size s_item. Exceeds a {ramBudgetMb} MB limit at N = {analysis.oomThresholdN.toLocaleString('en-US')}.</p>
            </StickyNote>
            <StickyNote
              title="2. Generator memory: O(1)"
              latex={String.raw`\text{RAM}_{\text{gen}} = 1 \times s_{\text{item}}`}
              color="green"
              tilt={1}
              active={mode === 'generator'}
              onSelect={() => chooseMode('generator')}
            >
              <p>yield pauses the function after 1 item, so memory stays constant at {itemSizeKb} KB even for millions of rows.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers (N = ${n.toLocaleString('en-US')} × ${itemSizeKb} KB)`} color="yellow" tilt={-1}>
              <p className="nm-sticky__mono">
                List = {n.toLocaleString('en-US')} × {itemSizeKb} KB = <strong style={{ color: listColor }}>{analysis.listMb.toFixed(1)} MB</strong>{' '}
                ({analysis.listExceedsBudget ? `exceeds ${ramBudgetMb} MB!` : `within ${ramBudgetMb} MB`})
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                Generator = 1 × {itemSizeKb} KB = <strong style={{ color: genColor }}>{analysis.generatorMb.toFixed(3)} MB</strong> ({analysis.savingsFactor.toLocaleString('en-US')}× smaller)
              </p>
            </StickyNote>
            <StickyNote title={`What just happened · step ${playback.step + 1} of ${analysis.trace.length}`} color="blue" tilt={1} live>
              <p>{traceStep.explain}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="With N = 20,000 items at 50 KB each and a 512 MB RAM limit, how much RAM does a generator use compared to a list?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="20,000 × 50 KB = 1,000,000 KB (976.6 MB), blowing past the 512 MB limit. A generator keeps only 1 × 50 KB = 0.049 MB in RAM."
            actionLabel="Test N = 20,000 with 512 MB limit now"
            onAction={() => {
              setMode('generator');
              setN(20000);
              setItemSizeKb(50);
              setRamBudgetMb(512);
              setScaleMode('linear');
              playback.setStep(3);
            }}
          />
        </>
      )}
    </>
  );
}

export default function GeneratorMemoryDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Generator vs. list memory playground"
      footer={
        compact
          ? undefined
          : 'Exact memory calculation comparing eager list buffering (N × item_size) with lazy generator streaming (1 × item_size). Toggle linear vs. log scale to see why log plots compress steep O(N) growth.'
      }
    >
      <GeneratorMemoryPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
