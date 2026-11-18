import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, VisualizationMath, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { detectionProbability, samplesForConfidence } from '../lib/alignment';

const PRESETS = [
  { p: 0.02, n: 50 },
  { p: 0.01, n: 120 },
  { p: 0.05, n: 40 },
  { p: 0.005, n: 250 },
];

export default function DeceptionDetectionDiagram() {
  const t = useVizTokens();
  const { value: presetIdx, stop } = useAutoCycle(PRESETS.length, 3200, 0);
  const [userP, setUserP] = useState<number | null>(null);
  const [userN, setUserN] = useState<number | null>(null);
  const p = userP ?? PRESETS[presetIdx].p;
  const n = userN ?? PRESETS[presetIdx].n;

  const detectProb = useMemo(() => detectionProbability(p, n), [p, n]);
  const n95 = useMemo(() => samplesForConfidence(p, 0.95), [p]);

  const width = 420;
  const height = 160;
  const samples = Array.from({ length: 60 }, (_, i) => Math.round((i / 59) * 500));
  const px = (nn: number) => (nn / 500) * width;
  const py = (v: number) => height - v * height;
  const curve = samples.map((nn) => [px(nn), py(detectionProbability(p, nn))]);

  return (
    <VisualizationContainer footer={`With a real per-input misbehavior rate of p=${p.toFixed(3)}, testing n=${n} inputs catches it with probability ${(detectProb * 100).toFixed(1)}% -- computed from 1−(1−p)^n, not estimated. Reaching 95% confidence at this p needs ${Number.isFinite(n95) ? Math.ceil(n95) : '∞'} test inputs. A behavior rare enough to matter (small p) can trivially hide behind an evaluation suite too small to have real power against it.`}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Slider label="hidden misbehavior rate (p)" value={p} onChange={(v) => { stop(); setUserP(v); }} min={0.001} max={0.15} step={0.001} format={(v) => v.toFixed(3)} />
        <Slider label="number of eval inputs tested (n)" value={n} onChange={(v) => { stop(); setUserN(v); }} min={1} max={500} step={1} />
      </div>

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        <line x1={0} y1={py(0.95)} x2={width} y2={py(0.95)} stroke={t.textMuted} strokeWidth={1} strokeDasharray="3 3" />
        <text x={4} y={py(0.95) - 4} fontSize={10} fill={t.textMuted}>95% confidence</text>
        <polyline points={curve.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={t.accentPrimary} strokeWidth={2.5} />
        <line x1={px(n)} y1={0} x2={px(n)} y2={height} stroke={t.accentWarn} strokeWidth={1.5} strokeDasharray="3 3" />
        <circle cx={px(n)} cy={py(detectProb)} r={5} fill={t.accentWarn} />
      </svg>
      <div style={{ textAlign: 'center', marginTop: 6 }}>
        <VisualizationMath latex={`P(\\text{detect}) = 1-(1-p)^n = ${(detectProb * 100).toFixed(1)}\\%`} display={false} />
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        This is the concrete statistical shape of "behavioral evaluation alone can be gamed" -- not a vague worry, a real detection-power curve that gets worse exactly as the behavior you're worried about gets rarer.
      </div>
    </VisualizationContainer>
  );
}
