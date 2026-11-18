import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle, usePrefersReducedMotion } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

/** GitOps: the git repo is the source of truth, Argo CD continuously
 * pulls the cluster toward it -- click "merge PR" to see the cluster
 * actually update, with no kubectl apply run by hand. */
export default function GitOpsReconciliationDiagram() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const cyc = useAutoCycle(2, 4000);
  const merged = cyc.value === 1;
  const gitColor = getConceptColor(t, 'query');
  const clusterColor = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer={merged ? 'Argo CD detects the git repo changed, reconciles the cluster to match -- no human ran kubectl apply. This is what "deploy by merging a PR" means literally.' : 'Click "merge PR" -- the git repo is the declared source of truth; the cluster continuously reconciles toward it.'}>
      <button
        type="button"
        onClick={() => cyc.pick(merged ? 0 : 1)}
        style={{
          marginBottom: 10,
          padding: '6px 12px',
          borderRadius: 6,
          border: `1px solid ${gitColor}`,
          background: merged ? `${gitColor}15` : 'transparent',
          color: gitColor,
          cursor: 'pointer',
          fontSize: 11.5,
          fontWeight: 700,
          boxShadow: merged && !reducedMotion ? `0 0 6px ${gitColor}33` : 'none',
          transition: 'all 0.2s ease',
        }}
      >
        {merged ? 'Revert PR' : 'Merge PR (image: v2)'}
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, padding: '0.7rem', borderRadius: 9, background: `${gitColor}15`, border: `1.5px solid ${gitColor}`, textAlign: 'center', transition: 'all 0.3s ease' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: gitColor }}>Git repo (desired)</div>
          <div style={{ fontSize: 11, fontFamily: 'monospace', color: gitColor, marginTop: 4 }}>image: {merged ? 'v2' : 'v1'}</div>
        </div>
        <div
          style={{
            fontSize: 18,
            color: gitColor,
            transform: merged && !reducedMotion ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.5s ease',
          }}
        >
          ⟳
        </div>
        <div style={{ flex: 1, padding: '0.7rem', borderRadius: 9, background: `${clusterColor}15`, border: `1.5px solid ${clusterColor}`, textAlign: 'center', transition: 'all 0.3s ease' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: clusterColor }}>Cluster (actual)</div>
          <div style={{ fontSize: 11, fontFamily: 'monospace', color: clusterColor, marginTop: 4 }}>image: {merged ? 'v2' : 'v1'}</div>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 10 }}>
        Argo CD's continuous reconciliation loop keeps these two in sync, in one direction: git → cluster.
      </div>
    </VisualizationContainer>
  );
}