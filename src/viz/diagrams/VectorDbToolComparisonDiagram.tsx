import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton } from '../primitives';

type Tool = 'chroma' | 'pinecone' | 'weaviate' | 'pgvector' | 'milvus';

const TOOLS: Record<Tool, { name: string; deployment: string; indexing: string; bestFor: string; tradeoff: string }> = {
  chroma: {
    name: 'ChromaDB',
    deployment: 'Embedded, in-process (like SQLite) or a lightweight local server',
    indexing: 'HNSW under the hood',
    bestFor: 'Prototyping, local development, smaller-scale RAG apps that don\'t need a separately-managed service',
    tradeoff: 'Not built for multi-billion-vector scale or heavy concurrent write load -- optimized for getting started fast, not for being the backbone of a large production system.',
  },
  pinecone: {
    name: 'Pinecone',
    deployment: 'Fully managed cloud service',
    indexing: 'Proprietary ANN index, auto-tuned',
    bestFor: 'Production RAG at scale with zero infrastructure to operate -- pay-as-you-go managed hosting',
    tradeoff: 'Vendor lock-in and ongoing hosting cost; no self-hosted option, so it is a real dependency on Pinecone staying available and priced reasonably.',
  },
  weaviate: {
    name: 'Weaviate',
    deployment: 'Self-hosted or managed cloud',
    indexing: 'HNSW, with built-in hybrid (vector + keyword) search',
    bestFor: 'Teams that want hybrid search and rich metadata filtering as first-class features, with the option to self-host',
    tradeoff: 'More operational surface than a managed-only service if self-hosting -- you own uptime, scaling, and upgrades.',
  },
  pgvector: {
    name: 'pgvector',
    deployment: 'A Postgres extension -- runs inside your existing Postgres instance',
    indexing: 'HNSW or IVFFlat index types',
    bestFor: 'Keeping vectors in the same transactional store as your structured data -- one JOIN across embeddings and relational metadata instead of syncing two systems',
    tradeoff: 'Postgres was not purpose-built for vector search -- at very large scale or very high QPS, a dedicated vector database\'s specialized indexing still outperforms it.',
  },
  milvus: {
    name: 'Milvus',
    deployment: 'Open-source (Apache 2.0) -- Milvus Lite (embedded, pip-installable) for prototyping, Standalone or Distributed for production, or Zilliz Cloud\'s fully managed hosting',
    indexing: 'A genuinely pluggable set of index types, not just one -- HNSW, IVF, DiskANN, and quantized/binary indexes, chosen per use case',
    bestFor: 'Billion-scale vector search where you want to pick your own index tradeoff rather than accept one vendor\'s proprietary default -- and self-host it if you need to',
    tradeoff: 'That flexibility is also the cost: running a horizontally-scaled Milvus Distributed cluster yourself is real operational work, well past ChromaDB\'s territory -- Zilliz Cloud trades that complexity away for the same managed-hosting tradeoff Pinecone makes.',
  },
};

export default function VectorDbToolComparisonDiagram() {
  const t = useVizTokens();
  const [tool, setTool] = useState<Tool>('chroma');
  const info = TOOLS[tool];

  const rows: [string, string][] = [
    ['Deployment', info.deployment],
    ['Indexing', info.indexing],
    ['Best for', info.bestFor],
    ['Tradeoff', info.tradeoff],
  ];

  return (
    <VisualizationContainer footer="pgvector is covered in more depth in PostgreSQL — pgvector and the AI Stack; this table is about picking between it and a dedicated vector database, not how to use it.">
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {(Object.keys(TOOLS) as Tool[]).map((k) => (
          <VizButton key={k} variant={tool === k ? 'primary' : 'secondary'} onClick={() => setTool(k)}>
            {TOOLS[k].name}
          </VizButton>
        ))}
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <td style={{ padding: '8px 10px', borderBottom: `1px solid ${t.border}`, color: t.textMuted, fontWeight: 600, verticalAlign: 'top', width: 110 }}>{label}</td>
              <td style={{ padding: '8px 10px', borderBottom: `1px solid ${t.border}`, color: t.textPrimary }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </VisualizationContainer>
  );
}
