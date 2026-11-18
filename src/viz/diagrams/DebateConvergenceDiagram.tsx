import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { simulateDebate } from '../lib/oversight';

const SEED_PRESETS = [11, 23, 37, 5, 42];

export default function DebateConvergenceDiagram() {
  const t = useVizTokens();
  const { value: seedIdx, stop } = useAutoCycle(SEED_PRESETS.length, 3500, 0);
  const [userSeed, setUserSeed] = useState<number | null>(null);
  const seed = userSeed ?? SEED_PRESETS[seedIdx];
  const rounds = useMemo(() => simulateDebate(6, seed), [seed]);
  const final = rounds[rounds.length - 1];

  const width = 420;
  const height = 180;
  const px = (r: number) => ((r - 1) / (rounds.length - 1)) * width;
  const py = (v: number) => height - v * height;

  return (
    <VisualizationContainer footer={`Judge never independently verifies the underlying claim -- it only ever compares each round's argument strength. Because the correct side genuinely has stronger evidence available on average (not guaranteed every single round, real noise included), the judge's real confidence in the correct answer reaches ${(final.judgeConfidence * 100).toFixed(1)}% after ${rounds.length} rounds.`}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <line x1={0} y1={py(0.5)} x2={width} y2={py(0.5)} stroke={t.textMuted} strokeWidth={1} strokeDasharray="3 3" />
        <text x={4} y={py(0.5) - 4} fontSize={10} fill={t.textMuted}>undecided (50%)</text>
        <polyline points={rounds.map((r) => `${px(r.round)},${py(r.judgeConfidence)}`).join(' ')} fill="none" stroke={t.accentPrimary} strokeWidth={2.5} />
        {rounds.map((r) => (
          <circle key={r.round} cx={px(r.round)} cy={py(r.judgeConfidence)} r={4} fill={t.accentPrimary} />
        ))}
      </svg>

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        {rounds.map((r) => (
          <div key={r.round} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: t.textMuted }}>round {r.round}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
              <div style={{ height: r.proStrength * 40, background: t.accentDanger, opacity: 0.6, borderRadius: 2 }} title={`pro (wrong side): ${r.proStrength.toFixed(2)}`} />
              <div style={{ height: r.conStrength * 40, background: t.accentPrimary, opacity: 0.8, borderRadius: 2 }} title={`con (correct side): ${r.conStrength.toFixed(2)}`} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 6 }}>
        <span><span style={{ color: t.accentDanger }}>⬤</span> pro (incorrect side)'s argument strength</span>
        <span><span style={{ color: t.accentPrimary }}>⬤</span> con (correct side)'s argument strength</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
        <VizButton onClick={() => { stop(); setUserSeed((s) => (s ?? seed) + 1); }}>Re-run debate</VizButton>
      </div>
    </VisualizationContainer>
  );
}
