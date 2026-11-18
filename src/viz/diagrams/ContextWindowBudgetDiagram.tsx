import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, PulseRect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const WINDOW_SIZE = 100; // in "units", not real tokens -- illustrative budget
const SEGMENTS = [
  { label: 'system prompt', size: 8, color: 'token' as const },
  { label: 'conversation so far', size: 40, color: 'query' as const },
  { label: 'retrieved documents', size: 30, color: 'value' as const },
  { label: 'tool results', size: 22, color: 'attention' as const },
];

/** The finite budget every agent loop is fighting: as more turns/tool
 * calls accumulate, the same 4 categories keep growing until they don't
 * fit -- drag the incoming amount and watch it overflow the window,
 * exactly the point where a real system needs an eviction/summarization
 * strategy instead of just appending forever. */
export default function ContextWindowBudgetDiagram() {
  const t = useVizTokens();
  const cyc = useAutoCycle(5, 2200, 0);
  const turns = cyc.value + 1;
  const setTurns = (val: number) => cyc.pick(val - 1);
  const scaledSegments = SEGMENTS.map((s) => ({ ...s, size: s.size * (0.4 + turns * 0.3) }));
  const total = scaledSegments.reduce((a, s) => a + s.size, 0);
  const overflow = total > WINDOW_SIZE;

  const width = 560;
  const barY = 50;
  const barH = 40;
  const barX = 20;
  const barW = width - 40;
  let cursor = 0;

  return (
    <VisualizationContainer footer={overflow ? 'Overflowing the window -- a real agent needs an explicit strategy here: summarize older turns, evict the least-relevant tool results, or offload to long-term memory (right).' : 'Still fits. Keep dragging turns forward and watch the same 4 categories outgrow the fixed window.'}>
      <Slider label={`conversation turns so far = ${turns}`} min={1} max={5} step={1} value={turns} onChange={setTurns} />
      <svg width="100%" viewBox={`0 0 ${width} 110`} style={{ display: 'block', marginTop: 8 }}>
        <rect x={barX} y={barY} width={barW} height={barH} rx={6} fill="none" stroke={t.textMuted} strokeWidth={1.5} strokeDasharray={overflow ? '4 3' : undefined} />
        {overflow && <PulseRect x={barX} y={barY} w={barW} h={barH} color={t.accentDanger} blink dur={1.6} />}
        <text x={barX} y={barY - 8} fontSize={9} fill={t.textMuted}>context window ({WINDOW_SIZE} units)</text>
        {scaledSegments.map((s) => {
          const color = getConceptColor(t, s.color);
          const w = Math.min(s.size, Math.max(0, WINDOW_SIZE - cursor)) / WINDOW_SIZE * barW;
          const x = barX + (cursor / WINDOW_SIZE) * barW;
          cursor += s.size;
          return w > 0 ? <rect key={s.label} x={x} y={barY} width={w} height={barH} fill={`${color}60`} stroke={color} strokeWidth={1} /> : null;
        })}
        {overflow && (
          <text x={barX + barW} y={barY + barH / 2 + 4} textAnchor="end" fontSize={10} fontWeight={700} fill={t.accentDanger}>
            +{(total - WINDOW_SIZE).toFixed(0)} over budget →
          </text>
        )}
      </svg>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4, fontSize: 9 }}>
        {SEGMENTS.map((s) => (
          <span key={s.label} style={{ color: getConceptColor(t, s.color) }}>● {s.label}</span>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: overflow ? t.accentDanger : t.textMuted, fontWeight: overflow ? 700 : 400, marginTop: 4 }}>
        {total.toFixed(0)} / {WINDOW_SIZE} units used
      </div>
    </VisualizationContainer>
  );
}
