import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle, usePrefersReducedMotion } from '../primitives';
import { getConceptColor } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

/** A quick preview of the two deployment shapes an MCP server can
 * take -- the full mechanics are in the protocol deep dive. */
export default function McpLocalVsRemoteDiagram() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const cyc = useAutoCycle(2, 4000);
  const remote = cyc.value === 1;
  const color = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer={remote ? 'Runs as an independent, network-reachable service over HTTP -- many different clients can connect to the same server at once. Necessary once a server isn\'t just a local subprocess (a hosted MCP server for a SaaS product, for example).' : 'The client launches the server as a local subprocess and talks to it over stdin/stdout -- simplest possible setup, for local tools where client and server run on the same machine.'}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => cyc.pick(0)}
          style={{
            flex: 1,
            padding: '6px 10px',
            borderRadius: 6,
            fontSize: 10.5,
            fontWeight: !remote ? 700 : 500,
            background: !remote ? `${color}20` : t.surfaceAlt,
            border: `1.25px solid ${!remote ? color : t.border}`,
            color: !remote ? color : t.textSecondary,
            boxShadow: !remote && !reducedMotion ? `0 0 6px ${color}33` : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Local (stdio)
        </button>
        <button
          type="button"
          onClick={() => cyc.pick(1)}
          style={{
            flex: 1,
            padding: '6px 10px',
            borderRadius: 6,
            fontSize: 10.5,
            fontWeight: remote ? 700 : 500,
            background: remote ? `${color}20` : t.surfaceAlt,
            border: `1.25px solid ${remote ? color : t.border}`,
            color: remote ? color : t.textSecondary,
            boxShadow: remote && !reducedMotion ? `0 0 6px ${color}33` : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Remote (HTTP)
        </button>
      </div>
      <SketchBox color={color}>
        <div style={{ padding: '0.6rem 0.8rem', background: `${color}10`, textAlign: 'center' }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, fontFamily: HAND_FONT, color: t.textPrimary }}>{remote ? 'One server, many clients over the network' : 'One client, one local subprocess'}</span>
        </div>
      </SketchBox>
    </VisualizationContainer>
  );
}