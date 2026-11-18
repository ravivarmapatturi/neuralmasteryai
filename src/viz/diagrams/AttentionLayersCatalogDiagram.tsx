import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

const LAYERS = [
  { key: 'selfattn', label: 'Self-Attention', desc: 'Computes Query/Key/Value projections and attention-weighted output over a sequence -- attending to ITSELF.' },
  { key: 'multihead', label: 'Multi-Head Attention', desc: 'Runs several attention computations in parallel and concatenates them -- each head can specialize in a different relationship pattern.' },
  { key: 'crossattn', label: 'Cross-Attention', desc: 'Queries from one sequence attend to keys/values from ANOTHER sequence -- connects encoder to decoder, and image features to text tokens in VLMs.' },
  { key: 'posenc', label: 'Positional Encoding', desc: 'Injects order information into an otherwise order-blind attention computation -- sinusoidal, learned, or RoPE.' },
  { key: 'block', label: 'Transformer Block', desc: 'The composed unit: self-attention → add & norm → feed-forward → add & norm -- stacked to build every Transformer-based model.' },
];

/** Five attention-family layers -- click one for what it actually
 * computes. */
export default function AttentionLayersCatalogDiagram() {
  const t = useVizTokens();
  const cycle = useAutoCycle(LAYERS.length, 2300, LAYERS.findIndex((layer) => layer.key === 'crossattn'));
  const active = LAYERS[cycle.value].key;
  const setActive = (key: string) => cycle.pick(LAYERS.findIndex((layer) => layer.key === key));
  const color = getConceptColor(t, 'attention');
  const l = LAYERS.find((x) => x.key === active)!;

  return (
    <VisualizationContainer footer={l.desc}>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {LAYERS.map((x) => {
          const isActive = active === x.key;
          return (
            <div key={x.key} onClick={() => setActive(x.key)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(x.key); } }} onMouseEnter={() => setActive(x.key)} style={{ cursor: 'pointer', padding: '0.5rem 0.6rem', borderRadius: 7, background: isActive ? `${color}18` : t.surfaceAlt, border: `1.5px solid ${isActive ? color : t.border}` }}>
              <span style={{ fontSize: 9.5, fontWeight: isActive ? 700 : 500, color: isActive ? color : t.textPrimary }}>{x.label}</span>
            </div>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}
