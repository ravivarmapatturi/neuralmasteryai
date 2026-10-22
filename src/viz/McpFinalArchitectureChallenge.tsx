import { useState } from 'react';
import VisualizationContainer from './primitives/VisualizationContainer';

const CORRECT_ORDER = [
  'LLM Decision',
  'MCP Client',
  'initialize',
  'tools/list',
  'tools/call',
  'MCP Server',
  'Result Content'
];

const SHUFFLED_BLOCKS = [
  'tools/call',
  'initialize',
  'LLM Decision',
  'MCP Server',
  'tools/list',
  'Result Content',
  'MCP Client'
];

export default function McpFinalArchitectureChallenge({ onMastered }: { onMastered?: () => void }) {
  const [userOrder, setUserOrder] = useState<string[]>([]);
  const [remaining, setRemaining] = useState<string[]>(SHUFFLED_BLOCKS);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSelectBlock = (block: string) => {
    setUserOrder((prev) => [...prev, block]);
    setRemaining((prev) => prev.filter((b) => b !== block));
    setStatus('idle');
  };

  const handleReset = () => {
    setUserOrder([]);
    setRemaining(SHUFFLED_BLOCKS);
    setStatus('idle');
  };

  const handleValidate = () => {
    const isCorrect = userOrder.length === CORRECT_ORDER.length && userOrder.every((val, idx) => val === CORRECT_ORDER[idx]);
    if (isCorrect) {
      setStatus('success');
      if (onMastered) onMastered();
    } else {
      setStatus('error');
    }
  };

  return (
    <VisualizationContainer>
      <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a855f7', fontWeight: 700, marginBottom: '4px' }}>
        Final Masterclass Challenge
      </div>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#f8fafc', fontWeight: 800 }}>
        Assemble the Complete MCP Protocol Sequence
      </h3>
      <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#94a3b8' }}>
        Click the blocks below to place them in the exact order of an end-to-end MCP tool call execution sequence.
      </p>

      {/* Selected Sequence */}
      <div style={{ padding: '14px', borderRadius: '10px', background: '#090d16', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '16px', minHeight: '60px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        {userOrder.length === 0 ? (
          <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>Click blocks below to build sequence...</span>
        ) : (
          userOrder.map((b, i) => (
            <div key={i} style={{ padding: '6px 12px', borderRadius: '6px', background: '#0284c7', color: '#ffffff', fontSize: '12px', fontWeight: 700 }}>
              {i + 1}. {b}
            </div>
          ))
        )}
      </div>

      {/* Available Blocks */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {remaining.map((b, i) => (
          <button
            key={i}
            onClick={() => handleSelectBlock(b)}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid #38bdf8',
              background: 'rgba(56, 189, 248, 0.1)',
              color: '#38bdf8',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            + {b}
          </button>
        ))}
      </div>

      {/* Controls & Feedback */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button
          onClick={handleValidate}
          disabled={userOrder.length !== CORRECT_ORDER.length}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            border: 'none',
            background: userOrder.length === CORRECT_ORDER.length ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#334155',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '13px',
            cursor: userOrder.length === CORRECT_ORDER.length ? 'pointer' : 'not-allowed'
          }}
        >
          Validate Architecture →
        </button>

        <button
          onClick={handleReset}
          style={{
            padding: '10px 14px',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent',
            color: '#94a3b8',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Reset Sequence
        </button>
      </div>

      {status === 'success' && (
        <div style={{ marginTop: '16px', padding: '14px', borderRadius: '8px', background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', color: '#34d399', fontSize: '13px', fontWeight: 700 }}>
          Perfect Architecture Assembly! You have mastered the Model Context Protocol lifecycle! (+50 XP)
        </div>
      )}

      {status === 'error' && (
        <div style={{ marginTop: '16px', padding: '14px', borderRadius: '8px', background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', color: '#f87171', fontSize: '13px', fontWeight: 700 }}>
          ✕ Incorrect Sequence. Correct flow: LLM Decision → MCP Client → initialize → tools/list → tools/call → MCP Server → Result Content. Click Reset and try again!
        </div>
      )}
    </VisualizationContainer>
  );
}
