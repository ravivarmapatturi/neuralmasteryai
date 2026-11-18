import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

type Part = 'method' | 'url' | 'reqHeaders' | 'reqBody' | 'status' | 'resHeaders' | 'resBody';
const PART_KEYS: Part[] = ['method', 'url', 'reqHeaders', 'reqBody', 'status', 'resHeaders', 'resBody'];
const PARTS: Record<Part, { label: string; example: string; desc: string; side: 'req' | 'res' }> = {
  method: { label: 'Method', example: 'POST', side: 'req', desc: 'What kind of action -- GET, POST, PUT, PATCH, DELETE.' },
  url: { label: 'URL', example: '/v1/messages', side: 'req', desc: 'Which resource this request targets.' },
  reqHeaders: { label: 'Headers', example: 'Authorization: Bearer sk-...\nContent-Type: application/json', side: 'req', desc: 'Metadata about the request -- auth token, content type, etc.' },
  reqBody: { label: 'Body', example: '{ "prompt": "..." }', side: 'req', desc: 'The actual payload -- your prompt, as JSON.' },
  status: { label: 'Status code', example: '200 OK', side: 'res', desc: 'Did it work, and how -- 2xx success, 4xx your fault, 5xx server\'s fault.' },
  resHeaders: { label: 'Headers', example: 'Content-Type: application/json', side: 'res', desc: 'Metadata about the response.' },
  resBody: { label: 'Body', example: '{ "content": "..." }', side: 'res', desc: 'The actual result -- the model\'s reply, as JSON.' },
};

/** The exact same cycle underlies a browser page load and an LLM API call
 * -- click any part to see what it is and a real example. */
export default function RequestResponseCycleDiagram() {
  const t = useVizTokens();
  const { value: activeIdx, pick: setActiveIdx, stop } = useAutoCycle(PART_KEYS.length, 3000, 3);
  const active = PART_KEYS[activeIdx];
  const reqColor = getConceptColor(t, 'query');
  const resColor = getConceptColor(t, 'attention');
  const info = PARTS[active];

  function Chip({ k }: { k: Part }) {
    const p = PARTS[k];
    const color = p.side === 'req' ? reqColor : resColor;
    const isActive = active === k;
    return (
      <div
        onClick={() => { stop(); setActiveIdx(PART_KEYS.indexOf(k)); }}
        onMouseEnter={() => { stop(); setActiveIdx(PART_KEYS.indexOf(k)); }}
        style={{ cursor: 'pointer', padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: isActive ? 700 : 500, background: isActive ? `${color}25` : t.surfaceAlt, border: `1.25px solid ${isActive ? color : t.border}`, color }}
      >
        {p.label}
      </div>
    );
  }

  return (
    <VisualizationContainer footer={info.desc}>
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: reqColor, marginBottom: 6 }}>REQUEST (client → server)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <Chip k="method" /><Chip k="url" /><Chip k="reqHeaders" /><Chip k="reqBody" />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: resColor, marginBottom: 6 }}>RESPONSE (server → client)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <Chip k="status" /><Chip k="resHeaders" /><Chip k="resBody" />
          </div>
        </div>
      </div>
      <div style={{ marginTop: 10, padding: '0.6rem 0.8rem', borderRadius: 7, background: t.surfaceAlt, fontFamily: 'monospace', fontSize: 11, color: t.textSecondary, whiteSpace: 'pre-wrap' }}>
        {info.example}
      </div>
    </VisualizationContainer>
  );
}
