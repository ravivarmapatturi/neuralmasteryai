import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { combinedCatchProbability } from '../lib/aisecurity';

const LAYERS = [
  { id: 'framing', label: 'Untrusted-content framing', catch: 0.35 },
  { id: 'output', label: 'Output filtering', catch: 0.3 },
  { id: 'agency', label: 'Least-privilege tool scoping', catch: 0.45 },
  { id: 'monitor', label: 'Monitoring / detection', catch: 0.25 },
];

const PRESET_COMBOS = [
  new Set(['framing', 'output', 'agency', 'monitor']),
  new Set(['framing', 'output']),
  new Set(['agency', 'monitor']),
  new Set(['framing']),
];

export default function DefenseInDepthDiagram() {
  const t = useVizTokens();
  const { value: comboIdx, stop } = useAutoCycle(PRESET_COMBOS.length, 3500, 0);
  const [userActive, setUserActive] = useState<Set<string> | null>(null);
  const active = userActive ?? PRESET_COMBOS[comboIdx];

  const toggle = (id: string) => {
    stop();
    setUserActive((prev) => {
      const next = new Set(prev ?? active);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const enabledRates = useMemo(() => LAYERS.filter((l) => active.has(l.id)).map((l) => l.catch), [active]);
  const combined = combinedCatchProbability(enabledRates);

  return (
    <VisualizationContainer footer={`No single layer is remotely close to 100% -- each has a real, illustrative independent catch rate of 25-45%. But combined catch probability = 1 − Π(1 − p_i) = ${(combined * 100).toFixed(1)}% with all ${LAYERS.length} layers on. Toggle layers off and watch it drop -- this is the actual math behind "defense in depth," not just a slogan.`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {LAYERS.map((l) => {
          const isOn = active.has(l.id);
          return (
            <div key={l.id} onClick={() => toggle(l.id)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(l.id); } }} style={{
              display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '0.5rem 0.8rem', borderRadius: 8,
              background: isOn ? `${t.accentPrimary}18` : t.surfaceAlt, border: `1.5px solid ${isOn ? t.accentPrimary : t.border}`, opacity: isOn ? 1 : 0.5,
            }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${isOn ? t.accentPrimary : t.border}`, background: isOn ? t.accentPrimary : 'transparent' }} />
              <div style={{ flex: 1, fontSize: 13, color: t.textPrimary }}>{l.label}</div>
              <div style={{ fontSize: 11, color: t.textMuted, fontFamily: 'monospace' }}>catches {(l.catch * 100).toFixed(0)}%</div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12, textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: t.accentPrimary, fontFamily: 'monospace' }}>{(combined * 100).toFixed(1)}%</div>
        <div style={{ fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>combined probability an attack gets caught by at least one active layer</div>
      </div>
    </VisualizationContainer>
  );
}
