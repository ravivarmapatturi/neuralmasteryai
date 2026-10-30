import { useState } from 'react';
import { Link } from 'react-router-dom';

interface SkillFamily {
  id: string;
  num: string;
  title: string;
  goal: string;
  topics: string[];
  trackSlug?: string;
  connections: string[];
}

const SKILL_FAMILIES: SkillFamily[] = [
  {
    id: 'mental-models',
    num: '01',
    title: 'Mental Models',
    goal: 'Understand enough of the underlying machinery to reason reliably about behavior.',
    topics: ['Transformers', 'Attention', 'Embeddings', 'Optimization', 'Retrieval', 'Agents', 'Inference', 'Distributed Systems'],
    trackSlug: 'neural-networks',
    connections: ['system-design', 'agent-engineering', 'debugging'],
  },
  {
    id: 'system-design',
    num: '02',
    title: 'System Design',
    goal: 'Turn messy business requirements into robust, scalable, decoupled architectures.',
    topics: ['Architecture', 'Data flows', 'APIs', 'State', 'Memory', 'Caching', 'Queues', 'Model selection', 'Scaling'],
    trackSlug: 'ml-systems',
    connections: ['specification', 'judgment-tradeoffs', 'agent-engineering'],
  },
  {
    id: 'specification',
    num: '03',
    title: 'Specification',
    goal: 'Convert ambiguous human intent into executable constraints, acceptance criteria, and invariants.',
    topics: ['Requirements', 'Constraints', 'Interfaces', 'Acceptance criteria', 'Invariants', 'Deterministic tests', 'Evals'],
    trackSlug: 'specify-verify-debug',
    connections: ['verification-eval', 'system-design'],
  },
  {
    id: 'judgment-tradeoffs',
    num: '04',
    title: 'Judgment & Trade-offs',
    goal: 'Navigate non-trivial engineering trade-offs where no single textbook answer exists.',
    topics: ['Cost vs quality', 'Latency vs quality', 'Accuracy vs recall', 'RAG vs long context', 'Fine-tuning vs prompting', 'SQL vs vector DB', 'Sync vs async'],
    trackSlug: 'specify-verify-debug',
    connections: ['system-design', 'verification-eval', 'product-judgment'],
  },
  {
    id: 'verification-eval',
    num: '05',
    title: 'Verification & Evaluation',
    goal: 'Prove computationally that AI-generated systems and non-deterministic loops actually work.',
    topics: ['Unit tests', 'Integration suites', 'LLM evals', 'Retrieval evals', 'Hallucination checks', 'Observability', 'Tracing', 'SLOs'],
    trackSlug: 'specify-verify-debug',
    connections: ['debugging', 'specification'],
  },
  {
    id: 'debugging',
    num: '06',
    title: 'Debugging & Diagnostics',
    goal: 'Isolate silent regressions, tool-call loops, stale caches, and production incidents.',
    topics: ['Hypothesis formation', 'Trace inspection', 'Root-cause analysis', 'Minimal reproduction', 'Fix selection', 'Regression gauntlets'],
    trackSlug: 'specify-verify-debug',
    connections: ['mental-models', 'verification-eval'],
  },
  {
    id: 'agent-engineering',
    num: '07',
    title: 'Agent Engineering',
    goal: 'Construct deterministic execution runtimes, tool boundaries, and context budgets for autonomous agents.',
    topics: ['Tool schemas', 'Context engineering', 'Memory recall', 'Planning', 'Delegation', 'Multi-agent graphs', 'Sandboxes', 'Harness engineering'],
    trackSlug: 'build-an-agent',
    connections: ['mental-models', 'system-design', 'debugging'],
  },
  {
    id: 'product-judgment',
    num: '08',
    title: 'Product & Domain Judgment',
    goal: 'Ensure technically flawless systems solve the right human problem without catastrophic failure risk.',
    topics: ['User requirements', 'Domain constraints', 'Business impact', 'Security & risk', 'Privacy / HIPAA', 'Failure cost analysis'],
    trackSlug: 'specify-verify-debug',
    connections: ['judgment-tradeoffs', 'system-design'],
  },
];

