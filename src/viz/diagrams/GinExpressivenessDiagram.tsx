import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider } from '../primitives';
import { DIAGRAM_TYPE, DIAGRAM_RADIUS } from './diagramSystem';
import { meanAgg, sumAgg } from '../lib/graphml';

function StarGraph({ leafCount, label }: { leafCount: number; label: string }) {
  const t = useVizTokens();
  const cx = 90;
  const cy = 70;
  const r = 60;
  const leaves = Array.from({ length: leafCount }, (_, i) => {
    const angle = (i / leafCount) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
  return (
    <svg width={180} height={150} viewBox={`0 0 ${180} ${150}`} className="nm-fit-svg">
      {leaves.map((l, i) => <line key={i} x1={cx} y1={cy} x2={l.x} y2={l.y} stroke={t.border} strokeWidth={1.5} />)}
      {leaves.map((l, i) => (
        <g key={i}>
          <circle cx={l.x} cy={l.y} r={14} fill={t.surfaceAlt} stroke={t.accentSecondary} strokeWidth={1.5} />
          <text x={l.x} y={l.y + 4} textAnchor="middle" fontSize={11} fontFamily="monospace" fill={t.accentSecondary}>1</text>
        </g>
      ))}
      <circle cx={cx} cy={cy} r={18} fill={`${t.accentPrimary}25`} stroke={t.accentPrimary} strokeWidth={2} />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill={t.accentPrimary}>center</text>
      <text x={cx} y={140} textAnchor="middle" fontSize={11} fill={t.textMuted}>{label}</text>
    </svg>
  );
}

export default function GinExpressivenessDiagram() {
  const t = useVizTokens();
  const [leafCountB, setLeafCountB] = useState(3);

  const neighborsA = [1, 1];
  const neighborsB = Array(leafCountB).fill(1);
  const meanA = meanAgg(neighborsA);
  const meanB = meanAgg(neighborsB);
  const sumA = sumAgg(neighborsA);
  const sumB = sumAgg(neighborsB);
  const meansEqual = Math.abs(meanA - meanB) < 1e-9;

  return (
    <VisualizationContainer footer={`Mean aggregation gives the center node ${meanA.toFixed(2)} in both graphs (identical, ${meansEqual ? 'literally indistinguishable' : 'still distinguishable'}) even though they have a different number of neighbors -- a GCN/GraphSAGE-style layer can't tell these two center nodes apart. Sum aggregation gives ${sumA} vs. ${sumB}: genuinely different numbers, because sum -- unlike mean -- doesn't throw away neighbor count.`}>
      <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
        <StarGraph leafCount={2} label="Graph A (2 neighbors)" />
        <StarGraph leafCount={leafCountB} label={`Graph B (${leafCountB} neighbors)`} />
      </div>

      <div style={{ maxWidth: 260, margin: '4px auto 0' }}>
        <Slider label="Graph B neighbor count" value={leafCountB} onChange={setLeafCountB} min={2} max={6} step={1} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 40, marginTop: 12 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>mean aggregation</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <span style={{ padding: '4px 10px', borderRadius: DIAGRAM_RADIUS.chip, background: t.surfaceAlt, border: `1.5px solid ${meansEqual ? t.accentDanger : t.border}`, fontFamily: 'monospace', fontSize: 13 }}>{meanA.toFixed(2)}</span>
            <span style={{ padding: '4px 10px', borderRadius: DIAGRAM_RADIUS.chip, background: t.surfaceAlt, border: `1.5px solid ${meansEqual ? t.accentDanger : t.border}`, fontFamily: 'monospace', fontSize: 13 }}>{meanB.toFixed(2)}</span>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>sum aggregation</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <span style={{ padding: '4px 10px', borderRadius: DIAGRAM_RADIUS.chip, background: `${t.accentPrimary}20`, border: `1.5px solid ${t.accentPrimary}`, fontFamily: 'monospace', fontSize: 13, color: t.accentPrimary, fontWeight: 700 }}>{sumA}</span>
            <span style={{ padding: '4px 10px', borderRadius: DIAGRAM_RADIUS.chip, background: `${t.accentPrimary}20`, border: `1.5px solid ${t.accentPrimary}`, fontFamily: 'monospace', fontSize: 13, color: t.accentPrimary, fontWeight: 700 }}>{sumB}</span>
          </div>
        </div>
      </div>
    </VisualizationContainer>
  );
}
