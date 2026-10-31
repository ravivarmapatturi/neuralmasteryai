import { useState } from 'react';

type Decision = 'ship' | 'block' | 'needs-changes' | null;

export default function WouldYouShipThis() {
  const [decision, setDecision] = useState<Decision>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const checklist = [
    { id: 'c1', label: 'Security: No raw string interpolation into SQL or subprocess commands', pass: false, note: 'CRITICAL: Raw query is passed to cursor without parameter binding' },
    { id: 'c2', label: 'Concurrency: Async lock protects shared cache from race conditions', pass: false, note: 'MISSING: Multiple concurrent coroutines will perform redundant cache writes' },
    { id: 'c3', label: 'Error handling: Database and cache failures have an explicit recovery path', pass: false, note: 'MISSING: The shown method does not handle database or cache exceptions.' },
    { id: 'c4', label: 'Observability: Failed queries and background writes can be traced', pass: false, note: 'MISSING: There are no spans or error records in the shown code; the background write is not awaited.' },
    { id: 'c5', label: 'Cache keys: The same query has a stable key across server processes', pass: false, note: 'MISSING: Python hash() is process-dependent; use a stable digest and include the source version in the key.' },
  ];

  return (
    <div className="nm-ship-lab" aria-label="Engineering Judgment: Would You Ship This?">
      <div className="nm-lab-badge-row">
        <span className="nm-lab-type-badge is-review">TYPE: REVIEW & JUDGMENT</span>
        <span className="nm-lab-status-badge">CODE REVIEW GATE</span>
      </div>

      <div className="nm-ship-header">
        <h3 className="nm-ship-title">Challenge: Would You Ship This AI-Generated Pull Request?</h3>
        <p className="nm-ship-desc">
          A teammate proposes this <em>Tenant Knowledge Retrieval Service</em> for release. This is a fictional review exercise.
          The test suite passed 100%. Inspect the code, evaluate security and concurrency, and make the ship decision.
        </p>
      </div>

      {/* Code Viewer */}
      <div className="nm-ship-code-box">
        <div className="nm-ship-code-topbar">
          <span>PR #418: services/tenant_retrieval.py (+48, -12 lines)</span>
          <span className="nm-ship-ci-badge">✓ CI: 14/14 Tests Passed</span>
        </div>
        <pre className="nm-ship-code">
          <code>{`class TenantRetrievalService:
    def __init__(self, db_pool, cache_client):
        self.db = db_pool
        self.cache = cache_client
        self.lock = asyncio.Lock()

    async def retrieve_context(self, tenant_id: str, query: str) -> list[str]:
        cache_key = f"tenant:{tenant_id}:q:{hash(query)}"
        
        # Check in-memory Redis cache
        cached = await self.cache.get(cache_key)
        if cached:
            return json.loads(cached)

        # Query vector embeddings from Postgres pgvector
        # AI generated: "Fast query construction using string formatting"
        sql = f"SELECT chunk_text FROM embeddings WHERE tenant_id = '{tenant_id}' ORDER BY vector <=> embedding(query) LIMIT 5;"
        
        async with self.db.acquire() as conn:
            records = await conn.fetch(sql)
            
        results = [r["chunk_text"] for r in records]
        
        # Fire-and-forget background cache update without concurrency lock
        asyncio.create_task(self.cache.set(cache_key, json.dumps(results), ex=3600))
        
        return results`}</code>
        </pre>
      </div>

      {/* Interactive Review Checklist */}
      <div className="nm-ship-checklist-section">
        <h4 className="nm-checklist-title">Pre-Deployment Review Checklist:</h4>
        <div className="nm-checklist-items">
          {checklist.map((item) => (
            <label key={item.id} className="nm-check-item">
              <input
                type="checkbox"
                checked={!!checkedItems[item.id]}
                onChange={() => toggleCheck(item.id)}
              />
              <span className="nm-check-label">{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Decision Action Buttons */}
      <div className="nm-ship-actions">
        <h4 className="nm-actions-prompt">What is your engineering decision?</h4>
        <div className="nm-action-buttons">
          <button
            type="button"
            className={`nm-ship-btn is-green ${decision === 'ship' ? 'is-active' : ''}`}
            onClick={() => {
              setDecision('ship');
              setShowAnalysis(true);
            }}
          >
            ✓ SHIP TO PROD
          </button>
          <button
            type="button"
            className={`nm-ship-btn is-amber ${decision === 'needs-changes' ? 'is-active' : ''}`}
            onClick={() => {
              setDecision('needs-changes');
              setShowAnalysis(true);
            }}
          >
            ⚠️ REQUEST CHANGES
          </button>
          <button
            type="button"
            className={`nm-ship-btn is-red ${decision === 'block' ? 'is-active' : ''}`}
            onClick={() => {
              setDecision('block');
              setShowAnalysis(true);
            }}
          >
            🛑 BLOCK RELEASE
          </button>
        </div>
      </div>

      {/* Expert Analysis Breakdown */}
      {showAnalysis && (
        <div className="nm-ship-analysis">
          <div className="nm-analysis-top">
            <span className="nm-analysis-badge">EXPERT VERDICT</span>
            <strong className="nm-verdict-text">
              {decision === 'needs-changes' || decision === 'block'
                ? 'Correct Decision: This PR contains a Critical Security Vulnerability.'
                : 'Catastrophic Production Incident! You shipped a SQL injection vector.'}
            </strong>
          </div>
          <div className="nm-analysis-content">
            <p>
              <strong>1. SQL Injection Vulnerability:</strong> Line 16 constructs a SQL string via python f-string formatting:{' '}
              <code>f"WHERE tenant_id = '{'{tenant_id}'}'"</code>. An adversary can craft a malicious <code>tenant_id</code> payload (e.g., <code>' OR 1=1 --</code>) to bypass tenant isolation and exfiltrate another enterprise customer’s proprietary vector documents.
            </p>
            <p>
              <strong>2. Unbounded Background Tasks:</strong> Line 24 dispatches <code>asyncio.create_task()</code> with no reference retention and no semaphore. Under 10,000 queries/second, this will exhaust task queues and crash the event loop with silent memory leaks.
            </p>
            <div className="nm-analysis-lesson">
              <strong>The AI Era Engineering Lesson:</strong> Autonomous coding agents generate code that compiles, runs, and passes shallow unit tests. The human engineer provides the adversarial lens: inspecting concurrency invariants, multi-tenant boundaries, and failure modes.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
