import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export type LoopStage = 'understand' | 'explore' | 'decide' | 'build' | 'verify';

interface StageMeta {
  id: LoopStage;
  num: string;
  name: string;
  tagline: string;
  summary: string;
  actionHint: string;
}

const STAGES: StageMeta[] = [
  {
    id: 'understand',
    num: '01',
    name: 'UNDERSTAND',
    tagline: 'Build the correct mental model.',
    summary: 'Deconstruct how the machinery works under the hood before touching a line of code. Understand representations, mathematical invariants, and failure modes.',
    actionHint: 'Inspect the representation graph below',
  },
  {
    id: 'explore',
    num: '02',
    name: 'EXPLORE',
    tagline: 'Change inputs. Watch the system respond.',
    summary: 'Manipulate live mathematical parameters—temperature, attention head scaling, chunking windows—and watch probability distributions and latency shifts in real time.',
    actionHint: 'Adjust the live dials below to alter probability curves',
  },
  {
    id: 'decide',
    num: '03',
    name: 'DECIDE',
    tagline: 'Choose between real engineering trade-offs.',
    summary: 'Engineering in the AI era is navigating physical constraints. Weigh cost vs quality, latency vs accuracy, dense retrieval vs hybrid search, and single-agent vs DAG workflows.',
    actionHint: 'Compare real architectural trade-offs',
  },
  {
    id: 'build',
    num: '04',
    name: 'BUILD',
    tagline: 'Implement the parts worth understanding.',
    summary: 'Don’t type boilerplate. Implement the core state graphs, tool dispatchers, and memory trims directly in the browser with live Python execution.',
    actionHint: 'Review the deterministic execution harness',
  },
  {
    id: 'verify',
    num: '05',
    name: 'VERIFY',
    tagline: 'Test assumptions. Find failures. Decide whether it ships.',
    summary: 'AI code is cheap; verifying non-deterministic behavior is the true engineering challenge. Run automated test suites, hallucination checks, and latency benchmarks.',
    actionHint: 'Inspect the test assertions and evaluation gauges',
  },
];

