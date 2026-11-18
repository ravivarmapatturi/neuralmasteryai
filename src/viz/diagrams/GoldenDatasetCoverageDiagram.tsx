import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { generateProductionCloud, coverageFraction } from '../lib/evaluationFundamentals';

const PRODUCTION = generateProductionCloud(120, 4);
const RADIUS = 0.45;
const SIZES = [8, 16, 4, 28];

export default function GoldenDatasetCoverageDiagram() {
  const t = useVizTokens();
  const { value: sizeIdx, stop } = useAutoCycle(SIZES.length, 3000, 0);
  const [userSize, setUserSize] = useState<number | null>(null);
  const goldenSize = userSize ?? SIZES[sizeIdx];

  // Deterministic "which points got selected first" -- picking evenly
  // spaced indices so growing goldenSize is a real, stable expansion.
  const golden = useMemo(() => {
    const step = Math.max(1, Math.floor(PRODUCTION.length / goldenSize));
    return PRODUCTION.filter((_, i) => i % step === 0).slice(0, goldenSize);
  }, [goldenSize]);

  const coverage = useMemo(() => coverageFraction(PRODUCTION, golden, RADIUS), [golden]);

  const width = 320;
  const height = 320;
  const scale = 70;
  const cx = width / 2, cy = height / 2;
  const px = (x: number) => cx + x * scale;
  const py = (y: number) => cy - y * scale;

  const isCovered = (p: { x: number; y: number }) => golden.some((g) => Math.hypot(p.x - g.x, p.y - g.y) <= RADIUS);

  return (
    <VisualizationContainer footer={`${goldenSize} golden examples cover ${(coverage * 100).toFixed(0)}% of the real production-input cloud (within a real nearest-neighbor radius of ${RADIUS}). The uncovered points aren't random -- they're disproportionately the sparse tail, exactly the rare/edge cases a golden set built only from "typical" examples would miss.`}>
      <Slider
        label="golden dataset size"
        value={goldenSize}
        onChange={(v) => {
          stop();
          setUserSize(v);
        }}
        min={2}
        max={40}
        step={1}
      />

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8, maxWidth: 320, margin: '8px auto 0' }}>
        {golden.map((g, i) => (
          <circle key={`r${i}`} cx={px(g.x)} cy={py(g.y)} r={RADIUS * scale} fill={t.accentPrimary} fillOpacity={0.06} stroke="none" />
        ))}
        {PRODUCTION.map((p, i) => (
          <circle key={i} cx={px(p.x)} cy={py(p.y)} r={3.5} fill={isCovered(p) ? t.accentPrimary : t.accentDanger} fillOpacity={0.7} />
        ))}
        {golden.map((g, i) => (
          <circle key={`g${i}`} cx={px(g.x)} cy={py(g.y)} r={6} fill="none" stroke={t.accentPrimary} strokeWidth={2} />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        <span><span style={{ color: t.accentPrimary }}>○</span> golden example</span>
        <span><span style={{ color: t.accentPrimary }}>⬤</span> covered production input</span>
        <span><span style={{ color: t.accentDanger }}>⬤</span> uncovered</span>
      </div>
    </VisualizationContainer>
  );
}
