import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { TRANSACTIONS, ruleMetrics } from '../lib/unsupervisedMisc';

const RULES: { key: string; antecedent: string[]; consequent: string[] }[] = [
  { key: 'bb-m', antecedent: ['bread', 'butter'], consequent: ['milk'] },
  { key: 'e-m', antecedent: ['eggs'], consequent: ['milk'] },
  { key: 'b-e', antecedent: ['bread'], consequent: ['eggs'] },
];

export default function AssociationRulesDiagram() {
  const t = useVizTokens();
  const [ruleKey, setRuleKey] = useState('bb-m');
  const transactionCycle = useAutoCycle(TRANSACTIONS.length, 900);
  const rule = RULES.find((r) => r.key === ruleKey)!;

  const metrics = useMemo(() => ruleMetrics(rule.antecedent, rule.consequent), [rule]);

  return (
    <VisualizationContainer footer={`Real counts over ${TRANSACTIONS.length} toy transactions: support = ${metrics.support.toFixed(2)}, confidence = ${metrics.confidence.toFixed(2)}, lift = ${metrics.lift.toFixed(2)}. ${metrics.lift > 1.1 ? 'Lift well above 1 -- a genuine positive association, not just two popular items.' : metrics.lift < 0.9 ? 'Lift below 1 -- these items actually co-occur LESS than chance would predict.' : 'Lift near 1 -- essentially coincidental co-occurrence, despite whatever the confidence number alone might suggest.'}`}>
      <PillSelect label="Rule" value={ruleKey} onChange={(v) => { transactionCycle.stop(); setRuleKey(v as string); }} options={RULES.map((r) => ({ value: r.key, label: `{${r.antecedent.join(',')}} ⇒ {${r.consequent.join(',')}}` }))} />

      <div style={{ marginTop: 10, fontFamily: 'monospace', fontSize: 12, color: t.textMuted }}>
        {TRANSACTIONS.map((tx, i) => {
          const hasAnte = rule.antecedent.every((a) => tx.includes(a));
          const hasBoth = hasAnte && rule.consequent.every((c) => tx.includes(c));
          return (
            <div key={i} style={{ padding: '2px 4px', color: hasBoth ? t.accentPrimary : hasAnte ? t.accentWarn : t.textMuted, fontWeight: hasBoth ? 700 : 400, background: transactionCycle.value === i ? t.surfaceAlt : 'transparent', borderLeft: transactionCycle.value === i ? `3px solid ${hasBoth ? t.accentPrimary : hasAnte ? t.accentWarn : t.border}` : '3px solid transparent' }}>
              T{i + 1}: {'{' + tx.join(', ') + '}'} {hasBoth ? '✓ both' : hasAnte ? '(antecedent only)' : ''}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 12 }}>
        {[{ label: 'support', v: metrics.support }, { label: 'confidence', v: metrics.confidence }, { label: 'lift', v: metrics.lift }].map((m) => (
          <div key={m.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: t.accentPrimary, fontFamily: 'monospace' }}>{m.v.toFixed(2)}</div>
            <div style={{ fontSize: 11, color: t.textMuted }}>{m.label}</div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 6 }}>
        Green rows really contain both the antecedent and consequent; amber rows have the antecedent but not the consequent -- exactly what confidence measures the ratio of.
      </div>
    </VisualizationContainer>
  );
}
