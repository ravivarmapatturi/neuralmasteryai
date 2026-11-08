import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

type Mode = 'dependency' | 'constituency';
const SENTENCE = ['The', 'dog', 'chases', 'the', 'cat'];

export default function DependencyVsConstituencyDiagram() {
  const t = useVizTokens();
  const [mode, setMode] = useState<Mode>('dependency');

  const wordX = (i: number) => 40 + i * 90;
  const baseY = 140;

  return (
    <VisualizationContainer footer={
      mode === 'dependency'
        ? '"chases" is the root -- both "dog" (subject) and "cat" (object) depend directly on it, "The"/"the" depend on their nouns. A directed graph exposing "who did what to whom" directly, useful for information extraction.'
        : 'Nested phrase structure: [S [NP The dog] [VP chases [NP the cat]]] -- a formal-grammar tree, the structure a sentence diagram represents, made rigorous.'
    }>
      <PillSelect label="Representation" value={mode} onChange={(v) => setMode(v as Mode)} options={[
        { value: 'dependency', label: 'Dependency parse' },
        { value: 'constituency', label: 'Constituency parse' },
      ]} />

      {mode === 'dependency' ? (
        <svg width="100%" viewBox="0 0 500 170" style={{ display: 'block', marginTop: 8 }}>
          <defs>
            <marker id="dep-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 Z" fill={t.accentPrimary} />
            </marker>
            <marker id="dep-arrow-sec" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 Z" fill={t.accentSecondary} />
            </marker>
          </defs>
          {SENTENCE.map((w, i) => (
            <text key={i} x={wordX(i)} y={baseY + 20} textAnchor="middle" fontSize={13} fontFamily="monospace" fill={t.textPrimary}>{w}</text>
          ))}
          {/* chases -> dog */}
          <path d={`M ${wordX(2)} ${baseY - 8} Q ${(wordX(2) + wordX(1)) / 2} ${baseY - 56} ${wordX(1)} ${baseY - 8}`} fill="none" stroke={t.accentPrimary} strokeWidth={2} markerEnd="url(#dep-arrow)" />
          <text x={(wordX(2) + wordX(1)) / 2} y={baseY - 38} textAnchor="middle" fontSize={10} fontWeight={600} fill={t.accentPrimary}>subj</text>
          {/* chases -> cat */}
          <path d={`M ${wordX(2)} ${baseY - 8} Q ${(wordX(2) + wordX(4)) / 2} ${baseY - 70} ${wordX(4)} ${baseY - 8}`} fill="none" stroke={t.accentPrimary} strokeWidth={2} markerEnd="url(#dep-arrow)" />
          <text x={(wordX(2) + wordX(4)) / 2} y={baseY - 48} textAnchor="middle" fontSize={10} fontWeight={600} fill={t.accentPrimary}>obj</text>
          {/* dog -> The */}
          <path d={`M ${wordX(1)} ${baseY - 8} Q ${(wordX(1) + wordX(0)) / 2} ${baseY - 32} ${wordX(0)} ${baseY - 8}`} fill="none" stroke={t.accentSecondary} strokeWidth={1.5} markerEnd="url(#dep-arrow-sec)" />
          <text x={(wordX(1) + wordX(0)) / 2} y={baseY - 22} textAnchor="middle" fontSize={9} fill={t.accentSecondary}>det</text>
          {/* cat -> the */}
          <path d={`M ${wordX(4)} ${baseY - 8} Q ${(wordX(4) + wordX(3)) / 2} ${baseY - 32} ${wordX(3)} ${baseY - 8}`} fill="none" stroke={t.accentSecondary} strokeWidth={1.5} markerEnd="url(#dep-arrow-sec)" />
          <text x={(wordX(4) + wordX(3)) / 2} y={baseY - 22} textAnchor="middle" fontSize={9} fill={t.accentSecondary}>det</text>
          <text x={wordX(2)} y={baseY + 40} textAnchor="middle" fontSize={10} fontWeight={700} fill={t.textMuted}>root</text>
        </svg>
      ) : (
        <svg width="100%" viewBox="0 0 500 170" style={{ display: 'block', marginTop: 8 }}>
          {/* Sentence level: S */}
          <text x={240} y={20} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.accentPrimary}>S</text>
          <line x1={240} y1={25} x2={115} y2={48} stroke={t.border} strokeWidth={1.5} />
          <line x1={240} y1={25} x2={330} y2={48} stroke={t.border} strokeWidth={1.5} />

          {/* Level 1: Left NP and VP */}
          <text x={115} y={62} textAnchor="middle" fontSize={11} fontWeight={700} fill={t.accentSecondary}>NP</text>
          <text x={330} y={62} textAnchor="middle" fontSize={11} fontWeight={700} fill={t.accentWarn}>VP</text>

          {/* Under left NP: The, dog */}
          <line x1={115} y1={68} x2={70} y2={130} stroke={t.border} strokeWidth={1.5} />
          <line x1={115} y1={68} x2={160} y2={130} stroke={t.border} strokeWidth={1.5} />
          <text x={70} y={145} textAnchor="middle" fontSize={12} fontFamily="monospace" fill={t.textPrimary}>The</text>
          <text x={160} y={145} textAnchor="middle" fontSize={12} fontFamily="monospace" fill={t.textPrimary}>dog</text>

          {/* Under VP: verb leaf chases and right NP */}
          <line x1={330} y1={68} x2={250} y2={130} stroke={t.border} strokeWidth={1.5} />
          <line x1={330} y1={68} x2={400} y2={88} stroke={t.border} strokeWidth={1.5} />
          <text x={250} y={145} textAnchor="middle" fontSize={12} fontFamily="monospace" fill={t.textPrimary}>chases</text>

          {/* Level 2: Right NP */}
          <text x={400} y={102} textAnchor="middle" fontSize={11} fontWeight={700} fill={t.accentSecondary}>NP</text>
          <line x1={400} y1={108} x2={360} y2={130} stroke={t.border} strokeWidth={1.5} />
          <line x1={400} y1={108} x2={440} y2={130} stroke={t.border} strokeWidth={1.5} />
          <text x={360} y={145} textAnchor="middle" fontSize={12} fontFamily="monospace" fill={t.textPrimary}>the</text>
          <text x={440} y={145} textAnchor="middle" fontSize={12} fontFamily="monospace" fill={t.textPrimary}>cat</text>
        </svg>
      )}
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Same sentence, same real grammatical relationships -- dependency parsing has become the more commonly used representation in modern pipelines because it exposes those relationships more directly.
      </div>
    </VisualizationContainer>
  );
}
