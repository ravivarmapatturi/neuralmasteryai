import { useEffect, useMemo, useRef, useState } from 'react';
import { scaleLinear } from 'd3';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../../theme/vizTokens';
import { SketchArrow, SketchRect } from '../../components/notebook/RoughShape';
import {
  PillSelect,
  StickyNote,
  StickyRow,
  VisualizationContainer,
  VisualizationHeader,
  VizButton,
  usePrefersReducedMotion,
  useVizVisible,
} from '../primitives';
import {
  IMAGE_PRESETS,
  INSPECT_TOUR,
  clampByte,
  cloneGrid,
  explainImagePixel,
  rgbToGrayscale,
  scaleToSignedUnit,
  tensorMemoryStats,
  zscoreChannel,
  type ImagePresetId,
  type RgbPixel,
  type TensorMemoryStats,
  type TensorMode,
} from '../lib/imageTensor';
import { useAutoplayDefault } from '../primitives/autoplayDefault';

const PRESET_OPTIONS: { value: ImagePresetId; label: string }[] = IMAGE_PRESETS.map((p) => ({
  value: p.id,
  label: p.label,
}));

const MODE_OPTIONS: { value: TensorMode; label: string }[] = [
  { value: 'rgb', label: 'RGB (0–255)' },
  { value: 'gray', label: 'Grayscale (Y)' },
  { value: 'unit', label: 'Scaled [-1, 1]' },
  { value: 'zscore', label: 'Z-score' },
];

const MODE_FORMULA_NOTES: {
  id: TensorMode;
  title: string;
  latex: string;
  explain: string;
  color: 'yellow' | 'pink' | 'orange' | 'green';
}[] = [
  {
    id: 'rgb',
    title: 'Raw RGB (0–255)',
    latex: '\\text{Bytes} = H \\times W \\times 3 \\times 1',
    explain: 'Three 0–255 integer grids (Red, Green, Blue). Shape [4, 4, 3], 1 byte per number.',
    color: 'yellow',
  },
  {
    id: 'gray',
    title: 'Grayscale brightness (Y)',
    latex: 'Y = 0.299R + 0.587G + 0.114B',
    explain: 'Merges 3 colour channels into 1 brightness grid. Green counts most because human eyes see it brightest.',
    color: 'pink',
  },
  {
    id: 'unit',
    title: 'Scaled to [-1, 1]',
    latex: "x' = 2\\!\\left(\\frac{x}{255}\\right) - 1",
    explain: 'Rescales 0..255 into −1.00..+1.00 floats so inputs start centered around zero.',
    color: 'orange',
  },
  {
    id: 'zscore',
    title: 'ImageNet Z-score',
    latex: 'z_c = \\frac{x_c/255 - \\mu_c}{\\sigma_c}',
    explain: 'Subtracts dataset average μ_c ([0.485, 0.456, 0.406]) and divides by spread σ_c per channel.',
    color: 'green',
  },
];

const PREDICT_OPTIONS = [
  'Blue = 0, Grayscale Y ≈ 226 (bright)',
  'Blue = 255, Grayscale Y = 0 (dark)',
  'All 3 channels equal 170',
] as const;

function contrastOnIntensity(t: ReturnType<typeof useVizTokens>, intensity: number): string {
  const lightInk = t.mode === 'dark' ? t.textPrimary : t.background;
  const darkInk = t.mode === 'dark' ? t.background : t.textPrimary;
  return intensity > 140 ? darkInk : lightInk;
}

