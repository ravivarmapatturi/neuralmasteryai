import { useAutoCycle } from '../primitives';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';

const THREATS = [
  { key: 'injection', label: 'Prompt injection', desc: 'Malicious instructions embedded in user input (or retrieved RAG content) attempt to override the system prompt -- mitigated by treating retrieved content as untrusted data, never as instructions.' },
  { key: 'leakage', label: 'Data leakage', desc: 'A fine-tuned model can memorize and regurgitate training data; a RAG system can surface documents a user shouldn\'t see -- requires access controls enforced before retrieval/generation, not just output filtering.' },
  { key: 'jailbreak', label: 'Jailbreaks', desc: 'Adversarial prompts designed to bypass safety training -- an ongoing arms race, addressed by model-level safety tuning plus system-level guardrails together.' },
  { key: 'agency', label: 'Excessive agency', desc: 'Giving an agent more real-world capability (API calls, file writes, financial transactions) than a task actually requires -- fixed with least-privilege applied to tool access.' },
  { key: 'pii', label: 'PII protection', desc: 'Detecting/redacting personal data in both training data and serving logs -- logging full prompts and completions by default is a common, easily-avoided PII exposure.' },
];

/** Five attack surfaces that don't exist in classical ML serving --
 * click one for what it actually is and how it's mitigated. */
export default function LlmAttackSurfaceDiagram() {
  const t = useVizTokens();
  const { value: activeIdx, pick } = useAutoCycle(THREATS.length, 2500, 0);
  const active = THREATS[activeIdx].key;
  const color = getConceptColor(t, 'attention');
  const x = THREATS[activeIdx];

  return (
    <VisualizationContainer footer={x.desc}>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {THREATS.map((y, idx) => {
          const isActive = active === y.key;
          return (
            <div key={y.key} onClick={() => pick(idx)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(idx); } }} onMouseEnter={() => pick(idx)} style={{ cursor: 'pointer', padding: '0.5rem 0.7rem', borderRadius: 7, background: isActive ? `${color}18` : t.surfaceAlt, border: `1.5px solid ${isActive ? color : t.border}` }}>
              <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, color: isActive ? color : t.textPrimary }}>{y.label}</span>
            </div>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}
