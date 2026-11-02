import { useVizTokens } from '../../theme/vizTokens';
import type { GlossaryTerm } from '../../data/glossary';

const matrixTerms = new Set(['self-attention', 'causal-mask', 'multi-head-attention', 'confusion-matrix', 'precision', 'recall', 'f1-score', 'convolution']);
const curveTerms = new Set(['gradient-descent', 'bias-variance-tradeoff', 'activation-function', 'learning-rate', 'overfitting', 'regularization', 'loss-function', 'roc-auc', 'calibration', 'model-drift']);
const histogramTerms = new Set(['quantization', 'normalization', 'dropout', 'batch-size', 'feature', 'label', 'data-poisoning']);
const treeTerms = new Set(['tokenization', 'classification', 'planning-agent', 'multi-agent-system', 'supervisor-agent', 'agent-harness', 'rest', 'json-schema']);
const sequenceTerms = new Set(['http', 'grpc', 'websocket', 'server-sent-events', 'mcp', 'a2a', 'tool-calling', 'idempotency', 'rate-limit', 'model-serving']);
const rankingTerms = new Set(['retrieval-augmented-generation', 'chunking', 'vector-database', 'cosine-similarity', 'dense-retrieval', 'bm25', 'hybrid-search', 'reranker', 'recall-at-k', 'grounding']);
const timelineTerms = new Set(['epoch', 'fine-tuning', 'rlhf', 'continuous-batching', 'speculative-decoding', 'time-to-first-token', 'tokens-per-second', 'prefill', 'decode', 'canary-deployment', 'experiment-tracking']);
const memoryTerms = new Set(['embedding', 'context-window', 'kv-cache', 'tensor-parallelism', 'lora', 'distillation', 'feature-store', 'model-registry']);
const graphTerms = new Set(['neuron', 'backpropagation', 'residual-connection', 'autoencoder', 'transformer', 'next-token-prediction', 'agent-loop', 'ai-agent', 'react-pattern', 'agent-memory']);
const boundaryTerms = new Set(['hallucination', 'human-in-the-loop', 'prompt-injection', 'jailbreak', 'guardrail', 'red-teaming', 'accuracy', 'benchmark', 'ab-test', 'model-monitoring']);

function seed(slug: string) { return [...slug].reduce((n, c) => n + c.charCodeAt(0), 0); }

