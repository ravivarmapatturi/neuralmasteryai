import { useMemo, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../../theme/vizTokens';
import { SketchRect } from '../../components/notebook/RoughShape';
import { PillSelect, VisualizationContainer, useVizVisible } from '../primitives';
import {
  IMAGE_PRESETS,
  INSPECT_TOUR,
  clampByte,
  cloneGrid,
  explainImagePixel,
  formatImageFormula,
  rgbToGrayscale,
  scaleToSignedUnit,
  tensorMemoryStats,
  zscoreChannel,
  type ImagePresetId,
  type RgbPixel,
  type TensorMode,
} from '../lib/imageTensor';
import {
  FormulaStrip,
  PlaygroundHeaderBar,
  PredictChallenge,
  StepCaptionStrip,
} from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

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
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 14, color: t.textSecondary }}>
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
          width: 62,
          padding: '4px 6px',
          borderRadius: RADIUS.sm,
          border: `1.5px solid ${accent}`,
          background: t.background,
          color: t.textPrimary,
          fontFamily: 'monospace',
          fontSize: 14,
        }}
      />
    </label>
  );
}

function ImageTensorPlayground({ outerVisible }: { outerVisible: boolean }) {
  const t = useVizTokens();
  const { hostRef, isCompactPhone } = useResponsiveHostWidth(700);
  const [presetId, setPresetId] = useState<ImagePresetId>('sunset');
  const [mode, setMode] = useState<TensorMode>('rgb');
  const [grid, setGrid] = useState<[number, number, number][][]>(() => cloneGrid(IMAGE_PRESETS[0].grid));
  const [manualCoord, setManualCoord] = useState<[number, number] | null>(null);
  const [prediction, setPrediction] = useState<number | null>(null);

  const playback = useStepPlayback(INSPECT_TOUR.length, 2000, 1, outerVisible);
  const [selRow, selCol] = manualCoord ?? INSPECT_TOUR[playback.step];
  const activePixel: RgbPixel = grid[selRow][selCol];

  const stats = useMemo(() => tensorMemoryStats(4, 4, mode), [mode]);
  const caption = explainImagePixel(activePixel, selRow, selCol, mode);
  const formula = formatImageFormula(activePixel, mode, stats);

  const selectPreset = (nextId: ImagePresetId | ((prev: ImagePresetId) => ImagePresetId)) => {
    const id = typeof nextId === 'function' ? nextId(presetId) : nextId;
    const found = IMAGE_PRESETS.find((p) => p.id === id) ?? IMAGE_PRESETS[0];
    playback.stop();
    setPresetId(id);
    setGrid(cloneGrid(found.grid));
    setManualCoord(null);
  };

  const updateChannel = (channelIdx: 0 | 1 | 2, val: number) => {
    playback.stop();
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
    playback.stop();
    setManualCoord([r, c]);
  };

  const formatCellVal = (px: RgbPixel, ch: 0 | 1 | 2): string => {
    if (mode === 'rgb') return String(px[ch]);
    if (mode === 'unit') return scaleToSignedUnit(px[ch]).toFixed(1);
    if (mode === 'zscore') return zscoreChannel(px[ch], ch).toFixed(1);
    return rgbToGrayscale(px).toFixed(0);
  };

  const renderPictureGrid = (offsetX: number, offsetY: number) => (
    <g>
      <text x={offsetX + 4} y={offsetY + 14} fontSize={14} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
        4×4 Picture (click pixel)
      </text>
      {[0, 1, 2, 3].map((c) => (
        <text key={`col-${c}`} x={offsetX + 26 + c * 38 + 18} y={offsetY + 36} textAnchor="middle" fontSize={13.5} fontFamily={FONT_FAMILY} fill={t.textMuted}>
          c{c}
        </text>
      ))}
      {grid.map((row, r) => (
        <g key={`row-${r}`}>
          <text x={offsetX + 12} y={offsetY + 44 + r * 38 + 23} textAnchor="middle" fontSize={13.5} fontFamily={FONT_FAMILY} fill={t.textMuted}>
            r{r}
          </text>
          {row.map((px, c) => {
            const x = offsetX + 26 + c * 38;
            const y = offsetY + 44 + r * 38;
            const yVal = Math.round(rgbToGrayscale(px));
            const fillCss = mode === 'gray' ? `rgb(${yVal}, ${yVal}, ${yVal})` : `rgb(${px[0]}, ${px[1]}, ${px[2]})`;
            const isSel = r === selRow && c === selCol;
            return (
              <g key={`px-${r}-${c}`} onClick={() => pickCell(r, c)} style={{ cursor: 'pointer' }}>
                <rect x={x} y={y} width={36} height={36} rx={3} fill={fillCss} stroke={t.border} strokeWidth={1} />
                {isSel && (
                  <SketchRect
                    x={x - 1}
                    y={y - 1}
                    width={38}
                    height={38}
                    color={t.accentWarn}
                    strokeWidth={2.4}
                    roughness={1}
                    id={`img-sel-${r}-${c}`}
                  />
                )}
              </g>
            );
          })}
        </g>
      ))}
      <text x={offsetX + 4} y={offsetY + 216} fontSize={13.5} fontFamily={FONT_FAMILY} fill={t.textSecondary}>
        Selected: ({selRow}, {selCol})
      </text>
    </g>
  );

  const renderChannelMatrix = (ch: 0 | 1 | 2, title: string, accent: string, ox: number, oy: number) => (
    <g key={title}>
      <text x={ox + 76} y={oy + 14} textAnchor="middle" fontSize={14} fontWeight={700} fontFamily={FONT_FAMILY} fill={accent}>
        {title}
      </text>
      {grid.map((row, r) =>
        row.map((px, c) => {
          const x = ox + c * 38;
          const y = oy + 24 + r * 38;
          const v = px[ch];
          const isSel = r === selRow && c === selCol;
          const bg =
            mode === 'rgb'
              ? `rgb(${ch === 0 ? v : 26}, ${ch === 1 ? v : 26}, ${ch === 2 ? v : 26})`
              : t.surfaceAlt;
          const txtColor = mode === 'rgb' ? contrastOnIntensity(t, v) : t.textPrimary;
          return (
            <g key={`c${ch}-${r}-${c}`} onClick={() => pickCell(r, c)} style={{ cursor: 'pointer' }}>
              <rect x={x} y={y} width={36} height={36} rx={3} fill={bg} stroke={isSel ? t.accentWarn : t.border} strokeWidth={isSel ? 2 : 1} />
              <text
                x={x + 18}
                y={y + 23}
                textAnchor="middle"
                fontSize={13.5}
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

  const renderGrayscalePanel = (ox: number, oy: number) => {
    const [rVal, gVal, bVal] = activePixel;
    const weights = [
      { label: '0.299×R', contrib: 0.299 * rVal, col: t.accentDanger },
      { label: '0.587×G', contrib: 0.587 * gVal, col: t.accentPrimary },
      { label: '0.114×B', contrib: 0.114 * bVal, col: t.accentSecondary },
    ];
    return (
      <g>
        <text x={ox} y={oy + 14} fontSize={14} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
          1 Grayscale channel Y (0–255 brightness)
        </text>
        {grid.map((row, r) =>
          row.map((px, c) => {
            const x = ox + c * 52;
            const y = oy + 24 + r * 38;
            const yVal = Math.round(rgbToGrayscale(px));
            const isSel = r === selRow && c === selCol;
            return (
              <g key={`g-${r}-${c}`} onClick={() => pickCell(r, c)} style={{ cursor: 'pointer' }}>
                <rect x={x} y={y} width={50} height={36} rx={3} fill={`rgb(${yVal},${yVal},${yVal})`} stroke={isSel ? t.accentWarn : t.border} strokeWidth={isSel ? 2.2 : 1} />
                <text x={x + 25} y={y + 23} textAnchor="middle" fontSize={14} fontFamily="monospace" fontWeight={700} fill={contrastOnIntensity(t, yVal)}>
                  {yVal}
                </text>
              </g>
            );
          }),
        )}

        {/* Per-channel luminance contribution bars on desktop */}
        {!isCompactPhone && (
          <g transform={`translate(${ox + 224}, ${oy + 32})`}>
            <text x={0} y={0} fontSize={14} fontWeight={700} fontFamily={FONT_FAMILY} fill={t.textPrimary}>
              Pixel ({selRow}, {selCol}) weights
            </text>
            {weights.map((w, idx) => {
              const wy = 22 + idx * 42;
              const bw = Math.max(4, (w.contrib / 255) * 165);
              return (
                <g key={w.label} transform={`translate(0, ${wy})`}>
                  <text x={0} y={12} fontSize={13.5} fontWeight={700} fontFamily={FONT_FAMILY} fill={w.col}>
                    {w.label} = {w.contrib.toFixed(1)}
                  </text>
                  <rect x={0} y={18} width={165} height={14} rx={3} fill={t.surfaceAlt} />
                  <rect x={0} y={18} width={bw} height={14} rx={3} fill={w.col} />
                </g>
              );
            })}
          </g>
        )}
      </g>
    );
  };

  return (
    <>
      <PlaygroundHeaderBar
        eyebrow="Live playground"
        title="Inside an image tensor [H, W, C]"
        description="Click any pixel or type custom R, G, B numbers (0–255) to watch the raw RGB array, grayscale luminance, and normalized inputs update live."
        playing={playback.playing}
        onToggle={playback.toggle}
        onNext={() => {
          setManualCoord(null);
          playback.next();
        }}
        onReset={() => {
          setManualCoord(null);
          playback.reset();
        }}
      />

      {/* Row 1: Scene preset + Format mode */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ marginBottom: -8 }}>
          <PillSelect<ImagePresetId> label="Scene preset" value={presetId} onChange={selectPreset} options={PRESET_OPTIONS} />
        </div>
        <div style={{ marginBottom: -8 }}>
          <PillSelect<TensorMode>
            label="Tensor format"
            value={mode}
            onChange={(nextM) => {
              playback.stop();
              setMode(typeof nextM === 'function' ? nextM(mode) : nextM);
            }}
            options={MODE_OPTIONS}
          />
        </div>
      </div>

      {/* Row 2: Free numeric R, G, B inputs for active pixel + Live readout */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>
          Pixel ({selRow}, {selCol}):
        </span>
        <ChannelNumberInput label="R" value={activePixel[0]} accent={t.accentDanger} onChange={(v) => updateChannel(0, v)} />
        <ChannelNumberInput label="G" value={activePixel[1]} accent={t.accentPrimary} onChange={(v) => updateChannel(1, v)} />
        <ChannelNumberInput label="B" value={activePixel[2]} accent={t.accentSecondary} onChange={(v) => updateChannel(2, v)} />
        <button
          type="button"
          onClick={() => selectPreset(presetId)}
          style={{
            padding: '4px 10px',
            borderRadius: RADIUS.sm,
            border: `1px solid ${t.border}`,
            background: 'transparent',
            color: t.textSecondary,
            fontFamily: FONT_FAMILY,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Reset pixels
        </button>
        <div style={{ marginLeft: 'auto', fontSize: 14, color: t.textSecondary, fontVariantNumeric: 'tabular-nums' }} aria-live="polite">
          Shape: <strong style={{ color: t.textPrimary }}>[{stats.shape.join(', ')}]</strong> ·{' '}
          <strong style={{ color: t.accentPrimary }}>{stats.totalValues} values</strong> ({stats.totalBytes} B {stats.dtype})
        </div>
      </div>

      <StepCaptionStrip caption={caption} accentColor={t.accentSecondary} />

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 700 228"
            role="img"
            aria-label={`4 by 4 image tensor in ${mode} mode, pixel (${selRow}, ${selCol}) equals [${activePixel.join(', ')}]`}
            style={{ display: 'block', overflow: 'visible' }}
          >
            {renderPictureGrid(0, 4)}
            {mode === 'gray' ? (
              renderGrayscalePanel(212, 20)
            ) : (
              <>
                {renderChannelMatrix(0, 'Red (R)', t.accentDanger, 206, 20)}
                {renderChannelMatrix(1, 'Green (G)', t.accentPrimary, 372, 20)}
                {renderChannelMatrix(2, 'Blue (B)', t.accentSecondary, 538, 20)}
                <text x={206} y={220} fontSize={13.5} fontFamily={FONT_FAMILY} fill={t.textSecondary}>
                  Colours: Red = R · Green = G · Blue = B · Yellow border = pixel ({selRow}, {selCol})
                </text>
              </>
            )}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg
              width="100%"
              viewBox="0 0 340 226"
              role="img"
              aria-label={`4 by 4 picture grid with pixel (${selRow}, ${selCol}) selected`}
              style={{ display: 'block', overflow: 'visible' }}
            >
              {renderPictureGrid(70, 4)}
            </svg>
            <svg
              width="100%"
              viewBox={mode === 'gray' ? '0 0 340 190' : '0 0 340 375'}
              role="img"
              aria-label={`Numeric tensor channel matrices in ${mode} mode`}
              style={{ display: 'block', overflow: 'visible' }}
            >
              {mode === 'gray' ? (
                renderGrayscalePanel(64, 4)
              ) : (
                <>
                  {renderChannelMatrix(0, 'Red (R)', t.accentDanger, 10, 4)}
                  {renderChannelMatrix(1, 'Green (G)', t.accentPrimary, 178, 4)}
                  {renderChannelMatrix(2, 'Blue (B)', t.accentSecondary, 94, 194)}
                </>
              )}
            </svg>
          </div>
        )}
      </div>

      <FormulaStrip general={formula.general} worked={formula.worked} />

      <PredictChallenge
        prompt="Set a pixel to bright yellow (R=255, G=255, B=0) — what happens to Blue and Grayscale?"
        options={PREDICT_OPTIONS}
        correctIndex={0}
        selected={prediction}
        onSelect={setPrediction}
        explanation="Red + Green make yellow with Blue = 0; luminance Y = 0.299×255 + 0.587×255 + 0 ≈ 225.9."
        actionLabel="Apply Yellow (255, 255, 0) now"
        onAction={() => {
          playback.stop();
          setManualCoord([selRow, selCol]);
          setGrid((prev) =>
            prev.map((row, r) => row.map((px, c) => (r === selRow && c === selCol ? [255, 255, 0] : px))),
          );
          setMode('gray');
        }}
      />
    </>
  );
}

export default function ImageTensorExplorerDiagram() {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="Image Tensor Explorer"
      footer="An image is an [H, W, C] numeric tensor. RGB stores 0–255 uint8 intensities; neural nets convert to float32 grayscale, [-1, 1], or channel-wise z-scores."
    >
      <ImageTensorPlayground outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
