import { useState } from 'react';
import VisualizationContainer from './primitives/VisualizationContainer';
import VisualizationHeader from './primitives/VisualizationHeader';
import VisualizationStepController, { useStepController } from './primitives/VisualizationStepController';

const PACKET_STEPS = [
  {
    step: 1,
    title: '1. User Prompt Sent to Host',
    actor: 'USER → HOST',
    summary: 'The user prompts the Host AI application: "Find active users in Postgres and format a summary report."',
    structuredCard: {
      action: 'USER_PROMPT_INPUT',
      payload: 'Find active users in Postgres and format a summary report',
      targetApp: 'Claude Desktop'
    },
    rawJson: {
      userInput: "Find active users in Postgres and format a summary report",
      context: { app: "Claude Desktop", timestamp: "2026-09-06T18:25:00Z" }
    },
    debugInfo: { status: "OK", channel: "UI Event Loop", activeConnections: 0 }
  },
  {
    step: 2,
    title: '2. LLM Decision & Tool Selection',
    actor: 'HOST (LLM)',
    summary: 'The LLM evaluates the prompt and determines it must call `query_database(status="active")` on the Postgres MCP Server.',
    structuredCard: {
      action: 'LLM_REASONING_DECISION',
      selectedTool: 'query_database',
      arguments: { status: 'active' },
      targetServer: 'Postgres MCP Server'
    },
    rawJson: {
      thought: "User wants active users. I should query the database using the registered Postgres MCP tool.",
      call: { name: "query_database", args: { status: "active" } }
    },
    debugInfo: { status: "OK", model: "Claude 3.5 Sonnet", selectedTool: "query_database" }
  },
  {
    step: 3,
    title: '3. MCP Client Initialization Handshake',
    actor: 'MCP CLIENT → MCP SERVER',
    summary: 'The Host\'s MCP Client sends an `initialize` JSON-RPC request to negotiate protocol version and client capabilities.',
    structuredCard: {
      method: 'initialize',
      protocolVersion: '2024-11-05',
      clientInfo: 'ClaudeDesktop v1.2',
      capabilities: 'roots'
    },
    rawJson: {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: { roots: { listChanged: true } },
        clientInfo: { name: "ClaudeDesktop", version: "1.2.0" }
      }
    },
    debugInfo: { status: "CONNECTED", transport: "stdio", pid: 48921 }
  },
  {
    step: 4,
    title: '4. Capability Discovery (tools/list)',
    actor: 'MCP CLIENT ↔ MCP SERVER',
    summary: 'The Client dispatches `tools/list` to discover registered tool names and JSON schema parameters.',
    structuredCard: {
      method: 'tools/list',
      availableToolsCount: 1,
      discoveredTool: 'query_database(status: string)'
    },
    rawJson: {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list"
    },
    debugInfo: { status: "OK", toolsDiscovered: ["query_database"], schemaValid: true }
  },
  {
    step: 5,
    title: '5. Tool Call Execution Payload (tools/call)',
    actor: 'MCP CLIENT → MCP SERVER',
    summary: 'The Client formats and sends the `tools/call` JSON-RPC message containing named parameter arguments.',
    structuredCard: {
      method: 'tools/call',
      toolName: 'query_database',
      arguments: { status: 'active' }
    },
    rawJson: {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "query_database",
        arguments: { status: "active" }
      }
    },
    debugInfo: { status: "EXECUTING", paramCheck: "passed", authHeader: "Bearer secret_mcp_token" }
  },
  {
    step: 6,
    title: '6. Server Execution & Content Delivery',
    actor: 'MCP SERVER → MCP CLIENT',
    summary: 'The Postgres MCP Server executes the SQL query and returns result text inside standard MCP `content` array payload.',
    structuredCard: {
      status: 'SUCCESS',
      contentType: 'text',
      responseResult: '14,208 active users found.'
    },
    rawJson: {
      jsonrpc: "2.0",
      id: 3,
      result: {
        content: [
          { type: "text", text: "Active User Count: 14,208" }
        ],
        isError: false
      }
    },
    debugInfo: { status: "SUCCESS", execTimeMs: 14, dbQueryTimeMs: 8 }
  },
  {
    step: 7,
    title: '7. Result Integration into LLM Context',
    actor: 'HOST → USER',
    summary: 'The MCP Client passes the result back into the LLM context to render the final response for the user.',
    structuredCard: {
      finalOutput: 'There are currently 14,208 active users in PostgreSQL.',
      completionStatus: 'TASK_COMPLETE'
    },
    rawJson: {
      finalResponse: "There are currently 14,208 active users in PostgreSQL.",
      tokensUsed: 142
    },
    debugInfo: { status: "COMPLETE", totalLatencyMs: 42 }
  }
];

