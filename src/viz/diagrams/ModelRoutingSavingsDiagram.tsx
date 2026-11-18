import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle, usePrefersReducedMotion } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

/** 100 requests, split by a cheap classifier -- click "route" to see
 * most traffic handled by a small, cheap model and only the genuinely
 * hard tail escalated to the expensive one. */
export default function ModelRoutingSavingsDiagram() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const cyc = useAutoCycle(2, 4000);
  const routed = cyc.value === 0;
  const color = getConceptColor(t, 'attention');
  const cheapColor = t.accentPrimary;
  const expensiveColor = t.accentWarn;

  const cheapPct = 80;
  const allExpensiveCost = 100 * 10;
  const routedCost = routed ? cheapPct * 1 + (100 - cheapPct) * 10 : allExpensiveCost;

  return (
    <VisualizationContainer footer={routed ? `${cheapPct} easy requests go to the small model, ${100 - cheapPct} genuinely complex ones escalate to the large model -- total relative cost drops to ${routedCost} vs. ${allExpensiveCost} sending everything to the large model.` : 'Every request -- easy or hard -- goes to the largest, most expensive model, regardless of whether the request actually needed that capability.'}>
      <button
        type="button"
        onClick={() => cyc.pick(routed ? 1 : 0)}
        style={{
          marginBottom: 10,
          padding: '6px 12px',
          borderRadius: 6,
          border: `1px solid ${color}`,
          background: routed ? `${color}15` : 'transparent',
          color,
          boxShadow: routed && !reducedMotion ? `0 0 6px ${color}33` : 'none',
          cursor: 'pointer',
          fontSize: 11.5,
          fontWeight: 700,
          transition: 'all 0.2s ease',
        }}
      >
        {routed ? 'Routed by difficulty' : 'Send everything to large model'}
      </button>
      <div style={{ display: 'flex', gap: 2, height: 28, borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>
        {routed ? (
          <>
            <div
              style={{
                width: `${cheapPct}%`,
                background: `${cheapColor}30`,
                border: `1px solid ${cheapColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: !reducedMotion ? `inset 0 0 8px ${cheapColor}22` : 'none',
                transition: 'width 0.3s ease',
              }}
            >
              <span style={{ fontSize: 9, fontWeight: 700, color: cheapColor }}>{cheapPct}% → small model</span>
            </div>
            <div
              style={{
                width: `${100 - cheapPct}%`,
                background: `${expensiveColor}30`,
                border: `1px solid ${expensiveColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'width 0.3s ease',
              }}
            >
              <span style={{ fontSize: 8, fontWeight: 700, color: expensiveColor }}>{100 - cheapPct}%</span>
            </div>
          </>
        ) : (
          <div
            style={{
              width: '100%',
              background: `${expensiveColor}30`,
              border: `1px solid ${expensiveColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
            }}
          >
            <span style={{ fontSize: 9, fontWeight: 700, color: expensiveColor }}>100% → large model</span>
          </div>
        )}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size + 1, fontWeight: 700, color }}>
        relative cost: {routedCost} (vs. {allExpensiveCost} sending all to the large model)
      </div>
    </VisualizationContainer>
  );
}