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
  analyzeConvolution,
  getWindowTerms,
  GRID_SIZE,
  IMAGE_PRESETS,
  KERNELS,
  type ImagePresetId,
  type KernelId,
} from '../lib/convolutionSlide';
import { PredictChallenge } from './playgroundPrimitives';
import { useResponsiveHostWidth, useStepPlayback } from './useStepPlayback';

const PREDICT_OPTIONS = [
  '0, because negative left weights and positive right weights cancel',
  '200, because the bright side is nearby',
  '-40, because the left weights are negative',
] as const;

type ConvFormulaTab = 'dot' | 'size' | 'sobel';

const FORMULA_LATEX: Record<ConvFormulaTab, string> = {
  dot: String.raw`O[r,c] = \sum_{i=0}^{2}\sum_{j=0}^{2} I[r\!\cdot\!s+i,\; c\!\cdot\!s+j]\,K[i,j]`,
  size: String.raw`N_{\text{out}} = \left\lfloor \frac{N - K}{s} \right\rfloor + 1`,
  sobel: String.raw`K_{\text{Sobel-X}} = \begin{bmatrix}-1 & 0 & 1 \\ -2 & 0 & 2 \\ -1 & 0 & 1\end{bmatrix}`,
};

function fmtNum(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, '');
}

function ConvolutionSlidePlayground({
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

  const [kernelId, setKernelId] = useState<KernelId>('sobelX');
  const [preset, setPreset] = useState<ImagePresetId>('verticalEdge');
  const [stride, setStride] = useState<1 | 2>(1);
  const [brightValue, setBrightValue] = useState<number>(200);
  const [activeFormula, setActiveFormula] = useState<ConvFormulaTab>('dot');
  const [prediction, setPrediction] = useState<number | null>(null);

  const analysis = useMemo(
    () => analyzeConvolution({ kernelId, preset, stride, darkValue: 10, brightValue }),
    [kernelId, preset, stride, brightValue],
  );

  const playback = useStepPlayback(
    analysis.positions.length,
    1300,
    analysis.defaultActiveIndex,
    outerVisible,
  );
  const activePos = analysis.positions[playback.step] ?? analysis.positions[0];
  const windowMath = useMemo(
    () => getWindowTerms(analysis.input, analysis.kernel.weights, activePos.inR, activePos.inC),
    [analysis.input, analysis.kernel.weights, activePos.inR, activePos.inC],
  );

  const windowColor = t.accentSecondary;
  const posColor = t.accentPrimary;
  const negColor = t.accentDanger;
  const kernelColor = t.accentPurple;

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

  const renderInputAndKernelPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 8;
    const plotY = 34;
    const plotW = panelW - 16;
    const plotH = 236;

    const cell = 28;
    const gridX = plotX + 10;
    const gridY = plotY + 18;

    const kCell = 36;
    const kX = gridX + GRID_SIZE * cell + 14;
    const kY = plotY + 34;
    const kFitsBeside = kX + 3 * kCell <= plotX + plotW - 4;

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          1. Input image (7×7) &amp; sliding 3×3 filter
        </text>
        <defs>
          <clipPath id={`${clipInputId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipInputId}-${offsetX})`}>
          {analysis.input.map((row, r) =>
            row.map((pxVal, c) => {
              const x = gridX + c * cell;
              const y = gridY + r * cell;
              const bright = pxVal > 120;
              const textFill = bright
                ? t.mode === 'dark'
                  ? t.background
                  : t.textPrimary
                : t.mode === 'dark'
                  ? t.textPrimary
                  : t.background;
              const canJump = r <= GRID_SIZE - 3 && c <= GRID_SIZE - 3 && r % stride === 0 && c % stride === 0;
              return (
                <g
                  key={`in-${r}-${c}`}
                  style={{ cursor: canJump ? 'pointer' : 'default' }}
                  onClick={() => {
                    if (!canJump) return;
                    const idx = analysis.positions.findIndex((p) => p.inR === r && p.inC === c);
                    if (idx >= 0) playback.setStep(idx);
                  }}
                >
                  <rect
                    x={x}
                    y={y}
                    width={cell - 2}
                    height={cell - 2}
                    rx={3}
                    fill={`rgb(${pxVal}, ${pxVal}, ${pxVal})`}
                    stroke={t.border}
                    strokeWidth={0.8}
                  />
                  <text x={x + (cell - 2) / 2} y={y + 18} textAnchor="middle" fontSize={14} fontWeight={600} fill={textFill}>
                    {pxVal}
                  </text>
                </g>
              );
            }),
          )}

          {/* Sliding 3x3 window frame */}
          <rect
            x={gridX + activePos.inC * cell - 2}
            y={gridY + activePos.inR * cell - 2}
            width={3 * cell + 2}
            height={3 * cell + 2}
            rx={4}
            fill="none"
            stroke={windowColor}
            strokeWidth={3}
          />

          {/* 3x3 Kernel beside input (on desktop panel) */}
          {kFitsBeside && (
            <g>
              <text x={kX + (3 * kCell) / 2} y={kY - 12} textAnchor="middle" fontSize={14} fontWeight={700} fill={kernelColor}>
                {analysis.kernel.shortLabel} weights K
              </text>
              {analysis.kernel.weights.map((row, kr) =>
                row.map((kw, kc) => {
                  const kx = kX + kc * kCell;
                  const ky = kY + kr * kCell;
                  const fillCol = kw > 0 ? `${posColor}22` : kw < 0 ? `${negColor}22` : t.surfaceAlt;
                  const txtCol = kw > 0 ? posColor : kw < 0 ? negColor : t.textSecondary;
                  return (
                    <g key={`k-${kr}-${kc}`}>
                      <rect x={kx} y={ky} width={kCell - 3} height={kCell - 3} rx={4} fill={fillCol} stroke={kernelColor} strokeWidth={1.3} />
                      <text x={kx + (kCell - 3) / 2} y={ky + 25} textAnchor="middle" fontSize={14} fontWeight={700} fill={txtCol}>
                        {kw === 1 / 9 ? '1/9' : fmtNum(kw)}
                      </text>
                    </g>
                  );
                }),
              )}
              <text x={kX + (3 * kCell) / 2} y={kY + 3 * kCell + 22} textAnchor="middle" fontSize={14} fontWeight={700} fill={t.textPrimary}>
                Window ({activePos.inR}, {activePos.inC})
              </text>
              <text x={kX + (3 * kCell) / 2} y={kY + 3 * kCell + 42} textAnchor="middle" fontSize={15} fontWeight={700} fill={activePos.value < 0 ? negColor : posColor}>
                Sum = {fmtNum(activePos.value)}
              </text>
            </g>
          )}
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 20} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Click any cell to slide the blue 3×3 window there (stride {stride})
        </text>
      </g>
    );
  };

  const renderOutputPanel = (offsetX: number, panelW: number) => {
    const plotX = offsetX + 8;
    const plotY = 34;
    const plotW = panelW - 16;
    const plotH = 236;

    const outN = analysis.outSize;
    const cell = Math.min(44, Math.floor((plotW - 40) / outN));
    const gridW = outN * cell;
    const gridX = plotX + Math.round((plotW - gridW) / 2);
    const gridY = plotY + 24;
    const maxAbs = Math.max(1, Math.abs(analysis.outMin), Math.abs(analysis.outMax));

    return (
      <g>
        <text x={offsetX + panelW / 2} y={20} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>
          2. Output feature map ({outN}×{outN})
        </text>
        <defs>
          <clipPath id={`${clipOutputId}-${offsetX}`}>
            <rect x={plotX} y={plotY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        <rect x={plotX} y={plotY} width={plotW} height={plotH} fill={t.background} stroke={t.border} strokeWidth={1} rx={4} />

        <g clipPath={`url(#${clipOutputId}-${offsetX})`}>
          {analysis.output.map((row, outR) =>
            row.map((val, outC) => {
              const x = gridX + outC * cell;
              const y = gridY + outR * cell;
              const isSelected = outR === activePos.outR && outC === activePos.outC;
              const mag = Math.min(1, Math.abs(val) / maxAbs);
              const fillColor = val > 0 ? posColor : val < 0 ? negColor : t.surfaceAlt;
              const fillOpacity = val === 0 ? 1 : 0.14 + mag * 0.65;
              const txtColor = val !== 0 && mag > 0.55 ? t.background : t.textPrimary;

              return (
                <g
                  key={`out-${outR}-${outC}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    const idx = analysis.positions.findIndex((p) => p.outR === outR && p.outC === outC);
                    if (idx >= 0) playback.setStep(idx);
                  }}
                >
                  <rect
                    x={x}
                    y={y}
                    width={cell - 3}
                    height={cell - 3}
                    rx={4}
                    fill={fillColor}
                    fillOpacity={fillOpacity}
                    stroke={isSelected ? windowColor : t.border}
                    strokeWidth={isSelected ? 3 : 1}
                  />
                  <text x={x + (cell - 3) / 2} y={y + cell / 2 + 4} textAnchor="middle" fontSize={14} fontWeight={isSelected ? 700 : 600} fill={txtColor}>
                    {Math.round(val)}
                  </text>
                </g>
              );
            }),
          )}
        </g>

        <text x={plotX + plotW / 2} y={plotY + plotH + 20} textAnchor="middle" fontSize={14} fill={t.textSecondary}>
          Output [{activePos.outR}, {activePos.outC}] = {fmtNum(activePos.value)}
        </text>
      </g>
    );
  };

  const compactSumText = `${windowMath.terms.filter((term) => term.weight !== 0).slice(0, 3).map((term) => `${term.pixel}×${fmtNum(term.weight)}`).join(' + ')}… = ${fmtNum(windowMath.total)}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!compact && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ flex: '1 1 320px', minWidth: 0, marginBottom: -8 }}>
              <VisualizationHeader
                eyebrow="Live playground"
                title="Sliding a 3×3 pattern detector across an image grid"
                description="A computer stores a photo as brightness numbers. A convolutional layer slides one small 3×3 filter across every patch, multiplying matching cells and summing them into one output pixel."
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
              <PillSelect<KernelId>
                label="Filter (3×3 pattern detector)"
                value={kernelId}
                onChange={(val) => {
                  const next = typeof val === 'function' ? val(kernelId) : val;
                  setKernelId(next);
                  setActiveFormula(next === 'sobelX' ? 'sobel' : 'dot');
                }}
                options={Object.values(KERNELS).map((k) => ({ value: k.id, label: k.label }))}
              />
            </div>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<ImagePresetId>
                label="Input image grid"
                value={preset}
                onChange={(val) => setPreset(val)}
                options={IMAGE_PRESETS.map((p) => ({ value: p.id, label: p.label }))}
              />
            </div>
            <div style={{ marginBottom: -8 }}>
              <PillSelect<1 | 2>
                label="Stride (step size)"
                value={stride}
                onChange={(val) => {
                  setStride(val);
                  setActiveFormula('size');
                  playback.setStep(0);
                }}
                options={[
                  { value: 1, label: 'Stride 1 (5×5 out)' },
                  { value: 2, label: 'Stride 2 (3×3 out)' },
                ]}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: 12, alignItems: 'end' }}>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Bright pixel intensity (0–255)</span>
              <input
                aria-label="Bright pixel intensity"
                type="number"
                min={20}
                max={255}
                step={10}
                value={brightValue}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setBrightValue(Math.max(20, Math.min(255, Math.round(v))));
                }}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Output row r (0 to {analysis.outSize - 1})</span>
              <input
                aria-label="Output row index"
                type="number"
                min={0}
                max={analysis.outSize - 1}
                step={1}
                value={activePos.outR}
                onChange={(e) => {
                  const r = Math.max(0, Math.min(analysis.outSize - 1, Math.round(Number(e.target.value) || 0)));
                  const idx = analysis.positions.findIndex((p) => p.outR === r && p.outC === activePos.outC);
                  if (idx >= 0) playback.setStep(idx);
                }}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'block', fontSize: 15, color: t.textPrimary }}>
              <span style={{ display: 'block', marginBottom: 4, fontWeight: 700 }}>Output col c (0 to {analysis.outSize - 1})</span>
              <input
                aria-label="Output col index"
                type="number"
                min={0}
                max={analysis.outSize - 1}
                step={1}
                value={activePos.outC}
                onChange={(e) => {
                  const c = Math.max(0, Math.min(analysis.outSize - 1, Math.round(Number(e.target.value) || 0)));
                  const idx = analysis.positions.findIndex((p) => p.outR === activePos.outR && p.outC === c);
                  if (idx >= 0) playback.setStep(idx);
                }}
                style={inputStyle}
              />
            </label>
          </div>
        </>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 15 }} aria-label="Convolution colours">
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: windowColor, verticalAlign: 'middle', marginRight: 6 }} />
          Active 3×3 window
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: kernelColor, verticalAlign: 'middle', marginRight: 6 }} />
          3×3 filter weights K
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: posColor, verticalAlign: 'middle', marginRight: 6 }} />
          Positive output response
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: negColor, verticalAlign: 'middle', marginRight: 6 }} />
          Negative output response
        </span>
      </div>

      <div ref={hostRef} style={{ width: '100%' }}>
        {!isCompactPhone ? (
          <svg
            width="100%"
            viewBox="0 0 760 302"
            role="img"
            aria-label={`2D convolution with ${analysis.kernel.label} at window (${activePos.inR}, ${activePos.inC}) outputs ${fmtNum(activePos.value)}`}
            style={{ display: 'block', fontFamily: FONT_FAMILY }}
          >
            {renderInputAndKernelPanel(0, 412)}
            {renderOutputPanel(420, 340)}
          </svg>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <svg width="100%" viewBox="0 0 370 302" role="img" aria-label="Input 7x7 grid and sliding window" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderInputAndKernelPanel(0, 370)}
            </svg>
            <svg width="100%" viewBox="0 0 370 302" role="img" aria-label="Output feature map" style={{ display: 'block', fontFamily: FONT_FAMILY }}>
              {renderOutputPanel(0, 370)}
            </svg>
          </div>
        )}
      </div>

      {compact ? (
        <StickyRow>
          <StickyNote title={`Dot product · ${analysis.kernel.shortLabel}`} latex={FORMULA_LATEX.dot} color="yellow" tilt={-1}>
            <p className="nm-sticky__mono" style={{ textAlign: 'center' }}>{compactSumText}</p>
          </StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${analysis.positions.length}`} color="blue" tilt={1} live>
            <p>{activePos.explain}</p>
          </StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote
              title="1. Window weighted sum"
              latex={FORMULA_LATEX.dot}
              color="yellow"
              tilt={-1}
              active={activeFormula === 'dot'}
              onSelect={() => setActiveFormula('dot')}
            >
              <p style={{ textAlign: 'center' }}>Multiply each pixel under the 3×3 frame by its filter weight, then add all 9.</p>
            </StickyNote>
            <StickyNote
              title="2. Output grid size"
              latex={FORMULA_LATEX.size}
              color="pink"
              tilt={1}
              active={activeFormula === 'size'}
              onSelect={() => setActiveFormula('size')}
            >
              <p style={{ textAlign: 'center' }}>With N = 7, K = 3, stride s = {stride}: {analysis.outSize}×{analysis.outSize} output pixels.</p>
            </StickyNote>
            <StickyNote
              title="3. Sobel X edge kernel"
              latex={FORMULA_LATEX.sobel}
              color="orange"
              tilt={-1}
              active={activeFormula === 'sobel'}
              onSelect={() => {
                setKernelId('sobelX');
                setActiveFormula('sobel');
              }}
            >
              <p style={{ textAlign: 'center' }}>Weights the center row twice (2 vs 1) to spotlight vertical edges.</p>
            </StickyNote>
          </StickyRow>

          <StickyRow>
            <StickyNote title={`Worked numbers · window (${activePos.inR}, ${activePos.inC}) → out[${activePos.outR},${activePos.outC}]`} color="green" tilt={1}>
              <p className="nm-sticky__mono">
                Non-zero terms:{' '}
                {windowMath.terms
                  .filter((term) => Math.abs(term.weight) > 1e-6)
                  .map((term) => `${term.pixel}×${term.weight === 1 / 9 ? '1/9' : fmtNum(term.weight)}`)
                  .join(' + ') || '0'}
              </p>
              <p className="nm-sticky__mono" style={{ marginTop: 4 }}>
                Total = <strong>{fmtNum(windowMath.total)}</strong> · Output size = ⌊(7 − 3) / {stride}⌋ + 1 = <strong>{analysis.outSize}×{analysis.outSize}</strong>
              </p>
            </StickyNote>
            <StickyNote title={`Step ${playback.step + 1} of ${analysis.positions.length} · What just happened`} color="blue" tilt={-1} live>
              <p>{activePos.explain}</p>
            </StickyNote>
          </StickyRow>

          <PredictChallenge
            prompt="Place the Sobel X vertical-edge filter completely inside the flat left patch where every pixel is 10. What output value do you get?"
            options={PREDICT_OPTIONS}
            correctIndex={0}
            selected={prediction}
            onSelect={setPrediction}
            explanation="Every pixel on the left (-1, -2, -1) equals every pixel on the right (+1, +2, +1), so the sum cancels to 0 across flat regions."
            actionLabel="Jump to flat patch (0, 0) now"
            onAction={() => {
              setKernelId('sobelX');
              setPreset('verticalEdge');
              setStride(1);
              setBrightValue(200);
              playback.setStep(0);
            }}
          />
        </>
      )}
    </div>
  );
}

export default function ConvolutionSlideDiagram({ compact = false }: { compact?: boolean } = {}) {
  const outerVisible = useVizVisible();
  return (
    <VisualizationContainer
      title="2D convolution sliding window playground"
      footer="Exact valid 2D cross-correlation (as used in CNN first layers) over an editable 7×7 grayscale pixel grid."
    >
      <ConvolutionSlidePlayground compact={compact} outerVisible={outerVisible} />
    </VisualizationContainer>
  );
}
