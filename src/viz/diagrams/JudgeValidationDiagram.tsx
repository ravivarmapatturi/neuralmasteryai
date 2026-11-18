import { useMemo } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { generateJudgeSamples, pearsonR } from '../lib/llmEval';

type RubricLevel = 'vague' | 'explicit';
const RUBRICS: RubricLevel[] = ['vague', 'explicit'];

export default function JudgeValidationDiagram() {
  const t = useVizTokens();
  const { value: rubricIdx, pick, stop } = useAutoCycle(RUBRICS.length, 3500, 0);
  const rubric = RUBRICS[rubricIdx];

  const samples = useMemo(() => generateJudgeSamples(40, 12, rubric === 'explicit' ? 0.85 : 0.35), [rubric]);
  const r = useMemo(() => pearsonR(samples.map((s) => s.human), samples.map((s) => s.judge)), [samples]);

  const width = 280;
  const height = 280;
  const scale = width / 10;
  const px = (v: number) => v * scale;
  const py = (v: number) => height - v * scale;

  return (
    <VisualizationContainer footer={`Real agreement between judge and human scores on the same 40 items: r=${r.toFixed(3)} with a "${rubric}" rubric. This is exactly the check "validate the judge against human judgments on a sample" means concretely -- if r is low, the judge's scores at scale aren't trustworthy yet, no matter how convenient it is to trust them.`}>
      <PillSelect
        label="Judge rubric"
        value={rubric}
        onChange={(v) => {
          const next = (typeof v === 'function' ? v(rubric) : v) as RubricLevel;
          const idx = RUBRICS.indexOf(next);
          if (idx >= 0) pick(idx);
          stop();
        }}
        options={[
          { value: 'vague', label: '"Rate this 1-10" (vague)' },
          { value: 'explicit', label: 'Explicit, example-anchored rubric' },
        ]}
      />

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8, maxWidth: 280, margin: '8px auto 0' }}>
        <line x1={0} y1={height} x2={width} y2={0} stroke={t.textMuted} strokeWidth={1} strokeDasharray="3 3" />
        {samples.map((s, i) => (
          <circle key={i} cx={px(s.human)} cy={py(s.judge)} r={4} fill={t.accentPrimary} fillOpacity={0.65} style={{ transition: 'all 0.3s ease' }} />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: t.textMuted, padding: '0 4px' }}>
        <span>human score →</span>
        <span>perfect agreement (dashed)</span>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        Same underlying items, same judge model -- only the rubric's specificity changed, and it real-measurably tightens the scatter toward the diagonal.
      </div>
    </VisualizationContainer>
  );
}
