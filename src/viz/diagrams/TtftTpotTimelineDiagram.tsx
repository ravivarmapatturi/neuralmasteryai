import { useAutoCycle } from '../primitives';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const METRICS = ['ttft', 'tpot'] as const;

/** Where TTFT and TPOT are actually measured on a real request timeline
 * -- click either metric to see exactly which span it covers. */
export default function TtftTpotTimelineDiagram() {
  const t = useVizTokens();
  const { value: activeIdx, pick } = useAutoCycle(METRICS.length, 3200, 0);
  const active = METRICS[activeIdx];
  const ttftColor = getConceptColor(t, 'query');
  const tpotColor = getConceptColor(t, 'attention');
  const width = 560;
  const y = 50;
  const reqStart = 20;
  const firstToken = 160;
  const tokens = [220, 270, 320, 370, 420];

  return (
    <VisualizationContainer footer={active === 'ttft' ? 'TTFT: request sent → first output token appears. Dominated by prefill time.' : 'TPOT: time between each subsequent token. Dominated by decode\'s memory-bandwidth bottleneck.'}>
      <svg width="100%" viewBox={`0 0 ${width} 90`} style={{ display: 'block' }}>
        <line x1={reqStart} y1={y} x2={width - 20} y2={y} stroke={t.border} strokeWidth={1.5} />
        <circle cx={reqStart} cy={y} r={4} fill={t.textMuted} />
        <text x={reqStart} y={y - 12} fontSize={8} fill={t.textMuted}>request sent</text>

        <g onClick={() => pick(0)} onMouseEnter={() => pick(0)} style={{ cursor: 'pointer' }} opacity={active === 'ttft' ? 1 : 0.35}>
          <line x1={reqStart} y1={y - 22} x2={firstToken} y2={y - 22} stroke={ttftColor} strokeWidth={3} />
          <text x={(reqStart + firstToken) / 2} y={y - 28} textAnchor="middle" fontSize={9} fontWeight={700} fill={ttftColor}>TTFT</text>
        </g>
        <circle cx={firstToken} cy={y} r={5} fill={ttftColor} />
        <text x={firstToken} y={y + 18} fontSize={8} fill={ttftColor}>1st token</text>

        <g onClick={() => pick(1)} onMouseEnter={() => pick(1)} style={{ cursor: 'pointer' }} opacity={active === 'tpot' ? 1 : 0.35}>
          {tokens.map((x, i) => {
            const prevX = i === 0 ? firstToken : tokens[i - 1];
            return (
              <g key={i}>
                <line x1={prevX} y1={y + 22} x2={x} y2={y + 22} stroke={tpotColor} strokeWidth={3} />
                {i === 0 && <text x={(prevX + x) / 2} y={y + 34} textAnchor="middle" fontSize={9} fontWeight={700} fill={tpotColor}>TPOT</text>}
                <circle cx={x} cy={y} r={4} fill={tpotColor} />
              </g>
            );
          })}
        </g>
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        A system can have fast TTFT but slow TPOT (or the reverse) -- production systems report both, plus end-to-end latency, separately.
      </div>
    </VisualizationContainer>
  );
}
