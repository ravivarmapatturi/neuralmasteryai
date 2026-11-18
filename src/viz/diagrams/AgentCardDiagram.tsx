import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const FIELDS = [
  { key: 'name', label: 'name', value: '"invoice-processor"', desc: 'A stable identifier for this agent.' },
  { key: 'skills', label: 'skills', value: '["extract line items", "flag anomalies", "match to PO"]', desc: 'Natural-language descriptions of what the agent can be trusted to do -- not function signatures.' },
  { key: 'modes', label: 'inputModes / outputModes', value: '["text", "file/pdf"] -> ["text", "application/json"]', desc: 'What kinds of content the agent accepts and returns.' },
  { key: 'auth', label: 'authentication', value: '{ scheme: "bearer" }', desc: 'How a caller proves it\'s allowed to delegate to this agent.' },
];

/** A concrete agent card, field by field -- click a field for what it's
 * for. Deliberately looks like a résumé's skills section, not a type
 * signature, because that's the actual analogy: a delegating agent reads
 * this to judge fit, it doesn't type-check against it. */
export default function AgentCardDiagram() {
  const t = useVizTokens();
  const cyc = useAutoCycle(FIELDS.length, 2500, 1);
  const color = getConceptColor(t, 'key');
  const active = FIELDS[cyc.value];

  return (
    <VisualizationContainer footer={active.desc}>
      <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8, padding: '0.9rem 1rem', fontFamily: 'monospace', fontSize: 12 }}>
        <div style={{ color: t.textMuted }}>{'{'}</div>
        {FIELDS.map((f, i) => (
          <div
            key={f.key}
            onClick={() => cyc.pick(i)}
            onMouseEnter={() => cyc.pick(i)}
            style={{ paddingLeft: 16, cursor: 'pointer', padding: '4px 0 4px 16px', background: cyc.value === i ? `${color}18` : 'transparent', borderRadius: 4 }}
          >
            <span style={{ color: cyc.value === i ? color : t.accentSecondary, fontWeight: cyc.value === i ? 700 : 400 }}>{f.label}</span>
            <span style={{ color: t.textMuted }}>: </span>
            <span style={{ color: t.textSecondary }}>{f.value}</span>
          </div>
        ))}
        <div style={{ color: t.textMuted }}>{'}'}</div>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        Click a field -- an agent card, similar in spirit to an OpenAPI spec, but describing trusted capabilities rather than literal signatures.
      </div>
    </VisualizationContainer>
  );
}
