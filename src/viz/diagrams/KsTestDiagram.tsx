import { useState } from 'react';
import { useAutoCycle } from '../primitives';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const SHIFTS = [5, 15, 25, 35];

/** Two empirical CDFs -- drag how far the current distribution has
 * shifted and watch the KS statistic (the max vertical gap between the
 * curves) actually grow. */
export default function KsTestDiagram() {
  const t = useVizTokens();
  const { value: autoIdx, pick } = useAutoCycle(SHIFTS.length, 2200, 1);
  const [manualShift, setManualShift] = useState<number | null>(null);
  const shift = manualShift ?? SHIFTS[autoIdx];
  const refColor = getConceptColor(t, 'query');
  const curColor = getConceptColor(t, 'attention');

  const width = 480;
  const height = 130;
  const chartLeft = 30;
  const chartRight = width - 20;
  const chartTop = 10;
  const chartBottom = 110;

  // Reference: standard normal-ish CDF via logistic approx. Current: shifted.
  const cdf = (x: number, mean: number) => 1 / (1 + Math.exp(-(x - mean) / 8));
  const xFor = (x: number) => chartLeft + (x / 100) * (chartRight - chartLeft);
  const yFor = (p: number) => chartBottom - p * (chartBottom - chartTop);

  let maxGap = 0;
  let maxGapX = 50;
  for (let x = 0; x <= 100; x += 1) {
    const gap = Math.abs(cdf(x, 50) - cdf(x, 50 + shift));
    if (gap > maxGap) { maxGap = gap; maxGapX = x; }
  }

  const refPath = Array.from({ length: 101 }, (_, x) => `${x === 0 ? 'M' : 'L'} ${xFor(x)},${yFor(cdf(x, 50))}`).join(' ');
  const curPath = Array.from({ length: 101 }, (_, x) => `${x === 0 ? 'M' : 'L'} ${xFor(x)},${yFor(cdf(x, 50 + shift))}`).join(' ');

  return (
    <VisualizationContainer footer={`KS statistic (max |CDF difference|) = ${maxGap.toFixed(3)}. The larger this gap, the less plausible that both samples come from the same distribution -- this is what the test's p-value is actually computed from.`}>
      <Slider
        label={`Distribution shift: ${shift}`}
        min={0}
        max={40}
        step={1}
        value={shift}
        onChange={(v) => {
          setManualShift(v);
          const closest = SHIFTS.reduce((prev, curr) => Math.abs(curr - v) < Math.abs(prev - v) ? curr : prev);
          pick(SHIFTS.indexOf(closest));
        }}
      />
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        <line x1={chartLeft} y1={chartBottom} x2={chartRight} y2={chartBottom} stroke={t.border} strokeWidth={1} />
        <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom} stroke={t.border} strokeWidth={1} />
        <path d={refPath} fill="none" stroke={refColor} strokeWidth={2} />
        <path d={curPath} fill="none" stroke={curColor} strokeWidth={2} />
        <line x1={xFor(maxGapX)} y1={yFor(cdf(maxGapX, 50))} x2={xFor(maxGapX)} y2={yFor(cdf(maxGapX, 50 + shift))} stroke={t.accentDanger} strokeWidth={2} strokeDasharray="3 2" />
        <text x={xFor(maxGapX) + 6} y={(yFor(cdf(maxGapX, 50)) + yFor(cdf(maxGapX, 50 + shift))) / 2} fontSize={8} fill={t.accentDanger}>KS = {maxGap.toFixed(2)}</text>
      </svg>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: DIAGRAM_TYPE.caption.size }}>
        <span style={{ color: refColor }}>— reference CDF</span>
        <span style={{ color: curColor }}>— current CDF</span>
      </div>
    </VisualizationContainer>
  );
}