function workedFormulaText(pixel: RgbPixel, mode: TensorMode, stats: TensorMemoryStats): string {
  const [r, g, b] = pixel;
  if (mode === 'gray') {
    const y = rgbToGrayscale(pixel);
    return `Y = 0.299×${r} + 0.587×${g} + 0.114×${b} = ${y.toFixed(1)} (grid shows ${Math.round(y)}) · Shape [${stats.shape.join(', ')}] = ${stats.totalValues} floats (${stats.totalBytes} bytes).`;
  }
  if (mode === 'unit') {
    return `R' = 2×(${r}/255)−1 = ${scaleToSignedUnit(r).toFixed(2)}, G' = ${scaleToSignedUnit(g).toFixed(2)}, B' = ${scaleToSignedUnit(b).toFixed(2)} · Shape [${stats.shape.join(', ')}] = ${stats.totalBytes} bytes (${stats.dtype}).`;
  }
  if (mode === 'zscore') {
    return `z_R = (${(r / 255).toFixed(3)}−0.485)/0.229 = ${zscoreChannel(r, 0).toFixed(2)}, z_G = ${zscoreChannel(g, 1).toFixed(2)}, z_B = ${zscoreChannel(b, 2).toFixed(2)} · ${stats.totalBytes} bytes (${stats.dtype}).`;
  }
  return `RGB = [${r}, ${g}, ${b}] · Shape [${stats.shape.join(', ')}] = ${stats.shape[0]}×${stats.shape[1]}×${stats.shape[2]} = ${stats.totalValues} integers (${stats.totalBytes} bytes as ${stats.dtype}).`;
}

function ChannelNumberInput({
  label,
  value,
  accent,
  onChange,
}: {
  label: string;
  value: number;
  accent: string;
  onChange: (v: number) => void;
}) {
  const t = useVizTokens();
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 15, color: t.textSecondary }}>
      <span style={{ fontWeight: 700, color: accent }}>{label}:</span>
      <input
        aria-label={label}
        type="number"
        min={0}
        max={255}
        step={1}
        value={value}
        onChange={(e) => onChange(clampByte(Number(e.target.value)))}
        style={{
          width: 66,
          minHeight: 34,
          padding: '4px 6px',
          borderRadius: RADIUS.sm,
          border: `1.5px solid ${accent}`,
          background: t.background,
          color: t.textPrimary,
          fontFamily: 'monospace',
          fontSize: 15,
        }}
      />
    </label>
  );
}

