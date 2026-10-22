import { useState } from 'react';
import VisualizationContainer from './primitives/VisualizationContainer';

export default function McpHeroStoryVisual() {
  const [mode, setMode] = useState<'without' | 'with'>('with');

  return (
    <VisualizationContainer>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a855f7', fontWeight: 700 }}>
            Visual Architecture Story
          </div>
          <h3 style={{ margin: '2px 0 0 0', fontSize: '18px', color: '#f8fafc', fontWeight: 800 }}>
            {mode === 'without' ? 'Without MCP: Fragile M×N Bespoke Integration Mesh' : 'With MCP: Standardized M+N USB-C Ecosystem'}
          </h3>
        </div>

        <div style={{ display: 'flex', background: '#020617', padding: '4px', borderRadius: '8px', border: '1px solid #1e293b' }}>
          <button
            onClick={() => setMode('without')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: mode === 'without' ? '#ef4444' : 'transparent',
              color: mode === 'without' ? '#ffffff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Without MCP (M×N Mesh)
          </button>
          <button
            onClick={() => setMode('with')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: mode === 'with' ? '#0284c7' : 'transparent',
              color: mode === 'with' ? '#ffffff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            With MCP (M+N Standard)
          </button>
        </div>
      </div>

      <div style={{ position: 'relative', minHeight: '260px', borderRadius: '12px', background: '#090d16', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {mode === 'without' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '13px', color: '#f43f5e', fontWeight: 600, textAlign: 'center', marginBottom: '8px' }}>
              Each AI App writes custom integration code for every single tool (12 custom clients to build & maintain)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              {['Claude Desktop', 'Cursor IDE', 'LangChain Agent'].map((app, i) => (
                <div key={i} style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>{app}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                    ├── GitHub Custom API Client<br/>
                    ├── Slack Custom Webhook Code<br/>
                    ├── Postgres SQL Query Wrapper<br/>
                    └── Local Filesystem Parser
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            {/* Top Row: AI Hosts */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {['Claude Desktop', 'Cursor IDE', 'smolagents App', 'Custom LLM Runtime'].map((app, i) => (
                <div key={i} style={{ padding: '8px 14px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', borderRadius: '8px', color: '#38bdf8', fontSize: '12px', fontWeight: 700 }}>
                  {app}
                </div>
              ))}
            </div>

            {/* Central Connector Line */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center' }}>
              <div style={{ height: '2px', flex: 1, background: 'linear-gradient(90deg, transparent, #38bdf8)' }} />
              <div style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #0284c7 0%, #7e22ce 100%)', borderRadius: '30px', color: '#ffffff', fontWeight: 800, fontSize: '14px', boxShadow: '0 0 20px rgba(168, 85, 247, 0.5)', border: '2px solid #ffffff' }}>
                Universal MCP Protocol (JSON-RPC 2.0)
              </div>
              <div style={{ height: '2px', flex: 1, background: 'linear-gradient(90deg, #7e22ce, transparent)' }} />
            </div>

            {/* Bottom Row: MCP Servers */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {['GitHub MCP Server', 'Slack MCP Server', 'Postgres MCP Server', 'Filesystem MCP Server'].map((server, j) => (
                <div key={j} style={{ padding: '8px 14px', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid #a855f7', borderRadius: '8px', color: '#c084fc', fontSize: '12px', fontWeight: 700 }}>
                  {server}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </VisualizationContainer>
  );
}
