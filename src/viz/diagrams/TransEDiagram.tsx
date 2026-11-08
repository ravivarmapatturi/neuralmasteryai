import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { addVec, dist, type Vec2 } from '../lib/graphml';

// Toy 2D embeddings -- real vector arithmetic, not a trained model.
// subject + relation should land close to the TRUE object and far from
// wrong candidates; that gap is exactly what TransE's training loss
// optimizes for at real scale.
const SUBJECT: Vec2 = { x: 40, y: 50 };
const RELATION: Vec2 = { x: 130, y: 35 };
const CANDIDATES: { name: string; pos: Vec2 }[] = [
  { name: 'Warsaw', pos: { x: 178, y: 92 } },
  { name: 'Paris', pos: { x: 90, y: -10 } },
  { name: 'Stockholm', pos: { x: 210, y: 130 } },
];

export default function TransEDiagram() {
  const t = useVizTokens();
  const [candidateIdx, setCandidateIdx] = useState(0);

  const predicted = addVec(SUBJECT, RELATION);
  const ranked = CANDIDATES.map((c) => ({ ...c, distance: dist(predicted, c.pos) })).sort((a, b) => a.distance - b.distance);
  const active = CANDIDATES[candidateIdx];
  const activeDist = dist(predicted, active.pos);

  const width = 320;
  const height = 220;
  const ox = 40;
  const oy = 190;
  const scale = 1;
  const px = (v: Vec2) => ox + v.x * scale;
  const py = (v: Vec2) => oy - v.y * scale;

  return (
    <VisualizationContainer footer={`embedding(Curie) + embedding(born_in) lands at (${predicted.x}, ${predicted.y}). Distance to "${active.name}" = ${activeDist.toFixed(1)}. Ranked by real distance, closest first: ${ranked.map((r) => `${r.name} (${r.distance.toFixed(1)})`).join(' < ')} -- TransE predicts whichever candidate lands closest as the most plausible missing fact.`}>
      <PillSelect label="Candidate object" value={candidateIdx} onChange={(v) => setCandidateIdx(v as number)} options={CANDIDATES.map((c, i) => ({ value: i, label: c.name }))} />

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8, maxWidth: 320, margin: '8px auto 0' }}>
        <defs>
          <marker id="transe-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill={t.textSecondary} />
          </marker>
        </defs>
        {/* subject vector */}
        <line x1={px({ x: 0, y: 0 })} y1={py({ x: 0, y: 0 })} x2={px(SUBJECT)} y2={py(SUBJECT)} stroke={t.accentSecondary} strokeWidth={2.5} markerEnd="url(#transe-arrow)" />
        <text x={px(SUBJECT) - 4} y={py(SUBJECT) - 8} fontSize={11} fontWeight={700} fill={t.accentSecondary}>Curie</text>

        {/* relation vector, from subject tip */}
        <line x1={px(SUBJECT)} y1={py(SUBJECT)} x2={px(predicted)} y2={py(predicted)} stroke={t.accentWarn} strokeWidth={2.5} markerEnd="url(#transe-arrow)" />
        <text x={(px(SUBJECT) + px(predicted)) / 2} y={(py(SUBJECT) + py(predicted)) / 2 - 8} fontSize={10} fontWeight={700} fill={t.accentWarn}>born_in</text>

        {/* predicted point */}
        <circle cx={px(predicted)} cy={py(predicted)} r={5} fill="none" stroke={t.textPrimary} strokeWidth={1.5} strokeDasharray="2 2" />
        <text x={px(predicted) - 6} y={py(predicted) + 18} textAnchor="end" fontSize={10} fontWeight={600} fill={t.textMuted}>Curie + born_in</text>

        {/* candidates */}
        {CANDIDATES.map((c) => {
          const isActive = c.name === active.name;
          return (
            <g key={c.name}>
              <line x1={px(predicted)} y1={py(predicted)} x2={px(c.pos)} y2={py(c.pos)} stroke={isActive ? t.accentPrimary : t.border} strokeWidth={isActive ? 2 : 1} strokeDasharray={isActive ? undefined : '3 3'} />
              <circle cx={px(c.pos)} cy={py(c.pos)} r={isActive ? 8 : 6} fill={isActive ? t.accentPrimary : t.surfaceAlt} stroke={isActive ? t.accentPrimary : t.textMuted} strokeWidth={1.5} />
              <text x={px(c.pos) + 10} y={py(c.pos) + 4} fontSize={10} fontWeight={isActive ? 700 : 400} fill={isActive ? t.accentPrimary : t.textMuted}>{c.name}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>
        embedding(subject) + embedding(relation) ≈ embedding(object) -- training pulls the true triple's object close to the vector sum and pushes every wrong candidate away.
      </div>
    </VisualizationContainer>
  );
}