export default function McpPacketJourneyInspector() {
  const controller = useStepController(PACKET_STEPS.length);
  const currentStep = PACKET_STEPS[controller.step];
  const [showRawJson, setShowRawJson] = useState(false);
  const [isDebugMode, setIsDebugMode] = useState(false);

  return (
    <VisualizationContainer>
      <VisualizationHeader
        title="Follow One Tool Call — Signature Packet Journey"
        description="Watch an animated tool-call packet travel from the User prompt through LLM reasoning, Client handshake, tool discovery, Server execution, and back."
      />

      {/* Mode Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <VisualizationStepController
          controller={controller}
          totalSteps={PACKET_STEPS.length}
        />

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowRawJson(!showRawJson)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: showRawJson ? '#0284c7' : 'rgba(255,255,255,0.06)',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {showRawJson ? 'Showing Raw JSON' : 'Show Raw JSON'}
          </button>

          <button
            onClick={() => setIsDebugMode(!isDebugMode)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: isDebugMode ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.15)',
              background: isDebugMode ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
              color: isDebugMode ? '#10b981' : '#94a3b8',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {isDebugMode ? 'Debug Mode: ON' : 'Debug Mode: OFF'}
          </button>
        </div>
      </div>

      {/* Main Packet Journey Display */}
      <div style={{ padding: '16px', borderRadius: '12px', background: '#090d16', border: '1px solid rgba(56, 189, 248, 0.2)', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h4 style={{ margin: 0, fontSize: '15px', color: '#f8fafc', fontWeight: 800 }}>
            {currentStep.title}
          </h4>
          <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid #a855f7', fontWeight: 700 }}>
            {currentStep.actor}
          </span>
        </div>

        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5' }}>
          {currentStep.summary}
        </p>

        {/* Visual Card View */}
        {!showRawJson ? (
          <div style={{ padding: '14px', borderRadius: '8px', background: '#020617', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#38bdf8', fontWeight: 700, marginBottom: '8px' }}>
              MCP Protocol Visual Frame Card
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
              {Object.entries(currentStep.structuredCard).map(([key, val]) => (
                <div key={key} style={{ padding: '8px', background: '#0b0f19', borderRadius: '6px', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>{key}</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', wordBreak: 'break-word' }}>
                    {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Raw JSON Expandable View */
          <div style={{ padding: '12px', borderRadius: '8px', background: '#030712', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#a855f7', fontWeight: 700, marginBottom: '6px' }}>
              Raw Wire JSON Payload
            </div>
            <pre style={{ margin: 0, color: '#38bdf8', fontSize: '12px', fontFamily: 'monospace', overflowX: 'auto' }}>
              {JSON.stringify(currentStep.rawJson, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Debug Mode Panel */}
      {isDebugMode && (
        <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid #10b981' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', marginBottom: '4px' }}>
            Protocol Debug Trace (Step {currentStep.step})
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace', flexWrap: 'wrap' }}>
            {Object.entries(currentStep.debugInfo).map(([k, v]) => (
              <span key={k}>
                <strong style={{ color: '#f8fafc' }}>{k}:</strong> {String(v)}
              </span>
            ))}
          </div>
        </div>
      )}
    </VisualizationContainer>
  );
}
