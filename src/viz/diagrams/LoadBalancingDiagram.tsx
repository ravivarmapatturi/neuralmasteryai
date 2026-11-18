import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type Strategy = 'roundrobin' | 'leastconn' | 'hash';
const STRATEGIES: Strategy[] = ['leastconn', 'roundrobin', 'hash'];
const N_BACKENDS = 3;

// 9 requests with wildly different costs -- a short completion vs. a long
// one, exactly the LLM-inference case the prose calls out. "key" is the
// value consistent hashing would route on (e.g. a session/prompt prefix).
const REQUESTS = [
  { cost: 20, key: 'userA' },
  { cost: 80, key: 'userB' },
  { cost: 15, key: 'userA' },
  { cost: 90, key: 'userC' },
  { cost: 25, key: 'userB' },
  { cost: 10, key: 'userA' },
  { cost: 70, key: 'userD' },
  { cost: 30, key: 'userC' },
  { cost: 60, key: 'userB' },
];

function simpleHash(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 997;
  return h;
}

function simulate(strategy: Strategy): number[] {
  const load = Array(N_BACKENDS).fill(0);
  REQUESTS.forEach((r, i) => {
    let backend: number;
    if (strategy === 'roundrobin') backend = i % N_BACKENDS;
    else if (strategy === 'hash') backend = simpleHash(r.key) % N_BACKENDS;
    else backend = load.indexOf(Math.min(...load));
    load[backend] += r.cost;
  });
  return load;
}

const EXPLAIN: Record<Strategy, string> = {
  roundrobin: 'Cycles through backends in fixed order, ignoring cost -- a run of expensive requests landing on the same backend by chance creates real imbalance, visible above.',
  leastconn: 'Always routes to whichever backend currently has the least outstanding load -- adapts to variable request cost, producing the most even distribution of the three.',
  hash: "Routes by a key (e.g. session or prompt prefix), so the same key always lands on the same backend -- not load-balanced by cost at all, but requests sharing that backend's warm cache/state keep reusing it instead of cold-starting elsewhere.",
};

export default function LoadBalancingDiagram() {
  const t = useVizTokens();
  const { value: stratIdx, pick: setStratIdx, stop } = useAutoCycle(STRATEGIES.length, 3500, 0);
  const strategy = STRATEGIES[stratIdx];
  const load = simulate(strategy);
  const maxLoad = Math.max(...load, 1);
  const color = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer={EXPLAIN[strategy]}>
      <PillSelect<Strategy>
        label="Strategy"
        value={strategy}
        onChange={(val) => {
          const v = typeof val === 'function' ? val(strategy) : val;
          stop();
          setStratIdx(STRATEGIES.indexOf(v));
        }}
        options={[
          { value: 'roundrobin', label: 'Round-robin' },
          { value: 'leastconn', label: 'Least-connections' },
          { value: 'hash', label: 'Consistent hashing' },
        ]}
      />
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end', height: 120, marginTop: 12 }}>
        {load.map((l, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ width: 60, height: (l / maxLoad) * 90, background: color, opacity: 0.5 + (i / N_BACKENDS) * 0.3, borderRadius: '4px 4px 0 0' }} />
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: t.textMuted, marginTop: 4 }}>backend {i}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, marginTop: 8 }}>
        9 requests, costs ranging 10-90 (a short vs. a long LLM completion) — bar height is total load assigned per backend.
      </div>
    </VisualizationContainer>
  );
}