export default function LearningLoopVisualizer() {
  const [activeStage, setActiveStage] = useState<LoopStage>('understand');
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(0.9);
  const [selectedArch, setSelectedArch] = useState<'rag' | 'context' | 'ft'>('rag');

  // Auto-advance preview every 10s if not interacted
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setActiveStage((prev) => {
        const idx = STAGES.findIndex((s) => s.id === prev);
        return STAGES[(idx + 1) % STAGES.length].id;
      });
    }, 9000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const current = STAGES.find((s) => s.id === activeStage) ?? STAGES[0];

  return (
    <section
      className="nm-loop-section"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-label="The 5-Stage Neural Mastery Learning Loop"
    >
      <div className="nm-landing-shell">
        <div className="nm-loop-header">
          <p className="nb-eyebrow">THE 5-STAGE LEARNING LOOP</p>
          <h2 className="nb-heading nm-loop-headline">
            Understand it. See it work. Make the decision.
          </h2>
          <p className="nm-loop-lead">
            AI can write more of the implementation than ever. Your advantage is understanding what the system is doing,
            knowing where it fails, choosing the right design, and verifying the result.
            Neural Mastery turns AI engineering concepts into interactive systems you can inspect, manipulate, build and evaluate.
          </p>
        </div>

        {/* Connected Step Navigation */}
        <div className="nm-loop-stepper" role="tablist">
          {STAGES.map((stage, idx) => {
            const isActive = stage.id === activeStage;
            return (
              <button
                key={stage.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`nm-loop-step-btn ${isActive ? 'is-active' : ''}`}
                onClick={() => {
                  setActiveStage(stage.id);
                  setIsPaused(true);
                }}
              >
                <div className="nm-loop-step-num">{stage.num}</div>
                <div className="nm-loop-step-text">
                  <strong>{stage.name}</strong>
                  <span>{stage.tagline}</span>
                </div>
                {idx < STAGES.length - 1 && <span className="nm-loop-step-connector" aria-hidden="true">→</span>}
              </button>
            );
          })}
        </div>

        {/* Stage Content & Interactive Centerpiece */}
        <div className="nm-loop-stage-panel">
          <div className="nm-loop-info">
            <span className="nm-loop-badge">STAGE {current.num} / 05</span>
            <h3 className="nm-loop-stage-title">{current.name}: {current.tagline}</h3>
            <p className="nm-loop-stage-desc">{current.summary}</p>
            <div className="nm-loop-hint">
              <span className="nm-loop-hint-dot" />
              <span>{current.actionHint}</span>
            </div>
            <div className="nm-loop-cta">
              <Link to="/practice" className="nm-button nm-button-primary">
                Experience in the Lab →
              </Link>
            </div>
          </div>

          <div className="nm-loop-interactive-canvas">
            {/* STAGE 1: UNDERSTAND (Mental Model & Attention Flow) */}
            {activeStage === 'understand' && (
              <div className="nm-interactive-stage nm-stage-understand">
                <div className="nm-stage-topbar">
                  <span>MENTAL MODEL: SCALED DOT-PRODUCT ATTENTION</span>
                  <span className="nm-stage-indicator">LIVE GRAPH</span>
                </div>
                <svg viewBox="0 0 540 240" className="nm-sim-svg" aria-label="Attention QKV computation flow">
                  {/* Q, K, V Input nodes */}
                  <g className="nm-sim-node">
                    <rect x="40" y="40" width="80" height="34" rx="6" />
                    <text x="80" y="62">Query (Q)</text>
                  </g>
                  <g className="nm-sim-node">
                    <rect x="40" y="100" width="80" height="34" rx="6" />
                    <text x="80" y="122">Key (K)</text>
                  </g>
                  <g className="nm-sim-node">
                    <rect x="40" y="160" width="80" height="34" rx="6" />
                    <text x="80" y="182">Value (V)</text>
                  </g>

                  {/* Matrix Multiply QK^T */}
                  <path d="M 120 57 L 200 95" stroke="var(--nm-border)" strokeWidth="2" strokeDasharray="4 2" />
                  <path d="M 120 117 L 200 95" stroke="var(--nm-border)" strokeWidth="2" strokeDasharray="4 2" />
                  <g className="nm-sim-node is-accent">
                    <rect x="200" y="78" width="95" height="34" rx="6" />
                    <text x="247" y="100">MatMul (QKᵀ)</text>
                  </g>

                  {/* Scale & Softmax */}
                  <path d="M 295 95 L 340 95" stroke="var(--nm-border)" strokeWidth="2" />
                  <g className="nm-sim-node">
                    <rect x="340" y="78" width="80" height="34" rx="6" />
                    <text x="380" y="100">Softmax / √d</text>
                  </g>

                  {/* Multiply with V */}
                  <path d="M 420 95 L 450 135" stroke="var(--nm-border)" strokeWidth="2" />
                  <path d="M 120 177 L 450 145" stroke="var(--nm-border)" strokeWidth="2" strokeDasharray="4 2" />
                  <g className="nm-sim-node is-highlight">
                    <rect x="440" y="125" width="85" height="34" rx="6" />
                    <text x="482" y="147">Output (Z)</text>
                  </g>
                </svg>
                <div className="nm-sim-caption">
                  Invariant: Weights sum to 1.0. Softmax normalizes variance across the feature dimension √dₖ to prevent vanishing gradients.
                </div>
              </div>
            )}

            {/* STAGE 2: EXPLORE (Live Dials & Probability Distributions) */}
            {activeStage === 'explore' && (
              <div className="nm-interactive-stage nm-stage-explore">
                <div className="nm-stage-topbar">
                  <span>SYSTEM BEHAVIOR: SAMPLING ENTROPY</span>
                  <span className="nm-stage-indicator">INTERACTIVE</span>
                </div>
                <div className="nm-sim-controls">
                  <label>
                    <span>Temperature (τ): <strong>{temperature.toFixed(2)}</strong></span>
                    <input
                      type="range"
                      min="0.1"
                      max="1.5"
                      step="0.05"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    />
                  </label>
                  <label>
                    <span>Top-p (Nucleus): <strong>{topP.toFixed(2)}</strong></span>
                    <input
                      type="range"
                      min="0.2"
                      max="1.0"
                      step="0.05"
                      value={topP}
                      onChange={(e) => setTopP(parseFloat(e.target.value))}
                    />
                  </label>
                </div>
                <div className="nm-sim-bars" aria-label="Token probability bars">
                  {[
                    { token: '"system"', raw: 4.2 },
                    { token: '"architecture"', raw: 3.5 },
                    { token: '"harness"', raw: 2.8 },
                    { token: '"decision"', raw: 2.1 },
                    { token: '"random"', raw: 0.8 },
                  ].map((item) => {
                    const scaled = Math.exp(item.raw / temperature);
                    const pct = Math.min(100, Math.max(8, (scaled / (1 + scaled * 0.4)) * 25));
                    return (
                      <div key={item.token} className="nm-sim-bar-row">
                        <span className="nm-sim-token">{item.token}</span>
                        <div className="nm-sim-bar-track">
                          <div
                            className="nm-sim-bar-fill"
                            style={{
                              width: `${pct}%`,
                              background: pct > 50 ? 'var(--nm-accent-primary)' : 'var(--nm-accent-secondary)',
                            }}
                          />
                        </div>
                        <span className="nm-sim-pct">{pct.toFixed(1)}%</span>
                      </div>
                    );
                  })}
                </div>
                <div className="nm-sim-caption">
                  High temperature flattens entropy across candidate tokens. Low temperature sharpens peak probability.
                </div>
              </div>
            )}

            {/* STAGE 3: DECIDE (Architectural Trade-offs Matrix) */}
            {activeStage === 'decide' && (
              <div className="nm-interactive-stage nm-stage-decide">
                <div className="nm-stage-topbar">
                  <span>TRADE-OFF MATRIX: CONTEXT ARCHITECTURE</span>
                  <span className="nm-stage-indicator">DECISION ENGINE</span>
                </div>
                <div className="nm-decision-pills">
                  <button
                    type="button"
                    className={`nm-decide-btn ${selectedArch === 'rag' ? 'is-active' : ''}`}
                    onClick={() => setSelectedArch('rag')}
                  >
                    Modular RAG
                  </button>
                  <button
                    type="button"
                    className={`nm-decide-btn ${selectedArch === 'context' ? 'is-active' : ''}`}
                    onClick={() => setSelectedArch('context')}
                  >
                    Long-Context (2M)
                  </button>
                  <button
                    type="button"
                    className={`nm-decide-btn ${selectedArch === 'ft' ? 'is-active' : ''}`}
                    onClick={() => setSelectedArch('ft')}
                  >
                    Domain Fine-Tuning
                  </button>
                </div>
                <div className="nm-tradeoff-grid">
                  <div className="nm-tradeoff-metric">
                    <span>Query Cost</span>
                    <strong>{selectedArch === 'rag' ? '$0.002 / req' : selectedArch === 'context' ? '$0.045 / req' : '$0.008 / req'}</strong>
                    <div className="nm-metric-meter">
                      <div style={{ width: selectedArch === 'rag' ? '20%' : selectedArch === 'context' ? '90%' : '45%' }} />
                    </div>
                  </div>
                  <div className="nm-tradeoff-metric">
                    <span>Time to First Token</span>
                    <strong>{selectedArch === 'rag' ? '320 ms' : selectedArch === 'context' ? '1,840 ms' : '190 ms'}</strong>
                    <div className="nm-metric-meter">
                      <div style={{ width: selectedArch === 'rag' ? '35%' : selectedArch === 'context' ? '92%' : '20%' }} />
                    </div>
                  </div>
                  <div className="nm-tradeoff-metric">
                    <span>Knowledge Freshness</span>
                    <strong>{selectedArch === 'rag' ? 'Real-time (seconds)' : selectedArch === 'context' ? 'Session bound' : 'Stale until retrain'}</strong>
                  </div>
                  <div className="nm-tradeoff-metric">
                    <span>Citation Verification</span>
                    <strong>{selectedArch === 'rag' ? 'Exact Span Level' : selectedArch === 'context' ? 'Approximate Window' : 'Implicit (Blackbox)'}</strong>
                  </div>
                </div>
                <div className="nm-sim-caption">
                  Engineering decision: RAG minimizes token cost and guarantees fresh audit trails at the expense of retrieval pipeline complexity.
                </div>
              </div>
            )}

            {/* STAGE 4: BUILD (Deterministic Agent Harness) */}
            {activeStage === 'build' && (
              <div className="nm-interactive-stage nm-stage-build">
                <div className="nm-stage-topbar">
                  <span>SYSTEM EXECUTION: AGENT DISPATCH HARNESS</span>
                  <span className="nm-stage-indicator">PYTHON RUNTIME</span>
                </div>
                <div className="nm-code-snippet">
                  <pre>
                    <code>{`@harness.register_tool(name="execute_query", timeout_sec=2.5)
def safe_query_runner(query: str, tenant_id: str) -> ToolResult:
    # 1. Enforce physical context isolation
    sandbox = IsolationSandbox(tenant=tenant_id, max_rows=100)
    
    # 2. Guard against non-deterministic loop runaway
    if harness.call_count > MAX_CALL_BUDGET:
        raise CircuitBreakerTripped("Agent call budget exhausted")
        
    return sandbox.execute(query)`}</code>
                  </pre>
                </div>
                <div className="nm-sim-caption">
                  Don't write boilerplate. Construct the deterministic runtime boundaries: sandboxing, circuit breakers, and state invariant checks.
                </div>
              </div>
            )}

            {/* STAGE 5: VERIFY (Automated Evals & Failure Discovery) */}
            {activeStage === 'verify' && (
              <div className="nm-interactive-stage nm-stage-verify">
                <div className="nm-stage-topbar">
                  <span>EVALUATION SUITE: PRODUCTION SHIP GATE</span>
                  <span className="nm-stage-indicator">VERIFICATION PASS</span>
                </div>
                <div className="nm-eval-list">
                  <div className="nm-eval-item is-pass">
                    <span className="nm-eval-icon">✓</span>
                    <span className="nm-eval-name">Deterministic Tool Argument Schema</span>
                    <span className="nm-eval-score">100% (24/24 passed)</span>
                  </div>
                  <div className="nm-eval-item is-pass">
                    <span className="nm-eval-icon">✓</span>
                    <span className="nm-eval-name">Groundedness & Faithfulness Metric</span>
                    <span className="nm-eval-score">0.96 (Threshold ≥ 0.90)</span>
                  </div>
                  <div className="nm-eval-item is-pass">
                    <span className="nm-eval-icon">✓</span>
                    <span className="nm-eval-name">P95 Latency Budget SLA</span>
                    <span className="nm-eval-score">482 ms (Budget &lt; 600 ms)</span>
                  </div>
                  <div className="nm-eval-item is-alert">
                    <span className="nm-eval-icon">!</span>
                    <span className="nm-eval-name">Prompt Injection & Jailbreak Invariant</span>
                    <span className="nm-eval-score">99.2% (1 edge case flagged)</span>
                  </div>
                </div>
                <div className="nm-sim-caption">
                  The ship decision: Every metric passes minimum threshold. The flagged injection edge case is isolated to a non-privileged sandbox.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
