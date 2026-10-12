import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton } from '../primitives';
import { getConceptColor } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

export default function VirtualEnvIsolationDiagram() {
  const t = useVizTokens();
  const [isolated, setIsolated] = useState(true);
  const okColor = getConceptColor(t, 'attention');
  const errColor = t.accentDanger;
  const projA = getConceptColor(t, 'query');
  const projB = getConceptColor(t, 'key');

  return (
    <VisualizationContainer
      footer={
        isolated
          ? 'Each project gets its own venv -- its own private site-packages directory. Project A installs torch 2.0 into its own environment, Project B installs torch 2.4 into a completely separate one. Neither knows or cares what the other has installed.'
          : "Without isolation, both projects share one global site-packages -- there's only one 'torch' installed system-wide at a time. Installing Project B's required version overwrites the one Project A needs, and whichever project runs second breaks."
      }
    >
      <div style={{ marginBottom: 12 }}>
        <VizButton variant={isolated ? 'primary' : 'secondary'} onClick={() => setIsolated(true)}>
          Isolated venvs
        </VizButton>{' '}
        <VizButton variant={!isolated ? 'primary' : 'secondary'} onClick={() => setIsolated(false)}>
          No isolation (global install)
        </VizButton>
      </div>

      {isolated ? (
        <div style={{ display: 'flex', gap: 24 }}>
          {[{ name: 'Project A', color: projA, torch: '2.0.0' }, { name: 'Project B', color: projB, torch: '2.4.0' }].map((p) => (
            <SketchBox key={p.name} color={p.color} strokeWidth={1.5} style={{ flex: 1 }}>
              <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 700, color: p.color, marginBottom: 6, fontFamily: HAND_FONT }}>{p.name}</div>
                <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4, fontFamily: HAND_FONT }}>.venv/site-packages</div>
                <div style={{ fontFamily: 'monospace', fontSize: 12, padding: '4px 8px', background: `${okColor}18`, borderRadius: 4, color: okColor }}>torch=={p.torch} ✓</div>
              </div>
            </SketchBox>
          ))}
        </div>
      ) : (
        <div>
          <SketchBox color={errColor} strokeWidth={1.5} style={{ marginBottom: 10 }}>
            <div style={{ padding: 12 }}>
              <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4, fontFamily: HAND_FONT }}>global site-packages (shared, one install at a time)</div>
              <div style={{ fontFamily: 'monospace', fontSize: 12, padding: '4px 8px', background: `${errColor}18`, borderRadius: 4, color: errColor }}>torch==2.4.0 (only one version can exist here)</div>
            </div>
          </SketchBox>
          <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontWeight: 700, color: projA, fontFamily: HAND_FONT }}>Project A</div>
              <div style={{ fontSize: 12, color: errColor, marginTop: 4, fontFamily: HAND_FONT }}>needs 2.0.0 — breaks ✗</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontWeight: 700, color: projB, fontFamily: HAND_FONT }}>Project B</div>
              <div style={{ fontSize: 12, color: okColor, marginTop: 4, fontFamily: HAND_FONT }}>needs 2.4.0 — works ✓</div>
            </div>
          </div>
        </div>
      )}
    </VisualizationContainer>
  );
}
