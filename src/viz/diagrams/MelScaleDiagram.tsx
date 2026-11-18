import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationMath, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const HZ_MAX = 8000;
const N_BINS = 16;

function hzToMel(hz: number): number {
  return 2595 * Math.log10(1 + hz / 700);
}

const MEL_MAX = hzToMel(HZ_MAX);

const WIDTH = 560;
const CURVE_H = 160;
const BINS_H = 70;
const PAD = 40;

const PROBE_FREQS = [250, 500, 1000, 2000, 4000, 8000];

export default function MelScaleDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(PROBE_FREQS.length, 2600);
  const [userProbe, setUserProbe] = useState<number | null>(null);
  const probeHz = userProbe ?? PROBE_FREQS[autoIdx];
  const probeMel = hzToMel(probeHz);
  const probeX = PAD + (probeHz / HZ_MAX) * (WIDTH - 2 * PAD);
  const probeY = CURVE_H - 20 - (probeMel / MEL_MAX) * (CURVE_H - 40);

  const N = 200;
  const curvePath = Array.from({ length: N }, (_, i) => {
    const hz = (i / (N - 1)) * HZ_MAX;
    const mel = hzToMel(hz);
    const x = PAD + (hz / HZ_MAX) * (WIDTH - 2 * PAD);
    const y = CURVE_H - 20 - (mel / MEL_MAX) * (CURVE_H - 40);
    return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
  }).join(' ');

  // Equally-spaced bins on the Mel axis, mapped back to Hz -- this is the
  // actual point: equal steps in Mel do NOT correspond to equal steps in Hz.
  const melBinEdges = Array.from({ length: N_BINS + 1 }, (_, i) => (i / N_BINS) * MEL_MAX);
  const hzBinEdges = melBinEdges.map((mel) => (700 * (10 ** (mel / 2595) - 1)));

  const curveColor = getConceptColor(t, 'attention');
  const linColor = t.textMuted;
  const melColor = t.accentSecondary;

  return (
    <VisualizationContainer footer="16 perceptually equal-width bins (equal steps on the Mel axis) map back to very unequal widths in Hz -- narrow, dense bins below ~1kHz where speech content and pitch discrimination matter most, wide bins at high frequency where human hearing (and speech) cares far less about small differences. A linear-Hz spectrogram spends the same resolution everywhere; a Mel spectrogram spends it where it's perceptually useful.">
      <svg width="100%" viewBox={`0 0 ${WIDTH} ${CURVE_H}`} style={{ display: 'block' }}>
        <line x1={PAD} y1={CURVE_H - 20} x2={WIDTH - PAD} y2={CURVE_H - 20} stroke={t.border} strokeWidth={1} />
        <line x1={PAD} y1={CURVE_H - 20} x2={PAD} y2={10} stroke={t.border} strokeWidth={1} />
        <path d={curvePath} fill="none" stroke={curveColor} strokeWidth={2.5} />
        <line x1={probeX} y1={CURVE_H - 20} x2={probeX} y2={probeY} stroke={t.accentWarn} strokeDasharray="3 2" />
        <line x1={PAD} y1={probeY} x2={probeX} y2={probeY} stroke={t.accentWarn} strokeDasharray="3 2" />
        <circle cx={probeX} cy={probeY} r={5} fill={t.accentWarn} />
        <text x={probeX + 8} y={probeY - 4} fontSize={10} fontWeight={700} fill={t.accentWarn}>{probeHz} Hz = {Math.round(probeMel)} Mel</text>
        <text x={WIDTH / 2} y={CURVE_H - 4} textAnchor="middle" fontSize={DIAGRAM_TYPE.secondaryLabel.size} fill={linColor}>Hz (linear) →</text>
        <text x={14} y={CURVE_H / 2} textAnchor="middle" fontSize={DIAGRAM_TYPE.secondaryLabel.size} fill={melColor} transform={`rotate(-90 14 ${CURVE_H / 2})`}>Mel →</text>
      </svg>

      <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, margin: '8px 0 2px' }}>16 Mel-equal bins, shown at their true Hz width</div>
      <svg width="100%" viewBox={`0 0 ${WIDTH} ${BINS_H}`} style={{ display: 'block' }}>
        {hzBinEdges.slice(0, -1).map((hzStart, i) => {
          const hzEnd = hzBinEdges[i + 1];
          const isProbeBin = probeHz >= hzStart && probeHz < hzEnd;
          const x0 = PAD + (hzStart / HZ_MAX) * (WIDTH - 2 * PAD);
          const x1 = PAD + (hzEnd / HZ_MAX) * (WIDTH - 2 * PAD);
          return <rect key={i} onClick={() => setUserProbe(hzStart + 10)} style={{ cursor: "pointer" }} x={x0} y={16} width={Math.max(1, x1 - x0 - 1)} height={BINS_H - 32} fill={isProbeBin ? t.accentWarn : melColor} opacity={isProbeBin ? 0.7 : 0.25 + (i / N_BINS) * 0.1} stroke={isProbeBin ? t.accentWarn : melColor} strokeWidth={isProbeBin ? 2 : 1} />;
        })}
        <text x={PAD} y={BINS_H - 6} fontSize={9} fill={t.textMuted}>0 Hz</text>
        <text x={WIDTH - PAD} y={BINS_H - 6} textAnchor="end" fontSize={9} fill={t.textMuted}>{HZ_MAX.toLocaleString()} Hz</text>
      </svg>

      <div style={{ textAlign: 'center', marginTop: 6 }}>
        <VisualizationMath latex="\text{mel}(f) = 2595 \log_{10}\left(1 + \frac{f}{700}\right)" />
      </div>
    </VisualizationContainer>
  );
}
