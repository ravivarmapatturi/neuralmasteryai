import { useId, useMemo, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../../theme/vizTokens';
import {
  PillSelect,
  StickyNote,
  StickyRow,
  useVizVisible,
  VisualizationContainer,
  VisualizationHeader,
  VizButton,
} from '../primitives';
import {
  applyMorphologicalOp,
  buildMorphPresetGrid,
  MORPH_GRID_SIZE,
  MORPH_OPS,
  MORPH_PRESETS,
  type MorphOp,
  type MorphPresetId,
  type StructuringShape,
} from '../lib/morphologicalOps';
import { PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const PREDICT_OPTIONS = [
  'It shrinks to 1×1 and then grows back to 2×2',
  'Erosion deletes all 4 pixels completely, so dilation cannot bring it back',
  'Only the larger 4×4 object is changed',
] as const;

const OP_LATEX: Record<Exclude<MorphOp, 'original'>, string> = {
  erosion: String.raw`(A \ominus B)(p) = \min_{q \in B_p} A(q)`,
  dilation: String.raw`(A \oplus B)(p) = \max_{q \in B_p} A(q)`,
  opening: String.raw`A \circ B = (A \ominus B) \oplus B`,
  closing: String.raw`A \bullet B = (A \oplus B) \ominus B`,
};

const OP_LABEL: Record<MorphOp, string> = {
  original: 'Original',
  erosion: 'Erosion',
  dilation: 'Dilation',
  opening: 'Opening',
  closing: 'Closing',
};

function MorphologicalOpsPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipInputId = useId();
  const clipOutputId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [presetId, setPresetId] = useState<MorphPresetId>('blob-hole-speck');
  const [inputGrid, setInputGrid] = useState<number[][]>(() => buildMorphPresetGrid('blob-hole-speck'));
  const [manualOp, setManualOp] = useState<MorphOp | null>(null);
  const [shape, setShape] = useState<StructuringShape>('square');
  const [inspectPos, setInspectPos] = useState<readonly [number, number]>([1, 9]);
  const [prediction, setPrediction] = useState<number | null>(null);

  const playback = useStepPlayback(MORPH_OPS.length, 2200, 3, outerVisible);
  const op = manualOp ?? MORPH_OPS[playback.step] ?? 'opening';

  const result = useMemo(
    () => applyMorphologicalOp({ inputGrid, op, shape, inspectPos }),
    [inputGrid, op, shape, inspectPos],
  );

  const onColor = t.accentPrimary;
  const addedColor = t.accentSecondary;
  const removedColor = t.accentDanger;
  const stampColor = t.accentPurple;

  const selectOp = (nextOp: MorphOp) => {
    playback.stop();
    setManualOp(nextOp);
  };

  const applyPreset = (id: MorphPresetId) => {
    const meta = MORPH_PRESETS.find((p) => p.id === id) ?? MORPH_PRESETS[0];
    setPresetId(id);
    setInputGrid(buildMorphPresetGrid(id));
    setInspectPos(meta.defaultInspect);
  };

  const toggleCell = (r: number, c: number) => {
    setInputGrid((prev) =>
      prev.map((row, rr) => (rr === r ? row.map((v, cc) => (cc === c ? (v ? 0 : 1) : v)) : row)),
    );
    setInspectPos([r, c]);
  };

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

  const renderGridSvg = (
    offsetX: number,
    yTop: number,
    cellSize: number,
    titleText: string,
    gridData: number[][],
    isOutput: boolean,
    clipId: string,
  ) => {
    const gridW = MORPH_GRID_SIZE * cellSize;
    const stampSet = new Set(result.inspected.neighborhoodPositions.map(([rr, cc]) => `${rr}-${cc}`));

    return (
      <g>
        <text x={offsetX + gridW / 2} y={yTop - 10} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          {titleText}
        </text>
        <defs>
          <clipPath id={clipId}>
            <rect x={offsetX - 2} y={yTop - 2} width={gridW + 4} height={gridW + 4} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          {gridData.map((row, r) =>
            row.map((val, c) => {
              const x = offsetX + c * cellSize;
              const y = yTop + r * cellSize;
              const inStamp = stampSet.has(`${r}-${c}`);
              const isCenter = r === result.inspected.r && c === result.inspected.c;
              const wasOn = result.inputGrid[r][c] === 1;
              const isAdded = isOutput && !wasOn && val === 1;
              const isRemoved = isOutput && wasOn && val === 0;

              const fill = isAdded
                ? addedColor
                : val === 1
                  ? onColor
                  : isRemoved
                    ? removedColor
                    : t.surfaceAlt;

              return (
                <g
                  key={`${r}-${c}`}
                  onClick={() => (isOutput ? setInspectPos([r, c]) : toggleCell(r, c))}
                  style={{ cursor: 'pointer' }}
                >
                  <title>{`(${r}, ${c}): ${val}${!isOutput ? ' — click to toggle' : ''}`}</title>
                  <rect
                    x={x}
                    y={y}
                    width={cellSize - 1.5}
                    height={cellSize - 1.5}
                    rx={2.5}
                    fill={fill}
                    fillOpacity={isRemoved ? 0.24 : val === 1 ? 0.88 : 1}
                    stroke={isCenter ? stampColor : inStamp && !isOutput ? stampColor : t.border}
                    strokeWidth={isCenter ? 2.4 : inStamp && !isOutput ? 1.5 : 0.6}
                  />
                </g>
              );
            }),
          )}
        </g>
      </g>
    );
  };

  const renderDesktopSvg = () => {
    const cell = 21;
    const gridW = MORPH_GRID_SIZE * cell; // 231
    const leftX = 34;
    const rightX = 492;
    const yTop = 32;
    const midX = 378;

    return (
      <svg
        width="100%"
        viewBox="0 0 760 296"
        role="img"
        aria-label={`${OP_LABEL[op]} transforms ${result.inputOnCount} ON pixels to ${result.outputOnCount} ON pixels`}
        style={{ display: 'block', fontFamily: FONT_FAMILY }}
      >
        {renderGridSvg(leftX, yTop, cell, `1. Input mask (${result.inputOnCount} ON)`, result.inputGrid, false, `${clipInputId}-d`)}
        {renderGridSvg(rightX, yTop, cell, `2. After ${OP_LABEL[op]} (${result.outputOnCount} ON)`, result.outputGrid, true, `${clipOutputId}-d`)}

        {/* Middle: Structuring element stamp preview + rule */}
        <text x={midX} y={50} textAnchor="middle" fontSize={14} fontWeight={700} fill={stampColor}>
          Stamp ({shape})
        </text>
        {[-1, 0, 1].map((dr) =>
          [-1, 0, 1].map((dc) => {
            const activeOffset =
              shape === 'square' ||
              (shape === 'cross' && (dr === 0 || dc === 0)) ||
              (shape === 'hline' && dr === 0);
            return (
              <rect
                key={`st-${dr}-${dc}`}
                x={midX - 33 + (dc + 1) * 22}
                y={64 + (dr + 1) * 22}
                width={20}
                height={20}
                rx={3}
                fill={activeOffset ? stampColor : t.surfaceAlt}
                fillOpacity={activeOffset ? 0.35 : 0.7}
                stroke={activeOffset ? stampColor : t.border}
                strokeWidth={dr === 0 && dc === 0 ? 2.2 : 1.1}
              />
            );
          }),
        )}
        <text x={midX} y={156} textAnchor="middle" fontSize={14} fontWeight={700} fill={t.textPrimary}>
          {OP_LABEL[op]} →
        </text>
        <text x={midX} y={178} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          {result.inspected.onInNeighborhood}/{result.inspected.totalInNeighborhood} stamp ON
        </text>
        <text x={midX} y={198} textAnchor="middle" fontSize={14} fontWeight={700} fill={result.inspected.outputValue ? onColor : removedColor}>
          at ({result.inspected.r},{result.inspected.c}) → {result.inspected.outputValue}
        </text>

        <text x={leftX + gridW / 2} y={yTop + gridW + 20} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Click grid cell to edit mask
        </text>
        <text x={rightX + gridW / 2} y={yTop + gridW + 20} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          +{result.addedCount} added · −{result.removedCount} erased
        </text>
      </svg>
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
                title="How a 3×3 pixel stamp cleans noisy masks and fills tiny holes"
                description="Segmentation masks often have stray single-pixel specks or small holes inside shapes. Morphological filters slide a small stamp across every pixel and decide ON or OFF solely from its neighbors."
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingTop: 2 }}>
              <VizButton
                onClick={() => {
                  setManualOp(null);
                  playback.toggle();
                }}
              >
                {playback.playing ? 'Pause' : 'Play'}
              </VizButton>
              <VizButton
                variant="secondary"
                onClick={() => {
                  setManualOp(null);
                  playback.next();
                }}
              >
                Step →
              </VizButton>
              <VizButton
                variant="secondary"
                onClick={() => {
                  setManualOp(null);
                  applyPreset(presetId);
                  playback.reset();
                }}
              >
                Reset
              </VizButton>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<MorphOp>
                label="Filter operation"
                value={op}
                onChange={(nextOp) => selectOp(typeof nextOp === 'function' ? nextOp(op) : nextOp)}
                options={MORPH_OPS.map((m) => ({ value: m, label: OP_LABEL[m] }))}
              />
            </div>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<StructuringShape>
                label="Stamp shape (structuring element)"
                value={shape}
                onChange={(s) => setShape(s)}
                options={[
                  { value: 'square', label: '3×3 square (9)' },
                  { value: 'cross', label: '3×3 cross (5)' },
                  { value: 'hline', label: '1×3 bar (3)' },
                ]}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 155px), 1fr))', gap: 12, alignItems: 'end' }}>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<MorphPresetId>
                label="Starting mask pattern"
                value={presetId}
                onChange={(p) => applyPreset(typeof p === 'function' ? p(presetId) : p)}
                options={MORPH_PRESETS.map((p) => ({ value: p.id, label: p.label }))}
              />
            </div>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Inspect row (0–10)</span>
              <input
                aria-label="Inspect row"
                type="number"
                min={0}
                max={MORPH_GRID_SIZE - 1}
                value={result.inspected.r}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setInspectPos([Math.max(0, Math.min(10, Math.round(v))), result.inspected.c]);
                }}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Inspect col (0–10)</span>
              <input
                aria-label="Inspect col"
                type="number"
                min={0}
                max={MORPH_GRID_SIZE - 1}
                value={result.inspected.c}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setInspectPos([result.inspected.r, Math.max(0, Math.min(10, Math.round(v)))]);
                }}
                style={inputStyle}
              />
            </label>
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 15 }} aria-label="Pixel mask legend">
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: onColor, verticalAlign: 'middle', marginRight: 6 }} />
          Kept ON
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: addedColor, verticalAlign: 'middle', marginRight: 6 }} />
          Filled / grown (+{result.addedCount})
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: removedColor, opacity: 0.45, verticalAlign: 'middle', marginRight: 6 }} />
          Erased (−{result.removedCount})
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, border: `2px solid ${stampColor}`, verticalAlign: 'middle', marginRight: 6 }} />
          Inspected stamp at ({result.inspected.r}, {result.inspected.c})
        </span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          renderDesktopSvg()
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 284" role="img" aria-label="Input binary mask" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderGridSvg(64, 30, 22, `1. Input mask (${result.inputOnCount} ON)`, result.inputGrid, false, `${clipInputId}-m`)}
            </svg>
            <svg width="100%" viewBox="0 0 370 284" role="img" aria-label="Output binary mask" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderGridSvg(64, 30, 22, `2. After ${OP_LABEL[op]} (${result.outputOnCount} ON)`, result.outputGrid, true, `${clipOutputId}-m`)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote
            title={op === 'original' ? '3×3 neighborhood rule' : OP_LABEL[op]}
            latex={op === 'original' ? OP_LATEX.opening : OP_LATEX[op]}
            color="yellow"
            tilt={-1}
          >
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              ON pixels: {result.inputOnCount} → {result.outputOnCount} (+{result.addedCount}, −{result.removedCount})
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${MORPH_OPS.length}`} color="blue" tilt={1} live>
            <p>{result.explain}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote title="Erosion (shrinks)" latex={OP_LATEX.erosion} color="yellow" tilt={-1} active={op === 'erosion'} onSelect={() => selectOp('erosion')}>
              <p style={{ textAlign: 'center' }}>Minimum over stamp: every neighbor must be 1 to survive, so specks vanish.</p>
            </StickyNote>
            <StickyNote title="Dilation (grows)" latex={OP_LATEX.dilation} color="pink" tilt={1} active={op === 'dilation'} onSelect={() => selectOp('dilation')}>
              <p style={{ textAlign: 'center' }}>Maximum over stamp: one ON neighbor turns the center ON, filling tiny holes.</p>
            </StickyNote>
            <StickyNote title="Opening (clean noise)" latex={OP_LATEX.opening} color="orange" tilt={-1} active={op === 'opening'} onSelect={() => selectOp('opening')}>
              <p style={{ textAlign: 'center' }}>Erode first to erase specks, then dilate back to restore big shapes.</p>
            </StickyNote>
            <StickyNote title="Closing (fill holes)" latex={OP_LATEX.closing} color="green" tilt={1} active={op === 'closing'} onSelect={() => selectOp('closing')}>
              <p style={{ textAlign: 'center' }}>Dilate first to seal holes, then erode back to keep original shape width.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · Pixel (${result.inspected.r}, ${result.inspected.c})`} color="green" tilt={1}>
              <p className="nm-sticky__mono">{result.inspected.ruleSummary}</p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                Total ON pixels: <strong>{result.inputOnCount} → {result.outputOnCount}</strong> (+{result.addedCount} added, −{result.removedCount} erased)
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${MORPH_OPS.length} · What just happened`} color="blue" tilt={-1} live>
              <p>{result.explain}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="You run Opening (erode then dilate) with a 3×3 square stamp on a grid containing a tiny 2×2 object and a 4×4 object. What happens to the 2×2 object?"
            options={PREDICT_OPTIONS}
            correctIndex={1}
            selected={prediction}
            onSelect={setPrediction}
            explanation="Because a 3×3 square never fits inside a 2×2 block, Erosion deletes all 4 pixels completely — leaving nothing for Dilation to restore."
            actionLabel="Test 2×2 object with Opening now"
            onAction={() => {
              applyPreset('small-object');
              setShape('square');
              selectOp('opening');
            }}
          />
        </>
      )}
    </div>
  );
}

export default function MorphologicalOpsDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Morphological operations playground"
      footer="Exact 11×11 binary morphology computed live from your edited grid and stamp shape. Click any pixel on the left grid to draw or erase."
    >
      <MorphologicalOpsPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
