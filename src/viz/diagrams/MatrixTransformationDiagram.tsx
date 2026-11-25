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
  analyzeMatrixTransform,
  MATRIX_PRESETS,
  MORPH_FRACTIONS,
  type MatrixPresetId,
} from '../lib/matrixTransformation';
import type { Mat2, Vec2 } from '../lib/linalg';
import { PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

type MatrixFormulaTab = 'product' | 'det' | 'rank';

const FORMULA_LATEX: Record<MatrixFormulaTab, string> = {
  product: String.raw`A\mathbf{v} = x\begin{bmatrix}a_{11}\\a_{21}\end{bmatrix} + y\begin{bmatrix}a_{12}\\a_{22}\end{bmatrix}`,
  det: String.raw`\det(A) = a_{11}a_{22} - a_{12}a_{21}`,
  rank: String.raw`\det(A) \neq 0 \iff \operatorname{rank}(A) = 2`,
};

const PREDICT_OPTIONS = [
  'The whole 2D grid collapses onto one 1D line (det = 0, rank = 1)',
  'The grid expands to twice its area (det = 2, rank = 2)',
  'The grid rotates 90° counter-clockwise',
] as const;

const GRID_LINES = [-3, -2, -1, 0, 1, 2, 3];

function MatrixEntryControl({
  label,
  ariaLabel,
  value,
  onChange,
  accent,
}: {
  label: string;
  ariaLabel: string;
  value: number;
  onChange: (value: number) => void;
  accent: string;
}) {
  const t = useVizTokens();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Slider
        label={label}
        value={value}
        onChange={onChange}
        min={-2}
        max={2}
        step={0.1}
        format={(v) => v.toFixed(1)}
      />
      <input
        aria-label={ariaLabel}
        type="number"
        min={-2}
        max={2}
        step={0.1}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(Math.max(-2, Math.min(2, Math.round(v * 10) / 10)));
        }}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          minHeight: 32,
          padding: '3px 7px',
          font: 'inherit',
          fontSize: 15,
          fontVariantNumeric: 'tabular-nums',
          border: `1.5px solid ${accent}`,
          borderRadius: RADIUS.sm,
          background: t.background,
          color: t.textPrimary,
        }}
      />
    </div>
  );
}

