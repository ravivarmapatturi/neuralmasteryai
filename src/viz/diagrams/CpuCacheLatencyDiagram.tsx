import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

// Representative real-world latencies (in CPU cycles) -- the actual
// orders-of-magnitude gaps that make cache-friendly access patterns matter.
const LEVELS = [
  { name: 'L1 cache', cycles: 4, size: '~32KB' },
  { name: 'L2 cache', cycles: 12, size: '~256KB-1MB' },
  { name: 'L3 cache', cycles: 40, size: '~8-32MB' },
  { name: 'RAM', cycles: 200, size: 'GBs' },
];
const WIDTH = 460;
const HEIGHT = 170;
const PAD_L = 70;
const PAD_B = 30;

export default function CpuCacheLatencyDiagram() {
  const t = useVizTokens();
  const color = getConceptColor(t, 'attention');
  const maxCycles = LEVELS[LEVELS.length - 1].cycles;
  const plotW = WIDTH - PAD_L - 20;
  const plotH = HEIGHT - PAD_B - 10;

  return (
    <VisualizationContainer footer="RAM access costs ~50x an L1 hit -- roughly the difference between one heartbeat and almost a minute, scaled to human time. Vectorized array operations are fast largely because they access memory sequentially (matching how a cache line loads a contiguous block at once), keeping the CPU fed from L1/L2 instead of stalling on a RAM round-trip for every single element the way an element-by-element Python loop over scattered objects does.">
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="nm-fit-svg" style={{ display: 'block' }}>
        {LEVELS.map((l, i) => {
          const barH = (Math.log(l.cycles + 1) / Math.log(maxCycles + 1)) * plotW;
          const y = i * (plotH / LEVELS.length) + 6;
          const rowH = plotH / LEVELS.length - 8;
          return (
            <g key={l.name}>
              <text x={PAD_L - 8} y={y + rowH / 2 + 4} textAnchor="end" fontSize={11} fill={t.textSecondary}>{l.name}</text>
              <rect x={PAD_L} y={y} width={Math.max(2, barH)} height={rowH} fill={color} opacity={0.4 + (i / LEVELS.length) * 0.5} rx={3} />
              <text x={PAD_L + barH + 8} y={y + rowH / 2 + 4} fontSize={11} fontFamily="monospace" fontWeight={700} fill={color}>{l.cycles} cycles</text>
            </g>
          );
        })}
      </svg>
      <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted }}>
        Bar length is log-scaled — RAM is genuinely ~{Math.round(LEVELS[3].cycles / LEVELS[0].cycles)}x slower than L1, not just visually longer.
      </div>
    </VisualizationContainer>
  );
}
