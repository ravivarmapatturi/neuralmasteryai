import { useState } from 'react';

export default function McpMasterclassHud({ xp, completedItems }: { xp: number; completedItems: string[] }) {
  const [isOpen, setIsOpen] = useState(false);

  const totalCheckpoints = 6;
  const progressPercent = Math.min(100, Math.round((completedItems.length / totalCheckpoints) * 100));

  return (
    <div
      style={{
        position: 'sticky',
        top: '12px',
        zIndex: 100,
        marginBottom: '20px',
        background: 'rgba(9, 13, 22, 0.95)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        borderRadius: '12px',
        padding: '12px 16px',
        boxShadow: '0 8px 25px rgba(0,0,0,0.5)',
        transition: 'all 0.3s ease'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc' }}>
            MCP MASTERCLASS HUD
          </span>
          <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid #10b981', fontWeight: 700 }}>
            +{xp} XP Earned
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, maxWidth: '300px', margin: '0 16px' }}>
          <div style={{ flex: 1, height: '8px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, #38bdf8, #10b981)', transition: 'width 0.4s ease' }} />
          </div>
          <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 700, minWidth: '40px' }}>
            {progressPercent}%
          </span>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.06)',
            color: '#94a3b8',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          {isOpen ? 'Close Checkpoints ▲' : 'Checkpoints ▼'}
        </button>
      </div>

      {isOpen && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #1e293b', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', fontSize: '11px', color: '#94a3b8' }}>
          {[
            'What is MCP (60s Story)',
            'M×N Complexity Simulator',
            '4 Capabilities Playground',
            '7-Step Packet Journey',
            'You Are The LLM Micro-Game',
            'Final Architecture Challenge'
          ].map((item, i) => {
            const isDone = completedItems.includes(item);
            return (
              <div key={i} style={{ color: isDone ? '#34d399' : '#64748b', fontWeight: isDone ? 700 : 400 }}>
                {isDone ? '✓' : '○'} {item}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
