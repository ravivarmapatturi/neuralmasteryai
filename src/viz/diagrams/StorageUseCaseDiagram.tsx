import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle, usePrefersReducedMotion } from '../primitives';
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
  const reducedMotion = usePrefersReducedMotion();
  const cyc = useAutoCycle(STORES.length, 3200);
  const color = getConceptColor(t, 'attention');
  const s = STORES[cyc.value];

  return (
    <VisualizationContainer footer={s.use}>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {STORES.map((x, i) => {
          const isActive = cyc.value === i;
          return (
            <SketchBox key={x.key} color={isActive ? color : t.border} strokeWidth={isActive ? 2 : 1.3}>
              <div
                onClick={() => cyc.pick(i)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    cyc.pick(i);
                  }
                }}
                onMouseEnter={() => cyc.pick(i)}
                style={{
                  cursor: 'pointer',
                  padding: '0.5rem 0.8rem',
                  borderRadius: 7,
                  background: isActive ? `${color}18` : t.surfaceAlt,
                  boxShadow: isActive && !reducedMotion ? `0 0 6px ${color}33` : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ fontSize: 10.5, fontWeight: isActive ? 700 : 500, color: isActive ? color : t.textPrimary, fontFamily: HAND_FONT }}>{x.label}</span>
              </div>
            </SketchBox>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}