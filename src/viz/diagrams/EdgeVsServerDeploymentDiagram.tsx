import { useAutoCycle } from '../primitives';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type Target = 'server' | 'edge';
const TARGETS: Target[] = ['server', 'edge'];
const AXES = [
  { key: 'throughput', label: 'Throughput/batching', server: 3, edge: 1 },
  { key: 'privacy', label: 'Privacy (data leaves device?)', server: 1, edge: 3 },
  { key: 'offline', label: 'Works offline', server: 1, edge: 3 },
  { key: 'cost', label: 'Zero marginal cost per inference', server: 1, edge: 3 },
];

function Dots({ n, color, t }: { n: number; color: string; t: ReturnType<typeof useVizTokens> }) {
  return <div style={{ display: 'flex', gap: 2 }}>{[1, 2, 3].map((i) => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i <= n ? color : t.border }} />)}</div>;
}

/** Server-side and on-device inference trade the exact same four things
 * in opposite directions -- toggle to see which side wins each axis. */
export default function EdgeVsServerDeploymentDiagram() {
  const t = useVizTokens();
  const { value: focusIdx, pick } = useAutoCycle(TARGETS.length, 3500, 1);
  const focus = TARGETS[focusIdx];
  const serverColor = getConceptColor(t, 'query');
  const edgeColor = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer={focus === 'server' ? 'Server-side: raw throughput and batching win, at the cost of a network round trip and per-request infrastructure cost.' : 'Edge/on-device: privacy, offline capability, and zero marginal cost win -- llama.cpp/GGUF, ExecuTorch, Core ML, MLX chosen by target platform, not raw throughput (rarely the binding constraint for single-request-at-a-time on-device work).'}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {TARGETS.map((k, idx) => (
          <div key={k} onClick={() => pick(idx)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(idx); } }} style={{ cursor: 'pointer', padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: focus === k ? 700 : 500, background: focus === k ? `${k === 'server' ? serverColor : edgeColor}25` : t.surfaceAlt, color: focus === k ? (k === 'server' ? serverColor : edgeColor) : t.textSecondary, border: `1.25px solid ${focus === k ? (k === 'server' ? serverColor : edgeColor) : t.border}` }}>
            {k === 'server' ? 'Server-side serving' : 'Edge / on-device'}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {AXES.map((a) => (
          <div key={a.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5 }}>
            <span style={{ color: t.textSecondary }}>{a.label}</span>
            <Dots n={focus === 'server' ? a.server : a.edge} color={focus === 'server' ? serverColor : edgeColor} t={t} />
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        No network round-trip at all on-device -- a structurally different tradeoff, not just "smaller/slower."
      </div>
    </VisualizationContainer>
  );
}
