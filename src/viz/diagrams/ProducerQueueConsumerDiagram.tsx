import { useEffect, useRef, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, VizButton } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import { SketchArrow, SketchRect } from '../../components/notebook/RoughShape';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

const WIDTH = 560;
const HEIGHT = 160;
const MAX_VISIBLE_DEPTH = 40;
const MAX_DEPTH = 400;

/** Live, running simulation -- not a static illustration. Queue depth
 * genuinely accumulates when producerRate > consumerRate and drains
 * otherwise, exactly the mechanism that makes backpressure a real design
 * problem rather than an abstract concern. */
export default function ProducerQueueConsumerDiagram() {
  const t = useVizTokens();
  const [producerRate, setProducerRate] = useState(8);
  const [consumerRate, setConsumerRate] = useState(5);
  const [depth, setDepth] = useState(0);
  const [running, setRunning] = useState(true);
  const depthRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      depthRef.current = Math.max(0, Math.min(MAX_DEPTH, depthRef.current + (producerRate - consumerRate) * 0.3));
      setDepth(depthRef.current);
    }, 150);
    return () => clearInterval(id);
  }, [producerRate, consumerRate, running]);

  const reset = () => {
    depthRef.current = 0;
    setDepth(0);
  };

  const visibleChips = Math.min(MAX_VISIBLE_DEPTH, Math.round(depth));
  const overflowing = depth >= MAX_DEPTH * 0.95;
  const queueColor = getConceptColor(t, 'attention');
  const producerColor = getConceptColor(t, 'token');
  const consumerColor = t.accentSecondary;

  const chipCols = 10;
  const chipSize = 12;
  const chipGap = 2;
  const queueX = 190;
  const queueW = 220;

  return (
    <VisualizationContainer
      footer={
        overflowing
          ? 'The queue is growing unbounded -- the producer is outpacing the consumer with no limit in place. In a real system this means unbounded memory growth, then an out-of-memory crash, unless something applies backpressure: capping queue size and rejecting/blocking new producers, or auto-scaling consumers.'
          : producerRate > consumerRate
            ? 'Producer rate exceeds consumer rate -- the queue is buffering the difference right now. That buffer absorbs a temporary spike, but it is not free capacity: without a cap, this keeps growing for as long as the imbalance holds.'
            : 'Consumer rate keeps up with (or exceeds) the producer -- the queue stays shallow. This is the steady state every queue-backed system is designed to spend most of its time in.'
      }
    >
      <Slider label={`Producer rate: ${producerRate} msg/s`} value={producerRate} onChange={setProducerRate} min={0} max={20} />
      <Slider label={`Consumer rate: ${consumerRate} msg/s`} value={consumerRate} onChange={setConsumerRate} min={0} max={20} />
      <div style={{ marginBottom: 10 }}>
        <VizButton variant={running ? 'secondary' : 'primary'} onClick={() => setRunning((r) => !r)}>
          {running ? 'Pause' : 'Resume'}
        </VizButton>{' '}
        <VizButton variant="secondary" onClick={reset}>
          Reset
        </VizButton>
      </div>
      <svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ display: 'block' }}>
        <rect x={10} y={50} width={110} height={50} rx={8} fill={`${producerColor}22`} stroke="none" />
        <SketchRect x={10} y={50} width={110} height={50} color={producerColor} strokeWidth={1.5} id="pqc-producer" />
        <text x={65} y={80} textAnchor="middle" fontSize={12} fontWeight={700} fontFamily={HAND_FONT} fill={producerColor}>Producer</text>

        <rect x={queueX} y={30} width={queueW} height={90} rx={8} fill={t.surfaceAlt} stroke="none" />
        <SketchRect x={queueX} y={30} width={queueW} height={90} color={overflowing ? t.accentDanger : t.border} strokeWidth={overflowing ? 2 : 1.5} id="pqc-queue" />
        <text x={queueX + queueW / 2} y={22} textAnchor="middle" fontSize={12} fontWeight={700} fontFamily={HAND_FONT} fill={t.textSecondary}>Queue</text>
        {/* Live-updating queue chips stay plain rects (real-time simulation
            state redrawn every 150ms -- re-sketching each with rough.js on
            every tick would be both wasteful and visually jittery). */}
        {Array.from({ length: visibleChips }, (_, i) => {
          const col = i % chipCols;
          const row = Math.floor(i / chipCols);
          return (
            <rect
              key={i}
              x={queueX + 8 + col * (chipSize + chipGap)}
              y={38 + row * (chipSize + chipGap)}
              width={chipSize}
              height={chipSize}
              rx={2}
              fill={overflowing ? t.accentDanger : queueColor}
              opacity={0.85}
            />
          );
        })}
        <text x={queueX + queueW / 2} y={135} textAnchor="middle" fontSize={13} fontWeight={700} fontFamily="monospace" fill={overflowing ? t.accentDanger : t.textPrimary}>
          depth: {Math.round(depth)}{depth >= MAX_DEPTH ? '+' : ''}
        </text>

        <rect x={WIDTH - 130} y={50} width={110} height={50} rx={8} fill={`${consumerColor}22`} stroke="none" />
        <SketchRect x={WIDTH - 130} y={50} width={110} height={50} color={consumerColor} strokeWidth={1.5} id="pqc-consumer" />
        <text x={WIDTH - 75} y={80} textAnchor="middle" fontSize={12} fontWeight={700} fontFamily={HAND_FONT} fill={consumerColor}>Consumer</text>

        <SketchArrow points={[[120, 75], [queueX - 6, 75]]} color={producerColor} strokeWidth={2} id="pqc-arrow-p" />
        <SketchArrow points={[[queueX + queueW + 6, 75], [WIDTH - 130, 75]]} color={consumerColor} strokeWidth={2} id="pqc-arrow-c" />
      </svg>
      <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, textAlign: 'center' }}>
        Live simulation -- queue depth updates in real time from the two rates above.
      </div>
    </VisualizationContainer>
  );
}
