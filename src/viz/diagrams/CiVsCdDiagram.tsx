import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle, usePrefersReducedMotion } from '../primitives';
import { FlowDots, line } from '../primitives/LiveFlow';
import { getConceptColor } from './diagramSystem';

type Stage = 'ci' | 'cd';

/** CI catches breakage BEFORE merge; CD ships AFTER merge, automatically
 * -- click either half of the pipeline. */
export default function CiVsCdDiagram() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const cyc = useAutoCycle(2, 3500);
  const active: Stage = cyc.value === 0 ? 'ci' : 'cd';
  const ciColor = getConceptColor(t, 'query');
  const cdColor = getConceptColor(t, 'attention');
  const width = 560;

  return (
    <VisualizationContainer footer={active === 'ci' ? 'CI: on every push/PR -- test, build, lint, vulnerability scan. Runs BEFORE merge, catching breakage before it ever reaches main.' : 'CD: on a successful CI run from main -- automatically deploy, run post-deploy checks, roll out. Runs AFTER merge, removing manual release steps.'}>
      <svg width="100%" viewBox={`0 0 ${width} 90`} style={{ display: 'block' }}>
        <defs>
          <marker id="cicd-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.textMuted} />
          </marker>
        </defs>
        <text x={10} y={16} fontSize={9} fill={t.textMuted}>push/PR</text>
        <g onClick={() => cyc.pick(0)} onMouseEnter={() => cyc.pick(0)} style={{ cursor: 'pointer' }} opacity={active === 'ci' ? 1 : 0.4}>
          <rect x={70} y={25} width={140} height={36} rx={8} fill={active === 'ci' ? `${ciColor}25` : t.surfaceAlt} stroke={ciColor} strokeWidth={active === 'ci' ? 2.5 : 1.5} />
          <text x={140} y={47} textAnchor="middle" fontSize={10} fontWeight={700} fill={ciColor}>CI</text>
        </g>
        <text x={140} y={80} textAnchor="middle" fontSize={8} fill={ciColor}>test · build · lint · scan</text>
        <line x1={210} y1={43} x2={250} y2={43} stroke={t.textPrimary} strokeWidth={1.5} markerEnd="url(#cicd-arrow)" />
        {!reducedMotion && (
          <FlowDots d={line(210, 43, 250, 43)} color={active === 'ci' ? ciColor : cdColor} count={1} dur={1.6} r={2.5} />
        )}
        <text x={220} y={35} fontSize={8} fill={t.textMuted}>merge</text>
        <g onClick={() => cyc.pick(1)} onMouseEnter={() => cyc.pick(1)} style={{ cursor: 'pointer' }} opacity={active === 'cd' ? 1 : 0.4}>
          <rect x={250} y={25} width={140} height={36} rx={8} fill={active === 'cd' ? `${cdColor}25` : t.surfaceAlt} stroke={cdColor} strokeWidth={active === 'cd' ? 2.5 : 1.5} />
          <text x={320} y={47} textAnchor="middle" fontSize={10} fontWeight={700} fill={cdColor}>CD</text>
        </g>
        <text x={320} y={80} textAnchor="middle" fontSize={8} fill={cdColor}>deploy · check · roll out</text>
        <line x1={390} y1={43} x2={430} y2={43} stroke={t.textPrimary} strokeWidth={1.5} markerEnd="url(#cicd-arrow)" />
        {!reducedMotion && active === 'cd' && (
          <FlowDots d={line(390, 43, 430, 43)} color={cdColor} count={1} dur={1.6} r={2.5} />
        )}
        <text x={470} y={47} fontSize={9} fill={t.accentPrimary} fontWeight={700}>production</text>
      </svg>
    </VisualizationContainer>
  );
}