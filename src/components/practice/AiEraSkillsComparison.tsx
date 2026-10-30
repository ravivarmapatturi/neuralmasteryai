import { useState } from 'react';

export default function AiEraSkillsComparison() {
  const [activeTab, setActiveTab] = useState<'both' | 'automated' | 'leveraged'>('both');

  const automated = [
    { title: 'Syntax Recall', desc: 'Remembering exact standard library method names and parameter order.' },
    { title: 'Boilerplate & Plumbing', desc: 'Setting up repetitive class declarations, serializers, and schemas.' },
    { title: 'Routine CRUD', desc: 'Writing straightforward database getters, setters, and REST routes.' },
    { title: 'Basic Transformations', desc: 'String manipulations, JSON mapping, and array reshaping.' },
    { title: 'Framework Scaffolding', desc: 'Initial directory structures, config files, and starter templates.' },
  ];

  const leveraged = [
    { title: 'Problem Framing & Decomposition', desc: 'Breaking chaotic domain ambiguity into isolated, solvable sub-systems.' },
    { title: 'Mental Models & Invariants', desc: 'Knowing mathematical boundaries: Rooflines, memory bandwidth, entropy.' },
    { title: 'Architecture & State Design', desc: 'Deciding where state lives, how events sync, and how errors isolate.' },
    { title: 'Specification & Evals', desc: 'Writing unambiguous intent, acceptance tests, and golden benchmarks.' },
    { title: 'Judgment & Trade-offs', desc: 'Balancing cost vs latency vs quality under physical GPU/budget constraints.' },
    { title: 'Stochastic Debugging', desc: 'Investigating silent failures, context drift, and tool-injection anomalies.' },
    { title: 'AI Orchestration & Sandboxes', desc: 'Designing feedback loops, agent tool contracts, and privilege ceilings.' },
    { title: 'Product & Domain Judgment', desc: 'Ensuring a technically working system solves the real customer problem.' },
  ];

  return (
    <section className="nm-skills-comp-section" aria-label="What becomes valuable when implementation becomes cheap?">
      <div className="nm-comp-header">
        <p className="nb-eyebrow">THE SHIFT IN HUMAN VALUE</p>
        <h2 className="nb-heading" style={{ fontSize: 'clamp(1.5rem, 3.2vw, 2.3rem)', margin: '0 0 0.75rem' }}>
          What becomes valuable when implementation becomes cheap?
        </h2>
        <p className="nb-body" style={{ margin: 0, maxWidth: 720, color: 'var(--nm-text-secondary)' }}>
          As code generation becomes abundant, engineering does not vanish—it moves upward in abstraction.
          The engineer’s job transitions from typing every line to directing systems, testing invariants, and deciding what ships.
        </p>

        <div className="nm-comp-toggles" role="tablist">
          <button
            type="button"
            className={`nm-comp-toggle ${activeTab === 'both' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('both')}
          >
            Side-by-Side Comparison
          </button>
          <button
            type="button"
            className={`nm-comp-toggle ${activeTab === 'automated' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('automated')}
          >
            More Automated
          </button>
          <button
            type="button"
            className={`nm-comp-toggle ${activeTab === 'leveraged' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('leveraged')}
          >
            More Leveraged
          </button>
        </div>
      </div>

      <div className="nm-comp-columns">
        {/* Automated Column */}
        {(activeTab === 'both' || activeTab === 'automated') && (
          <div className="nm-comp-col is-automated">
            <div className="nm-comp-col-top">
              <span className="nm-comp-pill is-auto">MORE AUTOMATED</span>
              <h3 className="nm-comp-col-title">Lower-Level Execution</h3>
              <p className="nm-comp-col-sub">AI models increasingly generate these with zero marginal friction.</p>
            </div>
            <ul className="nm-comp-list">
              {automated.map((item) => (
                <li key={item.title} className="nm-comp-item">
                  <span className="nm-comp-item-marker">↓</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Transition Divider */}
        {activeTab === 'both' && (
          <div className="nm-comp-divider" aria-hidden="true">
            <span>SHIFT TO JUDGMENT</span>
          </div>
        )}

        {/* Leveraged Column */}
        {(activeTab === 'both' || activeTab === 'leveraged') && (
          <div className="nm-comp-col is-leveraged">
            <div className="nm-comp-col-top">
              <span className="nm-comp-pill is-lev">MORE LEVERAGED</span>
              <h3 className="nm-comp-col-title">Human Leverage & Judgment</h3>
              <p className="nm-comp-col-sub">Where competitive advantage, compensation, and system success compound.</p>
            </div>
            <ul className="nm-comp-list">
              {leveraged.map((item) => (
                <li key={item.title} className="nm-comp-item">
                  <span className="nm-comp-item-marker">★</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
