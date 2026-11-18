import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

const LAYERS = [
  { key: 'dense', label: 'Dense / Linear', formula: 'y = Wx + b', desc: 'Every input connects to every output -- the final classification head in almost every architecture, and the feed-forward sublayer inside Transformer blocks.' },
  { key: 'embedding', label: 'Embedding', formula: 'lookup(token_id) → vector', desc: 'A lookup table mapping discrete tokens to dense learned vectors -- the first layer of essentially every NLP/LLM model.' },
  { key: 'flatten', label: 'Flatten', formula: '(C,H,W) → (C×H×W,)', desc: 'Reshapes a multi-dimensional tensor into a 1D vector -- the standard bridge between spatial layers and a dense head.' },
];

/** Three layers every architecture is ultimately built from -- click
 * one for its formula and role. */
export default function CoreBuildingBlocksDiagram() {
  const t = useVizTokens();
  const cycle = useAutoCycle(LAYERS.length, 2300);
  const active = LAYERS[cycle.value].key;
  const setActive = (key: string) => cycle.pick(LAYERS.findIndex((block) => block.key === key));
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
      <div style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color, padding: '0.5rem', borderRadius: 7, background: `${color}10` }}>
        {l.formula}
      </div>
    </VisualizationContainer>
  );
}
