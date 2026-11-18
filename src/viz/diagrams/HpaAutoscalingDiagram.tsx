import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

const LOAD_STEPS = [60, 180, 360, 540, 720];

/** Drag observed CPU load and watch HPA actually add/remove replicas to
 * keep average utilization near the target. */
export default function HpaAutoscalingDiagram() {
  const t = useVizTokens();
  const { value: stepIdx, pick } = useAutoCycle(LOAD_STEPS.length, 2500, 1);
  const loadPct = LOAD_STEPS[stepIdx];
  const color = getConceptColor(t, 'attention');
  const targetUtilPct = 60;
  const minReplicas = 2;
  const maxReplicas = 10;

  const desiredReplicas = Math.min(maxReplicas, Math.max(minReplicas, Math.ceil(loadPct / targetUtilPct)));

  return (
    <VisualizationContainer footer={`Target CPU utilization: ${targetUtilPct}%. Current load: ${loadPct}% (of one replica's capacity). HPA scales to ${desiredReplicas} replicas to bring average utilization back near target.`}>
      <Slider
        label={`Observed load: ${loadPct}%`}
        min={20}
        max={800}
        step={20}
        value={loadPct}
        onChange={(val) => {
          const closest = LOAD_STEPS.reduce((prev, curr, idx) => Math.abs(curr - val) < Math.abs(LOAD_STEPS[prev] - val) ? idx : prev, 0);
          pick(closest);
        }}
      />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
        {Array.from({ length: maxReplicas }, (_, i) => (
          <SketchBox key={i} color={i < desiredReplicas ? color : t.border} strokeWidth={1.5} style={{ width: 32, height: 32, opacity: i < desiredReplicas ? 1 : 0.3, transition: 'all 200ms ease' }}>
            <div style={{ width: 32, height: 32, background: i < desiredReplicas ? `${color}30` : 'none', transition: 'all 200ms ease' }} />
          </SketchBox>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color, fontWeight: 700, marginTop: 8 }}>
        {desiredReplicas} replicas ({minReplicas}-{maxReplicas} allowed range)
      </div>
    </VisualizationContainer>
  );
}
