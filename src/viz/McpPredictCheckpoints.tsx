import { useState } from 'react';
import VisualizationContainer from './primitives/VisualizationContainer';

interface Checkpoint {
  question: string;
  options: string[];
  correctIdx: number;
  explanation: string;
  payloadReveal: string;
}

const CHECKPOINTS: Checkpoint[] = [
  {
    question: "The MCP Client has successfully executed the `initialize` handshake. What request method MUST come next before executing tool calls?",
    options: [
      "A. tools/call",
      "B. tools/list (Capability Discovery)",
      "C. server/shutdown",
      "D. resources/read"
    ],
    correctIdx: 1,
    explanation: "Correct! The client dispatches `tools/list` to retrieve the registered tool names and JSON schema parameters before making tool calls.",
    payloadReveal: 'CLIENT -> {"jsonrpc": "2.0", "id": 2, "method": "tools/list"}'
  },
  {
    question: "In standard MCP, what is the default transport recommended for local desktop applications like Claude Desktop or Cursor IDE?",
    options: [
      "A. WebSockets over TLS",
      "B. stdio (standard input/output subprocess)",
      "C. gRPC over HTTP/2",
      "D. MQTT message broker"
    ],
    correctIdx: 1,
    explanation: "Correct! `stdio` spawns the server as a local child process, reading stdin and writing JSON-RPC frames to stdout.",
    payloadReveal: 'Transport: stdio (subprocess stdin/stdout newline-delimited JSON-RPC)'
  }
];

export default function McpPredictCheckpoints({ onEarnXp }: { onEarnXp?: (xp: number) => void }) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});

  const handleSelect = (qIdx: number, optIdx: number) => {
    if (selectedAnswers[qIdx] !== undefined) return;
    setSelectedAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
    if (optIdx === CHECKPOINTS[qIdx].correctIdx && onEarnXp) {
      onEarnXp(15);
    }
  };

  return (
    <VisualizationContainer>
      <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#10b981', fontWeight: 700, marginBottom: '4px' }}>
        Predict Before Revealing — Retrieval Practice Checkpoint
      </div>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#f8fafc', fontWeight: 800 }}>
        Test Your MCP Knowledge & Reveal Wire Messages
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {CHECKPOINTS.map((cp, qIdx) => {
          const answered = selectedAnswers[qIdx] !== undefined;
          const chosen = selectedAnswers[qIdx];
          const isCorrect = chosen === cp.correctIdx;

          return (
            <div key={qIdx} style={{ padding: '16px', borderRadius: '12px', background: '#090d16', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', marginBottom: '12px' }}>
                {qIdx + 1}. {cp.question}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px', marginBottom: '12px' }}>
                {cp.options.map((opt, oIdx) => {
                  let bg = '#020617';
                  let border = '#1e293b';
                  if (answered) {
                    if (oIdx === cp.correctIdx) {
                      bg = 'rgba(16, 185, 129, 0.15)';
                      border = '#10b981';
                    } else if (oIdx === chosen) {
                      bg = 'rgba(239, 68, 68, 0.15)';
                      border = '#ef4444';
                    }
                  }

                  return (
                    <button
                      key={oIdx}
                      onClick={() => handleSelect(qIdx, oIdx)}
                      disabled={answered}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '6px',
                        background: bg,
                        border: `1px solid ${border}`,
                        color: '#f8fafc',
                        fontSize: '12px',
                        fontWeight: 600,
                        textAlign: 'left',
                        cursor: answered ? 'default' : 'pointer'
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {answered && (
                <div style={{ padding: '12px', borderRadius: '8px', background: isCorrect ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${isCorrect ? '#10b981' : '#ef4444'}` }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: isCorrect ? '#34d399' : '#f87171', marginBottom: '6px' }}>
                    {isCorrect ? '✓ Correct! (+15 XP)' : '✕ Incorrect'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '8px' }}>
                    {cp.explanation}
                  </div>
                  <div style={{ fontSize: '11px', color: '#38bdf8', fontFamily: 'monospace', padding: '6px 10px', background: '#020617', borderRadius: '4px', border: '1px solid #1e293b' }}>
                    {cp.payloadReveal}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}