export default function GlossaryDiagram({ entry }: { entry: GlossaryTerm }) {
  const t = useVizTokens();
  const s = seed(entry.slug);
  const ink = t.textPrimary;
  const muted = t.textSecondary;
  const accent = t.accentPrimary;
  const second = t.accentSecondary;
  const surface = t.surfaceAlt;
  const border = t.border;
  const common = { fontSize: 11, fill: ink, fontFamily: "'Kalam', sans-serif" } as const;
  const title = <text x="12" y="18" style={common}>{entry.term}</text>;
  let body: React.ReactNode;

  if (matrixTerms.has(entry.slug)) {
    const causal = entry.slug === 'causal-mask';
    const confusion = ['confusion-matrix', 'precision', 'recall', 'f1-score'].includes(entry.slug);
    const vals = confusion ? [50, 20, 30, 900] : [0.7, 0.2, 0.1, 0.1, 0.6, 0.3, 0.05, 0.15, 0.8];
    const n = confusion ? 2 : 3;
    body = <>{title}<text x="12" y="39" style={{...common, fill: muted}}>{confusion ? 'predicted →' : causal ? 'keys →' : 'columns →'}</text>
      {vals.map((v, i) => { const r = Math.floor(i / n), c = i % n; const blocked = causal && c > r; return <g key={i}><rect x={70+c*62} y={49+r*48} width="54" height="40" rx="3" fill={blocked ? surface : (Number(v) > 0.5 ? accent : second)} opacity={blocked ? 1 : 0.32 + ((s+i)%4)*0.12} stroke={border}/><text x={97+c*62} y={74+r*48} textAnchor="middle" style={common}>{blocked ? 'masked' : v}</text></g>; })}
      <text x="12" y="102" style={{...common, fill: muted}}>{confusion ? 'actual ↓' : 'rows ↓'}</text></>;
  } else if (curveTerms.has(entry.slug)) {
    const overfit = entry.slug === 'overfitting' || entry.slug === 'bias-variance-tradeoff';
    const roc = entry.slug === 'roc-auc';
    const calibration = entry.slug === 'calibration';
    body = <>{title}<line x1="42" y1="174" x2="338" y2="174" stroke={border}/><line x1="42" y1="44" x2="42" y2="174" stroke={border}/>
      <text x="286" y="194" style={{...common, fill: muted}}>{roc ? 'false positive rate' : calibration ? 'predicted probability' : 'step / capacity'}</text>
      <path d={roc ? 'M42 174 C75 105 130 70 338 44' : calibration ? 'M42 174 L338 44' : overfit ? 'M42 145 C120 102 215 57 338 42' : `M42 ${150-(s%20)} C120 55 220 135 338 58`} fill="none" stroke={accent} strokeWidth="3"/>
      {overfit && <path d="M42 151 C125 101 195 82 232 91 C270 101 302 129 338 160" fill="none" stroke={second} strokeWidth="3"/>}
      <text x="52" y="57" style={common}>{overfit ? 'training' : roc ? 'ROC' : calibration ? 'perfect' : 'objective'}</text>{overfit && <text x="260" y="118" style={common}>validation rises</text>}</>;
  } else if (histogramTerms.has(entry.slug)) {
    const bars = [38, 62, 96, 128, 104, 73, 45].map((v, i) => Math.max(18, v + ((s + i * 7) % 25) - 12));
    body = <>{title}<line x1="36" y1="174" x2="340" y2="174" stroke={border}/>{bars.map((h,i)=><rect key={i} x={48+i*39} y={174-h} width="28" height={h} fill={i === 3 ? accent : second} opacity={0.72} />)}<text x="42" y="195" style={{...common, fill: muted}}>value bins</text><text x="12" y="92" transform="rotate(-90 12 92)" style={{...common, fill: muted}}>count</text><text x="230" y="39" style={common}>{entry.slug === 'quantization' ? 'levels after rounding' : 'illustrative distribution'}</text></>;
  } else if (treeTerms.has(entry.slug)) {
    const labels = entry.term.split(' ').slice(0,3);
    body = <>{title}<circle cx="180" cy="50" r="16" fill={surface} stroke={accent}/><text x="180" y="54" textAnchor="middle" style={common}>root</text>{[70,145,220,295].map((x,i)=><g key={x}><line x1="180" y1="66" x2={x} y2="112" stroke={border}/><circle cx={x} cy="126" r="15" fill={i === s%4 ? accent : surface} opacity={i === s%4 ? .6 : 1} stroke={border}/><text x={x} y="130" textAnchor="middle" style={common}>{labels[i%labels.length]?.slice(0,6) ?? i+1}</text>{i<2&&<><line x1={x} y1="141" x2={x+(i?22:-22)} y2="168" stroke={border}/><text x={x+(i?22:-22)} y="187" textAnchor="middle" style={common}>{i ? 'yes' : 'no'}</text></>}</g>)}</>;
  } else if (sequenceTerms.has(entry.slug)) {
    body = <>{title}{['client','service','worker'].map((label,i)=><g key={label}><text x={65+i*115} y="48" textAnchor="middle" style={common}>{label}</text><line x1={65+i*115} y1="56" x2={65+i*115} y2="185" stroke={border} strokeDasharray="4 4"/></g>)}
      <line x1="65" y1="78" x2="175" y2="78" stroke={accent} strokeWidth="2"/><polygon points="175,78 166,73 166,83" fill={accent}/><text x="120" y="72" textAnchor="middle" style={common}>request</text>
      <line x1="180" y1="112" x2="290" y2="112" stroke={second} strokeWidth="2"/><polygon points="290,112 281,107 281,117" fill={second}/><text x="235" y="106" textAnchor="middle" style={common}>{entry.slug === 'rate-limit' ? 'quota check' : 'typed action'}</text>
      <line x1="290" y1="151" x2="70" y2="151" stroke={accent} strokeWidth="2"/><polygon points="70,151 79,146 79,156" fill={accent}/><text x="180" y="145" textAnchor="middle" style={common}>{entry.slug === 'server-sent-events' ? 'event stream' : 'result'}</text></>;
  } else if (rankingTerms.has(entry.slug)) {
    const scores = [.92,.81,.67,.43];
    body = <>{title}<text x="12" y="42" style={{...common, fill: muted}}>ranked evidence</text>{scores.map((v,i)=><g key={i}><text x="18" y={72+i*31} style={common}>{i+1}</text><rect x="40" y={57+i*31} width={260*v} height="19" rx="3" fill={i<2?accent:second} opacity={.72}/><text x={48+260*v} y={72+i*31} style={common}>{entry.slug === 'bm25' ? (12.4-i*2.1).toFixed(1) : v.toFixed(2)}</text></g>)}<line x1={entry.slug === 'recall-at-k' ? 210 : 270} y1="50" x2={entry.slug === 'recall-at-k' ? 210 : 270} y2="184" stroke={border} strokeDasharray="5 4"/><text x="246" y="197" style={common}>cutoff k</text></>;
  } else if (timelineTerms.has(entry.slug)) {
    const points = [50,112,180,250,320];
    body = <>{title}<line x1="40" y1="112" x2="330" y2="112" stroke={border} strokeWidth="3"/>{points.map((x,i)=><g key={x}><circle cx={x} cy="112" r={i === s%5 ? 10 : 7} fill={i === s%5 ? accent : second}/><text x={x} y={i%2 ? 146 : 86} textAnchor="middle" style={common}>{entry.slug === 'continuous-batching' ? `req ${i+1}` : i === 0 ? 'start' : i === 4 ? 'result' : `step ${i}`}</text></g>)}<text x="38" y="184" style={{...common, fill: muted}}>time →</text></>;
  } else if (memoryTerms.has(entry.slug)) {
    const rows = 4, cols = 7;
    body = <>{title}<text x="12" y="42" style={{...common, fill: muted}}>{entry.slug === 'kv-cache' ? 'tokens →' : 'dimensions / shards →'}</text>{Array.from({length:rows*cols},(_,i)=><rect key={i} x={44+(i%cols)*39} y={52+Math.floor(i/cols)*31} width="31" height="23" fill={(i+s)%5===0?accent:surface} opacity={(i+s)%5===0?.65:1} stroke={border}/>) }<text x="12" y="112" transform="rotate(-90 12 112)" style={common}>{entry.slug === 'tensor-parallelism' ? 'devices' : 'items'}</text></>;
  } else if (graphTerms.has(entry.slug)) {
    const nodes = [[45,105],[115,65],[115,145],[205,105],[305,105]];
    body = <>{title}{[[0,1],[0,2],[1,3],[2,3],[3,4]].map(([a,b],i)=><line key={i} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} stroke={i===s%5?accent:border} strokeWidth={i===s%5?3:2}/>)}{nodes.map(([x,y],i)=><g key={i}><circle cx={x} cy={y} r="18" fill={i===3?accent:surface} opacity={i===3?.62:1} stroke={border}/><text x={x} y={y+4} textAnchor="middle" style={common}>{['x','h₁','h₂','state','y'][i]}</text></g>)}</>;
  } else if (boundaryTerms.has(entry.slug)) {
    body = <>{title}<rect x="26" y="52" width="308" height="122" rx="10" fill={surface} stroke={border}/><path d="M180 53 C145 85 215 110 180 173" fill="none" stroke={accent} strokeWidth="3" strokeDasharray="6 4"/><circle cx={95} cy={95} r="18" fill={second} opacity=".65"/><circle cx={265} cy={132} r="18" fill={accent} opacity=".65"/><text x="62" y="139" style={common}>{entry.slug === 'accuracy' ? 'incorrect' : 'untrusted'}</text><text x="232" y="91" style={common}>{entry.slug === 'accuracy' ? 'correct' : 'allowed'}</text><text x="150" y="195" style={{...common, fill: muted}}>decision boundary</text></>;
  } else {
    body = <>{title}<line x1="38" y1="172" x2="333" y2="172" stroke={border}/>{[0,1,2,3,4].map((i)=><g key={i}><circle cx={60+i*62} cy={145-((s+i*29)%90)} r="11" fill={i===2?accent:second} opacity=".75"/><line x1={60+i*62} y1={145-((s+i*29)%90)} x2={60+i*62} y2="172" stroke={border}/><text x={60+i*62} y="191" textAnchor="middle" style={common}>{i+1}</text></g>)}</>;
  }

  return <svg data-diagram-id={entry.diagram} viewBox="0 0 360 210" width="100%" role="img" aria-label={`${entry.term}: ${entry.oneLine}`} style={{ display: 'block', maxWidth: 360, marginInline: 'auto' }}>{body}</svg>;
}
