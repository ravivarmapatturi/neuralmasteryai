import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle, usePrefersReducedMotion } from '../primitives';
import { getConceptColor } from './diagramSystem';

const FEATURES = {
  gcp: [
    { key: 'vertex', label: 'Vertex AI', desc: 'Training, tuning, model registry, managed endpoints -- with particularly strong integration into Gemini for teams already building on Google\'s own foundation models.' },
    { key: 'gke', label: 'GKE', desc: 'Where Kubernetes itself originated conceptually (Google\'s internal Borg predates and inspired it) -- often the most mature managed Kubernetes experience.' },
    { key: 'bigquery', label: 'BigQuery', desc: 'A serverless data warehouse that separates storage and compute, charging per-query rather than per-provisioned-capacity -- distinctive for large, bursty analytical workloads feeding ML feature engineering.' },
  ],
  azure: [
    { key: 'azureml', label: 'Azure ML', desc: 'Training pipelines, model registry, managed endpoints -- with deep integration into Active Directory and existing enterprise data estates, often the actual reason a team is on Azure.' },
    { key: 'openai', label: 'Azure OpenAI', desc: 'Hosted access to GPT-4-class models through Azure\'s own infrastructure and compliance boundary -- for enterprises needing OpenAI-class capability inside their existing data-residency posture.' },
    { key: 'aks', label: 'AKS', desc: 'Azure\'s managed Kubernetes -- same role as EKS/GKE.' },
  ],
};

/** GCP's and Azure's genuinely distinctive services -- the ones that
 * are more than a renamed EC2/S3 -- click to switch cloud, then a
 * feature. */
export default function CloudDistinctiveFeaturesDiagram() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const cyc = useAutoCycle(6, 3200);
  const cloud: 'gcp' | 'azure' = cyc.value < 3 ? 'gcp' : 'azure';
  const list = FEATURES[cloud];
  const activeIdx = cyc.value < 3 ? cyc.value : cyc.value - 3;
  const f = list[activeIdx];
  const color = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer={f.desc}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <button
          type="button"
          onClick={() => cyc.pick(0)}
          style={{
            flex: 1,
            padding: '6px 10px',
            borderRadius: 6,
            fontSize: 10.5,
            fontWeight: cloud === 'gcp' ? 700 : 500,
            background: cloud === 'gcp' ? `${color}20` : t.surfaceAlt,
            border: `1.25px solid ${cloud === 'gcp' ? color : t.border}`,
            color: cloud === 'gcp' ? color : t.textSecondary,
            boxShadow: cloud === 'gcp' && !reducedMotion ? `0 0 6px ${color}33` : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          GCP
        </button>
        <button
          type="button"
          onClick={() => cyc.pick(3)}
          style={{
            flex: 1,
            padding: '6px 10px',
            borderRadius: 6,
            fontSize: 10.5,
            fontWeight: cloud === 'azure' ? 700 : 500,
            background: cloud === 'azure' ? `${color}20` : t.surfaceAlt,
            border: `1.25px solid ${cloud === 'azure' ? color : t.border}`,
            color: cloud === 'azure' ? color : t.textSecondary,
            boxShadow: cloud === 'azure' && !reducedMotion ? `0 0 6px ${color}33` : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Azure
        </button>
      </div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {list.map((x, i) => {
          const isActive = activeIdx === i;
          const globalIdx = cloud === 'gcp' ? i : i + 3;
          return (
            <div
              key={x.key}
              onClick={() => cyc.pick(globalIdx)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  cyc.pick(globalIdx);
                }
              }}
              onMouseEnter={() => cyc.pick(globalIdx)}
              style={{
                cursor: 'pointer',
                padding: '0.5rem 0.8rem',
                borderRadius: 7,
                background: isActive ? `${color}18` : t.surfaceAlt,
                border: `1.5px solid ${isActive ? color : t.border}`,
                boxShadow: isActive && !reducedMotion ? `0 0 8px ${color}33` : 'none',
                transform: isActive && !reducedMotion ? 'scale(1.02)' : 'scale(1)',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ fontSize: 10.5, fontWeight: isActive ? 700 : 500, color: isActive ? color : t.textPrimary }}>{x.label}</span>
            </div>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}