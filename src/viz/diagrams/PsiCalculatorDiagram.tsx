import { useState } from 'react';
import { useAutoCycle } from '../primitives';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const REFERENCE = [0.1, 0.25, 0.35, 0.2, 0.1]; // 5 bins, sums to 1
const SHIFTS = [0.03, 0.12, 0.22, 0.28];

/** Drag how much mass has shifted into the last bin -- watch PSI compute
 * live from the actual formula, crossing the real industry thresholds. */
export default function PsiCalculatorDiagram() {
  const t = useVizTokens();
  const { value: autoIdx, pick } = useAutoCycle(SHIFTS.length, 2500, 1);
  const [manualShift, setManualShift] = useState<number | null>(null);
  const shift = manualShift ?? SHIFTS[autoIdx];
  const refColor = getConceptColor(t, 'query');
  const curColor = getConceptColor(t, 'attention');

  // Move `shift` mass from bin 0 into bin 4, renormalized.
  const current = REFERENCE.map((v, i) => (i === 0 ? v - shift : i === 4 ? v + shift : v)).map((v) => Math.max(0.001, v));
  const total = current.reduce((a, b) => a + b, 0);
  const currentNorm = current.map((v) => v / total);

  const psi = REFERENCE.reduce((sum, ref, i) => {
    const cur = currentNorm[i];
    return sum + (cur - ref) * Math.log(cur / ref);
  }, 0);

  const zone = psi < 0.1 ? 'stable' : psi < 0.25 ? 'moderate drift' : 'significant drift';
  const zoneColor = psi < 0.1 ? t.accentPrimary : psi < 0.25 ? t.accentWarn : t.accentDanger;

  return (
    <VisualizationContainer footer={`PSI = ${psi.toFixed(3)} → ${zone}. PSI = Σ(current% − reference%) × ln(current%/reference%), summed across all 5 bins.`}>
      <Slider
        label={`Mass shifted from bin 1 into bin 5: ${(shift * 100).toFixed(0)}%`}
        min={0}
        max={0.3}
        step={0.01}
        value={shift}
        onChange={(v) => {
          setManualShift(v);
          const closest = SHIFTS.reduce((prev, curr) => Math.abs(curr - v) < Math.abs(prev - v) ? curr : prev);
          pick(SHIFTS.indexOf(closest));
        }}
      />
      <div style={{ display: 'flex', gap: 4, marginTop: 10, alignItems: 'flex-end', height: 90 }}>
        {REFERENCE.map((ref, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 2, height: '100%' }}>
            <div style={{ height: `${ref * 200}%`, background: refColor, opacity: 0.6, borderRadius: 2 }} />
            <div style={{ height: `${currentNorm[i] * 200}%`, background: curColor, opacity: 0.6, borderRadius: 2 }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 6, fontSize: DIAGRAM_TYPE.caption.size }}>
        <span style={{ color: refColor }}>■ reference (training)</span>
        <span style={{ color: curColor }}>■ current</span>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: zoneColor, fontWeight: 700, marginTop: 6 }}>
        {zone} (thresholds: &lt;0.1 stable, 0.1-0.25 moderate, &gt;0.25 significant)
      </div>
    </VisualizationContainer>
  );
}
