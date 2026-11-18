import { useAutoCycle } from '../primitives';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';

/** Incoming request volume exceeding capacity, with and without
 * backpressure -- click to see a system that silently accepts
 * everything degrade catastrophically, versus one that rejects/queues
 * predictably. */
export default function BackpressureQueueDiagram() {
  const t = useVizTokens();
  const { value: modeIdx, pick } = useAutoCycle(2, 3500, 1);
  const hasBackpressure = modeIdx === 1;
  const color = getConceptColor(t, 'attention');
  const badColor = t.accentDanger;
  const okColor = t.accentPrimary;
  const warnColor = t.accentWarn;

  const capacity = 5;
  const incoming = 9;
  const rejected = hasBackpressure ? incoming - capacity : 0;

  return (
    <VisualizationContainer footer={hasBackpressure ? `${capacity} requests served normally, ${rejected} explicitly rejected/queued -- some requests fail, but the system stays up and responsive. A predictable, bounded bad outcome.` : `All ${incoming} requests silently accepted despite only ${capacity} capacity -- every request now waits longer, queues grow unbounded, and the service risks crashing entirely under continued load.`}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <button type="button" onClick={() => pick(0)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: !hasBackpressure ? 700 : 500, background: !hasBackpressure ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${!hasBackpressure ? color : t.border}`, color: !hasBackpressure ? color : t.textSecondary, cursor: 'pointer' }}>
          No backpressure
        </button>
        <button type="button" onClick={() => pick(1)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: hasBackpressure ? 700 : 500, background: hasBackpressure ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${hasBackpressure ? color : t.border}`, color: hasBackpressure ? color : t.textSecondary, cursor: 'pointer' }}>
          Backpressure
        </button>
      </div>
      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {Array.from({ length: incoming }).map((_, i) => {
          const isRejected = hasBackpressure && i >= capacity;
          return (
            <div key={i} style={{ width: 32, height: 32, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isRejected ? `${warnColor}18` : `${okColor}18`, border: `1.5px solid ${isRejected ? warnColor : okColor}` }}>
              <span style={{ fontSize: 8, fontWeight: 700, color: isRejected ? warnColor : okColor }}>{isRejected ? 'queued' : 'ok'}</span>
            </div>
          );
        })}
      </div>
      {!hasBackpressure && (
        <div style={{ marginTop: 8, textAlign: 'center', fontSize: 9.5, fontWeight: 700, color: badColor }}>
          capacity: {capacity} — every one of these {incoming} requests waits longer than it should
        </div>
      )}
    </VisualizationContainer>
  );
}
