import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect, useAutoCycle } from '../primitives';

type PopulationKey = 'all' | 'eligible';
const POPULATIONS: PopulationKey[] = ['all', 'eligible'];

/** Calculated example: 10,000 attempts, including 500 rejected invalid inputs. */
export default function RequirementBoundaryExplorer() {
  const t = useVizTokens();
  const { value: popIdx, pick, stop } = useAutoCycle(POPULATIONS.length, 3500, 0);
  const population = POPULATIONS[popIdx];
  const denominator = population === 'all' ? 10000 : 9500;
  const successes = population === 'all' ? 9990 : 9490;

  return (
    <VisualizationContainer footer="In this illustrative population, 500 invalid requests were correctly rejected and 10 valid requests failed. Counting correct rejections as completed requests yields 99.90%, while valid-action success is 9,490/9,500 = 99.895%.">
      <VisualizationHeader title="Which promise does the percentage measure?" description="Choose the denominator before deciding whether a 99.9% objective was met." />
      <PillSelect<PopulationKey>
        label="Measurement population"
        value={population}
        onChange={(val) => {
          const next = typeof val === 'function' ? val(population) : val;
          const idx = POPULATIONS.indexOf(next);
          if (idx >= 0) pick(idx);
          stop();
        }}
        options={[
          { value: 'all', label: 'All attempts' },
          { value: 'eligible', label: 'Valid actions' },
        ]}
      />
      <svg viewBox="0 0 300 180" width="100%" role="img" aria-label={`${successes} successful outcomes out of ${denominator}; ${((100 * successes) / denominator).toFixed(3)} percent`}>
        <text x={8} y={20} fill={t.textPrimary} fontSize={14}>10,000 incoming attempts</text>
        {[
          ['Valid success', 9490],
          ['Correct rejection', 500],
          ['Valid failure', 10],
        ].map(([label, count], i) => (
          <g key={label}>
            <text x={8} y={50 + i * 45} fill={t.textPrimary} fontSize={13}>{label}: {count}</text>
            <rect x={8} y={58 + i * 45} width={(Number(count) / 10000) * 280} height={12} fill={i === 2 ? t.border : t.accentPrimary} />
          </g>
        ))}
      </svg>
      <p role="status">
        {successes}/{denominator} = {((100 * successes) / denominator).toFixed(3)}% · {successes / denominator >= 0.999 ? 'Meets' : 'Misses'} 99.9% objective
      </p>
    </VisualizationContainer>
  );
}
