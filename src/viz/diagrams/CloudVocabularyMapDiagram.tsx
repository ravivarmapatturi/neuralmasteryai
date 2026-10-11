import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { SelectableRow, VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';

const CONCEPTS = [
  { key: 'vm', label: 'Virtual machines', aws: 'EC2', gcp: 'Compute Engine', azure: 'Azure VMs' },
  { key: 'k8s', label: 'Managed Kubernetes', aws: 'EKS', gcp: 'GKE', azure: 'AKS' },
  { key: 'serverless', label: 'Serverless functions', aws: 'Lambda', gcp: 'Cloud Functions / Run', azure: 'Azure Functions' },
  { key: 'object', label: 'Object storage', aws: 'S3', gcp: 'Cloud Storage', azure: 'Blob Storage' },
  { key: 'nosql', label: 'Managed NoSQL', aws: 'DynamoDB', gcp: 'Firestore / Bigtable', azure: 'Cosmos DB' },
  { key: 'ml', label: 'Managed ML platform', aws: 'SageMaker', gcp: 'Vertex AI', azure: 'Azure ML' },
];

/** One concept, three vendor names -- click a concept to see the same
 * capability under AWS/GCP/Azure's own branding. The vocabulary is
 * what differs, not the underlying shape. */
export default function CloudVocabularyMapDiagram() {
  const t = useVizTokens();
  const [active, setActive] = useState('ml');
  const color = getConceptColor(t, 'attention');
  const c = CONCEPTS.find((x) => x.key === active)!;

  return (
    <VisualizationContainer footer={`Same concept (${c.label.toLowerCase()}), three names -- learning one cloud deeply and mapping to the others is mostly vocabulary, not new concepts.`}>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
        {CONCEPTS.map((x) => {
          const isActive = active === x.key;
          return (
            <SelectableRow key={x.key} selected={isActive} label={x.label} onSelect={() => setActive(x.key)} onMouseEnter={() => setActive(x.key)} style={{ padding: '0.45rem 0.7rem', borderRadius: 7, background: isActive ? `${color}18` : t.surfaceAlt, border: `1.5px solid ${isActive ? color : t.border}` }}>
              <span style={{ fontSize: 9.5, fontWeight: isActive ? 700 : 500, color: isActive ? color : t.textPrimary }}>{x.label}</span>
            </SelectableRow>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {[{ name: 'AWS', val: c.aws }, { name: 'GCP', val: c.gcp }, { name: 'Azure', val: c.azure }].map((v) => (
          <div key={v.name} style={{ flex: 1, textAlign: 'center', padding: '0.6rem 0.4rem', borderRadius: 8, background: `${color}10`, border: `1px solid ${color}40` }}>
            <div style={{ fontSize: 8.5, color: t.textMuted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.3 }}>{v.name}</div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: t.textPrimary }}>{v.val}</div>
          </div>
        ))}
      </div>
    </VisualizationContainer>
  );
}
