import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';

/** Anchor, positive, negative in embedding space -- click "train" to
 * see triplet loss pull the positive closer and push the negative
 * further, by at least a margin. */
export default function SiameseTripletDiagram() {
  const t = useVizTokens();
  const [trained, setTrained] = useState(false);
  const color = getConceptColor(t, 'attention');
  const okColor = t.accentPrimary;
  const badColor = t.accentDanger;

  const before = { anchor: { x: 130, y: 80 }, pos: { x: 210, y: 40 }, neg: { x: 190, y: 115 } };
  const after = { anchor: { x: 130, y: 80 }, pos: { x: 175, y: 75 }, neg: { x: 255, y: 45 } };
  const p = trained ? after : before;

  return (
    <VisualizationContainer footer={trained ? 'Triplet loss pushed anchor-positive distance below anchor-negative distance by at least a margin -- "same identity" pairs cluster, "different identity" pairs separate, without ever training on fixed class labels.' : 'Before training: the positive (same identity, different photo) and negative (different identity) start at similar, unhelpful distances from the anchor.'}>
      <button type="button" onClick={() => setTrained((v) => !v)} style={{ marginBottom: 10, padding: '6px 12px', borderRadius: 6, border: `1px solid ${color}`, background: trained ? `${color}15` : 'transparent', color, cursor: 'pointer', fontSize: 11.5, fontWeight: 700 }}>
        {trained ? 'Reset' : 'Train with triplet loss'}
      </button>
      <svg width="100%" viewBox="0 0 300 140" style={{ display: 'block' }}>
        <line x1={p.anchor.x} y1={p.anchor.y} x2={p.pos.x} y2={p.pos.y} stroke={okColor} strokeWidth={1.5} strokeDasharray={trained ? undefined : '3,2'} />
        <line x1={p.anchor.x} y1={p.anchor.y} x2={p.neg.x} y2={p.neg.y} stroke={badColor} strokeWidth={1.5} strokeDasharray={trained ? undefined : '3,2'} />
        <circle cx={p.anchor.x} cy={p.anchor.y} r={9} fill={`${color}40`} stroke={color} strokeWidth={2} />
        <text x={p.anchor.x} y={p.anchor.y - 14} textAnchor="middle" fontSize={8} fill={color}>anchor</text>
        <circle cx={p.pos.x} cy={p.pos.y} r={9} fill={`${okColor}40`} stroke={okColor} strokeWidth={2} />
        <text x={p.pos.x} y={p.pos.y - 14} textAnchor="middle" fontSize={8} fill={okColor}>positive</text>
        <circle cx={p.neg.x} cy={p.neg.y} r={9} fill={`${badColor}40`} stroke={badColor} strokeWidth={2} />
        <text x={p.neg.x} y={p.neg.y - 14} textAnchor="middle" fontSize={8} fill={badColor}>negative</text>
      </svg>
    </VisualizationContainer>
  );
}
