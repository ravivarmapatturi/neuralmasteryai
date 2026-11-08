import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, Slider } from '../primitives';

/** Calculated constant-traffic, 30-day request-budget model. */
export default function ErrorBudgetExplorer() {
  const t = useVizTokens();
  const [errorPercent, setErrorPercent] = useState(2);
  const burn = errorPercent / .1;
  const consumed = burn / (30*24) * 100;
  return <VisualizationContainer footer="At constant traffic, a 99.9% 30-day objective allows a 0.1% bad-request fraction. A 2% failure rate burns budget 20 times faster than the sustainable rate and consumes 2.78% of the monthly allowance in one hour.">
    <VisualizationHeader title="How quickly does an incident spend the budget?" description="Change the observed bad-request percentage during one hour; the objective remains 99.9%." />
    <Slider label="Observed failures (%)" value={errorPercent} onChange={setErrorPercent} min={0} max={10} step={.1} />
    <svg viewBox="0 0 300 145" width="100%" role="img" aria-label={`${burn.toFixed(1)} times burn rate; ${consumed.toFixed(2)} percent monthly budget spent in an hour`}>
      <text x={8} y={22} fill={t.textPrimary} fontSize={14}>Burn rate: {burn.toFixed(1)}×</text>
      <text x={8} y={52} fill={t.textPrimary} fontSize={14}>One hour spends {consumed.toFixed(2)}%</text>
      <rect x={8} y={70} width={280} height={25} fill={t.surfaceAlt} stroke={t.border}/>
      <rect x={8} y={70} width={280*Math.min(1,consumed/100)} height={25} fill={t.accentPrimary}/>
      <text x={8} y={120} fill={t.textSecondary} fontSize={12}>0% of monthly budget</text>
      <text x={288} y={140} textAnchor="end" fill={t.textSecondary} fontSize={12}>100%</text>
    </svg>
    <p role="status">{burn > 0 ? `At this constant rate, a full budget lasts ${(720/burn).toFixed(1)} hours.` : 'No budget is consumed by this observed interval.'}</p>
  </VisualizationContainer>;
}
