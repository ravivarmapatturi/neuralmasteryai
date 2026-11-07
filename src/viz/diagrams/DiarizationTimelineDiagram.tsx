import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

interface Segment {
  start: number;
  end: number;
  speaker: 'A' | 'B' | null; // null = silence / no speech detected
}

const SEGMENTS: Segment[] = [
  { start: 0, end: 8, speaker: 'A' },
  { start: 8, end: 9.5, speaker: null },
  { start: 9.5, end: 18, speaker: 'B' },
  { start: 18, end: 24, speaker: 'A' },
  { start: 24, end: 25, speaker: null },
  { start: 25, end: 27, speaker: 'B' },
  { start: 27, end: 34, speaker: 'A' },
];
const TOTAL = 34;

const WIDTH = 460;
const ROW_H = 44;

export default function DiarizationTimelineDiagram() {
  const t = useVizTokens();
  const [selected, setSelected] = useState<number | null>(null);
  const colorA = getConceptColor(t, 'query');
  const colorB = getConceptColor(t, 'key');
  const colorFor = (s: Segment['speaker']) => (s === 'A' ? colorA : s === 'B' ? colorB : t.textMuted);

  const active = selected !== null ? SEGMENTS[selected] : null;

  return (
    <VisualizationContainer
      footer={
        active
          ? `${active.speaker ? `Speaker ${active.speaker}` : 'Silence / no speech detected'} from ${active.start}s to ${active.end}s.`
          : 'Click a segment to see its timing. This combines voice-activity detection (finding when someone is speaking at all) with speaker-embedding clustering (grouping segments by who) into one "who spoke when" timeline -- a genuinely different output from ASR, which only produces the transcript text.'
      }
    >
      <svg width={WIDTH} height={ROW_H + 20} viewBox={`0 0 ${WIDTH} ${ROW_H + 20}`} className="nm-fit-svg" style={{ display: 'block' }}>
        <line x1={0} y1={ROW_H / 2 + 10} x2={WIDTH} y2={ROW_H / 2 + 10} stroke={t.border} strokeWidth={1} />
        {SEGMENTS.map((s, i) => {
          const x = (s.start / TOTAL) * WIDTH;
          const w = ((s.end - s.start) / TOTAL) * WIDTH;
          const isSelected = selected === i;
          return (
            <rect
              key={i}
              x={x}
              y={10}
              width={Math.max(1, w - 1)}
              height={ROW_H}
              fill={s.speaker ? `${colorFor(s.speaker)}${isSelected ? 'aa' : '55'}` : t.surfaceAlt}
              stroke={isSelected ? colorFor(s.speaker) : 'transparent'}
              strokeWidth={2}
              style={{ cursor: 'pointer' }}
              onClick={() => setSelected(i)}
            />
          );
        })}
      </svg>
      <div style={{ display: 'flex', gap: 16, fontSize: DIAGRAM_TYPE.secondaryLabel.size, marginTop: 4 }}>
        <span style={{ color: colorA }}>■ Speaker A</span>
        <span style={{ color: colorB }}>■ Speaker B</span>
        <span style={{ color: t.textMuted }}>■ Silence</span>
      </div>
    </VisualizationContainer>
  );
}