export default function SkillsMapVisualizer() {
  const [selectedSkill, setSelectedSkill] = useState<string>('mental-models');

  const active = SKILL_FAMILIES.find((s) => s.id === selectedSkill) ?? SKILL_FAMILIES[0];

  return (
    <section className="nm-skills-map-section" aria-label="The Skills That Compound in the AI Era">
      <div className="nm-map-header">
        <p className="nb-eyebrow">INTERCONNECTED METASKILL GRAPH</p>
        <h2 className="nb-heading" style={{ fontSize: 'clamp(1.5rem, 3.2vw, 2.3rem)', margin: '0 0 0.5rem' }}>
          The skills that compound in the AI era
        </h2>
        <p className="nb-body" style={{ margin: 0, maxWidth: 680, color: 'var(--nm-text-secondary)' }}>
          Click any skill family to inspect its learning objective, core concepts, and architectural relationships.
        </p>
      </div>

      <div className="nm-skills-grid-layout">
        {/* Visual Map Grid */}
        <div className="nm-skills-cards-cluster">
          {SKILL_FAMILIES.map((skill) => {
            const isSelected = skill.id === selectedSkill;
            const isConnected = active.connections.includes(skill.id);
            return (
              <button
                key={skill.id}
                type="button"
                className={`nm-skill-card ${isSelected ? 'is-selected' : ''} ${isConnected ? 'is-connected' : ''}`}
                onClick={() => setSelectedSkill(skill.id)}
              >
                <div className="nm-skill-card-top">
                  <span className="nm-skill-num">{skill.num}</span>
                  {isConnected && <span className="nm-skill-conn-tag">Connected</span>}
                  {isSelected && <span className="nm-skill-active-tag">Active</span>}
                </div>
                <h3 className="nm-skill-title">{skill.title}</h3>
                <p className="nm-skill-goal-preview">{skill.goal}</p>
                <div className="nm-skill-topic-pills">
                  {skill.topics.slice(0, 3).map((t) => (
                    <span key={t} className="nm-skill-pill">{t}</span>
                  ))}
                  {skill.topics.length > 3 && (
                    <span className="nm-skill-pill is-more">+{skill.topics.length - 3}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Skill Inspector Panel */}
        <div className="nm-skill-inspector">
          <div className="nm-inspector-header">
            <span className="nm-inspector-num">FAMILY {active.num} / 08</span>
            <h3 className="nm-inspector-title">{active.title}</h3>
            <p className="nm-inspector-goal">
              <strong>Objective:</strong> {active.goal}
            </p>
          </div>

          <div className="nm-inspector-body">
            <h4 className="nm-inspector-sub">Core Knowledge & Systems</h4>
            <div className="nm-inspector-topics">
              {active.topics.map((topic) => (
                <div key={topic} className="nm-inspector-topic-item">
                  <span className="nm-topic-bullet">▸</span>
                  <span>{topic}</span>
                </div>
              ))}
            </div>

            <h4 className="nm-inspector-sub" style={{ marginTop: '1.25rem' }}>Related Metaskill Connections</h4>
            <div className="nm-inspector-conn-pills">
              {active.connections.map((connId) => {
                const conn = SKILL_FAMILIES.find((s) => s.id === connId);
                if (!conn) return null;
                return (
                  <button
                    key={connId}
                    type="button"
                    className="nm-inspector-conn-btn"
                    onClick={() => setSelectedSkill(connId)}
                  >
                    {conn.num} {conn.title} →
                  </button>
                );
              })}
            </div>
          </div>

          <div className="nm-inspector-footer">
            <Link
              to={active.trackSlug ? `/practice/track/${active.trackSlug}` : '/practice'}
              className="nm-button nm-button-primary"
            >
              Practice {active.title} Challenges →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
