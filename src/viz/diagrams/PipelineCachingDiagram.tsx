import { useAutoCycle } from '../primitives';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const STAGES = ['Validation', 'Preprocessing', 'Feature Eng.', 'Training', 'Evaluation'];

/** Change the inputs to one stage and watch cache invalidation cascade
 * only from there forward -- earlier, unaffected stages stay cached. */
export default function PipelineCachingDiagram() {
  const t = useVizTokens();
  const { value: changedStage, pick } = useAutoCycle(STAGES.length, 2500, 2);
  const cachedColor = getConceptColor(t, 'attention');
  const rerunColor = t.accentWarn;

  return (
    <VisualizationContainer footer={`Inputs changed at "${STAGES[changedStage]}" -- everything before it is untouched and stays cached; everything from there forward reruns, since its inputs (directly or transitively) changed.`}>
      <div style={{ marginBottom: 10, fontSize: 11, color: t.textMuted }}>Click a stage to simulate its inputs changing:</div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {STAGES.map((s, i) => {
          const reruns = i >= changedStage;
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STAGES.length - 1 ? '1 1 0' : '0 0 auto' }}>
              <div onClick={() => pick(i)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(i); } }} style={{ flex: 1, cursor: 'pointer', padding: '0.6rem 0.4rem', borderRadius: 7, textAlign: 'center', background: reruns ? `${rerunColor}18` : `${cachedColor}18`, border: `1.5px solid ${reruns ? rerunColor : cachedColor}` }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: reruns ? rerunColor : cachedColor }}>{reruns ? 'rerun' : 'cached'}</div>
                <div style={{ fontSize: 8.5, color: t.textMuted, marginTop: 3 }}>{s}</div>
              </div>
              {i < STAGES.length - 1 && (
                <svg width="16" height="20" viewBox="0 0 16 20" style={{ flexShrink: 0 }}>
                  <line x1={0} y1={10} x2={10} y2={10} stroke={t.textMuted} strokeWidth={1.5} />
                  <path d="M 8,5 L 14,10 L 8,15 Z" fill={t.textMuted} />
                </svg>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        The same principle as a build system's incremental compilation, applied to a data pipeline.
      </div>
    </VisualizationContainer>
  );
}
