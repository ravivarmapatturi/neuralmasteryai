import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const METHODS = [
  { key: 'GET', idempotent: true, sideEffects: false, desc: 'Retrieve a resource. Safe to retry, safe to cache.' },
  { key: 'POST', idempotent: false, sideEffects: true, desc: 'Create something, or trigger an action. Retrying can duplicate the effect.' },
  { key: 'PUT', idempotent: true, sideEffects: true, desc: 'Replace a resource entirely. Retrying is safe -- same input, same end state.' },
  { key: 'PATCH', idempotent: false, sideEffects: true, desc: 'Partially update a resource. Not guaranteed idempotent (e.g. "increment by 1" isn\'t).' },
  { key: 'DELETE', idempotent: true, sideEffects: true, desc: 'Remove a resource. Retrying is safe -- it\'s already gone either way.' },
];

/** The property that actually matters for production retry logic isn't
 * "what does this method mean" but "is it safe to send twice." Click a
 * method. */
export default function HttpMethodsDiagram() {
  const t = useVizTokens();
  const { value: activeIdx, pick: setActiveIdx, stop } = useAutoCycle(METHODS.length, 3000, 1);
  const color = getConceptColor(t, 'attention');
  const active = METHODS[activeIdx];
  const selected = active.key;

  return (
    <VisualizationContainer footer={active.desc}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {METHODS.map((m, i) => {
          const isSelected = selected === m.key;
          return (
            <div
              key={m.key}
              onClick={() => { stop(); setActiveIdx(i); }}
              onMouseEnter={() => { stop(); setActiveIdx(i); }}
              style={{ cursor: 'pointer', padding: '6px 14px', borderRadius: 7, fontWeight: 700, fontSize: 12.5, fontFamily: 'monospace', background: isSelected ? `${color}25` : t.surfaceAlt, border: `1.5px solid ${isSelected ? color : t.border}`, color: isSelected ? color : t.textSecondary }}
            >
              {m.key}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 24, marginTop: 12 }}>
        <div style={{ fontSize: 12.5 }}>
          <span style={{ color: t.textMuted }}>Idempotent: </span>
          <span style={{ color: active.idempotent ? t.accentPrimary : t.accentDanger, fontWeight: 700 }}>{active.idempotent ? 'yes -- safe to retry' : 'no -- retrying can duplicate effects'}</span>
        </div>
        <div style={{ fontSize: 12.5 }}>
          <span style={{ color: t.textMuted }}>Side effects: </span>
          <span style={{ color: t.textSecondary, fontWeight: 700 }}>{active.sideEffects ? 'yes' : 'no'}</span>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 10 }}>
        Idempotency, not the verb's plain meaning, is what determines whether a network client can safely retry on timeout.
      </div>
    </VisualizationContainer>
  );
}
