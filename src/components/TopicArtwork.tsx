import { useVizTokens } from '../theme/vizTokens';

/** Editorial diagrams are schematic; probability bars are illustrative. */
export default function TopicArtwork({ kind }: { kind: string }) {
  const t = useVizTokens();
  const ink = t.textPrimary, blue = t.accentSecondary, green = t.accentTeal, purple = t.accentPurple;
  const box = (x: number,y: number,w: number,h: number,label: string,color=blue) => <g><rect x={x} y={y} width={w} height={h} rx="12" style={{fill:t.surface,stroke:color,strokeWidth:1.6}} /><text x={x+w/2} y={y+h/2} style={{fill:ink,fontSize:14}}>{label}</text></g>;
  return <svg viewBox="0 0 600 310" className="nm-topic-artwork" aria-hidden="true" focusable="false">
    <circle cx="300" cy="150" r="130" style={{fill:'none',stroke:t.border,strokeDasharray:'3 9'}} />
    <text x="45" y="37" style={{fill:t.textSecondary,fontSize:11,textAnchor:'start',letterSpacing:2}}>NEURAL MASTERY / VISUAL FIELD NOTES</text>
    {kind === 'kimi' ? <>
      <text x="150" y="80" style={{fill:ink,fontSize:16}}>Store the history</text><text x="455" y="80" style={{fill:ink,fontSize:16}}>Update a state</text>
      {Array.from({length:36},(_,i) => <rect key={i} x={67+i%6*29} y={103+Math.floor(i/6)*22} width="23" height="16" rx="3" style={{fill:i%6 <= Math.floor(i/6) ? blue : t.surfaceAlt,stroke:'none',opacity:i%6 <= Math.floor(i/6) ? .35+((i*7)%6)/10 : 1}} />)}
      <path d="M270 160H345m-12-8 12 8-12 8" style={{stroke:green,fill:'none'}} />
      {Array.from({length:16},(_,i) => <rect key={i} x={393+i%4*31} y={113+Math.floor(i/4)*28} width="25" height="22" rx="4" style={{fill:green,opacity:.3+(i*3%7)/10,stroke:'none'}} />)}
      <text x="150" y="265" style={{fill:t.textSecondary,fontSize:12}}>Growing KV cache</text><text x="455" y="265" style={{fill:t.textSecondary,fontSize:12}}>Fixed dimensions</text>
    </> : kind === 'jeva' ? <>
      {box(40,120,130,70,'Request',blue)}<path d="M170 155H225M375 155H420" style={{stroke:blue}} />{box(225,110,150,90,'Decision head',purple)}
      {[.18,.68,.14].map((n,i) => <g key={i}><rect x="420" y={95+i*48} width="135" height="32" rx="6" style={{fill:t.surfaceAlt,stroke:t.border}} /><rect x="420" y={95+i*48} width={135*n} height="32" rx="6" style={{fill:i===1?green:blue,opacity:.7,stroke:'none'}} /><text x="487" y={112+i*48} style={{fill:ink,fontSize:12}}>{['A','B','C'][i]} · {n.toFixed(2)}</text></g>)}
      <text x="300" y="265" style={{fill:t.textSecondary,fontSize:12}}>Structured choices · illustrative probabilities</text>
    </> : kind === 'jepa' ? <>
      {Array.from({length:25},(_,i) => <rect key={i} x={45+i%5*23} y={105+Math.floor(i/5)*23} width="19" height="19" rx="2" style={{fill:i%4===0?t.surfaceAlt:green,opacity:i%4===0?1:.3+((i*7)%5)/10,stroke:i%4===0?t.border:'none',strokeDasharray:'2 2'}} />)}
      <path d="M170 160H230M375 160H430" style={{stroke:purple}} />{box(230,125,145,70,'Predictor',purple)}
      {[0,1,2,3,4].map(i => <rect key={i} x={440+i*20} y={125+(i%2)*10} width="12" height={70-(i%2)*20} rx="5" style={{fill:purple,stroke:'none',opacity:.4+i*.12}} />)}
      <text x="105" y="255" style={{fill:t.textSecondary,fontSize:12}}>Visible context</text><text x="490" y="255" style={{fill:t.textSecondary,fontSize:12}}>Target embedding</text>
    </> : kind === 'gui' ? <>
      {[45,365].map((x,i) => <g key={x}><rect x={x} y="90" width="190" height="150" rx="12" style={{fill:t.surface,stroke:i?green:blue}} /><path d={`M${x} 118h190`} style={{stroke:t.border}} />{[0,1,2].map(n => <circle key={n} cx={x+15+n*12} cy="104" r="3" style={{fill:t.textMuted,stroke:'none'}} />)}<rect x={x+20} y="137" width="65" height="79" rx="6" style={{fill:t.surfaceAlt,stroke:'none'}} /><rect x={x+100} y="137" width="70" height="18" rx="4" style={{fill:i?green:blue,stroke:'none',opacity:.65}} /><path d={`M${x+100} 175h60m-60 16h45m-45 16h53`} style={{stroke:t.border}} /></g>)}
      <path d="M247 164H351m-12-8 12 8-12 8" style={{stroke:green}} /><text x="300" y="143" style={{fill:ink,fontSize:12}}>Act & check</text><text x="140" y="268" style={{fill:t.textSecondary,fontSize:12}}>Observed screen</text><text x="460" y="268" style={{fill:t.textSecondary,fontSize:12}}>Verify the outcome</text>
    </> : kind === 'skills' ? <>
      {box(225,125,150,65,'Agent',purple)}<path d="M225 157H175V100H90M375 157H430V210H510" style={{stroke:purple}} />
      {box(35,65,140,75,'Skill guide',green)}{box(425,180,140,65,'Tool action',blue)}
      {[0,1,2].map(i => <path key={i} d={`M60 ${160+i*18}h${90-i*18}`} style={{stroke:green,opacity:.5}} />)}
      <text x="300" y="260" style={{fill:t.textSecondary,fontSize:12}}>Instructions guide the work · tools perform actions</text>
    </> : <>
      {[2,1,0].map(i => <g key={i}><rect x={55+i*12} y={90+i*12} width="135" height="115" rx="10" style={{fill:t.surface,stroke:blue,opacity:1-i*.15}} /><path d={`M${75+i*12} ${120+i*12}h85m-85 20h65m-65 20h80`} style={{stroke:t.border}} /></g>)}
      <path d="M220 160H290M395 160H440" style={{stroke:green}} />{box(290,125,105,70,'Search',green)}{box(440,110,120,100,'Evidence',purple)}
      <text x="135" y="265" style={{fill:t.textSecondary,fontSize:12}}>Conversation history</text><text x="450" y="265" style={{fill:t.textSecondary,fontSize:12}}>Select for the next prompt</text>
    </>}
  </svg>;
}
