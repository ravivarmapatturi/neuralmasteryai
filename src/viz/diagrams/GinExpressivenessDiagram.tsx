import { useMemo, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../../theme/vizTokens';
import { SketchArrow } from '../../components/notebook/RoughShape';
import {
  PillSelect,
  StickyNote,
  StickyRow,
  VisualizationContainer,
  VizButton,
  useVizVisible,
} from '../primitives';
import {
  GIN_PRESETS,
  GIN_STEPS,
  compareGraphs,
  explainGinStep,
  parseNeighborList,
  type AggregatorKind,
  type GinComparisonResult,
  type GinPresetId,
} from '../lib/ginExpressiveness';
import { PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const AGG_NOTES: {
  id: AggregatorKind;
  title: string;
  latex: string;
  summary: string;
  color: 'yellow' | 'orange' | 'pink' | 'blue';
}[] = [
  {
    id: 'mean',
    title: 'Mean (average of neighbors)',
    latex: '\\text{Mean} = \\frac{1}{|\\mathcal{N}(v)|}\\sum_{u \\in \\mathcal{N}(v)} h_u',
    summary: 'Divides by neighbor count |N(v)|, so 2 ones and 4 ones both give 1.00.',
    color: 'yellow',
  },
  {
    id: 'max',
    title: 'Max (largest neighbor only)',
    latex: '\\text{Max} = \\max_{u \\in \\mathcal{N}(v)} h_u',
    summary: 'Keeps only the single biggest neighbor h_u and ignores duplicates.',
    color: 'orange',
  },
  {
    id: 'sum',
    title: 'Sum (add every neighbor)',
    latex: '\\text{Sum} = \\sum_{u \\in \\mathcal{N}(v)} h_u',
    summary: 'Adds all neighbor numbers without dividing, keeping the exact neighbor count.',
    color: 'pink',
  },
  {
    id: 'gin',
    title: 'GIN (sum + center + neural net)',
    latex: "h_v' = \\text{MLP}\\!\\big((1+\\epsilon)\\,h_v + \\sum_{u \\in \\mathcal{N}(v)} h_u\\big)",
    summary: 'Keeps (1+ε) of center h_v plus neighbor sum, then passes through a small neural net.',
    color: 'blue',
  },
];

const AGG_OPTIONS: { value: AggregatorKind; label: string }[] = [
  { value: 'mean', label: 'Mean (average)' },
  { value: 'max', label: 'Max (largest)' },
  { value: 'sum', label: 'Sum (add all)' },
  { value: 'gin', label: 'GIN (Sum + MLP)' },
];

const PREDICT_OPTIONS = [
  'Mean and Max (both give 1.00)',
  'Sum only (both give 2.00)',
  'GIN gives 1.00 for both',
] as const;

function formatNum(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function workedExpression(result: GinComparisonResult): string {
  const { graphA: a, graphB: b, kind } = result;
  const listA = a.neighbors.map(formatNum).join(' + ');
  const listB = b.neighbors.map(formatNum).join(' + ');
  if (kind === 'mean') {
    return `A: (${listA}) ÷ ${a.neighborCount} = ${a.output.toFixed(2)}  |  B: (${listB}) ÷ ${b.neighborCount} = ${b.output.toFixed(2)}`;
  }
  if (kind === 'max') {
    return `A: max(${a.neighbors.map(formatNum).join(', ')}) = ${a.output.toFixed(2)}  |  B: max(${b.neighbors.map(formatNum).join(', ')}) = ${b.output.toFixed(2)}`;
  }
  if (kind === 'sum') {
    return `A: ${listA} = ${a.output.toFixed(2)}  |  B: ${listB} = ${b.output.toFixed(2)}`;
  }
  return `A: MLP((1+${a.epsilon.toFixed(1)})×${a.centerValue.toFixed(1)} + ${a.neighborSum.toFixed(1)}) = ${a.output.toFixed(2)}  |  B: MLP((1+${b.epsilon.toFixed(1)})×${b.centerValue.toFixed(1)} + ${b.neighborSum.toFixed(1)}) = ${b.output.toFixed(2)}`;
}

function GinPlayground({ compact = false, outerVisible }: { compact?: boolean; outerVisible: boolean }) {
  const t = useVizTokens();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(760);
  const [presetId, setPresetId] = useState<GinPresetId | 'custom'>('same-average');
  const [neighborsAText, setNeighborsAText] = useState('1, 1');
  const [neighborsBText, setNeighborsBText] = useState('1, 1, 1, 1');
  const [centerA, setCenterA] = useState(0.5);
  const [centerB, setCenterB] = useState(0.5);
  const [epsilon, setEpsilon] = useState(0.0);
  const [kind, setKind] = useState<AggregatorKind>('mean');
  const [prediction, setPrediction] = useState<number | null>(null);

  const playback = useStepPlayback(GIN_STEPS.length, 2100, 3, outerVisible);
  const step = playback.step;

  const neighborsA = useMemo(() => parseNeighborList(neighborsAText, 8), [neighborsAText]);
  const neighborsB = useMemo(() => parseNeighborList(neighborsBText, 8), [neighborsBText]);
  const result = useMemo(
    () =>
      compareGraphs({
        neighborsA,
        neighborsB,
        centerA,
        centerB,
        epsilon,
        kind,
      }),
    [neighborsA, neighborsB, centerA, centerB, epsilon, kind],
  );

  // Distinct consistent colours everywhere (never two similar reds/oranges)
  const graphAColor = t.accentSecondary; // Blue
  const graphBColor = t.accentPurple; // Purple
  const centerColor = t.accentTeal; // Teal
  const verdictColor = result.isBlindCollision ? t.accentDanger : t.accentPrimary;

  const applyPreset = (id: GinPresetId) => {
    const found = GIN_PRESETS.find((p) => p.id === id);
    if (!found) return;
    setPresetId(id);
    setNeighborsAText(found.neighborsAText);
    setNeighborsBText(found.neighborsBText);
    setCenterA(found.centerA);
    setCenterB(found.centerB);
    setEpsilon(found.epsilon);
    playback.setStep(3);
  };

  const caption = explainGinStep(result, step);
  const activeNote = AGG_NOTES.find((n) => n.id === kind) ?? AGG_NOTES[0];

  const renderStar = (
    cx: number,
    cy: number,
    radius: number,
    title: string,
    neighbors: number[],
    centerVal: number,
    outVal: number,
    dotColor: string,
    prefix: string,
  ) => {
    const n = neighbors.length;
    const leaves = neighbors.map((val, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const lx = cx + radius * cos;
      const ly = cy + radius * sin;
      const labelR = radius + 17;
      const tx = cx + labelR * cos;
      const ty = cy + labelR * sin + (sin > 0.35 ? 11 : sin < -0.35 ? -2 : 4);
      const anchor: 'start' | 'end' | 'middle' = cos > 0.25 ? 'start' : cos < -0.25 ? 'end' : 'middle';
      const mx = cx + radius * 0.42 * cos;
      const my = cy + radius * 0.42 * sin;
      const sx = cx + radius * 0.78 * cos;
      const sy = cy + radius * 0.78 * sin;
      return { val, lx, ly, tx, ty, anchor, mx, my, sx, sy };
    });

    const titleY = cy - radius - 52;
    const subY = cy - radius - 32;
    const outY = cy + radius + 46;

    return (
      <g>
        <text x={cx} y={titleY} textAnchor="middle" fontSize={15} fontWeight={700} fontFamily={FONT_FAMILY} fill={dotColor}>
          {title} ({n} neighbors)
        </text>
        <text x={cx} y={subY} textAnchor="middle" fontSize={14} fontFamily={FONT_FAMILY} fill={centerColor}>
          center h_v = {centerVal.toFixed(1)}
        </text>

        {leaves.map((leaf, i) => (
          <g key={`${prefix}-edge-${i}`}>
            <line
              x1={cx}
              y1={cy}
              x2={leaf.lx}
              y2={leaf.ly}
              stroke={step === 1 ? dotColor : t.border}
              strokeWidth={step === 1 ? 2.2 : 1.5}
              strokeOpacity={step === 1 ? 0.9 : 0.75}
            />
            {step === 1 && (
              <SketchArrow
                points={[
                  [leaf.sx, leaf.sy],
                  [leaf.mx, leaf.my],
                ]}
                color={dotColor}
                strokeWidth={1.8}
                roughness={0.8}
                id={`gin-msg-${prefix}-${i}`}
              />
            )}
          </g>
        ))}

        {leaves.map((leaf, i) => (
          <g key={`${prefix}-node-${i}`}>
            <circle cx={leaf.lx} cy={leaf.ly} r={5} fill={dotColor} stroke={t.background} strokeWidth={1.2} />
            <text
              x={leaf.tx}
              y={leaf.ty}
              textAnchor={leaf.anchor}
              fontSize={14}
              fontWeight={700}
              fontFamily="monospace"
              fill={dotColor}
            >
              {formatNum(leaf.val)}
            </text>
          </g>
        ))}

        {step >= 2 && <circle cx={cx} cy={cy} r={10} fill="none" stroke={verdictColor} strokeWidth={2} />}
        <circle cx={cx} cy={cy} r={6} fill={centerColor} stroke={t.background} strokeWidth={1.3} />

        {step >= 2 && (
          <text x={cx} y={outY} textAnchor="middle" fontSize={15} fontWeight={700} fontFamily={FONT_FAMILY} fill={dotColor}>
            output = {outVal.toFixed(2)}
          </text>
        )}
      </g>
    );
  };

  const renderRightComparison = (x0: number, y0: number, width: number) => {
    const outA = result.graphA.output;
    const outB = result.graphB.output;
    const minDomain = Math.min(0, outA, outB);
    const maxDomain = Math.max(1, outA, outB);
    const span = Math.max(1, maxDomain - minDomain);

    const barPlotX = x0 + 28;
    const barPlotW = Math.max(96, width - 92);
    const xBar = (val: number) => barPlotX + ((val - minDomain) / span) * barPlotW;
    const zeroBarX = xBar(0);
    const clipBarsId = `gin-bars-clip-${x0}-${width}`;

    // Paper-convention embedding space (Xu et al. Fig. 1: two multisets -> points in embedding space)
    const mapY = y0 + 180;
    const mapL = x0 + 18;
    const mapR = x0 + width - 18;
    const mapW = mapR - mapL;
    const xMap = (val: number) => mapL + ((val - minDomain) / span) * mapW;
    const clipMapId = `gin-map-clip-${x0}-${width}`;
    const posA = xMap(outA);
    const posB = xMap(outB);

    const drawBar = (val: number, y: number, color: string, label: string) => {
      const targetX = xBar(val);
      const rx = Math.min(zeroBarX, targetX);
      const rw = Math.max(5, Math.abs(targetX - zeroBarX));
      return (
        <g key={label}>
          <text x={x0} y={y + 16} fontSize={14} fontWeight={700} fontFamily={FONT_FAMILY} fill={color}>
            {label}
          </text>
          <rect x={barPlotX} y={y + 2} width={barPlotW} height={20} rx={4} fill={t.surfaceAlt} />
          <g clipPath={`url(#${clipBarsId})`}>
            <rect x={rx} y={y + 2} width={rw} height={20} rx={4} fill={color} fillOpacity={0.88} />
          </g>
          <text x={barPlotX + barPlotW + 8} y={y + 17} fontSize={14} fontWeight={700} fontFamily="monospace" fill={color}>
            {val.toFixed(2)}
          </text>
        </g>
      );
    };

    return (
      <g>
        <defs>
          <clipPath id={clipBarsId}>
            <rect x={barPlotX} y={y0 + 16} width={barPlotW} height={74} rx={4} />
          </clipPath>
          <clipPath id={clipMapId}>
            <rect x={mapL - 8} y={mapY - 50} width={mapW + 16} height={100} />
          </clipPath>
        </defs>

        <text x={x0} y={y0 + 8} fontSize={15} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
          1. Combined values ({kind.toUpperCase()})
        </text>
        {drawBar(outA, y0 + 20, graphAColor, 'A')}
        {drawBar(outB, y0 + 54, graphBColor, 'B')}
        <line x1={zeroBarX} y1={y0 + 18} x2={zeroBarX} y2={y0 + 82} stroke={t.border} strokeWidth={1.3} />

        {/* Paper convention: injective vs colliding multiset mapping on output line */}
        <text x={x0} y={mapY - 56} fontSize={15} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
          2. Output space (Xu et al., 2019)
        </text>
        <line x1={mapL} y1={mapY} x2={mapR} y2={mapY} stroke={t.border} strokeWidth={1.5} />
        <text x={mapL} y={mapY + 18} textAnchor="start" fontSize={14} fontFamily="monospace" fill={t.textMuted}>
          {minDomain.toFixed(1)}
        </text>
        <text x={mapR} y={mapY + 18} textAnchor="end" fontSize={14} fontFamily="monospace" fill={t.textMuted}>
          {maxDomain.toFixed(1)}
        </text>

        <g clipPath={`url(#${clipMapId})`}>
          {/* Leader lines keep A above and B below so labels NEVER overlap even on collision */}
          <line x1={posA} y1={mapY - 5} x2={posA} y2={mapY - 22} stroke={graphAColor} strokeWidth={1.4} />
          <line x1={posB} y1={mapY + 5} x2={posB} y2={mapY + 22} stroke={graphBColor} strokeWidth={1.4} />
          {result.isBlindCollision && (
            <circle cx={posA} cy={mapY} r={10} fill="none" stroke={t.accentDanger} strokeWidth={2} strokeDasharray="3 2" />
          )}
          <circle cx={posA} cy={mapY} r={5} fill={graphAColor} stroke={t.background} strokeWidth={1.3} />
          <circle cx={posB} cy={mapY} r={5} fill={graphBColor} stroke={t.background} strokeWidth={1.3} />
        </g>

        <text
          x={Math.max(mapL + 36, Math.min(mapR - 36, posA))}
          y={mapY - 27}
          textAnchor="middle"
          fontSize={14}
          fontWeight={700}
          fontFamily={FONT_FAMILY}
          fill={graphAColor}
        >
          A: {outA.toFixed(2)}
        </text>
        <text
          x={Math.max(mapL + 36, Math.min(mapR - 36, posB))}
          y={mapY + 39}
          textAnchor="middle"
          fontSize={14}
          fontWeight={700}
          fontFamily={FONT_FAMILY}
          fill={graphBColor}
        >
          B: {outB.toFixed(2)}
        </text>

        <text x={x0} y={mapY + 66} fontSize={15} fontWeight={700} fontFamily={FONT_FAMILY} fill={verdictColor}>
          {result.isBlindCollision
            ? 'Collision: A & B land on the exact same dot!'
            : result.structureDiffers
              ? `Separated! Gap = ${result.outputGap.toFixed(2)}`
              : 'Identical graphs (same dot)'}
        </text>
      </g>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {!compact && (
        <>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.accentPrimary, marginBottom: 4 }}>
              Live playground
            </div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, lineHeight: 1.35, color: t.textPrimary }}>
              Can a Graph Neural Network tell two neighborhoods apart?
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 15, color: t.textSecondary, lineHeight: 1.5 }}>
              A graph network summarizes each dot by combining the numbers on its connected neighbors — if it only takes an average, two neighborhoods of different sizes can look identical.
            </p>
          </div>

          {/* Control Group 1: Scenarios */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }} role="group" aria-label="Preset graph pairs">
            <span style={{ fontSize: 15, fontWeight: 700, color: t.textSecondary }}>Scenarios (try a pair):</span>
            {GIN_PRESETS.map((p) => {
              const active = presetId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => applyPreset(p.id)}
                  style={{
                    padding: '6px 11px',
                    borderRadius: RADIUS.sm,
                    border: `1.5px solid ${active ? t.accentPrimary : t.border}`,
                    background: active ? t.surfaceAlt : 'transparent',
                    color: active ? t.accentPrimary : t.textPrimary,
                    fontFamily: FONT_FAMILY,
                    fontSize: 15,
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Control Group 2: Free node & center inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 168px), 1fr))', gap: 10, alignItems: 'end' }}>
            <label style={{ display: 'block', minWidth: 0, fontSize: 15 }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700, color: graphAColor }}>
                Graph A neighbor numbers h_u
              </span>
              <input
                aria-label="Graph A neighbors"
                type="text"
                value={neighborsAText}
                maxLength={40}
                onChange={(e) => {
                  setPresetId('custom');
                  setNeighborsAText(e.target.value);
                }}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  minHeight: 36,
                  padding: '5px 9px',
                  fontFamily: 'monospace',
                  fontSize: 15,
                  border: `1.5px solid ${t.border}`,
                  borderRadius: RADIUS.sm,
                  background: t.background,
                  color: t.textPrimary,
                }}
              />
            </label>

            <label style={{ display: 'block', minWidth: 0, fontSize: 15 }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700, color: graphBColor }}>
                Graph B neighbor numbers h_u
              </span>
              <input
                aria-label="Graph B neighbors"
                type="text"
                value={neighborsBText}
                maxLength={40}
                onChange={(e) => {
                  setPresetId('custom');
                  setNeighborsBText(e.target.value);
                }}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  minHeight: 36,
                  padding: '5px 9px',
                  fontFamily: 'monospace',
                  fontSize: 15,
                  border: `1.5px solid ${t.border}`,
                  borderRadius: RADIUS.sm,
                  background: t.background,
                  color: t.textPrimary,
                }}
              />
            </label>

            <div style={{ minWidth: 0, fontSize: 15 }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700, color: centerColor }}>
                Center dot value h_v (A / B)
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  aria-label="Center A feature"
                  type="number"
                  step={0.5}
                  min={-5}
                  max={10}
                  value={centerA}
                  onChange={(e) => {
                    setPresetId('custom');
                    setCenterA(Number(e.target.value) || 0);
                  }}
                  style={{
                    width: '50%',
                    minWidth: 0,
                    boxSizing: 'border-box',
                    minHeight: 36,
                    padding: '5px 7px',
                    fontFamily: 'monospace',
                    fontSize: 15,
                    border: `1.5px solid ${t.border}`,
                    borderRadius: RADIUS.sm,
                    background: t.background,
                    color: t.textPrimary,
                  }}
                />
                <input
                  aria-label="Center B feature"
                  type="number"
                  step={0.5}
                  min={-5}
                  max={10}
                  value={centerB}
                  onChange={(e) => {
                    setPresetId('custom');
                    setCenterB(Number(e.target.value) || 0);
                  }}
                  style={{
                    width: '50%',
                    minWidth: 0,
                    boxSizing: 'border-box',
                    minHeight: 36,
                    padding: '5px 7px',
                    fontFamily: 'monospace',
                    fontSize: 15,
                    border: `1.5px solid ${t.border}`,
                    borderRadius: RADIUS.sm,
                    background: t.background,
                    color: t.textPrimary,
                  }}
                />
              </div>
            </div>

            <label style={{ display: 'block', minWidth: 0, fontSize: 15 }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700, color: t.textPrimary }}>
                Center self-weight ε (GIN)
              </span>
              <input
                aria-label="GIN epsilon"
                type="number"
                step={0.1}
                min={0}
                max={2}
                value={epsilon}
                onChange={(e) => {
                  setPresetId('custom');
                  setEpsilon(Math.max(0, Math.min(2, Number(e.target.value) || 0)));
                }}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  minHeight: 36,
                  padding: '5px 9px',
                  fontFamily: 'monospace',
                  fontSize: 15,
                  border: `1.5px solid ${t.border}`,
                  borderRadius: RADIUS.sm,
                  background: t.background,
                  color: t.textPrimary,
                }}
              />
            </label>
          </div>

          {/* Control Group 3: Aggregation rule + live summary */}
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <PillSelect<AggregatorKind>
              label="How the center combines neighbors (aggregation rule)"
              value={kind}
              onChange={(next) => {
                setKind(typeof next === 'function' ? next(kind) : next);
                playback.setStep(3);
              }}
              options={AGG_OPTIONS}
            />
            <div style={{ fontSize: 15, color: t.textPrimary, fontVariantNumeric: 'tabular-nums' }} aria-live="polite">
              Output A: <strong style={{ color: graphAColor }}>{result.graphA.output.toFixed(2)}</strong> · Output B:{' '}
              <strong style={{ color: graphBColor }}>{result.graphB.output.toFixed(2)}</strong> · Status:{' '}
              <strong style={{ color: verdictColor }}>{result.isBlindCollision ? 'Collision!' : 'Separated'}</strong>
            </div>
          </div>
        </>
      )}

      {/* HTML Colour Legend (consistent everywhere) */}
      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 15, color: t.textSecondary }}
        aria-label="Graph colours"
      >
        <span>
          <span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: '50%', background: centerColor, verticalAlign: 'middle', marginRight: 6 }} />
          Center dot (h_v)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: '50%', background: graphAColor, verticalAlign: 'middle', marginRight: 6 }} />
          Graph A ({neighborsA.length} neighbors)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: '50%', background: graphBColor, verticalAlign: 'middle', marginRight: 6 }} />
          Graph B ({neighborsB.length} neighbors)
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: '50%', background: verdictColor, verticalAlign: 'middle', marginRight: 6 }} />
          {result.isBlindCollision ? 'Same point (blind)' : 'Different points (kept apart)'}
        </span>
      </div>

      {/* Main SVG */}
      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 296"
            role="img"
            aria-label={`Graph A (${neighborsA.length} neighbors) outputs ${result.graphA.output.toFixed(2)} and Graph B (${neighborsB.length} neighbors) outputs ${result.graphB.output.toFixed(2)} under ${kind}`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderStar(114, 152, 54, 'Graph A', neighborsA, centerA, result.graphA.output, graphAColor, 'A')}
            {renderStar(342, 152, 54, 'Graph B', neighborsB, centerB, result.graphB.output, graphBColor, 'B')}
            <line x1={462} y1={14} x2={462} y2={280} stroke={t.border} strokeDasharray="4 4" strokeWidth={1.2} />
            {renderRightComparison(482, 24, 266)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            <svg
              width="100%"
              viewBox="0 0 380 264"
              role="img"
              aria-label={`Graph A and Graph B star neighborhoods`}
              style={{ display: 'block', fontFamily: FONT_FAMILY }}
            >
              {renderStar(96, 138, 44, 'Graph A', neighborsA, centerA, result.graphA.output, graphAColor, 'A-m')}
              {renderStar(284, 138, 44, 'Graph B', neighborsB, centerB, result.graphB.output, graphBColor, 'B-m')}
            </svg>
            <svg
              width="100%"
              viewBox="0 0 380 264"
              role="img"
              aria-label={`Combined values and output space comparison under ${kind}`}
              style={{ display: 'block', fontFamily: FONT_FAMILY }}
            >
              {renderRightComparison(14, 16, 352)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title={activeNote.title} latex={activeNote.latex} color={activeNote.color} tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>{workedExpression(result)}</p>
          </StickyNote>
          <StickyNote title={`Step ${step + 1} of ${GIN_STEPS.length}`} color="blue" tilt={1} live>
            <p>{caption}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            {AGG_NOTES.map((note, idx) => (
              <StickyNote
                key={note.id}
                title={note.title}
                latex={note.latex}
                color={note.color}
                tilt={idx % 2 ? 1 : -1}
                active={kind === note.id}
                onSelect={() => {
                  setKind(note.id);
                  playback.setStep(3);
                }}
              >
                <p style={{ textAlign: 'center' }}>{note.summary}</p>
              </StickyNote>
            ))}
          </StickyRow>

          <StickyRow>
            <StickyNote title="Worked out with your numbers" color="green" tilt={1}>
              <p className="nm-sticky__mono">{workedExpression(result)}</p>
            </StickyNote>
            <StickyNote title={`Step ${step + 1} of ${GIN_STEPS.length} · What just happened`} color="blue" tilt={-1} live>
              <p>{caption}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="Graph A has 2 neighbors [1, 1] and Graph B has 4 neighbors [1, 1, 1, 1]. Which aggregators give BOTH center dots the exact same number?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="Mean (1.00 = 1.00) and Max (1.00 = 1.00) throw away neighbor count; Sum gives 2 vs 4."
            actionLabel="Test 2 vs 4 under Mean now"
            onAction={() => {
              applyPreset('same-average');
              setKind('mean');
              playback.playFromStart();
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
            <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
            <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            <span style={{ marginLeft: 'auto', fontSize: 15, color: t.textSecondary }}>
              h_v = center value · h_u = neighbor value · click any formula note to switch
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default function GinExpressivenessDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="GIN Sum vs. Mean Expressiveness Playground"
      footer="Exact message-passing calculation across Mean, Max, Sum, and a 2-layer ReLU GIN rule (Xu et al., 2019). Edit any neighbor list or center number to see when pooling loses graph structure."
    >
      <GinPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
