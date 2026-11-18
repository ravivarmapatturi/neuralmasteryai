import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type Rankings = 'good' | 'poor';

const GRADES: Record<Rankings, number[]> = {
  good: [2, 1, 1, 0],
  poor: [0, 1, 1, 2],
};

const GRADE_LABEL = ['not relevant', 'somewhat relevant', 'somewhat relevant', 'highly relevant'];

function dcg(grades: number[]): number {
  return grades.reduce((sum, g, i) => sum + g / Math.log2(i + 2), 0);
}

/** Same 4 documents retrieved either way -- Recall@4 is identical (1.0)
 * for both orderings, but click between them to see NDCG penalize
 * burying the highly-relevant result at the bottom. */
export default function NdcgRankingDiagram() {
  const t = useVizTokens();
  const { value, pick } = useAutoCycle(2, 3500, 0);
  const ranking: Rankings = value === 0 ? 'good' : 'poor';
  const color = getConceptColor(t, 'attention');
  const grades = GRADES[ranking];
  const idealGrades = [...GRADES.good].sort((a, b) => b - a);
  const idcg = dcg(idealGrades);
  const score = dcg(grades);
  const ndcg = score / idcg;
  const gradeColor = (g: number) => (g === 2 ? t.accentPrimary : g === 1 ? t.accentWarn : t.textMuted);

  return (
    <VisualizationContainer footer={`Recall@4 = 4/4 = 1.00 for both orderings -- but NDCG = ${ndcg.toFixed(2)} here, because ${ranking === 'good' ? 'the highly-relevant result sits at rank 1' : 'the highly-relevant result is buried at rank 4'}.`}>
      <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
        {(['good', 'poor'] as Rankings[]).map((r, idx) => {
          const isActive = ranking === r;
          return (
            <div key={r} onClick={() => pick(idx)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(idx); } }} onMouseEnter={() => pick(idx)} style={{ cursor: 'pointer', padding: '0.5rem 0.8rem', borderRadius: 7, background: isActive ? `${color}20` : t.surfaceAlt, border: `1.5px solid ${isActive ? color : t.border}`, transition: 'all 200ms ease' }}>
              <span style={{ fontSize: 10.5, fontWeight: isActive ? 700 : 500, color: isActive ? color : t.textPrimary }}>{r === 'good' ? 'Highly-relevant ranked first (NDCG 1.0)' : 'Highly-relevant ranked last (Penalized ⚠)'}</span>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {grades.map((g, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ height: 40, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${gradeColor(g)}20`, border: `1.5px solid ${gradeColor(g)}`, transition: 'all 250ms ease' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: gradeColor(g) }}>{g}</span>
            </div>
            <div style={{ fontSize: 8, color: t.textMuted, marginTop: 3 }}>rank {i + 1}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 9.5, color: t.textSecondary, marginBottom: 8 }}>{GRADE_LABEL.map((_l, i) => `rank ${i + 1}: ${grades[i] === 2 ? 'highly relevant' : grades[i] === 1 ? 'somewhat relevant' : 'not relevant'}`).join(' · ')}</div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: DIAGRAM_TYPE.caption.size + 1 }}>
        <span style={{ color: t.textMuted }}>DCG = {score.toFixed(2)}</span>
        <span style={{ fontWeight: 700, color, transition: 'all 200ms ease' }}>NDCG = {ndcg.toFixed(2)}</span>
      </div>
    </VisualizationContainer>
  );
}
