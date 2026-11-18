import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const ROWS = [
  { key: 'short-poll', label: 'Short polling', latency: 1, serverPush: false, complexity: 1, connCost: 1, when: 'Occasional updates, simplicity beats latency.' },
  { key: 'long-poll', label: 'Long polling', latency: 2, serverPush: false, complexity: 2, connCost: 2, when: 'Need lower latency than polling, can\'t use SSE/WebSockets (e.g. older infra).' },
  { key: 'webhook', label: 'Webhook', latency: 3, serverPush: true, complexity: 3, connCost: 1, when: 'You\'re the receiver of a 3rd-party integration (payments, CI) -- often the provider\'s only option.' },
  { key: 'sse', label: 'SSE', latency: 3, serverPush: true, complexity: 2, connCost: 2, when: 'Streaming one-directional output -- this is what LLM token streaming uses.' },
  { key: 'websocket', label: 'WebSocket', latency: 3, serverPush: true, complexity: 3, connCost: 3, when: 'Client also needs to push mid-stream -- realtime audio, interactive agent sessions.' },
];

function Dots({ n, color, t }: { n: number; color: string; t: ReturnType<typeof useVizTokens> }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i <= n ? color : t.border }} />
      ))}
    </div>
  );
}

/** All five patterns on the axes that actually drive the choice --
 * click a row for when it's the right call. */
export default function PatternComparisonMatrixDiagram() {
  const t = useVizTokens();
  const { value: selectedIdx, pick: setSelectedIdx, stop } = useAutoCycle(ROWS.length, 3200, 3);
  const color = getConceptColor(t, 'attention');
  const active = ROWS[selectedIdx];
  const selected = active.key;

  return (
    <VisualizationContainer footer={`When to use ${active.label}: ${active.when}`}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '4px 8px', color: t.textMuted, fontWeight: 600 }}>Pattern</th>
              <th style={{ textAlign: 'left', padding: '4px 8px', color: t.textMuted, fontWeight: 600 }}>Latency</th>
              <th style={{ textAlign: 'left', padding: '4px 8px', color: t.textMuted, fontWeight: 600 }}>Server push?</th>
              <th style={{ textAlign: 'left', padding: '4px 8px', color: t.textMuted, fontWeight: 600 }}>Complexity</th>
              <th style={{ textAlign: 'left', padding: '4px 8px', color: t.textMuted, fontWeight: 600 }}>Connection cost</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r, i) => {
              const isSelected = selected === r.key;
              return (
                <tr key={r.key} onClick={() => { stop(); setSelectedIdx(i); }} onMouseEnter={() => { stop(); setSelectedIdx(i); }} style={{ cursor: 'pointer', background: isSelected ? `${color}12` : 'transparent' }}>
                  <td style={{ padding: '6px 8px', fontWeight: isSelected ? 700 : 500, color: isSelected ? color : t.textPrimary }}>{r.label}</td>
                  <td style={{ padding: '6px 8px' }}><Dots n={r.latency} color={color} t={t} /></td>
                  <td style={{ padding: '6px 8px', color: r.serverPush ? t.accentPrimary : t.textMuted }}>{r.serverPush ? 'yes' : 'no'}</td>
                  <td style={{ padding: '6px 8px' }}><Dots n={r.complexity} color={color} t={t} /></td>
                  <td style={{ padding: '6px 8px' }}><Dots n={r.connCost} color={color} t={t} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        Click a row -- "Latency" here means how quickly a change reaches the client after it happens (higher dots = faster).
      </div>
    </VisualizationContainer>
  );
}
