import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

type Domain = 'nlp' | 'vision';
const DOMAINS: Domain[] = ['nlp', 'vision'];
const SHARED_CONCERNS = ['Latency budgets', 'Monitoring & drift', 'Retraining cadence', 'A/B testing'];

/** Same system-design skeleton, different model in the middle -- toggle
 * domain and watch the model swap while every surrounding concern stays
 * identical. */
export default function DomainAgnosticDesignDiagram() {
  const t = useVizTokens();
  const { value: domainIdx, pick, stop } = useAutoCycle(DOMAINS.length, 3500, 1);
  const domain = DOMAINS[domainIdx];
  const color = getConceptColor(t, 'attention');
  const sharedColor = t.textMuted;
  const model = domain === 'nlp' ? 'Transformer' : 'CNN / ViT';

  return (
    <VisualizationContainer footer={`Swapping ${model} for a different model changes step 6 of the 9-step framework -- nothing else. The system-design concerns around it are domain-agnostic.`}>
      <PillSelect<Domain>
        label="Domain"
        value={domain}
        onChange={(val) => {
          const next = typeof val === 'function' ? val(domain) : val;
          const idx = DOMAINS.indexOf(next);
          if (idx >= 0) pick(idx);
          stop();
        }}
        options={[{ value: 'nlp', label: 'NLP' }, { value: 'vision', label: 'Computer Vision' }]}
      />
      <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
        {SHARED_CONCERNS.slice(0, 2).map((c) => (
          <div key={c} style={{ flex: 1, textAlign: 'center', padding: '0.5rem', borderRadius: 7, background: `${sharedColor}12`, border: `1px solid ${sharedColor}40`, fontSize: 10, color: sharedColor }}>{c}</div>
        ))}
      </div>
      <div style={{ textAlign: 'center', margin: '8px 0' }}>
        <div style={{ display: 'inline-block', padding: '0.6rem 1.2rem', borderRadius: 9, background: `${color}20`, border: `2px solid ${color}`, transition: 'all 0.3s ease' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color }}>{model}</div>
          <div style={{ fontSize: 8.5, color: t.textMuted }}>the only thing that swaps</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {SHARED_CONCERNS.slice(2).map((c) => (
          <div key={c} style={{ flex: 1, textAlign: 'center', padding: '0.5rem', borderRadius: 7, background: `${sharedColor}12`, border: `1px solid ${sharedColor}40`, fontSize: 10, color: sharedColor }}>{c}</div>
        ))}
      </div>
    </VisualizationContainer>
  );
}
