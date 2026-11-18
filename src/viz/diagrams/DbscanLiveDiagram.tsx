import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { generateDbscanPoints, runDbscan } from '../lib/clustering';

const POINTS = generateDbscanPoints(6);
const CLUSTER_COLORS = ['accentPrimary', 'accentSecondary', 'accentWarn'] as const;

export default function DbscanLiveDiagram() {
  const t = useVizTokens();
  const epsCycle = useAutoCycle(27, 240, 10);
  const eps = 0.2 + epsCycle.value * 0.05;
  const [minSamples, setMinSamples] = useState(4);

  const labels = useMemo(() => runDbscan(POINTS, eps, minSamples), [eps, minSamples]);
  const nClusters = new Set(labels.filter((l) => l.cluster !== null).map((l) => l.cluster)).size;
  const nNoise = labels.filter((l) => l.role === 'noise').length;

  const width = 320, height = 260, scale = 42, ox = width / 2, oy = height / 2;
  const px = (x: number) => ox + x * scale;
  const py = (y: number) => oy - y * scale;

  return (
    <VisualizationContainer footer={`Real DBSCAN, run live on ${POINTS.length} real points: at ε=${eps.toFixed(2)}, min_samples=${minSamples} → ${nClusters} real cluster(s) found, ${nNoise} points labeled noise. Core points (filled) have ≥${minSamples} real neighbors within ε; border points (ring) don't qualify themselves but sit within ε of a core point; noise (×) qualifies for neither.`}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Slider label="ε (radius)" value={eps} onChange={(value) => epsCycle.pick(Math.round((value - 0.2) / 0.05))} min={0.2} max={1.5} step={0.05} />
        <Slider label="min_samples" value={minSamples} onChange={(value) => { epsCycle.stop(); setMinSamples(value); }} min={2} max={10} step={1} />
      </div>

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8, maxWidth: 320, margin: '8px auto 0' }}>
        <circle cx={px(POINTS[0].x)} cy={py(POINTS[0].y)} r={eps * scale} fill="none" stroke={t.accentPrimary} strokeWidth={1.5} strokeDasharray="5 4" opacity={0.55} aria-hidden />
        {POINTS.map((p, i) => {
          const label = labels[i];
          const color = label.cluster !== null ? t[CLUSTER_COLORS[label.cluster % CLUSTER_COLORS.length]] : t.textMuted;
          if (label.role === 'noise') {
            return <text key={i} x={px(p.x)} y={py(p.y) + 4} textAnchor="middle" fontSize={13} fill={t.textMuted}>×</text>;
          }
          return (
            <circle key={i} cx={px(p.x)} cy={py(p.y)} r={5} fill={label.role === 'core' ? color : 'none'} stroke={color} strokeWidth={label.role === 'border' ? 2 : 1} fillOpacity={0.85} />
          );
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>
        Push ε up to merge the two dense blobs into one cluster; push min_samples up to watch the sparser edges of each blob get demoted from core to border to noise.
      </div>
    </VisualizationContainer>
  );
}
