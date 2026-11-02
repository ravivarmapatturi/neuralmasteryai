import { useId } from 'react';
import { useVizTokens } from '../../../theme/vizTokens';
import type { TrainingDiagramKind } from '../../../data/trainingAtlas';

interface Props { kind: TrainingDiagramKind; name: string }

export default function TrainingTechniqueDiagram({ kind, name }: Props) {
  const t = useVizTokens();
  const markerId = useId().replace(/:/g, '');
  const line = { stroke: t.edge, strokeWidth: 2, fill: 'none', markerEnd: `url(#${markerId})` };
  const box = { fill: t.surfaceAlt, stroke: t.border, strokeWidth: 1.5 };
  const label = { fill: t.textPrimary, fontSize: 12, fontFamily: 'Inter, sans-serif' };
  const muted = { ...label, fill: t.textSecondary, fontSize: 11 };
  const accent = { fill: t.accentPrimary, stroke: t.accentPrimary };

  const content = (() => {
    switch (kind) {
      case 'perceptron': return <>
        <text x="8" y="24" style={label}>x₁=0.8</text><text x="8" y="62" style={label}>x₂=0.2</text>
        <path d="M52 20 L116 44 M52 58 L116 44" style={line}/><circle cx="140" cy="44" r="25" style={box}/>
        <text x="125" y="48" style={label}>Σwᵢxᵢ</text><path d="M165 44 L230 44" style={line}/>
        <text x="236" y="39" style={label}>ŷ=-1</text><text x="236" y="58" style={{...muted, fill:t.accentDanger}}>mistake → w+ηyx</text>
      </>;
      case 'backprop': return <>
        <rect x="8" y="24" width="58" height="38" rx="8" style={box}/><rect x="118" y="24" width="58" height="38" rx="8" style={box}/><rect x="228" y="24" width="58" height="38" rx="8" style={box}/>
        <text x="28" y="47" style={label}>input</text><text x="132" y="47" style={label}>hidden</text><text x="247" y="47" style={label}>loss</text>
        <path d="M66 35 L118 35 M176 35 L228 35" style={line}/><path d="M228 58 L176 58 M118 58 L66 58" style={{...line, stroke:t.accentDanger}}/>
        <text x="92" y="16" style={muted}>forward activations</text><text x="91" y="82" style={{...muted, fill:t.accentDanger}}>chain-rule gradients</text>
      </>;
      case 'sgd': return <>
        <path d="M18 67 Q80 16 145 59 T282 23" style={{...line, markerEnd:'none', stroke:t.border}}/>
        <circle cx="38" cy="52" r="5" style={accent}/><circle cx="91" cy="38" r="5" style={accent}/><circle cx="142" cy="57" r="5" style={accent}/><circle cx="200" cy="47" r="5" style={accent}/><circle cx="265" cy="29" r="5" style={accent}/>
        <path d="M38 52 L91 38 L142 57 L200 47 L265 29" style={line}/><text x="12" y="84" style={muted}>noisy minibatch steps</text><text x="218" y="16" style={label}>lower loss</text>
      </>;
      case 'momentum': return <>
        <path d="M10 18 Q65 78 120 18 T230 18 T300 18" style={{...line, markerEnd:'none', stroke:t.border}}/>
        <path d="M28 56 L76 31 L118 52 L166 32 L214 42 L270 27" style={{...line, stroke:t.accentDanger}}/><path d="M28 69 Q132 61 270 27" style={{...line, stroke:t.accentPrimary}}/>
        <text x="12" y="84" style={{...muted, fill:t.accentDanger}}>SGD zig-zag</text><text x="207" y="84" style={{...muted, fill:t.accentPrimary}}>velocity</text>
      </>;
      case 'regularization': return <>
        <path d="M14 70 Q85 4 154 67" style={{...line, markerEnd:'none', stroke:t.accentDanger}}/><path d="M154 67 Q222 25 290 53" style={{...line, markerEnd:'none', stroke:t.border}}/>
        <line x1="154" y1="12" x2="154" y2="73" stroke={t.textMuted} strokeDasharray="4 3"/><text x="58" y="18" style={{...muted, fill:t.accentDanger}}>large weights</text><text x="177" y="75" style={muted}>penalty pulls toward 0</text>
      </>;
      case 'early-stopping': return <>
        <path d="M18 18 Q110 75 284 72" style={{...line, markerEnd:'none'}}/><path d="M18 28 Q105 68 155 49 T284 20" style={{...line, markerEnd:'none', stroke:t.accentDanger}}/>
        <line x1="155" y1="10" x2="155" y2="78" stroke={t.accentPrimary} strokeDasharray="4 3"/><text x="112" y="14" style={{...muted, fill:t.accentPrimary}}>restore best</text><text x="198" y="34" style={{...muted, fill:t.accentDanger}}>validation rises</text>
      </>;
      case 'initialization': return <>
        {[30,72,114,156,198,240,282].map((x,i)=><circle key={x} cx={x} cy={44} r={Math.max(5,17-i*1.6)} fill={t.surfaceAlt} stroke={i<4?t.accentDanger:t.accentPrimary}/>) }
        <text x="8" y="82" style={{...muted, fill:t.accentDanger}}>wrong variance</text><text x="195" y="82" style={{...muted, fill:t.accentPrimary}}>fan-scaled signal</text>
      </>;
      case 'dropout': return <>
        {[38,94,150,206,262].map((x,i)=><g key={x}><circle cx={x} cy="42" r="13" fill={i===1||i===3?t.surface:t.surfaceAlt} stroke={i===1||i===3?t.textMuted:t.accentPrimary}/>{(i===1||i===3)&&<path d={`M${x-8} 34 L${x+8} 50 M${x+8} 34 L${x-8} 50`} stroke={t.accentDanger} strokeWidth="2"/>}</g>)}
        <text x="12" y="78" style={muted}>fresh Bernoulli mask: [1, 0, 1, 0, 1]</text>
      </>;
      case 'batch-norm': return <>
        {[24,54,84,114].map((x,i)=><circle key={x} cx={x} cy={20+i*15} r="5" fill={t.accentDanger}/>)}<path d="M126 44 L170 44" style={line}/>
        {[195,225,255,285].map((x,i)=><circle key={x} cx={x} cy={30+(i%2)*28} r="5" fill={t.accentPrimary}/>)}
        <text x="8" y="84" style={muted}>one channel across batch</text><text x="184" y="16" style={muted}>mean 0, variance 1</text>
      </>;
      case 'layer-norm': return <>
        {[24,64,104,144].map((x,i)=><rect key={x} x={x} y="20" width="28" height="32" rx="5" fill={i%2?t.surfaceAlt:t.nodeFill} stroke={t.border}/>)}<path d="M172 36 L214 36" style={line}/>
        {[224,251,278].map((x)=><circle key={x} cx={x} cy="36" r="7" fill={t.accentPrimary}/>)}
        <path d="M20 66 L172 66" stroke={t.accentSecondary} strokeWidth="3"/><text x="20" y="84" style={muted}>features within one token</text>
      </>;
      case 'adam': return <>
        <text x="10" y="22" style={label}>gradient gₜ</text><path d="M78 20 L126 20" style={line}/><rect x="130" y="6" width="64" height="28" rx="7" style={box}/><text x="142" y="25" style={label}>mean m</text>
        <path d="M78 48 L126 48" style={line}/><rect x="130" y="38" width="64" height="28" rx="7" style={box}/><text x="137" y="57" style={label}>square v</text>
        <path d="M194 20 L238 38 M194 52 L238 38" style={line}/><text x="244" y="42" style={label}>m̂/√v̂</text><text x="208" y="78" style={muted}>adaptive step</text>
      </>;
      case 'adamw': return <>
        <rect x="10" y="12" width="92" height="34" rx="8" style={box}/><text x="24" y="34" style={label}>Adam(data g)</text><path d="M102 29 L176 29" style={line}/><text x="182" y="33" style={label}>w′</text>
        <path d="M210 50 L210 36" style={line}/><text x="157" y="66" style={{...muted, fill:t.accentDanger}}>separate −ηλw</text><path d="M224 29 L282 29" style={line}/><text x="248" y="52" style={muted}>wₜ₊₁</text>
      </>;
      case 'lr-schedules': return <>
        <line x1="18" y1="72" x2="292" y2="72" stroke={t.border}/><path d="M18 70 L64 18 Q180 20 292 69" style={{...line, markerEnd:'none'}}/>
        <line x1="64" y1="14" x2="64" y2="75" stroke={t.accentWarn} strokeDasharray="4 3"/><text x="18" y="14" style={muted}>warmup</text><text x="171" y="40" style={muted}>cosine decay</text>
      </>;
      default: return <text x="12" y="45" style={label}>Mechanism diagram follows in its era commit.</text>;
    }
  })();

  return <svg viewBox="0 0 310 90" width="100%" role="img" aria-label={`${name} mechanism`}>
    <defs><marker id={markerId} markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill={t.edge}/></marker></defs>
    {content}
  </svg>;
}
