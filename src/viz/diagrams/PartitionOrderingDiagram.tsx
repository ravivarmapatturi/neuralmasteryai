import { useAutoCycle } from '../primitives';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type KeyMode = 'random' | 'byUser';
const MODES: KeyMode[] = ['random', 'byUser'];

// Each event: (id, user). Producer emits them in this exact order.
const EVENTS = [
  { id: 1, user: 'A' },
  { id: 2, user: 'B' },
  { id: 3, user: 'A' },
  { id: 4, user: 'C' },
  { id: 5, user: 'B' },
  { id: 6, user: 'A' },
];
const USER_COLORS: Record<string, 'query' | 'key' | 'value'> = { A: 'query', B: 'key', C: 'value' };

function partitionFor(user: string, mode: KeyMode, id: number): number {
  if (mode === 'random') return id % 3;
  const idx = { A: 0, B: 1, C: 2 }[user] ?? 0;
  return idx;
}

const WIDTH = 560;
const PART_H = 40;
const PAD_TOP = 30;

export default function PartitionOrderingDiagram() {
  const t = useVizTokens();
  const { value: modeIdx, pick } = useAutoCycle(MODES.length, 3500, 1);
  const mode = MODES[modeIdx];

  const partitions: { id: number; user: string }[][] = [[], [], []];
  for (const e of EVENTS) {
    partitions[partitionFor(e.user, mode, e.id)].push(e);
  }

  const chip = (e: { id: number; user: string }, x: number, y: number) => (
    <g key={e.id}>
      <rect x={x} y={y} width={30} height={24} rx={4} fill={`${getConceptColor(t, USER_COLORS[e.user])}33`} stroke={getConceptColor(t, USER_COLORS[e.user])} strokeWidth={1.5} />
      <text x={x + 15} y={y + 16} textAnchor="middle" fontSize={11} fontFamily="monospace" fontWeight={700} fill={getConceptColor(t, USER_COLORS[e.user])}>
        {e.id}{e.user}
      </text>
    </g>
  );

  return (
    <VisualizationContainer
      footer={
        mode === 'random'
          ? "With no partition key, Kafka spreads messages round-robin -- great for throughput, but user A's events (1, 3, 6) land in different partitions and can be consumed out of order relative to each other, since each partition is only internally ordered."
          : "Keying by user ID routes every event for the same user to the same partition -- now user A's events (1, 3, 6) are guaranteed to stay in that exact order within their partition, at the cost of that partition becoming a bottleneck if one key is much hotter than the others."
      }
    >
      <PillSelect<KeyMode>
        label="Partition assignment"
        value={mode}
        onChange={(val) => {
          const next = typeof val === 'function' ? val(mode) : val;
          pick(MODES.indexOf(next));
        }}
        options={[
          { value: 'random', label: 'No key (round-robin)' },
          { value: 'byUser', label: 'Keyed by user ID' },
        ]}
      />
      <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, margin: '8px 0 4px' }}>
        Producer emits, in order: {EVENTS.map((e) => `${e.id}${e.user}`).join(' → ')}
      </div>
      <svg width="100%" viewBox={`0 0 ${WIDTH} ${PAD_TOP + PART_H * 3 + 10}`} style={{ display: 'block' }}>
        {partitions.map((events, pi) => (
          <g key={pi}>
            <text x={0} y={PAD_TOP + pi * PART_H + 17} fontSize={11} fontWeight={700} fill={t.textMuted}>
              P{pi}
            </text>
            <rect x={40} y={PAD_TOP + pi * PART_H} width={WIDTH - 50} height={28} rx={6} fill={t.surfaceAlt} stroke={t.border} strokeWidth={1} />
            {events.map((e, ei) => chip(e, 48 + ei * 36, PAD_TOP + pi * PART_H + 2))}
          </g>
        ))}
      </svg>
    </VisualizationContainer>
  );
}
