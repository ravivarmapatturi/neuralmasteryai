import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider } from '../primitives';
import { getConceptColor } from './diagramSystem';

/** The "Earth Mover's" intuition made literal -- drag how far a single
 * mass has to move, watch Wasserstein distance track that movement
 * directly, even when the two distributions don't overlap at all (where
 * KL divergence would be undefined). */
export default function WassersteinDistanceDiagram() {
  const t = useVizTokens();
  const [gap, setGap] = useState(60);
  const refColor = getConceptColor(t, 'query');
  const curColor = getConceptColor(t, 'attention');
  const width = 480;

  const refX = 60;
  const curX = 60 + gap * 3.5;
  const startX = refX + 22;
  const endX = Math.max(startX + 16, curX - 22);
  const midX = (refX + curX) / 2;

  return (
    <VisualizationContainer footer={`Wasserstein distance ≈ ${gap} -- the minimum "work" (mass × distance moved) to reshape the reference pile into the current pile. Grows smoothly even here, where the piles don't overlap at all -- KL divergence would be undefined in this exact case.`}>
      <Slider label={`Distance between distributions: ${gap}`} min={0} max={100} step={2} value={gap} onChange={setGap} />
      <svg width="100%" viewBox={`0 0 ${width} 100`} style={{ display: 'block', marginTop: 10 }}>
        <defs>
          <marker id="wd-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.textMuted} />
          </marker>
        </defs>
        <line x1={20} y1={80} x2={width - 20} y2={80} stroke={t.border} strokeWidth={1} />
        <circle cx={refX} cy={80} r={22} fill={`${refColor}30`} stroke={refColor} strokeWidth={2} />
        <text x={refX} y={84} textAnchor="middle" fontSize={9} fill={refColor}>reference</text>
        {gap > 8 && (
          <path d={`M ${startX},${60} C ${midX},${32} ${midX},${32} ${endX},${60}`} fill="none" stroke={t.textMuted} strokeWidth={1.5} strokeDasharray="3 2" markerEnd="url(#wd-arrow)" />
        )}
        <circle cx={curX} cy={80} r={22} fill={`${curColor}30`} stroke={curColor} strokeWidth={2} />
        <text x={curX} y={84} textAnchor="middle" fontSize={9} fill={curColor}>current</text>
        {gap > 8 && (
          <text x={midX} y={18} textAnchor="middle" fontSize={8} fill={t.textMuted}>move this much mass, this far</text>
        )}
      </svg>
    </VisualizationContainer>
  );
}
