import { useVizTokens, FONT_FAMILY } from '../../theme/vizTokens';
import { VisualizationContainer, FlowDots, PulseRect, useAutoCycle } from '../primitives';

/**
 * Nine RAG types as nine pipelines. The explorer steps through them on its own
 * (any click hands control to the reader). For each type, a dot travels the
 * real path a query takes: two retrievers run side by side in hybrid search,
 * corrective and agentic RAG loop back before answering, GraphRAG does its
 * heavy work at index time.
 */
type Stage = { label: string; sub?: string; when?: 'index' };
type RagType = {
  key: string;
  name: string;
  stages: Stage[];
  parallel?: { at: number; labels: [string, string] };
  loop?: { from: number; to: number; label: string };
  fixes: string;
  costs: string;
};

const TYPES: RagType[] = [
  { key: 'naive', name: 'Naive', stages: [{ label: 'Question' }, { label: 'Embed' }, { label: 'Vector search', sub: 'top-k chunks' }, { label: 'LLM answers' }],
    fixes: 'The baseline: one retrieval, one answer.', costs: '1 LLM call. Misses exact terms and multi-hop questions.' },
  { key: 'hybrid', name: 'Hybrid', stages: [{ label: 'Question' }, { label: '' }, { label: 'Fuse (RRF)', sub: 'merge both lists' }, { label: 'LLM answers' }],
    parallel: { at: 1, labels: ['BM25 keywords', 'Dense vectors'] },
    fixes: 'Finds exact names, codes and IDs that embeddings blur.', costs: 'Two indexes to keep in sync; still 1 LLM call.' },
  { key: 'rerank', name: 'Reranked', stages: [{ label: 'Question' }, { label: 'Retrieve', sub: 'top 50' }, { label: 'Cross-encoder', sub: 'rescore each' }, { label: 'Keep top 5' }, { label: 'LLM answers' }],
    fixes: 'Puts the truly relevant chunks first.', costs: 'One extra model pass per candidate (adds latency).' },
  { key: 'contextual', name: 'Contextual', stages: [{ label: 'Chunk', when: 'index' }, { label: 'Add context', sub: 'LLM, per chunk', when: 'index' }, { label: 'Index', when: 'index' }, { label: 'Retrieve' }, { label: 'LLM answers' }],
    fixes: 'Chunks no longer lose their meaning when cut out of the document.', costs: 'One LLM call per chunk at index time.' },
  { key: 'hyde', name: 'HyDE', stages: [{ label: 'Question' }, { label: 'Draft answer', sub: 'LLM guesses' }, { label: 'Embed draft' }, { label: 'Search' }, { label: 'LLM answers' }],
    fixes: 'Short questions match long documents better via a fake answer.', costs: '2 LLM calls; a wrong draft can steer search off course.' },
  { key: 'graph', name: 'GraphRAG', stages: [{ label: 'Extract', sub: 'entities, links', when: 'index' }, { label: 'Graph', sub: 'communities', when: 'index' }, { label: 'Summaries', when: 'index' }, { label: 'Pick summaries' }, { label: 'LLM answers' }],
    fixes: 'Answers "across the whole corpus" and multi-hop questions.', costs: 'Expensive graph build; must be rebuilt as data changes.' },
  { key: 'crag', name: 'Corrective', stages: [{ label: 'Question' }, { label: 'Retrieve' }, { label: 'Grade', sub: 'relevant enough?' }, { label: 'LLM answers' }],
    loop: { from: 2, to: 1, label: 'no: rewrite or search wider' },
    fixes: 'Stops answering from irrelevant chunks.', costs: 'A grader call on every query; loops add latency.' },
  { key: 'self', name: 'Self-RAG', stages: [{ label: 'Question' }, { label: 'Model: retrieve?' }, { label: 'Retrieve' }, { label: 'Model critiques', sub: 'supported?' }, { label: 'Answer' }],
    loop: { from: 3, to: 1, label: 'not supported: try again' },
    fixes: 'The model itself decides when to retrieve and checks its claims.', costs: 'Needs a model trained to emit reflection tokens.' },
  { key: 'agentic', name: 'Agentic', stages: [{ label: 'Question' }, { label: 'Agent plans' }, { label: 'Tools', sub: 'search, SQL, web' }, { label: 'Enough?' }, { label: 'Answer' }],
    loop: { from: 3, to: 1, label: 'no: plan the next step' },
    fixes: 'Handles open, multi-step research questions.', costs: 'Most LLM calls and the least predictable latency.' },
];

const W = 900;
const BOX_W = 138;
const BOX_H = 62;
const ROW_Y = 120;

