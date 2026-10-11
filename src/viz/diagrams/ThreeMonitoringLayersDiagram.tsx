import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { SelectableRow, VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

const LAYERS = [
  { key: 'infra', label: 'Infrastructure', status: 'healthy', desc: 'CPU/GPU utilization, memory, disk, latency, error rate, uptime -- standard software monitoring.' },
  { key: 'app', label: 'Application', status: 'healthy', desc: 'Request/response schemas valid, correct status codes, no unhandled exceptions -- also not ML-specific.' },
  { key: 'ml', label: 'ML-specific', status: 'degraded', desc: 'Are predictions still accurate, does incoming data still resemble training data -- the layer with NO equivalent in regular software monitoring.' },
];

/** All three layers can be checked independently -- click one, and
 * notice the top two can read fully green while the one underneath has
 * silently failed. */
export default function ThreeMonitoringLayersDiagram() {
  const t = useVizTokens();
  const [active, setActive] = useState('ml');
  const okColor = t.accentPrimary;
  const badColor = t.accentDanger;
  const info = LAYERS.find((l) => l.key === active)!;

  return (
    <VisualizationContainer footer={info.desc}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {LAYERS.map((l) => {
          const isActive = active === l.key;
          const isBad = l.status === 'degraded';
          const c = isBad ? badColor : okColor;
          return (
            <SelectableRow key={l.key} selected={isActive} label={l.label} onSelect={() => setActive(l.key)} onMouseEnter={() => setActive(l.key)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.85rem', borderRadius: 8, background: isActive ? `${c}18` : t.surfaceAlt, border: `1.5px solid ${isActive ? c : t.border}` }}>
              <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? c : t.textPrimary }}>{l.label}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: c }}>{isBad ? '⚠ silently degraded' : '✓ 100% healthy'}</span>
            </SelectableRow>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        Every dashboard can read green while the model underneath has quietly degraded to near-random.
      </div>
    </VisualizationContainer>
  );
}
