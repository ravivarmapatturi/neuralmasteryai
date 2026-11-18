import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

// Representative real-world latencies (in CPU cycles) -- the actual
// orders-of-magnitude gaps that make cache-friendly access patterns matter.
const LEVELS = [
  { name: 'L1 cache', cycles: 4, size: '~32KB', desc: 'Sits directly on the CPU core: 4 cycles (~1ns). Instant access, but tiny (~32KB).' },
  { name: 'L2 cache', cycles: 12, size: '~256KB-1MB', desc: 'Per-core or paired cache: 12 cycles (~3ns). Holds recent hot working sets.' },
  { name: 'L3 cache', cycles: 40, size: '~8-32MB', desc: 'Shared across all cores on the socket: 40 cycles (~10ns). Last line of defense before main memory.' },
  { name: 'RAM', cycles: 200, size: 'GBs', desc: 'Main system memory: ~200 cycles (~50-80ns). ~50x slower than L1 -- cache misses stall instruction execution waiting on bus transfers.' },
];
const WIDTH = 460;
const HEIGHT = 170;
const PAD_L = 70;
const PAD_B = 30;

export default function CpuCacheLatencyDiagram() {
  const t = useVizTokens();
  const { value: activeIdx, pick: setActiveIdx, stop } = useAutoCycle(LEVELS.length, 2500, 0);
  const active = LEVELS[activeIdx];
  const color = getConceptColor(t, 'attention');
  const maxCycles = LEVELS[LEVELS.length - 1].cycles;
  const plotW = WIDTH - PAD_L - 20;
  const plotH = HEIGHT - PAD_B - 10;

  return (
    <VisualizationContainer footer={`${active.name} (${active.size}): ${active.cycles} cycles. ${active.desc}`}>
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="nm-fit-svg" style={{ display: 'block' }}>
        {LEVELS.map((l, i) => {
          const barH = (Math.log(l.cycles + 1) / Math.log(maxCycles + 1)) * plotW;
          const y = i * (plotH / LEVELS.length) + 6;
          const rowH = plotH / LEVELS.length - 8;
          const isSelected = i === activeIdx;
          return (
            <g key={l.name} onClick={() => { stop(); setActiveIdx(i); }} style={{ cursor: 'pointer' }}>
              <text x={PAD_L - 8} y={y + rowH / 2 + 4} textAnchor="end" fontSize={11} fontWeight={isSelected ? 700 : 400} fill={isSelected ? color : t.textSecondary}>{l.name}</text>
              <rect x={PAD_L} y={y} width={Math.max(2, barH)} height={rowH} fill={color} opacity={isSelected ? 0.9 : 0.4 + (i / LEVELS.length) * 0.4} stroke={isSelected ? t.accentPrimary : 'transparent'} strokeWidth={1.5} rx={3} />
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
