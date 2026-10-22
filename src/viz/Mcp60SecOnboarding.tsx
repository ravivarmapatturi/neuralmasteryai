import { useState } from 'react';
import VisualizationContainer from './primitives/VisualizationContainer';

const SLIDES = [
  {
    step: 1,
    title: "1. The AI Isolation Problem",
    icon: "",
    description: "An AI agent needs to read real-time data from GitHub, Slack, and PostgreSQL, but has no standard connection to external software.",
    visual: "AI Agent ──?── GitHub | Slack | Postgres"
  },
  {
    step: 2,
    title: "2. External Systems Expose Capabilities",
    icon: "",
    description: "Tools and databases expose their operations as standardized Tools, Resources, or Prompts via an MCP Server.",
    visual: "GitHub / Postgres ──(Exposes)──> MCP Server [Tools, Resources, Prompts]"
  },
  {
    step: 3,
    title: "3. MCP Standardizes Discovery",
    icon: "",
    description: "The AI Host launches an MCP Client that automatically discovers available tools via JSON-RPC protocol messaging.",
    visual: "AI Host [MCP Client] ──initialize & tools/list──> MCP Server"
  },
  {
    step: 4,
    title: "4. The Host Connects to the Server",
    icon: "",
    description: "A 1:1 protocol channel (stdio or HTTP+SSE) is established. No custom glue code is needed for each unique tool.",
    visual: "MCP Client <====== 1:1 Transport (stdio / SSE) ======> MCP Server"
  },
  {
    step: 5,
    title: "5. The Model Executes Tool Calls",
    icon: "",
    description: "When the LLM decides to take an action, it formats a tools/call request with arguments for the server to execute.",
    visual: "LLM ──(tools/call)──> MCP Server ──(Executes SQL/API)──> System"
  },
  {
    step: 6,
    title: "6. Results Return to LLM Context",
    icon: "",
    description: "The server returns structured output in a standard content array format back into the LLM context loop.",
    visual: "MCP Server ──(content: [text])──> MCP Client ──> LLM Context"
  }
];

export default function Mcp60SecOnboarding({ onComplete }: { onComplete?: () => void }) {
  const [slideIdx, setSlideIdx] = useState(0);

  const current = SLIDES[slideIdx];
  const isLast = slideIdx === SLIDES.length - 1;

  const handleNext = () => {
    if (isLast) {
      if (onComplete) onComplete();
    } else {
      setSlideIdx((s) => s + 1);
    }
  };

  const handlePrev = () => {
    setSlideIdx((s) => Math.max(0, s - 1));
  };

  return (
    <VisualizationContainer>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#38bdf8', fontWeight: 700 }}>
          Learn MCP in 60 Seconds
        </div>
        <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
          Slide {slideIdx + 1} of {SLIDES.length}
        </div>
      </div>

      <div style={{ padding: '20px', borderRadius: '12px', background: 'linear-gradient(135deg, #090d16 0%, #0f172a 100%)', border: '1px solid rgba(56, 189, 248, 0.2)', marginBottom: '16px' }}>
        <div style={{ fontSize: '28px', marginBottom: '10px' }}>{current.icon}</div>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#f8fafc', fontWeight: 800 }}>
          {current.title}
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#cbd5e1', lineHeight: '1.6' }}>
          {current.description}
        </p>

        <div style={{ padding: '12px', borderRadius: '8px', background: '#020617', border: '1px solid #1e293b', color: '#38bdf8', fontSize: '13px', fontFamily: 'monospace', textAlign: 'center' }}>
          {current.visual}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={handlePrev}
          disabled={slideIdx === 0}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: slideIdx === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.08)',
            color: slideIdx === 0 ? '#475569' : '#f8fafc',
            fontWeight: 600,
            fontSize: '13px',
            cursor: slideIdx === 0 ? 'not-allowed' : 'pointer'
          }}
        >
          ← Previous
        </button>

        <div style={{ display: 'flex', gap: '6px' }}>
          {SLIDES.map((_, i) => (
            <div
              key={i}
              onClick={() => setSlideIdx(i)}
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: i === slideIdx ? '#38bdf8' : 'rgba(255,255,255,0.2)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          style={{
            padding: '8px 18px',
            borderRadius: '6px',
            border: 'none',
            background: isLast ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(2, 132, 199, 0.3)'
          }}
        >
          {isLast ? 'Complete Story (+15 XP)' : 'Next →'}
        </button>
      </div>
    </VisualizationContainer>
  );
}
