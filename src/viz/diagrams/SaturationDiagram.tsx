import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { generationScores, stddev } from '../lib/evaluationFundamentals';

const N_GENERATIONS = 5;
const SEEDS = [1, 2, 3, 4];

export default function SaturationDiagram() {
  const t = useVizTokens();
  const { value: seedIdx, stop } = useAutoCycle(SEEDS.length, 3000, 0);
  const [userSeed, setUserSeed] = useState<number | null>(null);
  const seed = userSeed ?? SEEDS[seedIdx];

  const generations = useMemo(
    () => Array.from({ length: N_GENERATIONS }, (_, i) => generationScores(i, seed)),
    [seed],
  );

  const width = 460;
  const height = 200;
  const px = (gen: number) => 40 + (gen / (N_GENERATIONS - 1)) * (width - 80);
  const py = (v: number) => height - 20 - v * (height - 40);

  return (
    <VisualizationContainer footer={`Each dot is one real model's score within its generation; spread (stddev) is the benchmark's real discriminative power at that generation. Gen 1 spread = ${stddev(generations[0]).toFixed(3)}; Gen ${N_GENERATIONS} spread = ${stddev(generations[N_GENERATIONS - 1]).toFixed(3)} -- as scores cluster near the ceiling, the benchmark loses real, measurable ability to tell models apart, even though every score is still technically valid.`}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <line x1={40} y1={py(1)} x2={width - 40} y2={py(1)} stroke={t.textMuted} strokeWidth={1} strokeDasharray="3 3" />
        <text x={width - 40} y={py(1) - 4} textAnchor="end" fontSize={10} fill={t.textMuted}>ceiling</text>

        {generations.map((gen, gi) => (
          <g key={gi}>
            {gen.map((score, i) => (
              <circle key={i} cx={px(gi) + (i - gen.length / 2) * 4} cy={py(score)} r={4} fill={t.accentPrimary} fillOpacity={0.75} style={{ transition: 'cy 0.4s ease' }} />
            ))}
            <text x={px(gi)} y={height - 4} textAnchor="middle" fontSize={10} fill={t.textMuted}>gen {gi + 1}</text>
            <text x={px(gi)} y={16} textAnchor="middle" fontSize={9} fill={t.textSecondary}>spread {stddev(gen).toFixed(3)}</text>
          </g>
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
        <VizButton onClick={() => { stop(); setUserSeed(seed + 1); }}>Re-sample generations</VizButton>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Benchmark saturation is why new, harder benchmarks keep replacing old ones as a field matures -- not fashion, a real measurement-validity problem visible in this shrinking spread.
      </div>
    </VisualizationContainer>
  );
}
