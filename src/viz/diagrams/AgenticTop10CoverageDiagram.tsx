import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

interface AsiRow {
  id: string;
  name: string;
  risk: string;
  coverage: string;
  covered: boolean;
}

// The real OWASP Top 10 for Agentic Applications (ASI01-10), each mapped
// to what actually tests or defends against it -- not every category has
// mature tooling yet, and this says so rather than papering over the gap.
const ROWS: AsiRow[] = [
  { id: 'ASI01', name: 'Agent Goal Hijack', risk: 'An injected instruction redirects the agent away from its actual task.', coverage: 'Promptfoo: injection, jailbreak, jailbreak:tree, crescendo strategies.', covered: true },
  { id: 'ASI02', name: 'Tool Misuse & Exploitation', risk: 'The agent is talked into calling a legitimate tool with attacker-influenced arguments, or a tool beyond its intended scope.', coverage: 'Promptfoo: excessive-agency, bfla, bola, tool-discovery plugins. Runtime: OPA/Rego policy gating (deny-by-default per tool call).', covered: true },
  { id: 'ASI03', name: 'Agent Identity & Privilege Abuse', risk: 'An agent operates with more standing privilege than the task at hand needs, or its identity is spoofed/confused with another agent’s.', coverage: 'Partial: Promptfoo’s rbac plugin tests access-control enforcement; no dedicated PyRIT orchestrator for this specifically yet.', covered: false },
  { id: 'ASI04', name: 'Agentic Supply Chain Compromise', risk: 'A malicious or compromised tool/plugin/sub-agent is pulled into the system.', coverage: 'Not primarily a red-team problem — same provenance/dependency-scanning discipline as Model & Data Attacks’ supply-chain section.', covered: false },
  { id: 'ASI05', name: 'Unexpected Code Execution', risk: 'A tool call (code interpreter, shell tool) executes attacker-influenced code.', coverage: 'PyRIT: PromptSendingOrchestrator against code-execution tools; sandboxing is the actual containment layer, not detection.', covered: true },
  { id: 'ASI06', name: 'Memory & Context Poisoning', risk: 'Malicious content persists in an agent’s memory and influences future, unrelated turns.', coverage: 'OWASP Agent Memory Guard — the reference runtime implementation: screens every memory write for injection, protected-key tampering, self-reinforcement.', covered: true },
  { id: 'ASI07', name: 'Insecure Inter-Agent Communication', risk: 'Agent-to-agent messages are trusted and unfiltered by default — an injected instruction can propagate through legitimate handoffs.', coverage: 'Immature: no dedicated red-team plugin yet targets this specifically — an active research gap (see Single-Agent vs. Multi-Agent).', covered: false },
  { id: 'ASI08', name: 'Cascading Agent Failures', risk: 'One compromised or malfunctioning agent’s bad output propagates and amplifies through a multi-agent system.', coverage: 'Tested indirectly via multi-turn orchestrators (PyRIT Crescendo, Promptfoo crescendo) run against the full pipeline, not a single agent in isolation.', covered: false },
  { id: 'ASI09', name: 'Human-Agent Trust Exploitation', risk: 'An agent manipulates a human’s trust to get a harmful action approved (e.g. disguising what an approval request actually authorizes).', coverage: 'Promptfoo: excessive-agency plugin partially covers this; mostly still manual red-team review of approval-flow UX.', covered: false },
  { id: 'ASI10', name: 'Rogue Agents', risk: 'An agent operates outside its intended goal or authority entirely — the most severe, least common failure.', coverage: 'PyRIT: RedTeamingOrchestrator’s multi-turn adversarial conversations, specifically designed to probe for this.', covered: true },
];

/** Click each ASI category to see what actually tests for it -- real
 * tools and plugins, not a generic "use red-teaming" gesture, and honest
 * about which categories don't have mature tooling yet. */
export default function AgenticTop10CoverageDiagram() {
  const t = useVizTokens();
  const [selected, setSelected] = useState<string>(ROWS[0].id);
  const color = getConceptColor(t, 'attention');
  const colorGap = t.accentDanger;

  const row = ROWS.find((r) => r.id === selected)!;
  const coveredCount = ROWS.filter((r) => r.covered).length;

  return (
    <VisualizationContainer
      footer={`${row.id} -- ${row.name}: ${row.risk} Coverage: ${row.coverage}`}
      title="OWASP Agentic AI Top 10, mapped to real red-team/defense coverage"
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 6 }}>
        {ROWS.map((r) => {
          const isSelected = r.id === selected;
          return (
            <button
              key={r.id}
              onClick={() => setSelected(r.id)}
              style={{
                cursor: 'pointer',
                textAlign: 'left',
                padding: '8px 10px',
                borderRadius: 8,
                fontFamily: 'inherit',
                background: isSelected ? `${color}20` : t.surface,
                border: `1.5px solid ${isSelected ? color : r.covered ? t.border : colorGap + '88'}`,
              }}
            >
              <div style={{ fontSize: 11, color: t.textSecondary, fontWeight: 600 }}>{r.id}</div>
              <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, fontWeight: isSelected ? 700 : 500 }}>{r.name}</div>
              <div style={{ fontSize: 10.5, marginTop: 2, color: r.covered ? t.textSecondary : colorGap }}>
                {r.covered ? 'tooling exists' : 'immature / gap'}
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: 10, fontSize: 11.5, color: t.textSecondary }}>
        {coveredCount} of {ROWS.length} categories have real, mature red-team tooling today. The rest ({ROWS.length - coveredCount}) are genuine, current gaps in the tooling landscape -- not this page glossing over them, the field actually hasn't fully solved them yet.
      </div>
    </VisualizationContainer>
  );
}
