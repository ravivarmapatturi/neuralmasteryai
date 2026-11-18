import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, DIAGRAM_RADIUS } from './diagramSystem';

const NODES = [
  { id: 'embed', label: 'Token embeddings', sub: 'layer 0', detail: 'The raw per-token representation every downstream component reads from and writes back into (the residual stream).' },
  { id: 'prev', label: 'Previous-token head', sub: 'layer 1, head 3', detail: 'A real, verified pattern (see the diagram above): attends position i → i−1, writing "what token came right before me" into the residual stream at every position.' },
  { id: 'induction', label: 'Induction head', sub: 'layer 2, head 7', detail: 'Reads the previous-token head\'s output via K-composition -- its keys are built from "what preceded this position," so it can match the current token\'s predecessor against every earlier position and attend to whatever followed the earlier match.' },
  { id: 'mlp', label: 'MLP (copying)', sub: 'layer 2', detail: 'Takes the induction head\'s attended value (the token that followed the earlier match) and amplifies it -- copying that token\'s identity forward into the residual stream more strongly.' },
  { id: 'output', label: 'Output logits', sub: 'unembedding', detail: 'The amplified signal raises the logit for the "correct" repeated token above every alternative -- the model predicts the pattern will repeat, because this specific mechanism found and copied it.' },
];

export default function CircuitDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(NODES.length, 2800);
  const [userSelected, setUserSelected] = useState<string | null>(null);
  const selected = userSelected ?? NODES[autoIdx].id;
  const active = NODES.find((n) => n.id === selected) ?? NODES[0];

  const boxW = 108;
  const boxH = 56;
  const gap = 34;
  const totalW = NODES.length * boxW + (NODES.length - 1) * gap;
  const y = 20;

  return (
    <VisualizationContainer footer={active.detail}>
      <svg width="100%" viewBox={`0 0 ${totalW} ${boxH + 40}`} style={{ display: 'block' }}>
        <defs>
          <marker id="circuit-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill={t.textMuted} />
          </marker>
        </defs>
        {NODES.slice(0, -1).map((_, i) => {
          const x1 = i * (boxW + gap) + boxW;
          const x2 = x1 + gap;
          return <line key={i} x1={x1} y1={y + boxH / 2} x2={x2 - 6} y2={y + boxH / 2} stroke={t.textMuted} strokeWidth={1.5} markerEnd="url(#circuit-arrow)" />;
        })}
        {NODES.map((n, i) => {
          const x = i * (boxW + gap);
          const isSelected = selected === n.id;
          return (
            <g key={n.id} onClick={() => setUserSelected(n.id)} style={{ cursor: 'pointer' }}>
              <rect x={x} y={y} width={boxW} height={boxH} rx={DIAGRAM_RADIUS.node} fill={isSelected ? `${t.accentPrimary}22` : t.surfaceAlt} stroke={isSelected ? t.accentPrimary : t.border} strokeWidth={isSelected ? 2.5 : 1.5} />
              <text x={x + boxW / 2} y={y + 24} textAnchor="middle" fontSize={11} fontWeight={700} fill={isSelected ? t.accentPrimary : t.textPrimary}>{n.label}</text>
              <text x={x + boxW / 2} y={y + 40} textAnchor="middle" fontSize={10} fill={t.textMuted}>{n.sub}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        Click a component. This is the induction circuit -- one of the first circuits found and verified end-to-end in a real Transformer, and the canonical example of "a circuit" as this page defines it: a specific, identified subgraph implementing a specific behavior, not just a correlation.
      </div>
    </VisualizationContainer>
  );
}
