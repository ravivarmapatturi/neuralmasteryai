import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { entropy, crossEntropy, klDivergence } from '../lib/probstat';

const LABELS = ['cat', 'dog', 'bird'];
const P = [0.7, 0.2, 0.1]; // true distribution

const Q_PRESETS = [
  { q1: 0.70, q2: 0.20 }, // matched Q=P -> KL=0
  { q1: 0.33, q2: 0.33 }, // uniform Q
  { q1: 0.10, q2: 0.20 }, // inverted Q -> high KL
  { q1: 0.50, q2: 0.30 }, // intermediate
];

export default function EntropyKlDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(Q_PRESETS.length, 3000);
  const [userQPreset, setUserQPreset] = useState<{ q1: number; q2: number } | null>(null);
  const qPreset = userQPreset ?? Q_PRESETS[autoIdx];
  const q1 = qPreset.q1;
  const q2 = qPreset.q2;
  const q3 = Math.max(0.001, 1 - q1 - q2);
  const Q = [q1, q2, q3];

  const H_P = useMemo(() => entropy(P), []);
  const H_PQ = useMemo(() => crossEntropy(P, Q), [q1, q2]);
  const KL = useMemo(() => klDivergence(P, Q), [q1, q2]);

  return (
    <VisualizationContainer footer={`Real H(P) = ${H_P.toFixed(3)} bits (the true distribution's own uncertainty -- fixed). Real H(P,Q) = ${H_PQ.toFixed(3)} bits (cross-entropy -- this is literally the training loss). Real D_KL(P‖Q) = H(P,Q) − H(P) = ${KL.toFixed(3)} bits. Drag Q toward P and watch cross-entropy fall toward H(P) and KL fall toward exactly 0 -- a perfect predictor has zero extra cost over the distribution's own true uncertainty.`}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Slider label={`Q(${LABELS[0]})`} value={q1} onChange={(v) => setUserQPreset({ q1: Math.min(v, 1 - 0.02), q2 })} min={0.02} max={0.96} step={0.02} />
        <Slider label={`Q(${LABELS[1]})`} value={q2} onChange={(v) => setUserQPreset({ q1, q2: Math.min(v, 1 - q1 - 0.02) })} min={0.02} max={0.96} step={0.02} />
      </div>

      <div style={{ display: 'flex', gap: 24, marginTop: 12, justifyContent: 'center' }}>
        {LABELS.map((label, i) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 90 }}>
              <div style={{ width: 20, height: P[i] * 90, background: t.accentSecondary, borderRadius: 3 }} title={`P=${P[i]}`} />
              <div style={{ width: 20, height: Q[i] * 90, background: t.accentWarn, borderRadius: 3 }} title={`Q=${Q[i].toFixed(2)}`} />
            </div>
            <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 6 }}>
        <span><span style={{ color: t.accentSecondary }}>⬤</span> true P</span>
        <span><span style={{ color: t.accentWarn }}>⬤</span> predicted Q</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 30, marginTop: 10 }}>
        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 800, color: t.textSecondary, fontFamily: 'monospace' }}>{H_P.toFixed(3)}</div><div style={{ fontSize: 10, color: t.textMuted }}>H(P)</div></div>
        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 800, color: t.accentWarn, fontFamily: 'monospace' }}>{H_PQ.toFixed(3)}</div><div style={{ fontSize: 10, color: t.textMuted }}>H(P,Q)</div></div>
        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 800, color: t.accentDanger, fontFamily: 'monospace' }}>{KL.toFixed(3)}</div><div style={{ fontSize: 10, color: t.textMuted }}>D_KL(P‖Q)</div></div>
      </div>
    </VisualizationContainer>
  );
}
