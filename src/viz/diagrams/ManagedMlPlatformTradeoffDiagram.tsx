import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle, usePrefersReducedMotion } from '../primitives';
import { getConceptColor } from './diagramSystem';

/** SageMaker/Vertex AI/Azure ML vs. self-hosting on raw compute -- the
 * same speed-vs-control tradeoff every managed platform makes. Click
 * to compare. */
export default function ManagedMlPlatformTradeoffDiagram() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const cyc = useAutoCycle(2, 4000);
  const managed = cyc.value === 0;
  const color = getConceptColor(t, 'attention');

  const ROWS = managed
    ? [
        { label: 'Time to running', value: 'Fast', good: true },
        { label: 'Infra you provision', value: 'None', good: true },
        { label: 'Vendor lock-in', value: 'Higher', good: false },
        { label: 'Control over latency/cost', value: 'Lower', good: false },
      ]
    : [
        { label: 'Time to running', value: 'Slower', good: false },
        { label: 'Infra you provision', value: 'EC2 + Docker + serving tool', good: false },
        { label: 'Vendor lock-in', value: 'Lower', good: true },
        { label: 'Control over latency/cost', value: 'Higher', good: true },
      ];

  return (
    <VisualizationContainer footer="Many teams split the difference: SageMaker/Vertex/Azure ML for training (managed job infra saves real time), self-hosted serving on EKS/Triton for latency and cost control.">
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => cyc.pick(0)}
          style={{
            flex: 1,
            padding: '6px 10px',
            borderRadius: 6,
            fontSize: 10.5,
            fontWeight: managed ? 700 : 500,
            background: managed ? `${color}20` : t.surfaceAlt,
            border: `1.25px solid ${managed ? color : t.border}`,
            color: managed ? color : t.textSecondary,
            boxShadow: managed && !reducedMotion ? `0 0 6px ${color}33` : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Managed platform
        </button>
        <button
          type="button"
          onClick={() => cyc.pick(1)}
          style={{
            flex: 1,
            padding: '6px 10px',
            borderRadius: 6,
            fontSize: 10.5,
            fontWeight: !managed ? 700 : 500,
            background: !managed ? `${color}20` : t.surfaceAlt,
            border: `1.25px solid ${!managed ? color : t.border}`,
            color: !managed ? color : t.textSecondary,
            boxShadow: !managed && !reducedMotion ? `0 0 6px ${color}33` : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Self-hosted (EC2/EKS)
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {ROWS.map((r) => (
          <div
            key={r.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.5rem 0.7rem',
              borderRadius: 7,
              background: r.good ? `${t.accentPrimary}12` : `${t.accentWarn}12`,
              transition: 'background 0.3s ease',
            }}
          >
            <span style={{ fontSize: 10.5, color: t.textSecondary }}>{r.label}</span>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: r.good ? t.accentPrimary : t.accentWarn }}>{r.value}</span>
          </div>
        ))}
      </div>
    </VisualizationContainer>
  );
}