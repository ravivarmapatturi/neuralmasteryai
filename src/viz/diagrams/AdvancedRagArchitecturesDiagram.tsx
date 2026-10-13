import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import { SketchArrow, SketchRect } from '../../components/notebook/RoughShape';

type Arch = 'agentic' | 'corrective' | 'self-rag' | 'raptor' | 'cag' | 'flare';

/** Six architecture variants on the same retrieve→generate skeleton --
 * each adds a different decision point, a different retrieval shape, or
 * (for CAG) removes retrieval entirely. Select one to see exactly where
 * its extra loop/branch/tier sits relative to the plain pipeline. */
export default function AdvancedRagArchitecturesDiagram() {
  const t = useVizTokens();
  const [arch, setArch] = useState<Arch>('agentic');
  const baseColor = t.textMuted;
  const loopColor = getConceptColor(t, 'attention');
  const width = 560;
  const height = arch === 'raptor' ? 230 : 190;

  const STAGES = [
    { key: 'query', x: 40, label: 'Query' },
    { key: 'retrieve', x: 170, label: arch === 'cag' ? 'Retrieve' : 'Retrieve' },
    { key: 'generate', x: 300, label: 'Generate' },
    { key: 'answer', x: 430, label: 'Answer' },
  ];
  const y = 50;

  const descriptions: Record<Arch, string> = {
    agentic: 'An agent decides whether to retrieve, what to retrieve, and how many times -- it can loop back to Retrieve with a reformulated query before ever reaching Generate.',
    corrective: 'A grader checks retrieved chunks for relevance right after Retrieve -- insufficient context triggers a fallback (rewrite the query, broaden search, or go to web search) before Generate runs.',
    'self-rag': "The model itself emits reflection tokens at Generate -- was retrieval needed, are the passages relevant, is the answer actually grounded in them -- folding the judgment into the model's own token stream instead of a separate pipeline stage.",
    raptor: 'Retrieve pulls from a tree of recursive summaries built ahead of time -- a leaf chunk for a narrow question, a higher-level summary for a broad one -- instead of being stuck at one fixed chunk granularity.',
    cag: 'Retrieve is skipped entirely: the whole (small enough) corpus is preloaded into the KV cache up front, so Generate attends over all of it on every query with no selective retrieval step at all.',
    flare: "Generate is watched continuously, not just graded once -- the moment the model's own confidence drops mid-answer, it triggers a fresh Retrieve call for exactly the part of the answer that needs new information.",
  };

  return (
    <VisualizationContainer footer={descriptions[arch]}>
      <PillSelect<Arch>
        label="Architecture"
        value={arch}
        onChange={setArch}
        options={[
          { value: 'agentic', label: 'Agentic RAG' },
          { value: 'corrective', label: 'Corrective RAG' },
          { value: 'self-rag', label: 'Self-RAG' },
          { value: 'raptor', label: 'RAPTOR' },
          { value: 'cag', label: 'CAG' },
          { value: 'flare', label: 'FLARE' },
        ]}
      />
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        {STAGES.map((s, i) => {
          const skipped = arch === 'cag' && s.key === 'retrieve';
          return (
            <g key={s.key} opacity={skipped ? 0.35 : 1}>
              {i > 0 && (
                <SketchArrow
                  points={[[STAGES[i - 1].x + 45, y], [s.x - 5, y]]}
                  color={baseColor}
                  strokeWidth={1.5}
                  roughness={1.3}
                  id={`ara-flow-${s.key}`}
                />
              )}
              <rect x={s.x - 5} y={y - 16} width={80} height={32} rx={6} fill={t.surfaceAlt} stroke="none" />
              <SketchRect x={s.x - 5} y={y - 16} width={80} height={32} color={baseColor} strokeWidth={1.5} roughness={1.3} id={`ara-stage-${s.key}`} />
              <text x={s.x + 35} y={y + 4} textAnchor="middle" fontSize={10} fill={t.textSecondary}>{s.label}</text>
              {skipped && <SketchArrow points={[[s.x - 2, y - 13], [s.x + 72, y + 13]]} color={t.accentDanger} strokeWidth={1.3} roughness={1.6} arrowhead={false} id="ara-cag-strike" />}
            </g>
          );
        })}

        {arch === 'agentic' && (
          <>
            <SketchArrow points={[[335, 66], [250, 120], [165, 66]]} color={loopColor} strokeWidth={2} roughness={1.4} id="ara-agentic-loop" />
            <text x={250} y={132} textAnchor="middle" fontSize={9} fill={loopColor}>agent reformulates &amp; re-retrieves</text>
          </>
        )}
        {arch === 'corrective' && (
          <>
            <rect x={165} y={95} width={90} height={30} rx={6} fill={`${loopColor}18`} stroke="none" />
            <SketchRect x={165} y={95} width={90} height={30} color={loopColor} strokeWidth={1.5} roughness={1.3} id="ara-corrective-grader" />
            <text x={210} y={114} textAnchor="middle" fontSize={9} fill={loopColor}>grade relevance</text>
            <SketchArrow points={[[210, 66], [210, 93]]} color={loopColor} strokeWidth={1.5} roughness={1.3} id="ara-corrective-down" />
            <SketchArrow points={[[165, 110], [100, 110], [100, 66], [165, 66]]} color={loopColor} strokeWidth={1.5} roughness={1.4} id="ara-corrective-retry" />
            <text x={95} y={90} textAnchor="middle" fontSize={8} fill={loopColor} transform="rotate(-90 95 90)">insufficient → retry</text>
          </>
        )}
        {arch === 'self-rag' && (
          <>
            <rect x={295} y={95} width={110} height={30} rx={6} fill={`${loopColor}18`} stroke="none" />
            <SketchRect x={295} y={95} width={110} height={30} color={loopColor} strokeWidth={1.5} roughness={1.3} id="ara-selfrag-box" />
            <text x={350} y={114} textAnchor="middle" fontSize={8} fill={loopColor}>reflection tokens</text>
            <SketchArrow points={[[340, 66], [340, 93]]} color={loopColor} strokeWidth={1.5} roughness={1.3} id="ara-selfrag-down" />
          </>
        )}
        {arch === 'raptor' && (
          <>
            {[{ x: 110, label: 'leaf chunk' }, { x: 170, label: 'cluster summary' }, { x: 230, label: 'top summary' }].map((n) => (
              <g key={n.x}>
                <rect x={n.x - 28} y={160} width={56} height={26} rx={5} fill={`${loopColor}18`} stroke="none" />
                <SketchRect x={n.x - 28} y={160} width={56} height={26} color={loopColor} strokeWidth={1.3} roughness={1.3} id={`ara-raptor-${n.x}`} />
                <text x={n.x} y={176} textAnchor="middle" fontSize={7} fill={loopColor}>{n.label}</text>
                <SketchArrow points={[[n.x, 158], [170, 66]]} color={loopColor} strokeWidth={1.2} roughness={1.3} arrowhead={false} id={`ara-raptor-link-${n.x}`} />
              </g>
            ))}
            <text x={170} y={205} textAnchor="middle" fontSize={8} fill={loopColor}>tree of summaries, built ahead of time -- retrieve picks the right level</text>
          </>
        )}
        {arch === 'flare' && (
          <>
            <SketchArrow points={[[300, 34], [300, 24], [250, 24], [165, 66]]} color={loopColor} strokeWidth={1.8} roughness={1.4} id="ara-flare-loop" />
            <text x={225} y={16} textAnchor="middle" fontSize={8} fill={loopColor}>confidence drops mid-answer → re-retrieve</text>
          </>
        )}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Same retrieve→generate skeleton (gray) — each architecture adds a different decision point (highlighted).
      </div>
    </VisualizationContainer>
  );
}
