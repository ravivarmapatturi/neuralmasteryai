import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type Mode = 'p2p' | 'pubsub';
const MESSAGES = [1, 2, 3, 4];

const WIDTH = 560;
const HEIGHT = 190;

export default function PubSubVsPointToPointDiagram() {
  const t = useVizTokens();
  const [mode, setMode] = useState<Mode>('p2p');

  const producerColor = getConceptColor(t, 'token');
  const aColor = getConceptColor(t, 'attention');
  const bColor = t.accentSecondary;

  // p2p: messages are load-balanced, each consumer gets a disjoint subset (competing consumers).
  // pubsub: every subscriber gets every message (fan-out).
  const aMessages = mode === 'p2p' ? MESSAGES.filter((m) => m % 2 === 1) : MESSAGES;
  const bMessages = mode === 'p2p' ? MESSAGES.filter((m) => m % 2 === 0) : MESSAGES;

  return (
    <VisualizationContainer
      footer={
        mode === 'p2p'
          ? 'Point-to-point (a queue with competing consumers): each message is delivered to exactly one consumer instance -- this is how you scale out processing of one logical stream of work across a worker pool, e.g. Celery workers pulling from the same task queue.'
          : 'Pub/sub (a topic with independent subscribers): every message is delivered to every subscriber, independently -- this is how one event (e.g. "order placed") fans out to multiple unrelated systems -- fraud check, email receipt, analytics -- each consuming the same stream for a different purpose.'
      }
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <VizButton variant={mode === 'p2p' ? 'primary' : 'secondary'} onClick={() => setMode('p2p')}>
          Point-to-Point (Queue)
        </VizButton>
        <VizButton variant={mode === 'pubsub' ? 'primary' : 'secondary'} onClick={() => setMode('pubsub')}>
          Pub/Sub (Topic)
        </VizButton>
      </div>
      <svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ display: 'block' }}>
        <rect x={10} y={80} width={100} height={40} rx={8} fill={`${producerColor}22`} stroke={producerColor} strokeWidth={1.5} />
        <text x={60} y={104} textAnchor="middle" fontSize={12} fontWeight={700} fill={producerColor}>Producer</text>

        <rect x={150} y={60} width={90} height={80} rx={8} fill={t.surfaceAlt} stroke={t.border} strokeWidth={1.5} />
        <text x={195} y={52} textAnchor="middle" fontSize={11} fontWeight={700} fill={t.textSecondary}>
          {mode === 'p2p' ? 'Queue' : 'Topic'}
        </text>
        {MESSAGES.map((m, i) => (
          <rect key={m} x={165 + (i % 2) * 30} y={72 + Math.floor(i / 2) * 30} width={22} height={22} rx={3} fill={t.textMuted} opacity={0.7} />
        ))}

        <rect x={330} y={30} width={110} height={44} rx={8} fill={`${aColor}22`} stroke={aColor} strokeWidth={1.5} />
        <text x={385} y={56} textAnchor="middle" fontSize={12} fontWeight={700} fill={aColor}>Consumer A</text>
        {aMessages.map((m, i) => (
          <rect key={m} x={450 + i * 24} y={38} width={20} height={20} rx={3} fill={aColor} />
        ))}

        <rect x={330} y={130} width={110} height={44} rx={8} fill={`${bColor}22`} stroke={bColor} strokeWidth={1.5} />
        <text x={385} y={156} textAnchor="middle" fontSize={12} fontWeight={700} fill={bColor}>Consumer B</text>
        {bMessages.map((m, i) => (
          <rect key={m} x={450 + i * 24} y={138} width={20} height={20} rx={3} fill={bColor} />
        ))}

        <line x1={110} y1={100} x2={143} y2={100} stroke={producerColor} strokeWidth={2} markerEnd="url(#p2p-arrow)" />
        <line x1={240} y1={80} x2={323} y2={56} stroke={aColor} strokeWidth={2} markerEnd="url(#p2p-arrow-a)" />
        <line x1={240} y1={120} x2={323} y2={149} stroke={bColor} strokeWidth={2} markerEnd="url(#p2p-arrow-b)" />
        <defs>
          <marker id="p2p-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill={producerColor} /></marker>
          <marker id="p2p-arrow-a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill={aColor} /></marker>
          <marker id="p2p-arrow-b" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill={bColor} /></marker>
        </defs>
      </svg>
      <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, textAlign: 'center' }}>
        {mode === 'p2p' ? 'Messages 1-4 split across A and B -- each message processed exactly once, by whichever consumer picks it up.' : 'Messages 1-4 delivered to A AND B in full -- each subscriber gets its own complete copy of the stream.'}
      </div>
    </VisualizationContainer>
  );
}
