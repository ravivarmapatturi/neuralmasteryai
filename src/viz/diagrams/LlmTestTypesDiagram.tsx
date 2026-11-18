import { useAutoCycle } from '../primitives';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';

const TYPES = [
  { key: 'prompt', label: 'Prompt', desc: 'A prompt template treated as code under test -- fixed inputs, expected output criteria.' },
  { key: 'golden', label: 'Golden datasets', desc: 'The curated, maintained reference set every other test here actually runs against.' },
  { key: 'hallucination', label: 'Hallucination', desc: 'Does the model state claims unsupported by its provided context.' },
  { key: 'jailbreak', label: 'Jailbreak', desc: 'Known jailbreak patterns, run continuously -- not just a one-time pre-launch check.' },
  { key: 'toolcall', label: 'Tool-call', desc: 'Does a given input reliably produce the correct tool call, correctly formed.' },
  { key: 'structured', label: 'Structured-output', desc: 'Does the output actually validate against the requested schema.' },
  { key: 'trajectory', label: 'Agent trajectory', desc: 'Not just the final outcome -- does the SEQUENCE of steps match an expected pattern.' },
];

/** Seven test types with no classical-ML equivalent at all -- click one
 * for what it specifically checks. */
export default function LlmTestTypesDiagram() {
  const t = useVizTokens();
  const { value: activeIdx, pick } = useAutoCycle(TYPES.length, 2500, 3);
  const active = TYPES[activeIdx].key;
  const color = getConceptColor(t, 'attention');
  const info = TYPES[activeIdx];

  return (
    <VisualizationContainer footer={info.desc}>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {TYPES.map((x, idx) => {
          const isActive = active === x.key;
          return (
            <div key={x.key} onClick={() => pick(idx)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(idx); } }} onMouseEnter={() => pick(idx)} style={{ cursor: 'pointer', padding: '0.5rem 0.8rem', borderRadius: 7, background: isActive ? `${color}18` : t.surfaceAlt, border: `1.5px solid ${isActive ? color : t.border}` }}>
              <span style={{ fontSize: 10.5, fontWeight: isActive ? 700 : 500, color: isActive ? color : t.textPrimary }}>{x.label}</span>
            </div>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}