function ImageTensorPlayground({ compact = false, outerVisible = true }: { compact?: boolean; outerVisible?: boolean }) {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const innerVisible = useVizVisible();
  const visible = outerVisible && innerVisible;

  const hostRef = useRef<HTMLDivElement>(null);
  const [hostWidth, setHostWidth] = useState(760);
  useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 760;
      if (w > 0) setHostWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const isCompactPhone = hostWidth < 540;

  const [presetId, setPresetId] = useState<ImagePresetId>('sunset');
  const [mode, setMode] = useState<TensorMode>('rgb');
  const [grid, setGrid] = useState<[number, number, number][][]>(() => cloneGrid(IMAGE_PRESETS[0].grid));
  const [manualCoord, setManualCoord] = useState<[number, number] | null>(null);
  const [prediction, setPrediction] = useState<number | null>(null);

  const [tourIdx, setTourIdx] = useState(() => (reducedMotion ? 1 : 0));
  const autoplayDefault = useAutoplayDefault();
  const [playing, setPlaying] = useState(() => autoplayDefault && !reducedMotion);

  useEffect(() => {
    if (reducedMotion) {
      setPlaying(false);
      setTourIdx(1);
    }
  }, [reducedMotion]);

  useEffect(() => {
    if (!playing || !visible || reducedMotion) return undefined;
    const id = window.setTimeout(() => {
      setTourIdx((curr) => (curr + 1) % INSPECT_TOUR.length);
    }, 2000);
    return () => window.clearTimeout(id);
  }, [playing, visible, reducedMotion, tourIdx]);

  const [selRow, selCol] = manualCoord ?? INSPECT_TOUR[tourIdx];
  const activePixel: RgbPixel = grid[selRow][selCol];
  const stats = useMemo(() => tensorMemoryStats(4, 4, mode), [mode]);
  const caption = explainImagePixel(activePixel, selRow, selCol, mode);
  const workedText = workedFormulaText(activePixel, mode, stats);
  const activeModeMeta = MODE_FORMULA_NOTES.find((m) => m.id === mode) ?? MODE_FORMULA_NOTES[0];

  const rColor = t.accentDanger;
  const gColor = t.accentPrimary;
  const bColor = t.accentSecondary;
  const selColor = t.accentWarn;

  const selectPreset = (nextId: ImagePresetId | ((prev: ImagePresetId) => ImagePresetId)) => {
    const id = typeof nextId === 'function' ? nextId(presetId) : nextId;
    const found = IMAGE_PRESETS.find((p) => p.id === id) ?? IMAGE_PRESETS[0];
    setPlaying(false);
    setPresetId(id);
    setGrid(cloneGrid(found.grid));
    setManualCoord(null);
  };

  const selectMode = (nextM: TensorMode | ((prev: TensorMode) => TensorMode)) => {
    setPlaying(false);
    setMode((prev) => (typeof nextM === 'function' ? nextM(prev) : nextM));
  };

  const updateChannel = (channelIdx: 0 | 1 | 2, val: number) => {
    setPlaying(false);
    setManualCoord([selRow, selCol]);
    setGrid((prev) =>
      prev.map((row, r) =>
        row.map((px, c) => {
          if (r !== selRow || c !== selCol) return px;
          const copy: [number, number, number] = [px[0], px[1], px[2]];
          copy[channelIdx] = clampByte(val);
          return copy;
        }),
      ),
    );
  };

  const pickCell = (r: number, c: number) => {
    setPlaying(false);
    setManualCoord([r, c]);
  };

  const formatCellVal = (px: RgbPixel, ch: 0 | 1 | 2): string => {
    if (mode === 'rgb') return String(px[ch]);
    if (mode === 'unit') return scaleToSignedUnit(px[ch]).toFixed(1);
    if (mode === 'zscore') return zscoreChannel(px[ch], ch).toFixed(1);
    return String(Math.round(rgbToGrayscale(px)));
  };

  // ---- Left: 4x4 Picture Grid with explicit H and W labels ----
  const renderPictureGrid = (offsetX: number, offsetY: number) => (
    <g>
      <text x={offsetX + 4} y={offsetY + 18} fontSize={15} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
        Picture (H=4 × W=4)
      </text>
      {[0, 1, 2, 3].map((c) => (
        <text key={`col-${c}`} x={offsetX + 34 + c * 40 + 19} y={offsetY + 42} textAnchor="middle" fontSize={14} fontFamily={FONT_FAMILY} fill={t.textMuted}>
          c{c}
        </text>
      ))}
      {grid.map((row, r) => (
        <g key={`row-${r}`}>
          <text x={offsetX + 14} y={offsetY + 50 + r * 40 + 24} textAnchor="middle" fontSize={14} fontFamily={FONT_FAMILY} fill={t.textMuted}>
            r{r}
          </text>
          {row.map((px, c) => {
            const x = offsetX + 34 + c * 40;
            const y = offsetY + 50 + r * 40;
            const yVal = Math.round(rgbToGrayscale(px));
            const fillCss = mode === 'gray' ? `rgb(${yVal}, ${yVal}, ${yVal})` : `rgb(${px[0]}, ${px[1]}, ${px[2]})`;
            const isSel = r === selRow && c === selCol;
            return (
              <g key={`px-${r}-${c}`} onClick={() => pickCell(r, c)} style={{ cursor: 'pointer' }}>
                <rect x={x} y={y} width={38} height={38} rx={3} fill={fillCss} stroke={t.border} strokeWidth={1} />
                {isSel && (
                  <SketchRect
                    x={x - 1}
                    y={y - 1}
                    width={40}
                    height={40}
                    color={selColor}
                    strokeWidth={2.5}
                    roughness={1}
                    id={`img-sel-${r}-${c}`}
                  />
                )}
              </g>
            );
          })}
        </g>
      ))}
      <text x={offsetX + 34} y={offsetY + 230} fontSize={14} fontWeight={700} fontFamily={FONT_FAMILY} fill={selColor}>
        Selected: pixel ({selRow}, {selCol})
      </text>
      <text x={offsetX + 34} y={offsetY + 250} fontSize={14} fontFamily={FONT_FAMILY} fill={t.textSecondary}>
        Click any square to inspect
      </text>
    </g>
  );

  // ---- Channel 4x4 numeric matrix ----
  const renderChannelMatrix = (ch: 0 | 1 | 2, title: string, accent: string, ox: number, oy: number) => (
    <g key={title}>
      <text x={ox + 80} y={oy + 16} textAnchor="middle" fontSize={15} fontWeight={700} fontFamily={FONT_FAMILY} fill={accent}>
        {title}
      </text>
      {grid.map((row, r) =>
        row.map((px, c) => {
          const x = ox + c * 40;
          const y = oy + 26 + r * 40;
          const v = px[ch];
          const isSel = r === selRow && c === selCol;
          const bg =
            mode === 'rgb'
              ? `rgb(${ch === 0 ? v : 26}, ${ch === 1 ? v : 26}, ${ch === 2 ? v : 26})`
              : t.surfaceAlt;
          const txtColor = mode === 'rgb' ? contrastOnIntensity(t, v) : t.textPrimary;
          return (
            <g key={`c${ch}-${r}-${c}`} onClick={() => pickCell(r, c)} style={{ cursor: 'pointer' }}>
              <rect x={x} y={y} width={38} height={38} rx={3} fill={bg} stroke={isSel ? selColor : t.border} strokeWidth={isSel ? 2.2 : 1} />
              <text
                x={x + 19}
                y={y + 24}
                textAnchor="middle"
                fontSize={14}
                fontWeight={isSel ? 800 : 600}
                fontFamily="monospace"
                fill={txtColor}
              >
                {formatCellVal(px, ch)}
              </text>
            </g>
          );
        }),
      )}
    </g>
  );

  // ---- Clipped Number-Line Scale Comparison for Pixel (selRow, selCol) ----
  const renderScaleRuler = (ox: number, oy: number, width: number) => {
    const domain: [number, number] = mode === 'rgb' ? [0, 255] : mode === 'unit' ? [-1, 1] : [-2.5, 2.5];
    const lineL = ox + 16;
    const lineR = ox + width - 16;
    const lineY = oy + 36;
    const sx = scaleLinear().domain(domain).range([lineL, lineR]).clamp(true);
    const clipId = `img-ruler-clip-${ox}-${width}`;
    const vals = [
      { label: 'R', val: mode === 'rgb' ? activePixel[0] : mode === 'unit' ? scaleToSignedUnit(activePixel[0]) : zscoreChannel(activePixel[0], 0), col: rColor },
      { label: 'G', val: mode === 'rgb' ? activePixel[1] : mode === 'unit' ? scaleToSignedUnit(activePixel[1]) : zscoreChannel(activePixel[1], 1), col: gColor },
      { label: 'B', val: mode === 'rgb' ? activePixel[2] : mode === 'unit' ? scaleToSignedUnit(activePixel[2]) : zscoreChannel(activePixel[2], 2), col: bColor },
    ].sort((a, b) => a.val - b.val);

    // Offset labels above/below when two points land close on the scale so labels never collide
    const labelOffsets = vals.map((item, idx) => {
      const px = sx(item.val);
      const prevPx = idx > 0 ? sx(vals[idx - 1].val) : -Infinity;
      const closeToPrev = px - prevPx < 64;
      const above = idx % 2 === 0 && !closeToPrev ? true : idx % 2 === 1 ? false : true;
      return { ...item, px, above: closeToPrev ? !((idx - 1) % 2 === 0) : above };
    });

    const ticks = mode === 'rgb' ? [0, 128, 255] : mode === 'unit' ? [-1, 0, 1] : [-2, 0, 2];

    return (
      <g>
        <defs>
          <clipPath id={clipId}>
            <rect x={ox} y={oy} width={width} height={86} />
          </clipPath>
        </defs>
        <text x={ox + 4} y={oy + 14} fontSize={14} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
          Pixel ({selRow}, {selCol}) on the {mode === 'rgb' ? '0–255 byte' : mode === 'unit' ? '[-1, +1] centered' : 'Z-score'} scale:
        </text>
        <g clipPath={`url(#${clipId})`}>
          <line x1={lineL} y1={lineY} x2={lineR} y2={lineY} stroke={t.border} strokeWidth={1.6} />
          {ticks.map((tk) => (
            <g key={tk}>
              <line x1={sx(tk)} y1={lineY - 5} x2={sx(tk)} y2={lineY + 5} stroke={t.border} strokeWidth={1.3} />
              <text x={sx(tk)} y={lineY + 20} textAnchor="middle" fontSize={14} fontFamily="monospace" fill={t.textMuted}>
                {tk}
              </text>
            </g>
          ))}
          {labelOffsets.map((p) => {
            const textStr = mode === 'rgb' ? `${p.label}=${p.val}` : `${p.label}=${p.val.toFixed(2)}`;
            const clampedX = Math.max(lineL + 30, Math.min(lineR - 30, p.px));
            const labelY = p.above ? lineY - 10 : lineY + 38;
            return (
              <g key={p.label}>
                <circle cx={p.px} cy={lineY} r={5} fill={p.col} stroke={t.background} strokeWidth={1.4} />
                <text x={clampedX} y={labelY} textAnchor="middle" fontSize={14} fontWeight={700} fontFamily="monospace" fill={p.col}>
                  {textStr}
                </text>
              </g>
            );
          })}
        </g>
      </g>
    );
  };

  // ---- Grayscale Y grid + clipped luminance weights ----
  const renderGrayscalePanel = (ox: number, oy: number, panelW: number) => {
    const [rVal, gVal, bVal] = activePixel;
    const weights = [
      { label: '0.299 × R', contrib: 0.299 * rVal, col: rColor },
      { label: '0.587 × G', contrib: 0.587 * gVal, col: gColor },
      { label: '0.114 × B', contrib: 0.114 * bVal, col: bColor },
    ];
    const barWMax = isCompactPhone ? 180 : 185;
    const clipId = `img-gray-clip-${ox}`;
    const weightsOx = isCompactPhone ? ox : ox + 240;
    const weightsOy = isCompactPhone ? oy + 204 : oy + 32;

    return (
      <g>
        <defs>
          <clipPath id={clipId}>
            <rect x={weightsOx} y={weightsOy - 18} width={panelW} height={180} />
          </clipPath>
        </defs>
        <text x={ox} y={oy + 16} fontSize={15} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
          1 Grayscale channel Y (0–255 brightness)
        </text>
        {grid.map((row, r) =>
          row.map((px, c) => {
            const x = ox + c * 54;
            const y = oy + 26 + r * 40;
            const yVal = Math.round(rgbToGrayscale(px));
            const isSel = r === selRow && c === selCol;
            return (
              <g key={`g-${r}-${c}`} onClick={() => pickCell(r, c)} style={{ cursor: 'pointer' }}>
                <rect x={x} y={y} width={52} height={38} rx={3} fill={`rgb(${yVal},${yVal},${yVal})`} stroke={isSel ? selColor : t.border} strokeWidth={isSel ? 2.4 : 1} />
                <text x={x + 26} y={y + 24} textAnchor="middle" fontSize={14} fontFamily="monospace" fontWeight={700} fill={contrastOnIntensity(t, yVal)}>
                  {yVal}
                </text>
              </g>
            );
          }),
        )}

        <g transform={`translate(${weightsOx}, ${weightsOy})`} clipPath={`url(#${clipId})`}>
          <text x={0} y={0} fontSize={15} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
            Pixel ({selRow}, {selCol}) eye weights
          </text>
          {weights.map((w, idx) => {
            const wy = 18 + idx * 44;
            const bw = Math.max(4, (w.contrib / 255) * barWMax);
            return (
              <g key={w.label} transform={`translate(0, ${wy})`}>
                <text x={0} y={14} fontSize={14} fontWeight={700} fontFamily={FONT_FAMILY} fill={w.col}>
                  {w.label} = {w.contrib.toFixed(1)}
                </text>
                <rect x={0} y={20} width={barWMax} height={14} rx={3} fill={t.surfaceAlt} />
                <rect x={0} y={20} width={bw} height={14} rx={3} fill={w.col} />
              </g>
            );
          })}
          <text x={0} y={156} fontSize={14.5} fontWeight={700} fontFamily="monospace" fill={t.textPrimary}>
            Sum Y = {rgbToGrayscale(activePixel).toFixed(1)}
          </text>
        </g>
      </g>
    );
  };

  return (
    <>
      {!compact && (
        <>
          <VisualizationHeader
            eyebrow="Live playground"
            title="How a computer turns a picture into numbers [H, W, C]"
            description={
              <span style={{ fontSize: 15 }}>
                Computers cannot see colours directly — they read grids of numbers called tensors. A colour picture is 3 stacked brightness grids (Red, Green, Blue from 0 to 255) of shape [height H, width W, channels C].
              </span>
            }
          />

          {/* Control Group 1: Preset picture + Display scaling mode */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<ImagePresetId> label="Sample 4×4 picture" value={presetId} onChange={selectPreset} options={PRESET_OPTIONS} />
            </div>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<TensorMode> label="Number format (how pixel bytes are scaled)" value={mode} onChange={selectMode} options={MODE_OPTIONS} />
            </div>
          </div>

          {/* Control Group 2: Free numeric R, G, B inputs + Live tensor shape & bytes */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary }}>
              Edit pixel ({selRow}, {selCol}):
            </span>
            <ChannelNumberInput label="R" value={activePixel[0]} accent={rColor} onChange={(v) => updateChannel(0, v)} />
            <ChannelNumberInput label="G" value={activePixel[1]} accent={gColor} onChange={(v) => updateChannel(1, v)} />
            <ChannelNumberInput label="B" value={activePixel[2]} accent={bColor} onChange={(v) => updateChannel(2, v)} />
            <VizButton variant="secondary" onClick={() => selectPreset(presetId)}>
              Reset pixels
            </VizButton>
            <div style={{ marginLeft: 'auto', fontSize: 15, color: t.textSecondary, fontVariantNumeric: 'tabular-nums' }} aria-live="polite">
              Shape: <strong style={{ color: t.textPrimary }}>[{stats.shape.join(', ')}]</strong> ·{' '}
              <strong style={{ color: gColor }}>{stats.totalValues} values</strong> ({stats.totalBytes} B {stats.dtype})
            </div>
          </div>
        </>
      )}

      {/* HTML Colour Legend */}
      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 15, color: t.textSecondary, marginBottom: 4 }}
        aria-label="Channel and selection colours"
      >
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: rColor, verticalAlign: 'middle', marginRight: 6 }} />
          Red channel R
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: gColor, verticalAlign: 'middle', marginRight: 6 }} />
          Green channel G
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: bColor, verticalAlign: 'middle', marginRight: 6 }} />
          Blue channel B
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 14, height: 12, border: `2px solid ${selColor}`, verticalAlign: 'middle', marginRight: 6 }} />
          Selected pixel ({selRow}, {selCol})
        </span>
      </div>

      {/* Main SVG visual */}
      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 315"
            role="img"
            aria-label={`4 by 4 image tensor in ${mode} mode, pixel (${selRow}, ${selCol}) equals [${activePixel.join(', ')}]`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderPictureGrid(0, 4)}
            <SketchArrow points={[[200, 132], [234, 132]]} color={t.textSecondary} strokeWidth={1.8} roughness={1} id="img-split-arrow" />
            <text x={217} y={118} textAnchor="middle" fontSize={14} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textSecondary}>
              C={stats.channels}
            </text>
            {mode === 'gray' ? (
              renderGrayscalePanel(248, 14, 504)
            ) : (
              <>
                {renderChannelMatrix(0, 'Red (R)', rColor, 240, 14)}
                {renderChannelMatrix(1, 'Green (G)', gColor, 416, 14)}
                {renderChannelMatrix(2, 'Blue (B)', bColor, 592, 14)}
                {renderScaleRuler(240, 224, 512)}
              </>
            )}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            <svg
              width="100%"
              viewBox="0 0 380 260"
              role="img"
              aria-label={`4 by 4 picture grid with pixel (${selRow}, ${selCol}) selected`}
              style={{ display: 'block', fontFamily: FONT_FAMILY }}
            >
              {renderPictureGrid(88, 4)}
            </svg>
            <svg
              width="100%"
              viewBox={mode === 'gray' ? '0 0 380 390' : '0 0 380 510'}
              role="img"
              aria-label={`Numeric tensor channel matrices in ${mode} mode`}
              style={{ display: 'block', fontFamily: FONT_FAMILY }}
            >
              {mode === 'gray' ? (
                renderGrayscalePanel(80, 4, 290)
              ) : (
                <>
                  {renderChannelMatrix(0, 'Red (R)', rColor, 14, 4)}
                  {renderChannelMatrix(1, 'Green (G)', gColor, 200, 4)}
                  {renderChannelMatrix(2, 'Blue (B)', bColor, 107, 206)}
                  {renderScaleRuler(12, 412, 356)}
                </>
              )}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title={activeModeMeta.title} latex={activeModeMeta.latex} color={activeModeMeta.color} tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>{workedText}</p>
          </StickyNote>
          <StickyNote title={`Pixel (${selRow}, ${selCol}) · Step ${tourIdx + 1} of 4`} color="blue" tilt={1} live>
            <p>{caption}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            {MODE_FORMULA_NOTES.map((m, i) => (
              <StickyNote
                key={m.id}
                title={m.title}
                latex={m.latex}
                color={m.color}
                tilt={i % 2 ? 1 : -1}
                active={mode === m.id}
                onSelect={() => selectMode(m.id)}
              >
                <p style={{ textAlign: 'center' }}>{m.explain}</p>
              </StickyNote>
            ))}
          </StickyRow>
          <StickyRow>
            <StickyNote title={`Worked numbers · Pixel (${selRow}, ${selCol})`} color="yellow" tilt={-1}>
              <p className="nm-sticky__mono">{workedText}</p>
            </StickyNote>
            <StickyNote title={`Step ${tourIdx + 1} of 4 · What just happened`} color="blue" tilt={1} live>
              <p>{caption}</p>
            </StickyNote>
          </StickyRow>

          {/* Predict-then-run challenge */}
          <div
            style={{
              marginTop: 6,
              paddingTop: 8,
              borderTop: `1px dashed ${t.border}`,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '6px 10px',
              fontSize: 15,
            }}
          >
            <strong style={{ color: t.accentWarn }}>Predict first:</strong>
            <span style={{ color: t.textPrimary }}>
              Set a pixel to bright yellow (R=255, G=255, B=0) — what happens to Blue and Grayscale?
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PREDICT_OPTIONS.map((opt, idx) => {
                const picked = prediction === idx;
                const correct = idx === 0;
                const revealed = prediction !== null;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setPrediction(idx)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: RADIUS.sm,
                      border: `1px solid ${
                        revealed && correct ? t.accentPrimary : revealed && picked ? t.accentDanger : t.border
                      }`,
                      background:
                        revealed && correct ? t.accentPrimary : revealed && picked ? t.accentDanger : 'transparent',
                      color: revealed && (correct || picked) ? t.background : t.textPrimary,
                      fontFamily: FONT_FAMILY,
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {prediction !== null && (
              <span role="status" style={{ color: prediction === 0 ? t.accentPrimary : t.accentWarn, fontSize: 15 }}>
                {prediction === 0 ? 'Right — ' : 'Try it — '}
                Red + Green make yellow with Blue = 0; luminance Y = 0.299×255 + 0.587×255 + 0 ≈ 225.9.{' '}
                <button
                  type="button"
                  onClick={() => {
                    setPlaying(false);
                    setManualCoord([selRow, selCol]);
                    setGrid((prev) =>
                      prev.map((row, r) => row.map((px, c) => (r === selRow && c === selCol ? [255, 255, 0] : px))),
                    );
                    setMode('gray');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: t.accentSecondary,
                    textDecoration: 'underline',
                    fontFamily: FONT_FAMILY,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Apply Yellow (255, 255, 0) now
                </button>
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
            <VizButton onClick={() => setPlaying((p) => !p)}>{playing ? 'Pause' : 'Play'}</VizButton>
            <VizButton
              variant="secondary"
              onClick={() => {
                setPlaying(false);
                setManualCoord(null);
                setTourIdx((i) => (i + 1) % INSPECT_TOUR.length);
              }}
            >
              Step →
            </VizButton>
            <VizButton
              variant="secondary"
              onClick={() => {
                setPlaying(false);
                setManualCoord(null);
                setTourIdx(0);
              }}
            >
              Reset
            </VizButton>
            <span style={{ marginLeft: 'auto', fontSize: 15, color: t.textSecondary }}>
              Toy 4×4 tensor; a 1080p photo has shape [1080, 1920, 3].
            </span>
          </div>
        </>
      )}
    </>
  );
}

export default function ImageTensorExplorerDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Image Tensor Explorer"
      footer="An image is an [H, W, C] numeric tensor. RGB stores 0–255 uint8 intensities; neural nets convert to float32 grayscale, [-1, 1], or channel-wise z-scores."
    >
      <ImageTensorPlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
