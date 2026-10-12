import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton } from '../primitives';
import { getConceptColor } from './diagramSystem';
import { SketchArrow } from '../../components/notebook/RoughShape';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

export default function RebaseVsMergeDiagram() {
  const t = useVizTokens();
  const [mode, setMode] = useState<'merge' | 'rebase'>('merge');
  const mainColor = getConceptColor(t, 'query');
  const featColor = getConceptColor(t, 'attention');
  const newColor = t.accentWarn;

  return (
    <VisualizationContainer
      footer={
        mode === 'merge'
          ? 'Merge: a new merge commit (M) is created with two parents -- the original feature-branch commits (A, B) are untouched, and both branches\' history is preserved exactly as it happened.'
          : "Rebase: feature-branch commits are replayed on top of main's latest commit, producing NEW commits (A', B') with new hashes -- A and B still exist in Git's object store, but the branch pointer now points to the rewritten history. This is exactly why force-pushing after a rebase is required, and why rebasing commits someone else already pulled causes real conflicts: their history now disagrees with yours about what those commits even are."
      }
    >
      <div style={{ marginBottom: 14 }}>
        <VizButton variant={mode === 'merge' ? 'primary' : 'secondary'} onClick={() => setMode('merge')}>
          Merge
        </VizButton>{' '}
        <VizButton variant={mode === 'rebase' ? 'primary' : 'secondary'} onClick={() => setMode('rebase')}>
          Rebase
        </VizButton>
      </div>
      <svg width={420} height={160}>
        {/* main branch */}
        <SketchArrow points={[[20, 40], [mode === 'merge' ? 340 : 380, 40]]} color={mainColor} strokeWidth={2} arrowhead={false} id="rvm-main-1" />
        {[20, 120, 220].map((x, i) => (
          <circle key={i} cx={x} cy={40} r={8} fill={mainColor} />
        ))}
        <text x={20} y={20} fontSize={10} fontFamily={HAND_FONT} fill={mainColor} textAnchor="middle">main</text>

        {mode === 'merge' ? (
          <>
            {/* feature branch diverging and merging back */}
            <SketchArrow points={[[120, 40], [160, 85], [220, 100], [280, 85], [320, 40]]} color={featColor} strokeWidth={2} arrowhead={false} id="rvm-feature" />
            <circle cx={200} cy={98} r={8} fill={featColor} />
            <circle cx={260} cy={98} r={8} fill={featColor} />
            <text x={230} y={122} fontSize={10} fontFamily={HAND_FONT} fill={featColor} textAnchor="middle">A, B (unchanged)</text>
            <circle cx={340} cy={40} r={9} fill={newColor} />
            <text x={340} y={20} fontSize={10} fontFamily={HAND_FONT} fill={newColor} textAnchor="middle">M (2 parents)</text>
          </>
        ) : (
          <>
            {/* feature branch, then replayed on top of main's tip */}
            <SketchArrow points={[[120, 40], [150, 75], [210, 90], [240, 90]]} color={t.textMuted} strokeWidth={1.5} arrowhead={false} id="rvm-orphaned" />
            <circle cx={190} cy={90} r={7} fill={t.textMuted} opacity={0.5} />
            <circle cx={240} cy={90} r={7} fill={t.textMuted} opacity={0.5} />
            <text x={215} y={112} fontSize={9} fontFamily={HAND_FONT} fill={t.textMuted} textAnchor="middle">A, B (orphaned)</text>

            <SketchArrow points={[[220, 40], [380, 40]]} color={mainColor} strokeWidth={2} arrowhead={false} id="rvm-main-2" />
            <circle cx={300} cy={40} r={8} fill={newColor} />
            <circle cx={360} cy={40} r={8} fill={newColor} />
            <text x={330} y={20} fontSize={10} fontFamily={HAND_FONT} fill={newColor} textAnchor="middle">A', B' (new hashes)</text>
          </>
        )}
      </svg>
    </VisualizationContainer>
  );
}
