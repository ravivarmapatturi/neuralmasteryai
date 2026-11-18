import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, VisualizationMath, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

// A sparse reward sequence -- mostly 0, one useful reward at t=3, a bigger
// one far off at t=8. Real stand-in for "reward now vs. reward later."
const REWARDS = [0, 0, 0, 3, 0, 0, 0, 0, 8, 0];

const GAMMA_PRESETS = [0.3, 0.6, 0.85, 0.98];

export default function ReturnDiscountingDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(GAMMA_PRESETS.length, 2800);
  const [userGamma, setUserGamma] = useState<number | null>(null);
  const gamma = userGamma ?? GAMMA_PRESETS[autoIdx];

  const terms = useMemo(() => REWARDS.map((r, k) => ({ k, r, weighted: Math.pow(gamma, k) * r, discount: Math.pow(gamma, k) })), [gamma]);
  const G = terms.reduce((s, term) => s + term.weighted, 0);
  const maxTerm = Math.max(...terms.map((tm) => Math.abs(tm.weighted)), 1e-6);
  const halfLife = gamma < 1 && gamma > 0 ? Math.log(0.5) / Math.log(gamma) : Infinity;

  return (
    <VisualizationContainer footer={`G_0 = Σ γ^k · r_k = ${G.toFixed(3)}, real sum of the bars below. At γ=${gamma.toFixed(2)}, a reward's weight halves roughly every ${Number.isFinite(halfLife) ? halfLife.toFixed(1) : '∞'} steps -- that's the concrete "effective horizon" γ controls, not just an abstract discount.`}>
      <Slider label="discount factor γ" value={gamma} onChange={setUserGamma} min={0} max={0.99} step={0.01} />

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140, marginTop: 12, padding: '0 4px' }}>
        {terms.map((term) => (
          <div key={term.k} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 10, color: t.textMuted }}>{term.weighted !== 0 ? term.weighted.toFixed(2) : ''}</div>
            <div style={{
              width: '100%', height: Math.max(2, (Math.abs(term.weighted) / maxTerm) * 90),
              background: term.r !== 0 ? t.accentPrimary : t.surfaceAlt,
              opacity: 0.3 + term.discount * 0.7,
              borderRadius: 3,
            }} />
            <div style={{ fontSize: 10, color: t.textMuted }}>t={term.k}</div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 6 }}>
        Bar height = γ^k · r_k, the actual discounted contribution of each step's real reward to the return. Raw rewards are identical across every γ setting -- only the discounting (and therefore how much the far-off reward at t=8 counts) changes.
      </div>
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <VisualizationMath latex={`G_0 = \\sum_{k=0}^{9} \\gamma^k r_k = ${G.toFixed(3)}`} />
      </div>
    </VisualizationContainer>
  );
}
