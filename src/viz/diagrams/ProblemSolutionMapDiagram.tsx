import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const PAIRS = [
  { problem: 'Training-serving skew', solution: 'Shared feature pipelines, feature stores' },
  { problem: 'Cold start', solution: 'Content-based fallback, exploration strategies' },
  { problem: 'Feedback loops biasing the model', solution: 'Randomized exploration, counterfactual evaluation' },
  { problem: 'Model staleness / concept drift', solution: 'Monitoring dashboards, scheduled retraining, online learning' },
  { problem: 'Scaling inference to millions of requests', solution: 'Caching, batching, model distillation, horizontal scaling' },
];

/** Every production ML system eventually hits one of these five problems --
 * click a problem to trace its wire to the SOTA fix, rather than reading
 * problem and solution as two halves of one bullet line. */
export default function ProblemSolutionMapDiagram() {
  const t = useVizTokens();
  const { value: active, pick, stop } = useAutoCycle(PAIRS.length, 2500, 0);
  const problemColor = t.accentDanger;
  const solutionColor = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer="Click a problem -- every one of these eventually shows up in a production ML system regardless of domain; the fix pattern is what's reusable.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {PAIRS.map((p, i) => {
          const isActive = active === i;
          return (
            <div
              key={p.problem}
              onClick={() => { stop(); pick(i); }}
              onMouseEnter={() => { stop(); pick(i); }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', opacity: isActive ? 1 : 0.55, transition: 'all 0.25s ease' }}
            >
              <div style={{ flex: '0 0 220px', padding: '6px 10px', borderRadius: 6, fontSize: 11, fontWeight: isActive ? 700 : 400, background: isActive ? `${problemColor}18` : t.surfaceAlt, border: `1.5px solid ${isActive ? problemColor : t.border}`, color: isActive ? problemColor : t.textSecondary }}>
                {p.problem}
              </div>
              <div style={{ flex: '0 0 24px', textAlign: 'center', color: isActive ? solutionColor : t.textMuted, fontSize: 14 }}>→</div>
              <div style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 11, fontWeight: isActive ? 700 : 400, background: isActive ? `${solutionColor}18` : t.surfaceAlt, border: `1.5px solid ${isActive ? solutionColor : t.border}`, color: isActive ? solutionColor : t.textSecondary }}>
                {p.solution}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 10 }}>
        {PAIRS.length} recurring failure modes, {PAIRS.length} SOTA fix patterns.
      </div>
    </VisualizationContainer>
  );
}
