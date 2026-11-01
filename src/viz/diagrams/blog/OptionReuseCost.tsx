import { useState } from 'react';
import { useVizTokens } from '../../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader } from '../../primitives';

const TOKENS_PER_OPTION = 40; // illustrative size of one tool/label description
const fmt = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}k` : String(Math.round(n)));

export default function OptionReuseCost() {
  const t = useVizTokens();
  const [requests, setRequests] = useState(10000);
  const [options, setOptions] = useState(300);
  const llm = requests * options * TOKENS_PER_OPTION; // every prompt re-reads every option
  const encodeOnce = options * TOKENS_PER_OPTION; // option vectors computed once and stored
  const W = 520;
  const logW = (n: number) => (Math.log10(Math.max(1, n)) / 11) * (W - 200);
  return (
    <VisualizationContainer title="Reusing the options" footer={`${fmt(requests)} requests choosing among ${options} options of about ${TOKENS_PER_OPTION} tokens each (illustrative size). Listing the options in an LLM prompt reads them again for every request: ${fmt(llm)} option tokens. Encoding them once, as bi-encoders and decision models do, reads ${fmt(encodeOnce)}. Log scale; the request itself is read in both cases and is left out.`}>
      <VisualizationHeader eyebrow="TRY IT" title="How many times do the options get read?" description="Raise the traffic and the size of the option list. The bars use a log scale, so each step to the right is ten times more." />
      <div style={{ display: 'grid', gap: '0.6rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '0.75rem', color: t.textPrimary }}>
        <label>Requests: <strong>{fmt(requests)}</strong><input aria-label="Number of requests" type="range" min={1} max={6} step={0.1} value={Math.log10(requests)} onChange={e => setRequests(Math.round(10 ** Number(e.target.value)))} style={{ width: '100%' }} /></label>
        <label>Options: <strong>{options}</strong><input aria-label="Number of options" type="range" min={2} max={1000} value={options} onChange={e => setOptions(Number(e.target.value))} style={{ width: '100%' }} /></label>
      </div>
      <svg viewBox={`0 0 ${W} 110`} width="100%" role="img" aria-label={`Option tokens read: ${fmt(llm)} when prompting an LLM, ${fmt(encodeOnce)} when encoding once.`}>
        {[['Options in every prompt', llm, t.accentDanger], ['Encode options once', encodeOnce, t.accentPrimary]].map(([label, n, c], i) => (
          <g key={String(label)} transform={`translate(0 ${12 + i * 48})`}>
            <text x={0} y={20} fontSize={13} fill={t.textPrimary}>{String(label)}</text>
            <rect x={175} y={4} width={Math.max(2, logW(Number(n)))} height={24} rx={4} fill={String(c)} />
            <text x={181 + logW(Number(n))} y={21} fontSize={13} fontWeight={700} fill={t.textPrimary}>{fmt(Number(n))} tokens</text>
          </g>
        ))}
      </svg>
    </VisualizationContainer>
  );
}
