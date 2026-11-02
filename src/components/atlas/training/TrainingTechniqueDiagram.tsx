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
      case 'bptt': return <>
        {[34,104,174,244].map((x,i)=><g key={x}><rect x={x-20} y="28" width="40" height="28" rx="7" style={box}/><text x={x-8} y="47" style={label}>h{i+1}</text>{i<3&&<path d={`M${x+20} 42 L${x+48} 42`} style={line}/>}</g>)}
        <path d="M244 67 L174 67 L104 67 L34 67" style={{...line, stroke:t.accentDanger}}/><text x="75" y="84" style={{...muted, fill:t.accentDanger}}>loss gradient through shared recurrence</text>
      </>;
      case 'cnn-training': return <>
        <rect x="12" y="10" width="76" height="66" style={box}/><path d="M22 20 H78 M22 34 H78 M22 48 H78 M22 62 H78 M26 16 V70 M42 16 V70 M58 16 V70 M74 16 V70" stroke={t.border}/><rect x="42" y="34" width="32" height="28" fill="none" stroke={t.accentPrimary} strokeWidth="3"/>
        <path d="M92 43 L146 43" style={line}/><rect x="152" y="25" width="42" height="36" style={box}/><text x="161" y="47" style={label}>3×3</text><path d="M194 43 L246 43" style={line}/><text x="253" y="37" style={label}>feature</text><text x="253" y="54" style={muted}>map</text>
      </>;
      case 'transfer-learning': return <>
        <rect x="10" y="14" width="88" height="52" rx="8" style={box}/><text x="22" y="36" style={label}>source</text><text x="22" y="53" style={muted}>features</text><path d="M98 40 L157 40" style={line}/><rect x="162" y="14" width="58" height="52" rx="8" fill={t.surfaceAlt} stroke={t.accentPrimary}/><text x="173" y="36" style={label}>freeze</text><text x="177" y="53" style={muted}>or tune</text><path d="M220 40 L270 40" style={line}/><text x="273" y="36" style={label}>target</text><text x="273" y="53" style={muted}>head</text>
      </>;
      case 'augmentation': return <>
        <rect x="12" y="20" width="55" height="46" rx="6" style={box}/><path d="M24 54 L37 36 L47 47 L57 30" stroke={t.accentPrimary} fill="none"/><path d="M67 43 L114 43" style={line}/>
        <rect x="122" y="10" width="52" height="38" rx="5" style={box}/><rect x="189" y="31" width="52" height="38" rx="5" style={box}/><rect x="256" y="14" width="42" height="51" rx="5" style={box}/><text x="125" y="82" style={muted}>crop · flip · color; same label</text>
      </>;
      case 'teacher-forcing': return <>
        {['BOS','I','run'].map((v,i)=><g key={v}><rect x={12+i*92} y="12" width="54" height="26" rx="6" style={box}/><text x={21+i*92} y="30" style={label}>{v}</text><path d={`M${39+i*92} 38 L${39+i*92} 60`} style={line}/><text x={20+i*92} y="78" style={muted}>{['I','run','EOS'][i]}</text></g>)}
        <text x="210" y="9" style={{...muted, fill:t.accentPrimary}}>true previous tokens</text>
      </>;
      case 'next-token': return <>
        {['the','cat','sat'].map((v,i)=><g key={v}><rect x={12+i*82} y="24" width="58" height="32" rx="7" style={box}/><text x={25+i*82} y="45" style={label}>{v}</text>{i<2&&<path d={`M${70+i*82} 40 L${92+i*82} 40`} style={line}/>}</g>)}<text x="245" y="45" style={{...label, fill:t.accentPrimary}}>target</text><text x="90" y="78" style={muted}>each prefix predicts its next token</text>
      </>;
      case 'gradient-checkpointing': return <>
        {[25,65,105,145,185,225,265].map((x,i)=><circle key={x} cx={x} cy="34" r="10" fill={i===0||i===3||i===6?t.accentPrimary:t.surfaceAlt} stroke={t.border}/>)}<path d="M35 34 H255" style={{...line, markerEnd:'none'}}/><path d="M145 66 Q205 82 265 66" style={{...line, stroke:t.accentWarn}}/><text x="10" y="82" style={muted}>save green checkpoints; recompute amber segment</text>
      </>;
      case 'mixed-precision': return <>
        <rect x="10" y="13" width="75" height="30" rx="7" style={box}/><text x="23" y="33" style={label}>FP16 ops</text><path d="M85 28 L136 28" style={line}/><rect x="141" y="13" width="76" height="30" rx="7" style={box}/><text x="151" y="33" style={label}>scaled g</text><path d="M217 28 L264 28" style={line}/><text x="268" y="25" style={label}>FP32</text><text x="268" y="42" style={muted}>step</text><text x="66" y="72" style={{...muted, fill:t.accentPrimary}}>scale before backward · unscale before update</text>
      </>;
      case 'gradient-accumulation': return <>
        {[20,75,130,185].map((x,i)=><g key={x}><rect x={x} y="16" width="40" height="28" rx="6" style={box}/><text x={x+11} y="35" style={label}>g{i+1}</text></g>)}<path d="M40 48 Q125 77 205 48" style={{...line, markerEnd:'none'}}/><path d="M205 48 L253 48" style={line}/><text x="258" y="44" style={label}>one</text><text x="258" y="61" style={muted}>step</text><text x="77" y="82" style={muted}>sum four microbatches</text>
      </>;
      case 'distributed-training': return <>
        {[25,105,185,265].map((x,i)=><g key={x}><rect x={x-20} y="12" width="40" height="28" rx="6" style={box}/><text x={x-7} y="31" style={label}>GPU{i+1}</text></g>)}<path d="M25 50 C25 82 265 82 265 50 M265 50 C265 62 25 62 25 50" style={{...line, markerEnd:'none'}}/><text x="105" y="82" style={{...muted, fill:t.accentPrimary}}>all-reduce gradients</text>
      </>;
      case 'contrastive': return <>
        <rect x="10" y="13" width="54" height="32" rx="6" style={box}/><text x="23" y="34" style={label}>view A</text><rect x="10" y="51" width="54" height="32" rx="6" style={box}/><text x="23" y="72" style={label}>view B</text><path d="M64 29 L130 40 M64 67 L130 48" style={line}/><circle cx="153" cy="44" r="18" style={box}/><path d="M171 44 L227 44" style={line}/><circle cx="249" cy="44" r="12" fill={t.accentPrimary}/><circle cx="286" cy="22" r="9" fill={t.accentDanger}/><text x="226" y="78" style={muted}>pull pair; push others</text>
      </>;
      case 'mae': return <>
        {[0,1,2,3].flatMap(r=>[0,1,2,3].map(c=><rect key={`${r}-${c}`} x={12+c*24} y={8+r*18} width="20" height="14" fill={(r+c)%3===0?t.surfaceAlt:t.textMuted} stroke={t.border}/>))}<path d="M112 42 L162 42" style={line}/><rect x="168" y="20" width="47" height="44" rx="7" style={box}/><text x="176" y="39" style={label}>visible</text><text x="178" y="55" style={muted}>encoder</text><path d="M215 42 L259 42" style={line}/><text x="262" y="37" style={label}>rebuild</text><text x="262" y="54" style={muted}>masked</text>
      </>;
      case 'jepa': return <>
        <rect x="8" y="15" width="62" height="52" rx="6" style={box}/><rect x="20" y="26" width="29" height="25" fill={t.accentPrimary} opacity=".75"/><text x="12" y="82" style={muted}>context</text><path d="M70 41 L123 41" style={line}/><rect x="128" y="22" width="62" height="38" rx="7" style={box}/><text x="139" y="45" style={label}>predictor</text><path d="M190 41 L239 41" style={line}/><rect x="245" y="22" width="54" height="38" rx="7" fill={t.surfaceAlt} stroke={t.accentSecondary}/><text x="253" y="38" style={label}>target</text><text x="252" y="54" style={muted}>latent</text>
      </>;
      case 'curriculum': return <>
        {[12,70,128,186,244].map((x,i)=><rect key={x} x={x} y={58-i*11} width="42" height={18+i*5} rx="5" fill={t.surfaceAlt} stroke={i<2?t.accentPrimary:i<4?t.accentWarn:t.accentDanger}/>)}<path d="M25 80 Q151 5 286 18" style={line}/><text x="13" y="15" style={muted}>easy → prerequisites → hard</text>
      </>;
      case 'active-learning': return <>
        <circle cx="42" cy="43" r="27" style={box}/><text x="25" y="39" style={label}>pool</text><text x="24" y="55" style={muted}>unlabeled</text><path d="M69 43 L120 43" style={line}/><text x="126" y="38" style={label}>query</text><text x="126" y="55" style={muted}>uncertain</text><path d="M181 43 L226 43" style={line}/><rect x="232" y="23" width="62" height="40" rx="7" style={box}/><text x="241" y="47" style={label}>human y</text><path d="M263 66 Q151 88 52 69" style={{...line, stroke:t.accentPrimary}}/>
      </>;
      case 'distillation': return <>
        <rect x="10" y="13" width="77" height="50" rx="8" style={box}/><text x="24" y="34" style={label}>teacher</text><text x="20" y="51" style={muted}>.70 .25 .05</text><path d="M87 38 L157 38" style={line}/><text x="106" y="28" style={muted}>soft targets</text><rect x="163" y="20" width="54" height="36" rx="8" fill={t.surfaceAlt} stroke={t.accentPrimary}/><text x="172" y="42" style={label}>student</text><path d="M217 38 L270 38" style={line}/><text x="274" y="42" style={label}>small</text>
      </>;
      case 'sft': return <>
        <rect x="10" y="18" width="84" height="48" rx="7" style={box}/><text x="20" y="38" style={label}>prompt</text><text x="20" y="55" style={muted}>+ target</text><path d="M94 42 L150 42" style={line}/><rect x="156" y="18" width="80" height="48" rx="7" style={box}/><text x="171" y="38" style={label}>pretrained</text><text x="181" y="55" style={muted}>all weights</text><path d="M236 42 L279 42" style={line}/><text x="282" y="38" style={label}>task</text><text x="282" y="55" style={muted}>model</text>
      </>;
      case 'prefix-tuning': return <>
        {[16,48,80].map((x,i)=><rect key={x} x={x} y="16" width="25" height="50" rx="5" fill={t.accentPurple} opacity={.55+i*.12}/>)}<text x="14" y="82" style={muted}>learned prefix</text><path d="M107 41 L151 41" style={line}/><rect x="157" y="15" width="84" height="52" rx="7" style={box}/><text x="171" y="37" style={label}>frozen layer</text><text x="171" y="54" style={muted}>K/V attention</text><path d="M241 41 L288 41" style={line}/>
      </>;
      case 'lora': return <>
        <rect x="10" y="14" width="72" height="54" rx="7" style={box}/><text x="26" y="38" style={label}>frozen W</text><text x="30" y="55" style={muted}>d × d</text><text x="99" y="45" style={label}>+</text><rect x="125" y="24" width="28" height="34" fill={t.surfaceAlt} stroke={t.accentPrimary}/><text x="134" y="45" style={label}>B</text><rect x="171" y="31" width="58" height="20" fill={t.surfaceAlt} stroke={t.accentPrimary}/><text x="195" y="46" style={label}>A</text><path d="M231 41 L277 41" style={line}/><text x="280" y="45" style={label}>Wx+BAx</text>
      </>;
      case 'instruction-tuning': return <>
        {['translate','classify','answer'].map((v,i)=><g key={v}><rect x="8" y={6+i*27} width="72" height="21" rx="5" style={box}/><text x="15" y={21+i*27} style={muted}>{v}</text><path d={`M80 ${16+i*27} L138 41`} style={line}/></g>)}<rect x="143" y="20" width="70" height="42" rx="7" style={box}/><text x="155" y="45" style={label}>one model</text><path d="M213 41 L266 41" style={line}/><text x="270" y="36" style={label}>unseen</text><text x="270" y="53" style={muted}>instruction</text>
      </>;
      case 'rlhf-ppo': return <>
        <rect x="8" y="18" width="57" height="44" rx="7" style={box}/><text x="18" y="38" style={label}>policy</text><text x="15" y="54" style={muted}>rollout</text><path d="M65 40 L111 40" style={line}/><rect x="117" y="18" width="68" height="44" rx="7" style={box}/><text x="129" y="38" style={label}>reward</text><text x="130" y="54" style={muted}>+ KL</text><path d="M185 40 L228 40" style={line}/><rect x="234" y="18" width="62" height="44" rx="7" style={box}/><text x="245" y="45" style={label}>PPO</text><path d="M265 66 Q125 88 35 66" style={{...line, stroke:t.accentPrimary}}/>
      </>;
      case 'constitutional-ai': return <>
        <rect x="7" y="10" width="62" height="29" rx="6" style={box}/><text x="16" y="30" style={label}>response</text><path d="M69 25 L116 25" style={line}/><rect x="121" y="7" width="77" height="35" rx="6" style={box}/><text x="132" y="22" style={label}>principle</text><text x="135" y="36" style={muted}>critique</text><path d="M198 25 L246 25" style={line}/><text x="250" y="29" style={label}>revise</text><path d="M278 36 Q230 79 160 61 Q91 46 36 67" style={{...line, stroke:t.accentPrimary}}/><text x="93" y="84" style={muted}>preferred synthetic pair</text>
      </>;
      case 'dpo': return <>
        <text x="10" y="27" style={{...label, fill:t.accentPrimary}}>chosen log π/πref ↑</text><path d="M34 36 L139 36" style={{...line, stroke:t.accentPrimary}}/><text x="10" y="68" style={{...label, fill:t.accentDanger}}>rejected log π/πref ↓</text><path d="M34 77 L139 77" style={{...line, stroke:t.accentDanger}}/><text x="163" y="52" style={label}>pairwise</text><text x="163" y="69" style={muted}>logistic loss</text><path d="M225 56 L284 56" style={line}/>
      </>;
      case 'qlora': return <>
        <rect x="8" y="16" width="84" height="48" rx="7" style={box}/><text x="20" y="37" style={label}>frozen base</text><text x="27" y="54" style={muted}>4-bit NF4</text><text x="104" y="44" style={label}>+</text><rect x="130" y="20" width="54" height="40" rx="7" fill={t.surfaceAlt} stroke={t.accentPrimary}/><text x="142" y="37" style={label}>LoRA</text><text x="139" y="53" style={muted}>16-bit</text><path d="M184 40 L238 40" style={line}/><text x="243" y="35" style={label}>dequantize</text><text x="243" y="53" style={muted}>for matmul</text>
      </>;
      case 'kto': return <>
        <rect x="10" y="12" width="81" height="28" rx="6" fill={t.surfaceAlt} stroke={t.accentPrimary}/><text x="20" y="31" style={label}>desirable</text><rect x="10" y="50" width="81" height="28" rx="6" fill={t.surfaceAlt} stroke={t.accentDanger}/><text x="18" y="69" style={label}>undesirable</text><path d="M91 26 L157 42 M91 64 L157 48" style={line}/><text x="164" y="39" style={label}>value vs</text><text x="164" y="56" style={muted}>KL reference</text><path d="M224 45 L284 45" style={line}/>
      </>;
      case 'grpo': return <>
        <text x="8" y="17" style={label}>one prompt</text><path d="M62 21 L103 42" style={line}/>{[122,154,186,218].map((x,i)=><g key={x}><circle cx={x} cy="42" r="12" fill={i===1||i===3?t.accentPrimary:t.surfaceAlt} stroke={t.border}/><text x={x-3} y="46" style={label}>{i===1||i===3?'1':'0'}</text></g>)}<path d="M232 42 L273 42" style={line}/><text x="276" y="37" style={label}>group</text><text x="276" y="54" style={muted}>advantage</text><text x="103" y="78" style={muted}>compare sampled rewards; no critic</text>
      </>;
      default: return <text x="12" y="45" style={label}>Mechanism diagram follows in its era commit.</text>;
    }
  })();

  return <svg viewBox="0 0 370 90" width="100%" role="img" aria-label={`${name} mechanism`}>
    <defs><marker id={markerId} markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill={t.edge}/></marker></defs>
    {content}
  </svg>;
}
