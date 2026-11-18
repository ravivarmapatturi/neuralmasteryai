import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';

const SHIFT_PRESETS = [10, 35, 65, 90];

export default function VisionDataShiftDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(SHIFT_PRESETS.length, 2800);
  const [userShift, setUserShift] = useState<number | null>(null);
  const shift = userShift ?? SHIFT_PRESETS[autoIdx];
  const match = 100 - shift;

  return (
    <VisualizationContainer footer={shift < 35 ? 'The deployment environment is well covered by the training data.' : shift < 65 ? 'Coverage is weakening: collect targeted examples and inspect failures by condition.' : 'The camera domain has shifted sharply; a great offline score is no longer evidence of reliable deployment.'}>
      <Slider label={`deployment shift = ${shift}%`} min={0} max={100} value={shift} onChange={setUserShift}/>
      <svg width="100%" viewBox="0 0 510 150" style={{ display: 'block', marginTop: 8 }}>
        <text x="25" y="25" fontSize="11" fill={t.textSecondary}>training images</text>
        <text x="25" y="91" fontSize="11" fill={t.textSecondary}>camera images</text>
        {['lighting','viewpoint','blur','background'].map((n, i) => (
          <g key={n}>
            <text x={120 + i * 92} y="20" fontSize="9" fill={t.textMuted}>{n}</text>
            <rect x={120 + i * 92} y="30" width="58" height="25" rx="4" fill={`${t.accentPrimary}${Math.round(match * 2.1).toString(16).padStart(2,'0')}`} />
            <rect x={120 + i * 92 + shift * .36} y="96" width="58" height="25" rx="4" fill={`${t.accentWarn}99`} />
            <line x1={149 + i * 92} y1={57} x2={149 + i * 92 + shift * .36} y2={94} stroke={t.textMuted} strokeDasharray="3 3"/>
          </g>
        ))}
        <text x="255" y="142" textAnchor="middle" fontSize="11" fill={shift > 50 ? t.accentDanger : t.textSecondary}>
          distribution overlap: {match}%
        </text>
      </svg>
    </VisualizationContainer>
  );
}