function clampPlot(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function MatrixTransformationPlayground({
  compact = false,
  outerVisible = true,
}: {
  compact?: boolean;
  outerVisible?: boolean;
}) {
  const t = useVizTokens();
  const clipGridId = useId();
  const clipRightId = useId();
  const arrowId = useId();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);

  const [targetA, setTargetA] = useState<Mat2>(MATRIX_PRESETS[0].A);
  const [inputV, setInputV] = useState<Vec2>([1, 1]);
  const [activeFormula, setActiveFormula] = useState<MatrixFormulaTab>('product');
  const [prediction, setPrediction] = useState<number | null>(null);

  const playback = useStepPlayback(
    MORPH_FRACTIONS.length,
    1450,
    MORPH_FRACTIONS.length - 1,
    outerVisible,
  );
  const morphFraction = MORPH_FRACTIONS[playback.step] ?? 1;

  const analysis = useMemo(
    () => analyzeMatrixTransform({ targetA, inputV, morphFraction }),
    [targetA, inputV, morphFraction],
  );

  const col1Color = t.accentSecondary;
  const col2Color = t.accentTeal;
  const vecColor = t.accentPurple;
  const areaColor = analysis.orientation === 'flipped' ? t.accentDanger : t.accentPrimary;

  const activePresetId: MatrixPresetId =
    MATRIX_PRESETS.find(
      (p) =>
        Math.abs(p.A[0][0] - targetA[0][0]) < 1e-3 &&
        Math.abs(p.A[0][1] - targetA[0][1]) < 1e-3 &&
        Math.abs(p.A[1][0] - targetA[1][0]) < 1e-3 &&
        Math.abs(p.A[1][1] - targetA[1][1]) < 1e-3,
    )?.id ?? 'custom';

  const setMatrixEntry = (r: 0 | 1, c: 0 | 1, val: number) => {
    const next: Mat2 = [
      [targetA[0][0], targetA[0][1]],
      [targetA[1][0], targetA[1][1]],
    ];
    next[r][c] = Math.round(val * 10) / 10;
    setTargetA(next);
    // Jump immediately to 100% applied when learner drags or types an entry.
    playback.setStep(MORPH_FRACTIONS.length - 1);
  };

  const renderGridPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 20;
    const plotY = 36;
    const plotW = panelW - 36;
    const plotH = 224;
    const ox = plotX + plotW / 2;
    const oy = plotY + plotH / 2;
    // Uniform scale keeps 90° rotations genuinely perpendicular on screen.
    const scale = Math.min(plotW / 6.8, plotH / 4.8);
    const px = (x: number) => ox + x * scale;
    const py = (y: number) => oy - y * scale;

    const polyPts = analysis.unitParallelogram.map((pt) => `${px(pt[0]).toFixed(1)},${py(pt[1]).toFixed(1)}`).join(' ');

    const c1Tip: [number, number] = [px(analysis.col1[0]), py(analysis.col1[1])];
    const c2Tip: [number, number] = [px(analysis.col2[0]), py(analysis.col2[1])];
    const vInTip: [number, number] = [px(analysis.inputV[0]), py(analysis.inputV[1])];
    const vOutTip: [number, number] = [px(analysis.outputV[0]), py(analysis.outputV[1])];

    const makeLabel = (id: string, tip: [number, number], vec: Vec2, text: string, color: string) => {
      const rawX = tip[0] + (vec[0] >= 0 ? 8 : -8);
      const nearRight = rawX > plotX + plotW - 95;
      const nearLeft = rawX < plotX + 95;
      const anchor: 'start' | 'end' = nearRight ? 'end' : nearLeft ? 'start' : vec[0] >= 0 ? 'start' : 'end';
      const x = clampPlot(rawX, plotX + 10, plotX + plotW - 10);
      const y = clampPlot(tip[1] + (vec[1] >= 0 ? -10 : 18), plotY + 18, plotY + plotH - 8);
      return { id, text, color, x, y, anchor };
    };

    const labelCandidates = [
      makeLabel('col1', c1Tip, analysis.col1, `col 1 (${analysis.col1[0].toFixed(1)}, ${analysis.col1[1].toFixed(1)})`, col1Color),
      makeLabel('col2', c2Tip, analysis.col2, `col 2 (${analysis.col2[0].toFixed(1)}, ${analysis.col2[1].toFixed(1)})`, col2Color),
      makeLabel('av', vOutTip, analysis.outputV, `A·v (${analysis.outputV[0].toFixed(1)}, ${analysis.outputV[1].toFixed(1)})`, vecColor),
    ];

    // Push apart any two labels whose vertical coordinates land closer than 18px near the same x.
    for (let i = 1; i < labelCandidates.length; i++) {
      for (let j = 0; j < i; j++) {
        if (Math.abs(labelCandidates[i].x - labelCandidates[j].x) < 110 && Math.abs(labelCandidates[i].y - labelCandidates[j].y) < 18) {
          labelCandidates[i].y = clampPlot(labelCandidates[j].y + 20, plotY + 18, plotY + plotH - 8);
        }
      }
    }

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          1. Warped 2D space ({Math.round(analysis.morphFraction * 100)}% of A applied)
        </text>
        <defs>
          <clipPath id={`${clipGridId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
          <marker id={`${arrowId}-c1-${offsetX}`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={col1Color} />
          </marker>
          <marker id={`${arrowId}-c2-${offsetX}`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={col2Color} />
          </marker>
          <marker id={`${arrowId}-v-${offsetX}`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={vecColor} />
          </marker>
        </defs>

        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipGridId}-${offsetX})`}>
          {/* Faint fixed background axes & original unit square */}
          <line x1={plotX} y1={oy} x2={plotX + plotW} y2={oy} stroke={t.border} strokeWidth={1} strokeOpacity={0.5} />
          <line x1={ox} y1={plotY} x2={ox} y2={plotY + plotH} stroke={t.border} strokeWidth={1} strokeOpacity={0.5} />
          <rect
            x={px(0)}
            y={py(1)}
            width={scale}
            height={scale}
            fill="none"
            stroke={t.textMuted}
            strokeWidth={1.2}
            strokeDasharray="3 3"
          />

          {/* Transformed vertical lines (controlled by col 1 + shifted by col 2) */}
          {GRID_LINES.map((i) => {
            const p1: Vec2 = [
              analysis.activeA[0][0] * i + analysis.activeA[0][1] * -4,
              analysis.activeA[1][0] * i + analysis.activeA[1][1] * -4,
            ];
            const p2: Vec2 = [
              analysis.activeA[0][0] * i + analysis.activeA[0][1] * 4,
              analysis.activeA[1][0] * i + analysis.activeA[1][1] * 4,
            ];
            return (
              <line
                key={`gv-${i}`}
                x1={px(p1[0])}
                y1={py(p1[1])}
                x2={px(p2[0])}
                y2={py(p2[1])}
                stroke={col1Color}
                strokeWidth={i === 0 ? 1.8 : 0.9}
                strokeOpacity={i === 0 ? 0.8 : 0.32}
              />
            );
          })}

          {/* Transformed horizontal lines */}
          {GRID_LINES.map((i) => {
            const p1: Vec2 = [
              analysis.activeA[0][0] * -4 + analysis.activeA[0][1] * i,
              analysis.activeA[1][0] * -4 + analysis.activeA[1][1] * i,
            ];
            const p2: Vec2 = [
              analysis.activeA[0][0] * 4 + analysis.activeA[0][1] * i,
              analysis.activeA[1][0] * 4 + analysis.activeA[1][1] * i,
            ];
            return (
              <line
                key={`gh-${i}`}
                x1={px(p1[0])}
                y1={py(p1[1])}
                x2={px(p2[0])}
                y2={py(p2[1])}
                stroke={col2Color}
                strokeWidth={i === 0 ? 1.8 : 0.9}
                strokeOpacity={i === 0 ? 0.8 : 0.32}
              />
            );
          })}

          {/* Shaded transformed unit square (area = |det(A)|) */}
          <polygon
            points={polyPts}
            fill={areaColor}
            fillOpacity={0.2}
            stroke={areaColor}
            strokeWidth={1.6}
          />

          {/* Original input vector v (dashed) */}
          <line x1={ox} y1={oy} x2={vInTip[0]} y2={vInTip[1]} stroke={vecColor} strokeWidth={1.6} strokeDasharray="4 3" opacity={0.7} />
          <circle cx={vInTip[0]} cy={vInTip[1]} r={3.5} fill={vecColor} opacity={0.7} />

          {/* Transformed basis columns + A*v */}
          {Math.hypot(c1Tip[0] - ox, c1Tip[1] - oy) > 4 && (
            <line
              x1={ox}
              y1={oy}
              x2={c1Tip[0]}
              y2={c1Tip[1]}
              stroke={col1Color}
              strokeWidth={2.8}
              markerEnd={`url(#${arrowId}-c1-${offsetX})`}
            />
          )}
          {Math.hypot(c2Tip[0] - ox, c2Tip[1] - oy) > 4 && (
            <line
              x1={ox}
              y1={oy}
              x2={c2Tip[0]}
              y2={c2Tip[1]}
              stroke={col2Color}
              strokeWidth={2.8}
              markerEnd={`url(#${arrowId}-c2-${offsetX})`}
            />
          )}
          {Math.hypot(vOutTip[0] - ox, vOutTip[1] - oy) > 4 && (
            <line
              x1={ox}
              y1={oy}
              x2={vOutTip[0]}
              y2={vOutTip[1]}
              stroke={vecColor}
              strokeWidth={2.6}
              markerEnd={`url(#${arrowId}-v-${offsetX})`}
            />
          )}
          <circle cx={vOutTip[0]} cy={vOutTip[1]} r={4.5} fill={vecColor} stroke={t.background} strokeWidth={1.3} />

          {labelCandidates.map((lbl) => (
            <text
              key={lbl.id}
              x={lbl.x}
              y={lbl.y}
              textAnchor={lbl.anchor}
              fontSize={14}
              fontWeight={700}
              fill={lbl.color}
              stroke={t.background}
              strokeWidth={4}
              paintOrder="stroke"
            >
              {lbl.text}
            </text>
          ))}
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 22} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Dashed = old square (area 1) · Shaded = {analysis.areaScale.toFixed(2)}
        </text>
      </g>
    );
  };

  const renderBreakdownPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 12;
    const plotY = 36;
    const plotW = panelW - 22;
    const plotH = 224;
    const barW = plotW - 24;
    const areaRatio = Math.min(1, analysis.areaScale / 4);

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2. Columns, output A·v &amp; area scale
        </text>
        <defs>
          <clipPath id={`${clipRightId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipRightId}-${offsetX})`}>
          {/* Column linear combination */}
          <text x={plotX + 12} y={plotY + 24} fontSize={14} fontWeight={700} fill={t.textPrimary}>
            Input v = ({analysis.inputV[0].toFixed(1)}, {analysis.inputV[1].toFixed(1)}) mixes the columns:
          </text>
          <text x={plotX + 12} y={plotY + 48} fontSize={14} fill={col1Color} fontWeight={700}>
            {analysis.inputV[0].toFixed(1)} × col 1 = ({analysis.scaledCol1[0].toFixed(2)}, {analysis.scaledCol1[1].toFixed(2)})
          </text>
          <text x={plotX + 12} y={plotY + 70} fontSize={14} fill={col2Color} fontWeight={700}>
            + {analysis.inputV[1].toFixed(1)} × col 2 = ({analysis.scaledCol2[0].toFixed(2)}, {analysis.scaledCol2[1].toFixed(2)})
          </text>
          <line x1={plotX + 12} y1={plotY + 82} x2={plotX + plotW - 12} y2={plotY + 82} stroke={t.border} strokeWidth={1.2} />
          <text x={plotX + 12} y={plotY + 104} fontSize={15} fill={vecColor} fontWeight={700}>
            = Output A·v = ({analysis.outputV[0].toFixed(2)}, {analysis.outputV[1].toFixed(2)})
          </text>

          {/* Area scale bar */}
          <text x={plotX + 12} y={plotY + 138} fontSize={14} fontWeight={700} fill={t.textPrimary}>
            Area scale |det(A)|
          </text>
          <text x={plotX + plotW - 12} y={plotY + 138} textAnchor="end" fontSize={15} fontWeight={700} fill={areaColor}>
            det = {analysis.determinant.toFixed(2)} ({analysis.areaScale.toFixed(2)}×)
          </text>
          <rect x={plotX + 12} y={plotY + 148} width={barW} height={16} rx={4} fill={t.surfaceAlt} />
          <rect x={plotX + 12} y={plotY + 148} width={Math.max(3, areaRatio * barW)} height={16} rx={4} fill={areaColor} fillOpacity={0.85} />
          {/* Marker for 1.0x unit area */}
          <line x1={plotX + 12 + barW * 0.25} y1={plotY + 144} x2={plotX + 12 + barW * 0.25} y2={plotY + 168} stroke={t.textPrimary} strokeWidth={1.5} strokeDasharray="3 2" />
          <text x={plotX + 12 + barW * 0.25} y={plotY + 183} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
            1.0× (unchanged)
          </text>

          <text x={plotX + 12} y={plotY + 210} fontSize={14} fontWeight={700} fill={areaColor}>
            Rank = {analysis.rank} ·{' '}
            {analysis.orientation === 'collapsed'
              ? 'Collapsed to a line!'
              : analysis.orientation === 'flipped'
                ? 'Flipped like a mirror'
                : 'Normal orientation'}
          </text>
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 22} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Columns tell where (1, 0) and (0, 1) land
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
                title="A 2×2 matrix stretches, turns, or squashes every point on a plane"
                description="Instead of memorizing multiplication rules, watch the two columns of A: column 1 shows where (1, 0) lands, column 2 shows where (0, 1) lands, and every grid line and vector follows."
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
              <PillSelect<string>
                label="Matrix presets (common space warps)"
                value={activePresetId}
                onChange={(id) => {
                  const found = MATRIX_PRESETS.find((p) => p.id === id);
                  if (found) {
                    setTargetA(found.A);
                    playback.playFromStart();
                    setPrediction(null);
                  }
                }}
                options={[
                  ...MATRIX_PRESETS.map((p) => ({ value: p.id, label: p.label })),
                  ...(activePresetId === 'custom' ? [{ value: 'custom', label: 'Custom matrix' }] : []),
                ]}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 135px), 1fr))', gap: 10, alignItems: 'end' }}>
            <MatrixEntryControl
              label="A[0][0] (col 1 x)"
              ariaLabel="Matrix entry A[0][0]"
              value={targetA[0][0]}
              onChange={(v) => setMatrixEntry(0, 0, v)}
              accent={col1Color}
            />
            <MatrixEntryControl
              label="A[0][1] (col 2 x)"
              ariaLabel="Matrix entry A[0][1]"
              value={targetA[0][1]}
              onChange={(v) => setMatrixEntry(0, 1, v)}
              accent={col2Color}
            />
            <MatrixEntryControl
              label="A[1][0] (col 1 y)"
              ariaLabel="Matrix entry A[1][0]"
              value={targetA[1][0]}
              onChange={(v) => setMatrixEntry(1, 0, v)}
              accent={col1Color}
            />
            <MatrixEntryControl
              label="A[1][1] (col 2 y)"
              ariaLabel="Matrix entry A[1][1]"
              value={targetA[1][1]}
              onChange={(v) => setMatrixEntry(1, 1, v)}
              accent={col2Color}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', fontSize: 15 }}>
            <strong style={{ color: vecColor }}>Test vector v:</strong>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>x</span>
              <input
                aria-label="Test vector x"
                type="number"
                min={-2.5}
                max={2.5}
                step={0.5}
                value={inputV[0]}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setInputV([Math.max(-2.5, Math.min(2.5, v)), inputV[1]]);
                }}
                style={{
                  width: 72,
                  minHeight: 32,
                  padding: '3px 6px',
                  font: 'inherit',
                  fontSize: 15,
                  fontVariantNumeric: 'tabular-nums',
                  border: `1.5px solid ${vecColor}`,
                  borderRadius: RADIUS.sm,
                  background: t.background,
                  color: t.textPrimary,
                }}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>y</span>
              <input
                aria-label="Test vector y"
                type="number"
                min={-2.5}
                max={2.5}
                step={0.5}
                value={inputV[1]}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setInputV([inputV[0], Math.max(-2.5, Math.min(2.5, v))]);
                }}
                style={{
                  width: 72,
                  minHeight: 32,
                  padding: '3px 6px',
                  font: 'inherit',
                  fontSize: 15,
                  fontVariantNumeric: 'tabular-nums',
                  border: `1.5px solid ${vecColor}`,
                  borderRadius: RADIUS.sm,
                  background: t.background,
                  color: t.textPrimary,
                }}
              />
            </label>
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="Matrix transformation colours">
        <span>
          <span style={{ display: 'inline-block', width: 16, height: 4, background: col1Color, verticalAlign: 'middle', marginRight: 6 }} />
          Column 1 (where (1, 0) lands)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 16, height: 4, background: col2Color, verticalAlign: 'middle', marginRight: 6 }} />
          Column 2 (where (0, 1) lands)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 16, height: 4, background: vecColor, verticalAlign: 'middle', marginRight: 6 }} />
          Test vector v → A·v
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: areaColor, opacity: 0.5, verticalAlign: 'middle', marginRight: 6 }} />
          Transformed unit square (|det| = {analysis.areaScale.toFixed(2)})
        </span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 296"
            role="img"
            aria-label={`2x2 matrix grid transformation: det=${analysis.determinant.toFixed(2)}, rank=${analysis.rank}`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderGridPanel(0, 444)}
            {renderBreakdownPanel(456, 304)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 296" role="img" aria-label="Warped 2D grid and basis arrows" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderGridPanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 296" role="img" aria-label="Column combination and area scale" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderBreakdownPanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title="Matrix map & determinant" latex={FORMULA_LATEX.det} color="yellow" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>
              col₁ = ({analysis.col1[0].toFixed(1)}, {analysis.col1[1].toFixed(1)}) · det = <strong>{analysis.determinant.toFixed(2)}</strong> · rank = <strong>{analysis.rank}</strong>
            </p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${MORPH_FRACTIONS.length}`} color="blue" tilt={1} live>
            <p>{analysis.explain}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="1. Column rule A·v"
              latex={FORMULA_LATEX.product}
              color="yellow"
              tilt={-1}
              active={activeFormula === 'product'}
              onSelect={() => setActiveFormula('product')}
            >
              <p style={{ textAlign: 'center' }}>The output is just x copies of column 1 plus y copies of column 2.</p>
            </StickyNote>
            <StickyNote
              title="2. Area scale det(A)"
              latex={FORMULA_LATEX.det}
              color="pink"
              tilt={1}
              active={activeFormula === 'det'}
              onSelect={() => setActiveFormula('det')}
            >
              <p style={{ textAlign: 'center' }}>Signed area of the stretched unit square; negative means mirror flip.</p>
            </StickyNote>
            <StickyNote
              title="3. Full rank vs collapse"
              latex={FORMULA_LATEX.rank}
              color="orange"
              tilt={-1}
              active={activeFormula === 'rank'}
              onSelect={() => setActiveFormula('rank')}
            >
              <p style={{ textAlign: 'center' }}>If area drops to 0, both columns point along one line and info is lost.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · ${Math.round(analysis.morphFraction * 100)}% applied`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                det = ({analysis.activeA[0][0].toFixed(2)}×{analysis.activeA[1][1].toFixed(2)}) − ({analysis.activeA[0][1].toFixed(2)}×{analysis.activeA[1][0].toFixed(2)}) = <strong>{analysis.determinant.toFixed(2)}</strong>
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                A·v = ({analysis.outputV[0].toFixed(2)}, {analysis.outputV[1].toFixed(2)}) · Rank = <strong>{analysis.rank}</strong>
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${MORPH_FRACTIONS.length} · What just happened`} color="blue" tilt={-1} live>
              <p>{analysis.explain}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="Set Row 1 to [1.0, 0.5] and Row 2 to [2.0, 1.0] (notice Row 2 is 2 × Row 1). What happens to the 2D grid?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="Because column 2 = 0.5 × column 1, both landing arrows point along the exact same line—det(A) = 1.0×1.0 − 0.5×2.0 = 0.00 (rank 1)."
            actionLabel="Load [1.0, 0.5; 2.0, 1.0] collapse now"
            onAction={() => {
              setTargetA([[1.0, 0.5], [2.0, 1.0]]);
              playback.setStep(MORPH_FRACTIONS.length - 1);
            }}
          />
        </>
      )}
    </div>
  );
}

export default function MatrixTransformationDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="2×2 matrix linear transformation playground"
      footer="Exact 2×2 matrix map A·v and determinant det(A) = a₁₁a₂₂ − a₁₂a₂₁. Edit any entry or vector coordinate to inspect basis landing columns and rank collapse."
    >
      <MatrixTransformationPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
