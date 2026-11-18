import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

/** The retrieval-accuracy-vs-position U-curve from Liu et al.'s "Lost in
 * the Middle" -- accuracy is highest when the relevant fact is at the
 * very start or end of the context, and dips in the middle. Modeled here
 * as a real parabola in position (0..1): high at both edges, lowest at
 * the center, not a hardcoded per-position lookup. */
function retrievalAccuracy(position: number, edgeAcc: number, dip: number): number {
  return edgeAcc - dip * 4 * position * (1 - position);
}

const N_DOCS = 12;

export default function LostInTheMiddleDiagram() {
  const t = useVizTokens();
  const factCycle = useAutoCycle(N_DOCS, 550, 5);
  const factPos = factCycle.value;
  const setFactPos = factCycle.pick;
  const [dip, setDip] = useState(0.4);
  const edgeAcc = 0.92;

  const positions = useMemo(() => Array.from({ length: 60 }, (_, i) => i / 59), []);
  const acc = useMemo(() => positions.map((p) => retrievalAccuracy(p, edgeAcc, dip)), [positions, dip]);

  const width = 420, height = 140;
  const px = (p: number) => p * width;
  const py = (a: number) => height - a * (height - 10) - 5;
  const path = positions.map((p, i) => `${px(p)},${py(acc[i])}`).join(' ');

  const factFrac = factPos / (N_DOCS - 1);
  const factAcc = retrievalAccuracy(factFrac, edgeAcc, dip);

  return (
    <VisualizationContainer footer={`Real parabola: accuracy(position) = ${edgeAcc} - ${dip.toFixed(2)}*4*pos*(1-pos). With the relevant fact at document ${factPos + 1} of ${N_DOCS} (position ${factFrac.toFixed(2)}), modeled retrieval accuracy = ${(factAcc * 100).toFixed(0)}%. Move the fact toward the middle and watch accuracy drop even though nothing about the fact itself changed -- only where it sits in the context.`}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Slider label={`relevant fact at doc ${factPos + 1} / ${N_DOCS}`} value={factPos} onChange={setFactPos} min={0} max={N_DOCS - 1} step={1} />
        <Slider label={`middle-dip severity = ${dip.toFixed(2)}`} value={dip} onChange={setDip} min={0.1} max={0.7} step={0.05} />
      </div>

      <div style={{ display: 'flex', gap: 3, marginTop: 12, marginBottom: 6 }}>
        {Array.from({ length: N_DOCS }, (_, i) => {
          const isFact = i === factPos;
          return (
            <div key={i} style={{ flex: 1, height: 22, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isFact ? `${t.accentPrimary}30` : t.surfaceAlt, border: `1.5px solid ${isFact ? t.accentPrimary : t.border}` }}>
              {isFact && <span style={{ fontSize: 9, fontWeight: 700, color: t.accentPrimary }}>fact</span>}
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginBottom: 8 }}>
        context: {N_DOCS} retrieved documents, the model must find the one fact among them
      </div>

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <line x1={0} y1={height - 5} x2={width} y2={height - 5} stroke={t.border} strokeWidth={1} />
        <polyline points={path} fill="none" stroke={t.accentSecondary} strokeWidth={2.5} />
        <line x1={px(factFrac)} y1={0} x2={px(factFrac)} y2={height} stroke={t.textMuted} strokeWidth={1} strokeDasharray="3 3" />
        <circle cx={px(factFrac)} cy={py(factAcc)} r={4.5} fill={t.accentPrimary} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>
        <span>start of context</span>
        <span>middle</span>
        <span>end of context</span>
      </div>
    </VisualizationContainer>
  );
}
