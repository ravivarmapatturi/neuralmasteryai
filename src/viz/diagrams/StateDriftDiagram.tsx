import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

/** Terraform's state file lets it diff "declared" against "actually
 * exists" -- click to see plan compute a change and apply resolve it,
 * versus what a config change with no state to diff against would
 * mean: reapplying everything, blind. */
export default function StateDriftDiagram() {
  const t = useVizTokens();
  const { value, pick } = useAutoCycle(2, 3500, 0);
  const applied = value === 1;
  const color = getConceptColor(t, 'attention');
  const badColor = t.accentDanger;
  const okColor = t.accentPrimary;

  const RESOURCES = [
    { name: 'vpc', declared: 't2', actual: 't2' },
    { name: 'eks_cluster', declared: '1.29', actual: '1.28' },
    { name: 's3_bucket', declared: 'present', actual: 'present' },
  ];

  return (
    <VisualizationContainer footer={applied ? '"terraform apply" resolved the one diffed resource -- state now matches declared config again.' : 'State says eks_cluster is on 1.28, but the config now declares 1.29 -- "terraform plan" surfaces exactly this one line as a diff, leaving the two matching resources untouched.'}>
      <button type="button" onClick={() => pick(applied ? 0 : 1)} style={{ marginBottom: 10, padding: '6px 12px', borderRadius: 6, border: `1px solid ${color}`, background: applied ? `${color}15` : 'transparent', color, cursor: 'pointer', fontSize: 11.5, fontWeight: 700, transition: 'all 200ms ease' }}>
        {applied ? '↺ Reset to show drift' : '▶ Run terraform apply (reconcile drift)'}
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {RESOURCES.map((r) => {
          const matches = applied || r.declared === r.actual;
          return (
            <div key={r.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.7rem', borderRadius: 7, background: matches ? `${okColor}12` : `${badColor}15`, border: `1px solid ${matches ? `${okColor}25` : `${badColor}40`}`, transition: 'all 250ms ease' }}>
              <span style={{ fontSize: 10.5, color: t.textSecondary }}>{r.name}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: matches ? okColor : badColor }}>
                {matches ? '✓ declared = state' : `⚠ declared: ${r.declared} ≠ state: ${r.actual}`}
              </span>
            </div>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}
