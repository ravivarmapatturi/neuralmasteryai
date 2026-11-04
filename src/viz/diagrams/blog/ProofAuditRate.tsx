import { useState } from 'react';
import { useVizTokens } from '../../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader } from '../../primitives';

// Audit model behind the post's figure and its Python snippet.
// Each request is audited independently with probability `audit`, drawn after the reply has been served.
// Only the overhead (72x and 94x, Anthropic's measurements) is real; the traffic numbers are illustrative.
export function chanceCaught(audit: number, swapped: number, exposed: number, requests: number) {
  return 1 - Math.pow(1 - audit * swapped * exposed, requests);
}

export function gpuCost(audit: number, overhead: number) {
  return 1 + audit * overhead;
}

const REQUESTS = [1000, 10000, 100000];
const pct = (v: number) => `${(v * 100).toFixed(v < 0.01 ? 2 : 1)}%`;

export default function ProofAuditRate() {
  const t = useVizTokens();
  const [audit, setAudit] = useState(0.01);
  const [swapped, setSwapped] = useState(0.01);
  const [exposed, setExposed] = useState(1);
  const [requests, setRequests] = useState(10000);
  const [overhead, setOverhead] = useState(72);
  const caught = chanceCaught(audit, swapped, exposed, requests);
  const cost = gpuCost(audit, overhead);

  const W = 340, H = 190, left = 42, right = 10, top = 10, bottom = 40, maxAudit = 0.1;
  const x = (a: number) => left + (a / maxAudit) * (W - left - right);
  const y = (p: number) => H - bottom - p * (H - top - bottom);
  const curve = Array.from({ length: 101 }, (_, i) => {
    const a = (i / 100) * maxAudit;
    return `${i ? 'L' : 'M'}${x(a).toFixed(1)} ${y(chanceCaught(a, swapped, exposed, requests)).toFixed(1)}`;
  }).join(' ');

  return (
    <VisualizationContainer title="Audit rate" footer={`Auditing ${pct(audit)} of ${requests.toLocaleString()} requests costs ${cost.toFixed(2)}x the GPU time of serving alone and catches a provider who swaps ${pct(swapped)} of them with probability ${pct(caught)}. The ${overhead}x overhead is Anthropic's measurement; the traffic, swap rate and exposure values are illustrative, and the audit scheme is our sketch, not a FlashProve feature.`}>
      <VisualizationHeader eyebrow="TRY IT" title="How much proving do you need to catch a swap?" description="Proofs cost too much to attach to everything. Change how often you audit and how often the provider cheats." />
      <div style={{ display: 'grid', gap: '0.6rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '0.75rem', color: t.textPrimary }}>
        <label>Requests audited: <strong>{pct(audit)}</strong><input aria-label="Share of requests audited" type="range" min={0.001} max={0.1} step={0.001} value={audit} onChange={e => setAudit(Number(e.target.value))} style={{ width: '100%' }} /></label>
        <label>Requests swapped: <strong>{pct(swapped)}</strong><input aria-label="Share of requests served by a different model" type="range" min={0.001} max={0.1} step={0.001} value={swapped} onChange={e => setSwapped(Number(e.target.value))} style={{ width: '100%' }} /></label>
        <label>An audit exposes a swap: <strong>{Math.round(exposed * 100)}%</strong><input aria-label="Chance that one audit of a swapped request exposes it" type="range" min={0.1} max={1} step={0.05} value={exposed} onChange={e => setExposed(Number(e.target.value))} style={{ width: '100%' }} /></label>
        <label>Requests served
          <select aria-label="Requests served" value={requests} onChange={e => setRequests(Number(e.target.value))} style={{ width: '100%', marginTop: 4, background: t.surface, color: t.textPrimary, border: `1px solid ${t.border}`, borderRadius: 6, padding: '0.25rem' }}>
            {REQUESTS.map(n => <option key={n} value={n}>{n.toLocaleString()}</option>)}
          </select>
        </label>
        <label>Proving overhead
          <select aria-label="Proving overhead compared with plain inference" value={overhead} onChange={e => setOverhead(Number(e.target.value))} style={{ width: '100%', marginTop: 4, background: t.surface, color: t.textPrimary, border: `1px solid ${t.border}`, borderRadius: 6, padding: '0.25rem' }}>
            <option value={72}>72x (batch of 24)</option>
            <option value={94}>94x (vLLM at highest load)</option>
          </select>
        </label>
      </div>
      <p style={{ margin: '0 0 0.5rem', fontSize: 22, fontWeight: 700, color: t.textPrimary }}>{pct(caught)} <span style={{ display: 'block', fontSize: 14, fontWeight: 400, color: t.textSecondary }}>chance of catching it · {cost.toFixed(2)}x GPU time</span></p>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Chance of catching a swap rises with the audit rate; at ${pct(audit)} audited it is ${pct(caught)}, for ${cost.toFixed(2)} times the GPU time.`}>
        {[0, 0.5, 1].map(p => <g key={p}>
          <line x1={left} x2={W - right} y1={y(p)} y2={y(p)} stroke={t.border} />
          <text x={left - 6} y={y(p) + 4} fontSize={12} textAnchor="end" fill={t.textSecondary}>{p * 100}%</text>
        </g>)}
        {[0, 0.05, 0.1].map(a => <text key={a} x={x(a)} y={H - bottom + 16} fontSize={12} textAnchor={a === 0.1 ? 'end' : a === 0 ? 'start' : 'middle'} fill={t.textSecondary}>{a * 100}%</text>)}
        <text x={left + (W - left - right) / 2} y={H - 6} fontSize={12} textAnchor="middle" fill={t.textSecondary}>share of requests audited</text>
        <path d={curve} fill="none" stroke={t.accentSecondary} strokeWidth={2} />
        <line x1={x(audit)} x2={x(audit)} y1={y(0)} y2={y(caught)} stroke={t.accentPrimary} strokeDasharray="3 3" />
        <circle cx={x(audit)} cy={y(caught)} r={5} fill={t.accentPrimary} />
      </svg>
    </VisualizationContainer>
  );
}
