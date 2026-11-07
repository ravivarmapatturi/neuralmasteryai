import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const CPU_MS = 15; // time spent actually computing, per request
const IO_MS = 80; // time spent waiting on a downstream call, per request

const WIDTH = 460;
const ROW_H = 20;
const PAD_L = 20;

export default function AsyncEventLoopDiagram() {
  const t = useVizTokens();
  const [n, setN] = useState(4);

  const cpuColor = getConceptColor(t, 'attention');
  const waitColor = t.textMuted;

  const syncTotal = n * (CPU_MS + IO_MS);
  const asyncTotal = n * CPU_MS + IO_MS;
  const scale = (WIDTH - PAD_L - 10) / syncTotal;

  const syncRows = Array.from({ length: n }, (_, i) => ({
    cpuStart: i * (CPU_MS + IO_MS),
    cpuEnd: i * (CPU_MS + IO_MS) + CPU_MS,
    waitEnd: (i + 1) * (CPU_MS + IO_MS),
  }));
  const asyncRows = Array.from({ length: n }, (_, i) => ({
    cpuStart: i * CPU_MS,
    cpuEnd: (i + 1) * CPU_MS,
    waitEnd: (i + 1) * CPU_MS + IO_MS,
  }));

  const gantt = (rows: typeof syncRows, label: string) => (
    <div>
      <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, margin: '8px 0 2px' }}>{label}</div>
      <svg width={WIDTH} height={n * ROW_H + 8} viewBox={`0 0 ${WIDTH} ${n * ROW_H + 8}`} className="nm-fit-svg">
        {rows.map((r, i) => (
          <g key={i}>
            <rect x={PAD_L + r.cpuStart * scale} y={i * ROW_H} width={(r.cpuEnd - r.cpuStart) * scale} height={ROW_H - 3} fill={cpuColor} />
            <rect x={PAD_L + r.cpuEnd * scale} y={i * ROW_H} width={(r.waitEnd - r.cpuEnd) * scale} height={ROW_H - 3} fill={`${waitColor}55`} />
            <text x={2} y={i * ROW_H + ROW_H / 2} fontSize={9} fill={t.textMuted}>r{i}</text>
          </g>
        ))}
      </svg>
    </div>
  );

  return (
    <VisualizationContainer
      footer={`${n} concurrent requests, each ${CPU_MS}ms of real work + ${IO_MS}ms waiting on a downstream call. Sync (blocking): ${syncTotal}ms total -- every request's wait blocks the next one from even starting. Async (event loop): ${asyncTotal}ms total -- the event loop runs each request's quick CPU portion back-to-back, then all their I/O waits overlap in the background. The gap between these two numbers only grows as concurrency (n) increases.`}
    >
      <Slider label="Concurrent requests" value={n} onChange={setN} min={1} max={8} format={(v) => `${v}`} />
      {gantt(syncRows, `Sync (blocking): ${syncTotal}ms total`)}
      {gantt(asyncRows, `Async (event loop): ${asyncTotal}ms total`)}
      <div style={{ display: 'flex', gap: 16, fontSize: DIAGRAM_TYPE.secondaryLabel.size, marginTop: 6 }}>
        <span style={{ color: cpuColor }}>■ CPU work</span>
        <span style={{ color: t.textMuted }}>■ waiting on I/O</span>
      </div>
    </VisualizationContainer>
  );
}
