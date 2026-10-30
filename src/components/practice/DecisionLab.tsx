import { useState, useMemo } from 'react';

type Chunking = 'semantic' | 'recursive' | 'parent-child';
type Retrieval = 'dense' | 'hybrid' | 'sparse';
type Index = 'hnsw' | 'ivf-pq' | 'flat';
type Reranking = 'none' | 'cross-encoder' | 'llm';
type Model = 'small' | 'medium' | 'frontier';
type Caching = 'none' | 'query' | 'semantic';

export default function DecisionLab() {
  const [chunking, setChunking] = useState<Chunking>('recursive');
  const [retrieval, setRetrieval] = useState<Retrieval>('hybrid');
  const [index, setIndex] = useState<Index>('hnsw');
  const [reranking, setReranking] = useState<Reranking>('cross-encoder');
  const [model, setModel] = useState<Model>('medium');
  const [caching, setCaching] = useState<Caching>('query');

  // Dynamic calculation based on physical laws and economics
  const stats = useMemo(() => {
    let latency = 120; // base network + orchestrator ms
    let cost = 1200; // base infra hosting
    let quality = 65; // base score / 100
    let freshness = 60; // default 60 min update time
    let complexityScore = 2; // scale 1-5

    // Chunking impacts quality & latency
    if (chunking === 'semantic') {
      quality += 12;
      latency += 60;
      complexityScore += 1;
    } else if (chunking === 'parent-child') {
      quality += 18;
      latency += 80;
      cost += 600;
      complexityScore += 1.5;
    } else {
      // recursive
      quality += 6;
      latency += 20;
    }

    // Retrieval method
    if (retrieval === 'hybrid') {
      quality += 15;
      latency += 70;
      cost += 900;
      complexityScore += 1;
    } else if (retrieval === 'dense') {
      quality += 8;
      latency += 40;
      cost += 500;
    } else {
      // sparse BM25
      quality -= 6;
      latency += 15;
      cost += 100;
    }

    // Index
    if (index === 'hnsw') {
      latency += 15;
      cost += 1800; // RAM heavy for 10M vectors
    } else if (index === 'ivf-pq') {
      latency += 45;
      cost += 450; // Compressed
      quality -= 4;
    } else {
      // flat exact
      latency += 650;
      cost += 200;
    }

    // Reranker
    if (reranking === 'cross-encoder') {
      quality += 16;
      latency += 180;
      cost += 1100;
      complexityScore += 0.8;
    } else if (reranking === 'llm') {
      quality += 22;
      latency += 750;
      cost += 3800;
      complexityScore += 1.2;
    }

    // Generation Model
    if (model === 'frontier') {
      quality += 20;
      latency += 520;
      cost += 4200;
    } else if (model === 'medium') {
      quality += 12;
      latency += 260;
      cost += 1800;
    } else {
      // small 8B
      quality += 2;
      latency += 90;
      cost += 400;
    }

    // Caching
    if (caching === 'semantic') {
      latency = Math.round(latency * 0.65);
      cost -= 800;
      freshness += 25; // cache invalidation delay
      complexityScore += 1.2;
    } else if (caching === 'query') {
      latency = Math.round(latency * 0.8);
      cost -= 500;
      freshness += 10;
    }

    const budgetExceeded = cost > 8000;
    const latencyViolated = latency > 800;

    let complexityLabel = 'Low';
    if (complexityScore >= 4.5) complexityLabel = 'Very High';
    else if (complexityScore >= 3.2) complexityLabel = 'High';
    else if (complexityScore >= 2.2) complexityLabel = 'Moderate';

    return {
      quality: Math.min(99, Math.max(30, quality)),
      latency,
      cost,
      freshness,
      complexity: complexityLabel,
      budgetExceeded,
      latencyViolated,
    };
  }, [chunking, retrieval, index, reranking, model, caching]);

  return (
    <div className="nm-decision-lab" aria-label="Interactive Decision Lab: Production RAG">
      <div className="nm-lab-badge-row">
        <span className="nm-lab-type-badge">TYPE: DESIGN & DECIDE</span>
        <span className="nm-lab-status-badge">LIVE SIMULATION</span>
      </div>

      <div className="nm-lab-scenario">
        <h3 className="nm-lab-scenario-title">Scenario: Design a 10M-Document Production RAG System</h3>
        <div className="nm-lab-constraints">
          <div className="nm-constraint-chip"><strong>Corpus:</strong> 10M Docs</div>
          <div className="nm-constraint-chip"><strong>Traffic:</strong> 50K queries/day</div>
          <div className="nm-constraint-chip"><strong>SLA Target:</strong> P95 &lt; 800ms</div>
          <div className="nm-constraint-chip"><strong>Citations:</strong> Strict Source Spans</div>
          <div className="nm-constraint-chip"><strong>Updates:</strong> Hourly Ingestion</div>
          <div className="nm-constraint-chip"><strong>Budget:</strong> $8,000 / month</div>
        </div>
      </div>

      {/* Decision Configuration Controls */}
      <div className="nm-lab-controls-grid">
        {/* 1. Chunking */}
        <div className="nm-lab-control-group">
          <label className="nm-lab-control-label">1. Chunking Strategy</label>
          <div className="nm-lab-button-row">
            {(['recursive', 'semantic', 'parent-child'] as Chunking[]).map((c) => (
              <button
                key={c}
                type="button"
                className={`nm-lab-choice-btn ${chunking === c ? 'is-active' : ''}`}
                onClick={() => setChunking(c)}
              >
                {c === 'recursive' ? 'Recursive (512)' : c === 'semantic' ? 'Semantic Spans' : 'Parent-Child (Hierarchical)'}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Retrieval */}
        <div className="nm-lab-control-group">
          <label className="nm-lab-control-label">2. Retrieval Method</label>
          <div className="nm-lab-button-row">
            {(['dense', 'hybrid', 'sparse'] as Retrieval[]).map((r) => (
              <button
                key={r}
                type="button"
                className={`nm-lab-choice-btn ${retrieval === r ? 'is-active' : ''}`}
                onClick={() => setRetrieval(r)}
              >
                {r === 'dense' ? 'Dense Only (HNSW)' : r === 'hybrid' ? 'Hybrid (Dense + BM25 Reciprocal)' : 'Sparse (BM25 only)'}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Vector Index */}
        <div className="nm-lab-control-group">
          <label className="nm-lab-control-label">3. Vector Index Structure</label>
          <div className="nm-lab-button-row">
            {(['hnsw', 'ivf-pq', 'flat'] as Index[]).map((i) => (
              <button
                key={i}
                type="button"
                className={`nm-lab-choice-btn ${index === i ? 'is-active' : ''}`}
                onClick={() => setIndex(i)}
              >
                {i === 'hnsw' ? 'HNSW (High RAM, Ultra Fast)' : i === 'ivf-pq' ? 'IVF-PQ (Quantized, Low Memory)' : 'Flat (Exact Scan)'}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Reranking */}
        <div className="nm-lab-control-group">
          <label className="nm-lab-control-label">4. Post-Retrieval Reranking</label>
          <div className="nm-lab-button-row">
            {(['none', 'cross-encoder', 'llm'] as Reranking[]).map((rr) => (
              <button
                key={rr}
                type="button"
                className={`nm-lab-choice-btn ${reranking === rr ? 'is-active' : ''}`}
                onClick={() => setReranking(rr)}
              >
                {rr === 'none' ? 'None (Raw Scores)' : rr === 'cross-encoder' ? 'Cross-Encoder (BGE-Reranker)' : 'LLM-as-a-Reranker'}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Generator Model */}
        <div className="nm-lab-control-group">
          <label className="nm-lab-control-label">5. Generation LLM</label>
          <div className="nm-lab-button-row">
            {(['small', 'medium', 'frontier'] as Model[]).map((m) => (
              <button
                key={m}
                type="button"
                className={`nm-lab-choice-btn ${model === m ? 'is-active' : ''}`}
                onClick={() => setModel(m)}
              >
                {m === 'small' ? '8B Distilled (Local vLLM)' : m === 'medium' ? '70B Quantized' : 'Frontier Cloud API'}
              </button>
            ))}
          </div>
        </div>

        {/* 6. Caching Layer */}
        <div className="nm-lab-control-group">
          <label className="nm-lab-control-label">6. Caching Strategy</label>
          <div className="nm-lab-button-row">
            {(['none', 'query', 'semantic'] as Caching[]).map((cc) => (
              <button
                key={cc}
                type="button"
                className={`nm-lab-choice-btn ${caching === cc ? 'is-active' : ''}`}
                onClick={() => setCaching(cc)}
              >
                {cc === 'none' ? 'No Cache' : cc === 'query' ? 'Exact Hash Query Cache' : 'Semantic Embedding Cache'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live System Consequences Dashboard */}
      <div className="nm-lab-consequences">
        <h4 className="nm-lab-cons-title">Live System Consequences</h4>
        <div className="nm-lab-metrics-bar">
          <div className="nm-lab-metric-card">
            <span className="nm-lab-metric-label">Quality Score</span>
            <strong className="nm-lab-metric-val" style={{ color: stats.quality > 85 ? 'var(--nm-accent-primary)' : 'var(--nm-accent-secondary)' }}>
              {stats.quality} / 100
            </strong>
            <span className="nm-lab-metric-sub">Faithfulness & Recall</span>
          </div>

          <div className={`nm-lab-metric-card ${stats.latencyViolated ? 'is-violating' : ''}`}>
            <span className="nm-lab-metric-label">P95 Latency</span>
            <strong className="nm-lab-metric-val">
              {stats.latency} ms
            </strong>
            <span className="nm-lab-metric-sub">{stats.latencyViolated ? '⚠️ Breaches 800ms SLA' : '✓ Within 800ms budget'}</span>
          </div>

          <div className={`nm-lab-metric-card ${stats.budgetExceeded ? 'is-violating' : ''}`}>
            <span className="nm-lab-metric-label">Monthly Infra Cost</span>
            <strong className="nm-lab-metric-val">
              ${stats.cost.toLocaleString()}
            </strong>
            <span className="nm-lab-metric-sub">{stats.budgetExceeded ? '⚠️ Exceeds $8K budget' : '✓ Within $8K budget'}</span>
          </div>

          <div className="nm-lab-metric-card">
            <span className="nm-lab-metric-label">Data Freshness</span>
            <strong className="nm-lab-metric-val">
              ~{stats.freshness} min
            </strong>
            <span className="nm-lab-metric-sub">Ingestion & cache TTL</span>
          </div>

          <div className="nm-lab-metric-card">
            <span className="nm-lab-metric-label">System Complexity</span>
            <strong className="nm-lab-metric-val">
              {stats.complexity}
            </strong>
            <span className="nm-lab-metric-sub">Maintenance surface</span>
          </div>
        </div>

        {/* Dynamic Architectural Post-Mortem */}
        <div className="nm-lab-postmortem">
          <h5 className="nm-lab-pm-title">ARCHITECTURAL TRADE-OFF ANALYSIS</h5>
          <div className="nm-lab-pm-grid">
            <div className="nm-lab-pm-item">
              <strong style={{ color: 'var(--nm-accent-primary)' }}>What you optimized:</strong>
              <p>
                {stats.quality > 85
                  ? 'Maximum groundedness and context precision using dense reranking and semantic hierarchy.'
                  : stats.latency < 400
                  ? 'Low-latency conversational response times under 400ms.'
                  : 'Economical throughput, keeping cloud infrastructure costs under budget.'}
              </p>
            </div>
            <div className="nm-lab-pm-item">
              <strong style={{ color: 'var(--nm-accent-warn)' }}>What you sacrificed:</strong>
              <p>
                {stats.budgetExceeded
                  ? 'Budget viability: High-tier models and large memory indices exceed financial parameters.'
                  : stats.latencyViolated
                  ? 'User responsiveness: Multiple sequential network hops (reranker + LLM) breach SLA.'
                  : index === 'ivf-pq'
                  ? 'Vector recall: Compressed quantization introduces subtle recall drops on niche queries.'
                  : 'Operational simplicity: Multi-stage pipeline requires complex distributed monitoring.'}
              </p>
            </div>
            <div className="nm-lab-pm-item">
              <strong style={{ color: 'var(--nm-accent-danger)' }}>Where it will fail first:</strong>
              <p>
                {caching === 'semantic'
                  ? 'Cache poisoning on subtly different user intents that share high cosine similarity.'
                  : reranking === 'llm'
                  ? 'Sequential LLM timeouts and throughput exhaustion under peak traffic spikes.'
                  : index === 'hnsw'
                  ? 'OOM memory crashes when 10M embeddings and graph connections exceed server RAM.'
                  : 'Document sync lag when hourly batch updates lock index read replicas.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
