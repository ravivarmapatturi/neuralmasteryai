import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

const STAGES = [
  { id: 'generate', label: 'Generate', sublabel: 'initial response', detail: 'The model produces an initial response to a prompt, same as any other generation step.' },
  { id: 'critique', label: 'Self-critique', sublabel: 'against constitution', detail: 'The SAME model is prompted to critique its own response against an explicit written principle from the constitution (e.g. "does this response avoid being harmful?").' },
  { id: 'revise', label: 'Self-revise', sublabel: 'rewrite response', detail: 'The model rewrites its response to address the critique -- still no human in this loop at all.' },
  { id: 'train', label: 'Train', sublabel: 'on revised pairs', detail: 'The (original, revised) pair becomes training signal -- preferring the revised version -- replacing what a human preference label would have done in plain RLHF.' },
];

export default function ConstitutionalAiLoopDiagram() {
  const t = useVizTokens();
  const [selected, setSelected] = useState('critique');
  const active = STAGES.find((s) => s.id === selected)!;

  const width = 460;
  const height = 220;
  const cx = width / 2;
  const cy = 108;
  const rx = 120;
  const ry = 65;
  const cardW = 96;
  const cardH = 38;

  const positions = [
    { x: cx, y: cy - ry },        // Top: Generate
    { x: cx + rx, y: cy },        // Right: Self-critique
    { x: cx, y: cy + ry },        // Bottom: Self-revise
    { x: cx - rx, y: cy },        // Left: Train
  ];

  // Arrow connections between cards
  const arrows = [
    { x1: positions[0].x + 36, y1: positions[0].y + cardH / 2 + 2, x2: positions[1].x - cardW / 2 - 4, y2: positions[1].y - 12 }, // Gen -> Critique
    { x1: positions[1].x - cardW / 2 + 4, y1: positions[1].y + cardH / 2 - 2, x2: positions[2].x + 36, y2: positions[2].y - cardH / 2 - 4 }, // Critique -> Revise
    { x1: positions[2].x - 36, y1: positions[2].y - cardH / 2 - 2, x2: positions[3].x + cardW / 2 + 4, y2: positions[3].y + 12 }, // Revise -> Train
    { x1: positions[3].x + cardW / 2 - 4, y1: positions[3].y - cardH / 2 + 2, x2: positions[0].x - 36, y2: positions[0].y + cardH / 2 + 4 }, // Train -> Gen
  ];

  return (
    <VisualizationContainer footer={active.detail}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          <marker id="cai-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={t.textMuted} />
          </marker>
        </defs>

        {/* Clean directional arrows between card boundaries */}
        {arrows.map((a, i) => (
          <line
            key={i}
            x1={a.x1}
            y1={a.y1}
            x2={a.x2}
            y2={a.y2}
            stroke={t.textMuted}
            strokeWidth={1.5}
            markerEnd="url(#cai-arrow)"
          />
        ))}

        {/* Stage cards */}
        {STAGES.map((s, i) => {
          const pos = positions[i];
          const isSelected = selected === s.id;
          const x = pos.x - cardW / 2;
          const y = pos.y - cardH / 2;

          return (
            <g key={s.id} onClick={() => setSelected(s.id)} style={{ cursor: 'pointer' }}>
              <rect
                x={x}
                y={y}
                width={cardW}
                height={cardH}
                rx={8}
                fill={isSelected ? `${t.accentPrimary}25` : t.surfaceAlt}
                stroke={isSelected ? t.accentPrimary : t.border}
                strokeWidth={isSelected ? 2 : 1}
              />
              <text
                x={pos.x}
                y={pos.y - 2}
                textAnchor="middle"
                fontSize={9.5}
                fontWeight={700}
                fill={isSelected ? t.accentPrimary : t.textPrimary}
              >
                {s.label}
              </text>
              <text
                x={pos.x}
                y={pos.y + 11}
                textAnchor="middle"
                fontSize={7.5}
                fill={t.textMuted}
              >
                {s.sublabel}
              </text>
            </g>
          );
        })}

        <text x={cx} y={cy - 5} textAnchor="middle" fontSize={10.5} fontWeight={600} fill={t.textMuted}>
          no human
        </text>
        <text x={cx} y={cy + 9} textAnchor="middle" fontSize={10.5} fontWeight={600} fill={t.textMuted}>
          in the loop
        </text>
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Compare to RLHF's pipeline (Training Pipeline page): same end goal (a preferred-vs-rejected training signal), but every step of the loop above is the model itself, not a human labeler -- reducing labeling volume and making the values being trained toward an explicit, readable document instead of an implicit pattern across thousands of individual labels.
      </div>
    </VisualizationContainer>
  );
}
