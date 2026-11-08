import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, DIAGRAM_RADIUS } from './diagramSystem';

type Mode = 'direct' | 'indirect';

export default function DirectVsIndirectInjectionDiagram() {
  const t = useVizTokens();
  const [mode, setMode] = useState<Mode>('indirect');

  const nodes = mode === 'direct'
    ? [{ id: 'attacker', label: 'Attacker' }, { id: 'chat', label: 'Chat input' }, { id: 'model', label: 'Model' }, { id: 'output', label: 'Output' }]
    : [{ id: 'attacker', label: 'Attacker' }, { id: 'doc', label: 'Poisoned webpage / doc' }, { id: 'user', label: 'Innocent user' }, { id: 'model', label: 'Model (via RAG/agent)' }, { id: 'output', label: 'Output / action' }];

  return (
    <VisualizationContainer footer={
      mode === 'direct'
        ? 'Direct injection: the attacker IS the user typing the malicious instruction straight into the chat. Most safety training and input guardrails specifically target this path.'
        : 'Indirect injection: the attacker plants the instruction somewhere the model will later retrieve or process. The user who triggers the attack (by asking the model to summarize that page, or read that email) is not the attacker and has no idea anything malicious happened -- the attack surface is every piece of external content the system ever touches, not just the input box.'
    }>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {(['indirect', 'direct'] as Mode[]).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)} style={{
            padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${mode === m ? t.accentPrimary : t.border}`,
            background: mode === m ? t.accentPrimary : 'transparent',
            color: mode === m ? t.background : t.textPrimary,
          }}>{m === 'indirect' ? 'Indirect (more dangerous)' : 'Direct'}</button>
        ))}
      </div>

      <svg width="100%" viewBox={`0 0 ${nodes.length * 110} 100`} style={{ display: 'block' }}>
        <defs>
          <marker id="inj-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.textMuted} />
          </marker>
        </defs>
        {nodes.slice(0, -1).map((_, i) => (
          <line
            key={i}
            x1={i * 110 + 90}
            y1={45}
            x2={(i + 1) * 110 - 2}
            y2={45}
            stroke={t.textMuted}
            strokeWidth={1.5}
            markerEnd="url(#inj-arrow)"
          />
        ))}
        {nodes.map((n, i) => {
          const isAttacker = n.id === 'attacker';
          const isModel = n.id === 'model';
          const color = isAttacker ? t.accentDanger : isModel ? t.accentPrimary : t.textSecondary;
          return (
            <g key={n.id} transform={`translate(${i * 110}, 20)`}>
              <rect width={90} height={50} rx={DIAGRAM_RADIUS.node} fill={isAttacker ? `${color}18` : t.surfaceAlt} stroke={color} strokeWidth={1.5} />
              <text x={45} y={20} textAnchor="middle" fontSize={10} fontWeight={700} fill={color}>{n.label.split(' ')[0]}</text>
              <text x={45} y={34} textAnchor="middle" fontSize={9} fill={t.textMuted}>{n.label.split(' ').slice(1).join(' ')}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 6 }}>
        Same underlying vulnerability (the blurred instruction/data boundary above), two different attack paths to it.
      </div>
    </VisualizationContainer>
  );
}
