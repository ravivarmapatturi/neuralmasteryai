import { useState } from 'react';
import { useVizTokens } from '../../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader } from '../../primitives';

// Same billing rule as the post's session_cost(): prices in $ per million tokens.
export function sessionCost(turns: number, observation = 200, cache = true, system = 6000, output = 300, priceIn = 1, priceCached = 0.1, priceOut = 5) {
  let total = 0, context = system;
  const perTurn: { cached: number; fresh: number; out: number }[] = [];
  for (let t = 0; t < turns; t++) {
    const fresh = t === 0 || !cache ? context : observation;
    const cached = context - fresh;
    const c = { cached: (priceCached * cached) / 1e6, fresh: (priceIn * fresh) / 1e6, out: (priceOut * output) / 1e6 };
    perTurn.push(c);
    total += c.cached + c.fresh + c.out;
    context += output + observation;
  }
  return { total, perTurn };
}

export default function AgentTurnCost() {
  const t = useVizTokens();
  const [turns, setTurns] = useState(40);
  const [obs, setObs] = useState(200);
  const [cache, setCache] = useState(true);
  const { total, perTurn } = sessionCost(turns, obs, cache);
  const base = sessionCost(40).total;
  const W = 520, H = 170, maxTurnCost = Math.max(...sessionCost(60, 400, false).perTurn.map(p => p.cached + p.fresh + p.out));
  const bw = (W - 40) / 60;
  const y = (v: number) => (v / maxTurnCost) * (H - 30);
  return (
    <VisualizationContainer title="Session cost" footer={`${turns} turns, ${obs}-token tool outputs, caching ${cache ? 'on' : 'off'}: $${total.toFixed(3)} per session (40 turns with defaults: $${base.toFixed(3)}). Each bar is one turn: cached history (light), new tokens (dark), and the model's output (top). Same billing rule and prices as the code in this post; real sessions vary.`}>
      <VisualizationHeader eyebrow="TRY IT" title="What actually makes an agent session expensive?" description="Change the number of turns, the size of each tool output, and caching. Watch which one moves the total." />
      <div style={{ display: 'grid', gap: '0.6rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '0.75rem', color: t.textPrimary }}>
        <label>Turns: <strong>{turns}</strong><input aria-label="Turns in the session" type="range" min={5} max={60} value={turns} onChange={e => setTurns(Number(e.target.value))} style={{ width: '100%' }} /></label>
        <label>Tool output: <strong>{obs} tokens</strong><input aria-label="Tokens per tool output" type="range" min={50} max={400} step={10} value={obs} onChange={e => setObs(Number(e.target.value))} style={{ width: '100%' }} /></label>
        <label style={{ alignSelf: 'center' }}><input type="checkbox" checked={cache} onChange={e => setCache(e.target.checked)} /> Prefix caching</label>
      </div>
      <p style={{ margin: '0 0 0.5rem', fontSize: 22, fontWeight: 700, color: t.textPrimary }}>${total.toFixed(3)} <span style={{ fontSize: 14, fontWeight: 400, color: t.textSecondary }}>per session · {total > base ? '+' : ''}{Math.round(((total - base) / base) * 100)}% vs 40 turns with defaults</span></p>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Per-turn cost over ${turns} turns; total ${total.toFixed(3)} dollars.`}>
        {perTurn.map((p, i) => {
          const x = 30 + i * bw;
          const hc = y(p.cached), hf = y(p.fresh), ho = y(p.out);
          return <g key={i}>
            <rect x={x} y={H - 20 - hc} width={bw - 1} height={hc} fill={t.accentSecondary} opacity={0.45} />
            <rect x={x} y={H - 20 - hc - hf} width={bw - 1} height={hf} fill={t.accentSecondary} />
            <rect x={x} y={H - 20 - hc - hf - ho} width={bw - 1} height={ho} fill={t.accentPrimary} />
          </g>;
        })}
        <line x1={30} y1={H - 20} x2={W - 10} y2={H - 20} stroke={t.border} />
        <text x={30} y={H - 4} fontSize={11} fill={t.textSecondary}>turn 1</text>
        <text x={W - 10} y={H - 4} fontSize={11} textAnchor="end" fill={t.textSecondary}>turn 60</text>
      </svg>
    </VisualizationContainer>
  );
}
