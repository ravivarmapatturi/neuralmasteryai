import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

const STORES = [
  { key: 's3', label: 'S3', use: 'Datasets, model artifacts, logs -- the default backend nearly every tool in this section (DVC, MLflow, Airflow, Docker registries) can target.' },
  { key: 'ebs', label: 'EBS', use: "A single EC2 instance's own attached disk -- not for data meant to be shared across services." },
  { key: 'rds', label: 'RDS', use: 'Managed relational databases (Postgres/MySQL) -- structured, transactional data with relationships.' },
  { key: 'dynamo', label: 'DynamoDB', use: 'Managed NoSQL key-value/document store -- durable, fully managed low-latency lookups, where an in-memory store like Redis wouldn\'t be durable enough.' },
];

/** Four storage services with genuinely different jobs -- click one
 * for what actually belongs there. */
export default function StorageUseCaseDiagram() {
  const t = useVizTokens();
  const [active, setActive] = useState('s3');
  const color = getConceptColor(t, 'attention');
  const s = STORES.find((x) => x.key === active)!;

  return (
    <VisualizationContainer footer={s.use}>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {STORES.map((x) => {
          const isActive = active === x.key;
          return (
            <SketchBox key={x.key} color={isActive ? color : t.border} strokeWidth={isActive ? 2 : 1.3}>
              <div onClick={() => setActive(x.key)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(x.key); } }} onMouseEnter={() => setActive(x.key)} style={{ cursor: 'pointer', padding: '0.5rem 0.8rem', borderRadius: 7, background: isActive ? `${color}18` : t.surfaceAlt }}>
                <span style={{ fontSize: 10.5, fontWeight: isActive ? 700 : 500, color: isActive ? color : t.textPrimary, fontFamily: HAND_FONT }}>{x.label}</span>
              </div>
            </SketchBox>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}
