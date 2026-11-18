import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle, usePrefersReducedMotion } from '../primitives';
import { FlowDots, line } from '../primitives/LiveFlow';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type Trigger = 'schedule' | 'drift';

/** Two ways a retrain can trigger, but the SAME gate afterward -- click
 * either trigger to see it feeds into the identical promote-only-if-
 * better check. */
export default function AutomatedRetrainLoopDiagram() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const cyc = useAutoCycle(2, 4000);
  const trigger: Trigger = cyc.value === 0 ? 'drift' : 'schedule';
  const color = getConceptColor(t, 'attention');
  const width = 560;

  return (
    <VisualizationContainer footer={trigger === 'schedule' ? 'Scheduled retrain: e.g. nightly, regardless of whether anything actually changed -- simple, but can retrain unnecessarily.' : 'Drift-triggered retrain: only when incoming data has measurably moved from what the model was trained on -- retrains exactly when there\'s a real reason to.'}>
      <PillSelect<Trigger>
        label="Trigger"
        value={trigger}
        onChange={(v) => cyc.pick(v === 'drift' ? 0 : 1)}
        options={[{ value: 'schedule', label: 'Scheduled' }, { value: 'drift', label: 'Drift threshold' }]}
      />
      <svg width="100%" viewBox={`0 0 ${width} 90`} style={{ display: 'block', marginTop: 10 }}>
        <defs>
          <marker id="arl-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.textMuted} />
          </marker>
        </defs>
        <rect x={20} y={27} width={110} height={36} rx={8} fill={`${color}25`} stroke={color} strokeWidth={2} />
        <text x={75} y={49} textAnchor="middle" fontSize={9} fontWeight={700} fill={color}>{trigger === 'schedule' ? 'Nightly cron' : 'Drift > threshold'}</text>
        <line x1={130} y1={45} x2={175} y2={45} stroke={t.textMuted} strokeWidth={1.5} markerEnd="url(#arl-arrow)" />
        {!reducedMotion && (
          <FlowDots d={line(130, 45, 175, 45)} color={color} count={1} dur={1.6} r={2.5} />
        )}
        <rect x={175} y={27} width={100} height={36} rx={8} fill={t.surfaceAlt} stroke={t.textMuted} strokeWidth={1.5} />
        <text x={225} y={49} textAnchor="middle" fontSize={9} fill={t.textMuted}>Retrain</text>
        <line x1={275} y1={45} x2={320} y2={45} stroke={t.textMuted} strokeWidth={1.5} markerEnd="url(#arl-arrow)" />
        {!reducedMotion && (
          <FlowDots d={line(275, 45, 320, 45)} color={t.accentPrimary} count={1} dur={1.6} r={2.5} />
        )}
        <rect x={320} y={27} width={110} height={36} rx={8} fill={t.surfaceAlt} stroke={t.accentPrimary} strokeWidth={1.5} />
        <text x={375} y={49} textAnchor="middle" fontSize={9} fill={t.accentPrimary}>Beats prod?</text>
        <line x1={430} y1={45} x2={475} y2={45} stroke={t.textMuted} strokeWidth={1.5} markerEnd="url(#arl-arrow)" />
        {!reducedMotion && (
          <FlowDots d={line(430, 45, 475, 45)} color={t.accentPrimary} count={1} dur={1.6} r={2.5} />
        )}
        <text x={480} y={49} fontSize={9} fill={t.accentPrimary} fontWeight={700}>promote</text>
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Whichever trigger fires, the SAME regression gate decides whether the new model actually ships -- closing the loop from orchestration into something that runs itself.
      </div>
    </VisualizationContainer>
  );
}