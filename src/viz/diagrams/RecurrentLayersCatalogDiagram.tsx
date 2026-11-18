import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

const LAYERS = [
  { key: 'rnn', label: 'RNN cell', formula: 'h_t = f(h_{t-1}, x_t)', desc: 'The basic recurrent unit -- struggles with long sequences since gradients have to flow back through every time step.' },
  { key: 'lstm', label: 'LSTM cell', formula: 'gated cell state', desc: 'Adds a gated cell state that explicitly controls what\'s remembered vs. forgotten -- solves the long-sequence problem plain RNNs have.' },
  { key: 'gru', label: 'GRU cell', formula: 'two-gate, simplified', desc: 'A simplified two-gate alternative to LSTM -- fewer parameters, often comparable performance.' },
];

/** Three recurrent cell types, in order of increasing sophistication
 * -- click one for its update rule and why it exists. */
export default function RecurrentLayersCatalogDiagram() {
  const t = useVizTokens();
  const cycle = useAutoCycle(LAYERS.length, 2400, LAYERS.findIndex((layer) => layer.key === 'lstm'));
  const active = LAYERS[cycle.value].key;
  const setActive = (key: string) => cycle.pick(LAYERS.findIndex((layer) => layer.key === key));
  const color = getConceptColor(t, 'attention');
  const l = LAYERS.find((x) => x.key === active)!;

  return (
    <VisualizationContainer footer={l.desc}>
      <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
        {LAYERS.map((x) => {
          const isActive = active === x.key;
          return (
            <div key={x.key} onClick={() => setActive(x.key)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(x.key); } }} onMouseEnter={() => setActive(x.key)} style={{ cursor: 'pointer', flex: 1, textAlign: 'center', padding: '0.5rem 0.4rem', borderRadius: 7, background: isActive ? `${color}18` : t.surfaceAlt, border: `1.5px solid ${isActive ? color : t.border}` }}>
              <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, color: isActive ? color : t.textPrimary }}>{x.label}</span>
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: 10.5, fontWeight: 700, color, padding: '0.5rem', borderRadius: 7, background: `${color}10` }}>
        {l.formula}
      </div>
    </VisualizationContainer>
  );
}
