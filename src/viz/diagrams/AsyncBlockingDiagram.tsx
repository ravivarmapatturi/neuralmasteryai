import { useAutoCycle } from '../primitives';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type Mode = 'sync' | 'async';
const MODES: Mode[] = ['sync', 'async'];

/** Three requests arriving close together -- a blocking (sync def)
 * endpoint serves them strictly one at a time even while waiting on I/O;
 * an async endpoint interleaves the WAITING parts so all three finish
 * sooner. Toggle to compare timelines directly. */
export default function AsyncBlockingDiagram() {
  const t = useVizTokens();
  const { value: modeIdx, pick } = useAutoCycle(MODES.length, 3500, 1);
  const mode = MODES[modeIdx];
  const colors = [getConceptColor(t, 'query'), getConceptColor(t, 'attention'), t.accentWarn];

  const width = 560;
  const height = 130;
  const rowH = 26;
  const workMs = 20; // CPU work (feature lookup formatting etc) in px-units
  const ioMs = 40; // waiting on I/O (DB/feature-store call) in px-units
  const scale = 5;

  // sync: requests fully serialized (work+io each, back to back)
  // async: work is serialized (can't truly parallelize CPU), but IO overlaps
  const reqDuration = workMs + ioMs;

  return (
    <VisualizationContainer footer={mode === 'sync' ? 'Blocking (sync def): request 2 can\'t even START until request 1\'s I/O wait finishes -- one slow feature-store call stalls everyone behind it.' : 'Async (async def): while request 1 waits on I/O, the server starts request 2\'s work immediately -- all three finish sooner, same single process.'}>
      <PillSelect<Mode>
        label="Endpoint style"
        value={mode}
        onChange={(val) => {
          const next = typeof val === 'function' ? val(mode) : val;
          pick(MODES.indexOf(next));
        }}
        options={[{ value: 'sync', label: 'Blocking (sync def)' }, { value: 'async', label: 'Async (async def)' }]}
      />
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        {[0, 1, 2].map((i) => {
          const y = 15 + i * rowH;
          const color = colors[i];
          const startOffset = mode === 'sync' ? i * reqDuration * scale : i * workMs * scale;
          return (
            <g key={i}>
              <text x={4} y={y + 12} fontSize={8.5} fill={color}>req {i + 1}</text>
              <rect x={40 + startOffset} y={y} width={workMs * scale} height={16} fill={color} opacity={0.85} rx={2} />
              <rect x={40 + startOffset + workMs * scale} y={y} width={ioMs * scale} height={16} fill={color} opacity={0.25} stroke={color} strokeWidth={1} strokeDasharray="2 2" rx={2} />
            </g>
          );
        })}
        <text x={40} y={height - 8} fontSize={8} fill={t.textMuted}>solid = CPU work</text>
        <text x={140} y={height - 8} fontSize={8} fill={t.textMuted}>dashed = waiting on I/O</text>
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Same 3 requests, same single process -- async overlaps the I/O-wait time instead of spending it idle.
      </div>
    </VisualizationContainer>
  );
}
