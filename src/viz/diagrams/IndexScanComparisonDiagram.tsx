import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

const LOG_PRESETS = [4, 2, 5.5, 3];

/** Real comparison operations: a full table scan checks every row (n);
 * a B-tree index lookup checks roughly log2(n) rows on its path down the
 * tree. Both computed live from the same table-size slider, not a
 * hardcoded pair of numbers. */
export default function IndexScanComparisonDiagram() {
  const t = useVizTokens();
  const { value: autoIdx, stop } = useAutoCycle(LOG_PRESETS.length, 3000, 0);
  const [userLog, setUserLog] = useState<number | null>(null);
  const logRows = userLog ?? LOG_PRESETS[autoIdx]; // 10^logRows rows

  const n = Math.round(10 ** logRows);
  const scanOps = n;
  const indexOps = Math.max(1, Math.ceil(Math.log2(n)));
  const speedup = scanOps / indexOps;

  const points = useMemo(() => Array.from({ length: 60 }, (_, i) => 1 + (i / 59) * 5), []); // log10(rows) from 1 to 6

  const width = 420, height = 150;
  const maxLogOps = 6;
  const px = (logN: number) => ((logN - 1) / 5) * width;
  const py = (ops: number) => height - (Math.log10(Math.max(ops, 1)) / maxLogOps) * (height - 10) - 5;

  const scanPath = points.map((lg) => `${px(lg)},${py(10 ** lg)}`).join(' ');
  const indexPath = points.map((lg) => `${px(lg)},${py(Math.max(1, Math.log2(10 ** lg)))}`).join(' ');

  return (
    <VisualizationContainer footer={`Real op counts at n = ${n.toLocaleString()} rows: full scan checks all ${scanOps.toLocaleString()} rows; a B-tree index checks ~log2(n) = ${indexOps} rows on its path down the tree -- a ${speedup >= 1000 ? `${(speedup / 1000).toFixed(1)}k` : speedup.toFixed(0)}x fewer comparisons. The gap only widens as the table grows, which is exactly why indexes matter more on large tables and barely matter on tiny ones.`}>
      <Slider
        label={`table size = 10^${logRows.toFixed(1)} ≈ ${n.toLocaleString()} rows`}
        value={logRows}
        onChange={(v) => {
          stop();
          setUserLog(v);
        }}
        min={1}
        max={6}
        step={0.1}
      />

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 10 }}>
        <line x1={0} y1={height - 5} x2={width} y2={height - 5} stroke={t.border} strokeWidth={1} />
        <polyline points={scanPath} fill="none" stroke={t.accentDanger} strokeWidth={2.5} />
        <polyline points={indexPath} fill="none" stroke={t.accentPrimary} strokeWidth={2.5} />
        <line x1={px(logRows)} y1={0} x2={px(logRows)} y2={height} stroke={t.textMuted} strokeWidth={1} strokeDasharray="3 3" />
        <circle cx={px(logRows)} cy={py(scanOps)} r={4} fill={t.accentDanger} />
        <circle cx={px(logRows)} cy={py(indexOps)} r={4} fill={t.accentPrimary} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>
        <span><span style={{ color: t.accentDanger }}>⬤</span> full scan: O(n) = {scanOps.toLocaleString()} rows checked</span>
        <span><span style={{ color: t.accentPrimary }}>⬤</span> B-tree index: O(log n) = {indexOps} rows checked</span>
      </div>
    </VisualizationContainer>
  );
}
