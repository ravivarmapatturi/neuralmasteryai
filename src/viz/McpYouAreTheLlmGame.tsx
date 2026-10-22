import { useState } from 'react';
import VisualizationContainer from './primitives/VisualizationContainer';

interface GameStep {
  task: string;
  options: { label: string; action: string; isCorrect: boolean; feedback: string }[];
}

const GAME_STEPS: GameStep[] = [
  {
    task: 'User prompt: "Find all GitHub issues in our repo labelled bug."',
    options: [
      {
        label: 'A. Search the local filesystem using os.listdir()',
        action: 'filesystem.search',
        isCorrect: false,
        feedback: 'Incorrect! The local filesystem does not store remote GitHub issues.'
      },
      {
        label: 'B. Call github.search_issues(label="bug")',
        action: 'github.search_issues',
        isCorrect: true,
        feedback: 'Correct! The GitHub MCP Server exposes search_issues tool to query repository issue trackers.'
      },
      {
        label: 'C. Ask the user to paste all issue URLs manually',
        action: 'ask_user',
        isCorrect: false,
        feedback: 'Incorrect! An autonomous agent should use its available MCP tools instead of bothering the user.'
      }
    ]
  },
  {
    task: 'User prompt: "Query active customer counts from PostgreSQL database."',
    options: [
      {
        label: 'A. Execute postgres.query_database(sql="SELECT count(*) FROM customers WHERE active = true")',
        action: 'postgres.query_database',
        isCorrect: true,
        feedback: 'Correct! The Postgres MCP Server handles database connections and returns query content safely.'
      },
      {
        label: 'B. Make a web search for customer statistics on Google',
        action: 'google_search',
        isCorrect: false,
        feedback: 'Incorrect! Private database records are not accessible via web search engines.'
      },
      {
        label: 'C. Generate a random guess number',
        action: 'guess',
        isCorrect: false,
        feedback: 'Incorrect! Agents must provide authoritative computational results.'
      }
    ]
  }
];

export default function McpYouAreTheLlmGame({ onEarnXp }: { onEarnXp?: (xp: number) => void }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  const current = GAME_STEPS[stepIdx];

  const handleSelect = (idx: number) => {
    setSelectedIdx(idx);
    const opt = current.options[idx];
    if (opt.isCorrect) {
      setScore((s) => s + 10);
      if (onEarnXp) onEarnXp(10);
    }
  };

  const handleNext = () => {
    setSelectedIdx(null);
    if (stepIdx < GAME_STEPS.length - 1) {
      setStepIdx((s) => s + 1);
    }
  };

  return (
    <VisualizationContainer>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f59e0b', fontWeight: 700 }}>
          Interactive Game — You Are The LLM
        </div>
        <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 800 }}>
          Score: +{score} XP
        </div>
      </div>

      <div style={{ padding: '16px', borderRadius: '12px', background: '#090d16', border: '1px solid rgba(245, 158, 11, 0.3)', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '4px' }}>Agent Task (Question {stepIdx + 1}/{GAME_STEPS.length}):</div>
        <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#f8fafc', fontWeight: 800 }}>
          {current.task}
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {current.options.map((opt, i) => {
            const isChosen = selectedIdx === i;
            let bg = '#020617';
            let border = '#1e293b';
            if (selectedIdx !== null) {
              if (opt.isCorrect) {
                bg = 'rgba(16, 185, 129, 0.15)';
                border = '#10b981';
              } else if (isChosen) {
                bg = 'rgba(239, 68, 68, 0.15)';
                border = '#ef4444';
              }
            }

            return (
              <button
                key={i}
                onClick={() => selectedIdx === null && handleSelect(i)}
                disabled={selectedIdx !== null}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: bg,
                  border: `1px solid ${border}`,
                  color: '#f8fafc',
                  fontSize: '13px',
                  fontWeight: 600,
                  textAlign: 'left',
                  cursor: selectedIdx === null ? 'pointer' : 'default',
                  transition: 'all 0.2s ease'
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {selectedIdx !== null && (
          <div style={{ marginTop: '14px', padding: '12px', borderRadius: '8px', background: current.options[selectedIdx].isCorrect ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${current.options[selectedIdx].isCorrect ? '#10b981' : '#ef4444'}` }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: current.options[selectedIdx].isCorrect ? '#34d399' : '#f87171' }}>
              {current.options[selectedIdx].isCorrect ? 'Correct! +10 XP Earned!' : 'Incorrect Decision'}
            </div>
            <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>
              {current.options[selectedIdx].feedback}
            </div>
          </div>
        )}
      </div>

      {selectedIdx !== null && stepIdx < GAME_STEPS.length - 1 && (
        <button
          onClick={handleNext}
          style={{
            padding: '8px 18px',
            borderRadius: '6px',
            border: 'none',
            background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          Next Scenario →
        </button>
      )}
    </VisualizationContainer>
  );
}
