import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

interface Dep {
  name: string;
  today: string;
  later: string;
  direct: boolean;
}
const DEPS: Dep[] = [
  { name: 'torch', today: '2.4.0', later: '2.4.0', direct: true },
  { name: 'numpy', today: '1.26.0', later: '2.1.0', direct: false },
  { name: 'typing-extensions', today: '4.9.0', later: '4.12.0', direct: false },
];

export default function DependencyPinningDiagram() {
  const t = useVizTokens();
  // 0: unpinned today, 1: unpinned 3 months later, 2: pinned + lockfile
  const { value, pick } = useAutoCycle(3, 3500, 1);
  const mode = value === 2 ? 'pinned' : 'unpinned';
  const later = value === 1;
  const okColor = getConceptColor(t, 'attention');
  const warnColor = t.accentDanger;

  return (
    <VisualizationContainer
      footer={
        mode === 'unpinned' && later
          ? "Reinstalling from unpinned ranges (torch>=2.4) three months later silently pulls in whatever numpy and typing-extensions happen to be current then -- numpy 1.26 -> 2.1 is a real breaking-change-prone jump. Nothing in the requirements file changed; the resolved versions still drifted."
          : mode === 'unpinned'
            ? 'Unpinned ranges resolve to *some* version that satisfies the range -- today, that happens to be these versions. Toggle "3 months later" to see what changes.'
            : 'A lockfile pins every resolved version -- direct AND transitive -- exactly. Reinstalling from the same lockfile gives back the identical versions, today or in three months, regardless of what\'s newly published upstream.'
      }
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <VizButton variant={mode === 'unpinned' && !later ? 'primary' : 'secondary'} onClick={() => pick(0)}>
          Unpinned (Today)
        </VizButton>
        <VizButton variant={mode === 'unpinned' && later ? 'primary' : 'secondary'} onClick={() => pick(1)}>
          Unpinned (3 months later ⚠)
        </VizButton>
        <VizButton variant={mode === 'pinned' ? 'primary' : 'secondary'} onClick={() => pick(2)}>
          Pinned + lockfile (Deterministic ✓)
        </VizButton>
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '6px 10px', borderBottom: `1.5px solid ${t.border}`, color: t.textSecondary }}>Package</th>
            <th style={{ textAlign: 'left', padding: '6px 10px', borderBottom: `1.5px solid ${t.border}`, color: t.textSecondary }}>Resolved version</th>
          </tr>
        </thead>
        <tbody>
          {DEPS.map((d) => {
            const version = mode === 'pinned' ? d.today : later ? d.later : d.today;
            const drifted = mode === 'unpinned' && later && d.today !== d.later;
            return (
              <tr key={d.name}>
                <td style={{ padding: '6px 10px', borderBottom: `1px solid ${t.border}`, fontFamily: 'monospace', color: d.direct ? t.textPrimary : t.textMuted }}>
                  {d.direct ? d.name : `  ↳ ${d.name}`}
                </td>
                <td style={{ padding: '6px 10px', borderBottom: `1px solid ${t.border}`, fontFamily: 'monospace', fontWeight: drifted ? 700 : 400, color: drifted ? warnColor : okColor, transition: 'color 300ms ease' }}>
                  {version} {drifted && '(DRIFTED!)'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </VisualizationContainer>
  );
}
