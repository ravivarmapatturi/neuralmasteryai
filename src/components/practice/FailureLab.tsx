import { useState } from 'react';

type Tab = 'overview' | 'traces' | 'diff' | 'logs';

export default function FailureLab() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedHypothesis, setSelectedHypothesis] = useState<string | null>(null);
  const [isResolved, setIsResolved] = useState(false);

  const hypotheses = [
    {
      id: 'h1',
      text: 'The model provider degraded weights or had an outage.',
      correct: false,
      feedback: 'Incorrect. The model latency and base completion benchmarks remained steady across external monitors.',
    },
    {
      id: 'h2',
      text: 'A recent prompt change caused the model to hallucinate tool names.',
      correct: false,
      feedback: 'Close, but tool names in the traces match the JSON schema perfectly.',
    },
    {
      id: 'h3',
      text: 'Context trimming silently clipped the JSON schema invariants when chat history exceeded 8,000 tokens.',
      correct: true,
      feedback: 'Correct! The commit diff shows context trimming was changed from FIFO messages to raw token truncation, cutting off the closing braces of tool schemas at high turn counts.',
    },
    {
      id: 'h4',
      text: 'Tool API rate limits are being exceeded by excessive retries.',
      correct: false,
      feedback: 'Incorrect. HTTP status codes from the tool server returned 200 OK without 429 Throttle errors.',
    },
  ];

  return (
    <div className="nm-failure-lab" aria-label="Interactive Failure Lab: Silent Agent Degradation">
      <div className="nm-lab-badge-row">
        <span className="nm-lab-type-badge is-incident">TYPE: INCIDENT & DEBUG</span>
        <span className="nm-lab-status-badge is-alert">INCIDENT #4092 · INVESTIGATING</span>
      </div>

      <div className="nm-incident-hero">
        <h3 className="nm-incident-title">
          Your Agent Worked Yesterday. Today Task Success Rate Dropped to 61%.
        </h3>
        <p className="nm-incident-desc">
          Customers are reporting that multi-turn customer support tasks fail silently halfway through resolution.
          No crashes or 500 errors were thrown. Inspect the production telemetry and identify the root cause.
        </p>

        <div className="nm-incident-stats-row">
          <div className="nm-incident-stat">
            <span>Historical Baseline</span>
            <strong>94.2% Success</strong>
          </div>
          <div className="nm-incident-stat is-danger">
            <span>Current Status</span>
            <strong>61.4% Success (-32.8%)</strong>
          </div>
          <div className="nm-incident-stat">
            <span>Deployment Event</span>
            <strong>v2.4.1 (14h ago)</strong>
          </div>
          <div className="nm-incident-stat">
            <span>Logged HTTP Errors</span>
            <strong>0 Server Errors</strong>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="nm-failure-tabs" role="tablist">
        <button
          type="button"
          className={`nm-ftab-btn ${activeTab === 'overview' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Incident Telemetry
        </button>
        <button
          type="button"
          className={`nm-ftab-btn ${activeTab === 'traces' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('traces')}
        >
          Execution Traces (Failed Run #8412)
        </button>
        <button
          type="button"
          className={`nm-ftab-btn ${activeTab === 'diff' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('diff')}
        >
          Deployment Diff (v2.4.0 → v2.4.1)
        </button>
        <button
          type="button"
          className={`nm-ftab-btn ${activeTab === 'logs' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          Structured Logs
        </button>
      </div>

      {/* Tab Panels */}
      <div className="nm-failure-body">
        {activeTab === 'overview' && (
          <div className="nm-fpanel">
            <h4 className="nm-fpanel-title">Telemetry Anomaly Detection</h4>
            <div className="nm-fpanel-grid">
              <div className="nm-ftelemetry-card">
                <strong>Failure Pattern:</strong>
                <p>Tasks requiring 1–3 turns succeed with 98% reliability. Tasks extending beyond 6 turns fail with 88% probability.</p>
              </div>
              <div className="nm-ftelemetry-card">
                <strong>Model Behavior:</strong>
                <p>The model ceases making tool calls and outputs plain text apologies: <em>"I cannot complete this request as the available tools are not recognized."</em></p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'traces' && (
          <div className="nm-fpanel">
            <h4 className="nm-fpanel-title">OpenTelemetry Trace: Session Turn 7</h4>
            <div className="nm-trace-box">
              <pre className="nm-trace-code">
{`span_id: "spn_8412_turn7"
parent_id: "spn_8412_turn6"
tokens_total: 8192
tokens_system_prompt: 1820
tool_declarations_sent: [
  {"name": "fetch_order_status", "parameters": { ... }},
  {"name": "issue_refund", "parameters": {"type": "object", "properties": {"amount": ... [TRUNCATED]
]
model_response: "I apologize, but I don't have access to the refund tool."
finish_reason: "stop" (model saw invalid closing JSON and ignored tool)`}
              </pre>
            </div>
            <p className="nm-trace-note">
              Notice: <code>tool_declarations_sent</code> ends abruptly with <code>[TRUNCATED]</code> at token 8192.
            </p>
          </div>
        )}

        {activeTab === 'diff' && (
          <div className="nm-fpanel">
            <h4 className="nm-fpanel-title">Git Diff: commit 8f9b20 (v2.4.1)</h4>
            <div className="nm-diff-box">
              <pre className="nm-diff-code">
{`@@ -42,8 +42,8 @@ def prepare_context(history, system_prompt, max_tokens=8192):
-    # Prune oldest conversation messages first while preserving system & tool definitions
-    pruned_history = prune_oldest_user_assistant_turns(history, budget=max_tokens - len(system_prompt))
-    return system_prompt + pruned_history
+    # Optimization: Hard slice token array directly to avoid parsing turn objects
+    combined = system_prompt + history
+    return combined[:max_tokens]`}
              </pre>
            </div>
            <p className="nm-diff-note">
              Inspection note: <code>combined[:max_tokens]</code> slices the concatenated string/token buffer without parsing message or tool schema boundaries!
            </p>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="nm-fpanel">
            <h4 className="nm-fpanel-title">Agent Runtime Logs</h4>
            <div className="nm-logs-box">
              <div className="nm-log-row"><code>[14:20:01.102]</code> <span className="nm-log-info">INFO</span> Session started: user_id=9812</div>
              <div className="nm-log-row"><code>[14:20:03.450]</code> <span className="nm-log-info">INFO</span> Tool executed: fetch_order_status -&gt; OK</div>
              <div className="nm-log-row"><code>[14:20:12.890]</code> <span className="nm-log-warn">WARN</span> Context length reached 8192 tokens. Truncator triggered.</div>
              <div className="nm-log-row"><code>[14:20:14.004]</code> <span className="nm-log-info">INFO</span> Completion returned 0 tool_calls. Assistant output: "I apologize..."</div>
            </div>
          </div>
        )}

        {/* Diagnosis & Hypothesis Selection */}
        <div className="nm-hypothesis-section">
          <h4 className="nm-hyp-title">Select Your Root-Cause Diagnosis:</h4>
          <div className="nm-hyp-list">
            {hypotheses.map((hyp) => {
              const isSelected = selectedHypothesis === hyp.id;
              return (
                <div key={hyp.id} className={`nm-hyp-item ${isSelected ? 'is-selected' : ''}`}>
                  <button
                    type="button"
                    className="nm-hyp-btn"
                    onClick={() => {
                      setSelectedHypothesis(hyp.id);
                      if (hyp.correct) setIsResolved(true);
                      else setIsResolved(false);
                    }}
                  >
                    <span className="nm-hyp-bullet">{isSelected ? '●' : '○'}</span>
                    <span>{hyp.text}</span>
                  </button>
                  {isSelected && (
                    <div className={`nm-hyp-feedback ${hyp.correct ? 'is-correct' : 'is-wrong'}`}>
                      <strong>{hyp.correct ? '✓ Verified Root Cause' : '✗ Hypothesis Rejected'}:</strong>
                      <p>{hyp.feedback}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {isResolved && (
            <div className="nm-remediation-box">
              <span className="nm-rem-badge">INCIDENT MITIGATION VERIFIED</span>
              <h5>Engineering Fix:</h5>
              <p>
                Never slice raw token buffers across structured tool schemas. Preserve the immutable system prompt and tool definitions, and prune conversation history turns from the middle or oldest turn using message-level granularity.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
