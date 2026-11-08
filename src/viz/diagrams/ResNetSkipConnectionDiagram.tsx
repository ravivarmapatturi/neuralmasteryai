import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';

/** A plain block versus a residual block -- click to see why
 * y = F(x) + x lets a block default to the identity function when
 * added depth isn't helping, solving the degradation problem. */
export default function ResNetSkipConnectionDiagram() {
  const t = useVizTokens();
  const [residual, setResidual] = useState(true);
  const color = getConceptColor(t, 'attention');
  const okColor = t.accentPrimary;
  const badColor = t.accentDanger;

  return (
    <VisualizationContainer footer={residual ? 'If F(x) learns to output ~0, the block just passes x through unchanged -- depth can never make things WORSE than a shallower network, because every added block can fall back to identity.' : 'A plain block must learn a useful transformation to avoid hurting accuracy -- with enough stacked plain blocks, very deep plain networks get WORSE, not just harder to train (the degradation problem).'}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button type="button" onClick={() => setResidual(false)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: !residual ? 700 : 500, background: !residual ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${!residual ? color : t.border}`, color: !residual ? color : t.textSecondary, cursor: 'pointer' }}>
          Plain block
        </button>
        <button type="button" onClick={() => setResidual(true)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: residual ? 700 : 500, background: residual ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${residual ? color : t.border}`, color: residual ? color : t.textSecondary, cursor: 'pointer' }}>
          Residual block
        </button>
      </div>
      <svg width="100%" viewBox="0 0 300 100" style={{ display: 'block' }}>
        <defs>
          <marker id="rnarrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={t.textMuted} />
          </marker>
          <marker id="rnarrow-green" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={okColor} />
          </marker>
        </defs>

        {/* Input x */}
        <rect x={15} y={46} width={65} height={28} rx={6} fill={t.surfaceAlt} stroke={t.border} strokeWidth={1.5} />
        <text x={47.5} y={63} textAnchor="middle" fontSize={9} fontWeight={600} fill={t.textPrimary}>x (input)</text>

        {/* Arrow x -> F(x) */}
        <line x1={80} y1={60} x2={113} y2={60} stroke={t.textMuted} strokeWidth={1.5} markerEnd="url(#rnarrow)" />

        {/* F(x) transformation block */}
        <rect x={115} y={46} width={65} height={28} rx={6} fill={`${color}18`} stroke={color} strokeWidth={1.5} />
        <text x={147.5} y={63} textAnchor="middle" fontSize={9} fontWeight={700} fill={color}>F(x)</text>

        {/* Arrow F(x) -> output */}
        <line x1={180} y1={60} x2={213} y2={60} stroke={t.textMuted} strokeWidth={1.5} markerEnd="url(#rnarrow)" />

        {/* Residual skip connection */}
        {residual && (
          <g>
            <path d="M 47.5,46 C 47.5,18 253,18 253,38" fill="none" stroke={okColor} strokeWidth={1.5} markerEnd="url(#rnarrow-green)" />
            <rect x={110} y={9} width={80} height={14} rx={3} fill={t.surface} />
            <text x={150} y={19} textAnchor="middle" fontSize={8} fontWeight={600} fill={okColor}>shortcut (+ x)</text>
          </g>
        )}

        {/* Output block */}
        <rect x={215} y={42} width={75} height={36} rx={6} fill={residual ? `${okColor}18` : `${badColor}12`} stroke={residual ? okColor : badColor} strokeWidth={1.5} />
        <text x={252.5} y={64} textAnchor="middle" fontSize={9} fontWeight={700} fill={residual ? okColor : badColor}>
          {residual ? 'y = F(x) + x' : 'y = F(x)'}
        </text>
      </svg>
    </VisualizationContainer>
  );
}
