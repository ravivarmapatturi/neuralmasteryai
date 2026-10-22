import { useState } from 'react';
import VisualizationContainer from './primitives/VisualizationContainer';
import VisualizationHeader from './primitives/VisualizationHeader';

type CapabilityType = 'tools' | 'resources' | 'prompts' | 'sampling';

export default function McpCapabilityMatrixWidget() {
  const [activeCap, setActiveCap] = useState<CapabilityType>('tools');
  const [sampleArgText, setSampleArgText] = useState('Neural Mastery is awesome!');
  const [numA, setNumA] = useState(12);
  const [numB, setNumB] = useState(8);

  return (
    <VisualizationContainer>
      <VisualizationHeader
        title="Interactive MCP Capability Matrix & JSON-RPC Payload Inspector"
        description="Select a capability tab to explore how Tools, Resources, Prompts, and Sampling serialize input arguments and output schemas."
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { id: 'tools', label: 'Tools (Actions)', color: '#38bdf8' },
          { id: 'resources', label: 'Resources (Data Feeds)', color: '#a855f7' },
          { id: 'prompts', label: 'Prompts (Templates)', color: '#f59e0b' },
          { id: 'sampling', label: 'Sampling (LLM Feedback)', color: '#10b981' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveCap(tab.id as CapabilityType)}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: activeCap === tab.id ? `2px solid ${tab.color}` : '1px solid rgba(255,255,255,0.1)',
              background: activeCap === tab.id ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.4)',
              color: activeCap === tab.id ? '#ffffff' : '#94a3b8',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {/* Left Column: Interactive Inputs */}
        <div style={{ background: '#090d16', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#f8fafc', fontWeight: 700 }}>
            Interactive Capability Execution
          </h4>

          {activeCap === 'tools' && (
            <div>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>
                Tools are executable functions called by the LLM to perform computed actions.
              </p>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>Parameter A:</label>
                <input
                  type="number"
                  value={numA}
                  onChange={(e) => setNumA(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>Parameter B:</label>
                <input
                  type="number"
                  value={numB}
                  onChange={(e) => setNumB(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '13px' }}
                />
              </div>
            </div>
          )}

          {activeCap === 'resources' && (
            <div>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>
                Resources are read-only data sources identified by URI schemes (`file://`, `postgres://`).
              </p>
              <div style={{ padding: '12px', background: '#0f172a', borderRadius: '8px', border: '1px dashed #a855f7' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#c084fc', marginBottom: '4px' }}>URI: file:///workspace/config.json</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>MIME: application/json</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>Size: 248 bytes</div>
              </div>
            </div>
          )}

          {activeCap === 'prompts' && (
            <div>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>
                Prompts are standardized workflow templates parameterized by user inputs.
              </p>
              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>Prompt Argument (Topic):</label>
                <input
                  type="text"
                  value={sampleArgText}
                  onChange={(e) => setSampleArgText(e.target.value)}
                  style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '13px' }}
                />
              </div>
            </div>
          )}

          {activeCap === 'sampling' && (
            <div>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>
                Sampling allows an MCP Server to initiate a completion request back to the Host LLM.
              </p>
              <div style={{ padding: '12px', background: '#0f172a', borderRadius: '8px', border: '1px solid #10b981' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#34d399' }}>Server $\rightarrow$ Host Sampling</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Request: Summarize intermediate execution log</div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Payload Preview */}
        <div style={{ background: '#030712', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#38bdf8', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Wire JSON-RPC 2.0 Payload</span>
            <span style={{ fontSize: '10px', background: 'rgba(56,189,248,0.15)', padding: '2px 8px', borderRadius: '4px', border: '1px solid #38bdf8' }}>Standard</span>
          </h4>

          <pre style={{ margin: 0, padding: '12px', background: '#0b0f19', borderRadius: '8px', color: '#f1f5f9', fontSize: '12px', fontFamily: 'monospace', overflowX: 'auto', border: '1px solid #1e293b' }}>
            {activeCap === 'tools' && JSON.stringify({
              jsonrpc: "2.0",
              id: 101,
              method: "tools/call",
              params: {
                name: "calculate_add",
                arguments: { a: numA, b: numB }
              }
            }, null, 2)}

            {activeCap === 'resources' && JSON.stringify({
              jsonrpc: "2.0",
              id: 102,
              method: "resources/read",
              params: {
                uri: "file:///workspace/config.json"
              }
            }, null, 2)}

            {activeCap === 'prompts' && JSON.stringify({
              jsonrpc: "2.0",
              id: 103,
              method: "prompts/get",
              params: {
                name: "summarize_topic",
                arguments: { topic: sampleArgText }
              }
            }, null, 2)}

            {activeCap === 'sampling' && JSON.stringify({
              jsonrpc: "2.0",
              id: 104,
              method: "sampling/createMessage",
              params: {
                messages: [
                  { role: "user", content: { type: "text", text: "Summarize this output" } }
                ],
                maxTokens: 100
              }
            }, null, 2)}
          </pre>
        </div>
      </div>
    </VisualizationContainer>
  );
}
