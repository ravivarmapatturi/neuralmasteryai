import { useState } from 'react';
import VisualizationContainer from './primitives/VisualizationContainer';

type TransportMode = 'stdio' | 'http' | 'sse';

export default function McpTransportAnimator() {
  const [transport, setTransport] = useState<TransportMode>('stdio');

  return (
    <VisualizationContainer>
      <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#38bdf8', fontWeight: 700, marginBottom: '4px' }}>
        Byte Transport Mechanics
      </div>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#f8fafc', fontWeight: 800 }}>
        Interactive Transport Switcher & Animated Byte Flow
      </h3>

      {/* Mode Switcher */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { id: 'stdio', label: 'stdio (Local Subprocess)', color: '#38bdf8' },
          { id: 'http', label: 'Streamable HTTP (Remote POST)', color: '#a855f7' },
          { id: 'sse', label: 'SSE (Server-Sent Events Stream)', color: '#10b981' }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTransport(t.id as TransportMode)}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: transport === t.id ? `2px solid ${t.color}` : '1px solid rgba(255,255,255,0.1)',
              background: transport === t.id ? 'rgba(255,255,255,0.06)' : '#090d16',
              color: transport === t.id ? '#ffffff' : '#94a3b8',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Visualizer Canvas */}
      <div style={{ padding: '20px', borderRadius: '12px', background: '#020617', border: '1px solid #1e293b' }}>
        {transport === 'stdio' && (
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8', marginBottom: '8px' }}>
              stdio: Subprocess stdin / stdout Channel
            </div>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 16px 0' }}>
              The client spawns the MCP server as a local child process. Requests pass over `stdin`, responses over `stdout`, and logs over `stderr`.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#0b0f19', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <div style={{ padding: '10px 16px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', borderRadius: '6px', color: '#38bdf8', fontWeight: 700, fontSize: '13px' }}>
                CLIENT (Host App)
              </div>

              <div style={{ textAlign: 'center', flex: 1, margin: '0 16px' }}>
                <div style={{ fontSize: '11px', color: '#10b981', fontFamily: 'monospace', marginBottom: '4px' }}>{'══ stdin / stdout ══>'}</div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>Newline-delimited JSON-RPC 2.0</div>
              </div>

              <div style={{ padding: '10px 16px', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid #a855f7', borderRadius: '6px', color: '#c084fc', fontWeight: 700, fontSize: '13px' }}>
                LOCAL MCP SERVER
              </div>
            </div>
          </div>
        )}

        {transport === 'http' && (
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#a855f7', marginBottom: '8px' }}>
              Streamable HTTP: Remote Network Endpoint POST
            </div>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 16px 0' }}>
              Every client request is an HTTP POST to a remote endpoint (e.g. `https://api.example.com/mcp`) carrying structured JSON payloads.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#0b0f19', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <div style={{ padding: '10px 16px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', borderRadius: '6px', color: '#38bdf8', fontWeight: 700, fontSize: '13px' }}>
                CLIENT (Host App)
              </div>

              <div style={{ textAlign: 'center', flex: 1, margin: '0 16px' }}>
                <div style={{ fontSize: '11px', color: '#c084fc', fontFamily: 'monospace', marginBottom: '4px' }}>{'POST /mcp (HTTPS) ──>'}</div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>Accept: application/json</div>
              </div>

              <div style={{ padding: '10px 16px', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid #a855f7', borderRadius: '6px', color: '#c084fc', fontWeight: 700, fontSize: '13px' }}>
                REMOTE MCP SERVER
              </div>
            </div>
          </div>
        )}

        {transport === 'sse' && (
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#10b981', marginBottom: '8px' }}>
              SSE: Server-Sent Events Streaming Connection
            </div>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 16px 0' }}>
              Client opens a GET request to establish a standing SSE stream, allowing the server to push real-time updates and progress frames.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#0b0f19', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <div style={{ padding: '10px 16px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', borderRadius: '6px', color: '#38bdf8', fontWeight: 700, fontSize: '13px' }}>
                CLIENT (Host App)
              </div>

              <div style={{ textAlign: 'center', flex: 1, margin: '0 16px' }}>
                <div style={{ fontSize: '11px', color: '#34d399', fontFamily: 'monospace', marginBottom: '4px' }}>{'<══ SSE Event Stream ══'}</div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>Content-Type: text/event-stream</div>
              </div>

              <div style={{ padding: '10px 16px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', borderRadius: '6px', color: '#34d399', fontWeight: 700, fontSize: '13px' }}>
                GRADIO / HF SPACE
              </div>
            </div>
          </div>
        )}
      </div>
    </VisualizationContainer>
  );
}