export default function RagTypesExplorer() {
  const t = useVizTokens();
  const cyc = useAutoCycle(TYPES.length, 4200);
  const rt = TYPES[cyc.value];
  const n = rt.stages.length;
  const gap = (W - 40 - n * BOX_W) / (n - 1);
  const x = (i: number) => 20 + i * (BOX_W + gap);
  const cy = ROW_Y + BOX_H / 2;
  const dur = 1.1; // seconds per hop
  const total = dur * (n - 1);
  const indexColor = t.accentPurple;
  const queryColor = t.accentSecondary;

  // the main path, box edge to box edge; a parallel stage forks into two lanes
  const hops = Array.from({ length: n - 1 }, (_, i) => i);

  return (
    <VisualizationContainer title="Nine types of RAG" footer={`${rt.name} RAG. Fixes: ${rt.fixes} Costs: ${rt.costs}`}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10, fontFamily: FONT_FAMILY }}>
        {TYPES.map((ty, i) => {
          const on = i === cyc.value;
          return (
            <button key={ty.key} type="button" onClick={() => cyc.pick(i)} aria-pressed={on}
              style={{ fontFamily: FONT_FAMILY, fontSize: 15, cursor: 'pointer', padding: '1px 12px', borderRadius: '12px 8px 13px 9px',
                border: `1.8px solid ${on ? t.accentSecondary : t.border}`, background: on ? t.accentSecondary : 'transparent', color: on ? t.surface : t.textPrimary }}>
              {i + 1}. {ty.name}
            </button>
          );
        })}
      </div>

      <svg key={rt.key} viewBox={`0 0 ${W} 270`} width="100%" role="img" aria-label={`${rt.name} RAG pipeline`} style={{ display: 'block', fontFamily: FONT_FAMILY }}>
        {rt.stages.some((s) => s.when === 'index') && (
          <g>
            <text x={20} y={26} fontSize={15} fill={indexColor} fontWeight={700}>● built once, before any question (index time)</text>
            <text x={20} y={56} fontSize={15} fill={queryColor} fontWeight={700}>● runs on every question (query time)</text>
          </g>
        )}

        {hops.map((i) => {
          const parallelHere = rt.parallel && (i === rt.parallel.at - 1 || i === rt.parallel.at);
          if (parallelHere) return null;
          const c = rt.stages[i + 1].when === 'index' ? indexColor : queryColor;
          return (
            <g key={`e${i}`}>
              <line x1={x(i) + BOX_W} y1={cy} x2={x(i + 1) - 6} y2={cy} stroke={t.textSecondary} strokeWidth={1.8} />
              <path d={`M ${x(i + 1) - 6},${cy} l -9,-5 l 0,10 z`} fill={t.textSecondary} />
              <FlowDots d={`M ${x(i) + BOX_W},${cy} L ${x(i + 1) - 6},${cy}`} color={c} count={1} r={5} dur={total + 1.4} delay={i * dur} />
            </g>
          );
        })}

        {rt.parallel && (() => {
          const k = rt.parallel.at;
          const lanes = [cy - 44, cy + 44];
          return (
            <g>
              {lanes.map((ly, j) => (
                <g key={`p${j}`}>
                  <path d={`M ${x(k - 1) + BOX_W},${cy} C ${x(k) - 20},${cy} ${x(k) - 30},${ly} ${x(k)},${ly}`} fill="none" stroke={t.textSecondary} strokeWidth={1.8} />
                  <path d={`M ${x(k) + BOX_W},${ly} C ${x(k + 1) - 30},${ly} ${x(k + 1) - 20},${cy} ${x(k + 1) - 6},${cy}`} fill="none" stroke={t.textSecondary} strokeWidth={1.8} />
                  <rect x={x(k)} y={ly - 24} width={BOX_W} height={48} rx={8} fill={t.surfaceAlt} stroke={t.accentPrimary} strokeWidth={2} />
                  <text x={x(k) + BOX_W / 2} y={ly + 6} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>{rt.parallel!.labels[j]}</text>
                  {/* both retrievers run at the same moment */}
                  <FlowDots d={`M ${x(k - 1) + BOX_W},${cy} C ${x(k) - 20},${cy} ${x(k) - 30},${ly} ${x(k)},${ly} L ${x(k) + BOX_W},${ly} C ${x(k + 1) - 30},${ly} ${x(k + 1) - 20},${cy} ${x(k + 1) - 6},${cy}`}
                    color={queryColor} count={1} r={5} dur={total + 1.4} delay={(k - 1) * dur} />
                </g>
              ))}
            </g>
          );
        })()}

        {rt.stages.map((s, i) => {
          if (rt.parallel && i === rt.parallel.at) return null;
          const idx = s.when === 'index';
          const c = idx ? indexColor : queryColor;
          return (
            <g key={`s${i}`}>
              <rect x={x(i)} y={ROW_Y} width={BOX_W} height={BOX_H} rx={8} fill={t.surface} stroke={c} strokeWidth={2} strokeDasharray={idx ? '6 4' : undefined} />
              <PulseRect x={x(i)} y={ROW_Y} w={BOX_W} h={BOX_H} color={c} blink dur={total + 1.4} delay={i * dur} />
              <text x={x(i) + BOX_W / 2} y={ROW_Y + (s.sub ? 27 : 37)} textAnchor="middle" fontSize={15} fontWeight={700} fill={t.textPrimary}>{s.label}</text>
              {s.sub && <text x={x(i) + BOX_W / 2} y={ROW_Y + 48} textAnchor="middle" fontSize={14} fill={t.textSecondary}>{s.sub}</text>}
            </g>
          );
        })}

        {rt.loop && (() => {
          const { from, to, label } = rt.loop;
          const x1 = x(from) + BOX_W / 2;
          const x2 = x(to) + BOX_W / 2;
          const yb = ROW_Y + BOX_H;
          const d = `M ${x1},${yb} C ${x1},${yb + 70} ${x2},${yb + 70} ${x2},${yb + 4}`;
          return (
            <g>
              <path d={d} fill="none" stroke={t.accentDanger} strokeWidth={2} strokeDasharray="6 4" />
              <path d={`M ${x2},${yb + 4} l -5,9 l 10,0 z`} fill={t.accentDanger} />
              <text x={(x1 + x2) / 2} y={yb + 76} textAnchor="middle" fontSize={15} fill={t.accentDanger}>{label}</text>
              <FlowDots d={d} color={t.accentDanger} count={1} r={5} dur={total + 1.4} delay={from * dur + 0.4} />
            </g>
          );
        })()}
      </svg>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10, marginTop: 6, fontFamily: FONT_FAMILY, fontSize: 16 }}>
        <div><b style={{ color: t.accentPrimary }}>Fixes:</b> {rt.fixes}</div>
        <div><b style={{ color: t.accentDanger }}>Costs:</b> {rt.costs}</div>
      </div>
    </VisualizationContainer>
  );
}
