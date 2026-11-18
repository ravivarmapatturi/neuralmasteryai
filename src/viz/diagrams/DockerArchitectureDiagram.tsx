import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle, usePrefersReducedMotion } from '../primitives';
import { FlowDots, line } from '../primitives/LiveFlow';
import { DIAGRAM_TYPE } from './diagramSystem';
import { ArrowMarker, FlowArrow, OutputNode, RectNode } from './architectureShapes';

const STAGES = [
  { id: 'cli', label: 'docker CLI', sublabel: 'docker run ...', detail: 'The client -- sends your command to the daemon over the Docker REST API (a Unix socket locally, or a network interface for a remote daemon).' },
  { id: 'dockerd', label: 'dockerd', sublabel: 'the daemon', detail: 'Listens for API requests and manages Docker objects (images, containers, networks, volumes) -- but delegates the actual container lifecycle work to containerd.' },
  { id: 'containerd', label: 'containerd', sublabel: 'lifecycle manager', detail: 'A separate daemon (Docker is one of many adopters) that handles image pull/storage, container execution, and supervision -- the layer between dockerd\'s API surface and the low-level runtime.' },
  { id: 'runc', label: 'runc', sublabel: 'the OCI runtime', detail: 'Does the actual kernel-level work of creating a container: sets up namespaces and cgroups, then execs your process inside them. Implements the OCI Runtime Spec -- swap runc for another OCI-compliant runtime and the container still runs the same way.' },
  { id: 'kernel', label: 'Linux kernel', sublabel: 'namespaces + cgroups', detail: 'Namespaces isolate what a process can SEE (its own PIDs, network stack, filesystem mounts); cgroups limit what it can USE (CPU, memory, I/O). This is the real mechanism -- there is no separate "container" feature in the kernel, just these two primitives combined.' },
];

const COL_X = 60;
const COL_W = 220;
const ROW_H = 62;
const REGISTRY_X = 300;
const REGISTRY_W = 130;

/** The real chain a `docker run` actually goes through, as a real traced
 * SVG flow (not floating boxes) -- click a stage for what it does. */
export default function DockerArchitectureDiagram() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const cyc = useAutoCycle(STAGES.length, 3000);
  const selected = cyc.value;
  const color = t.accentPrimary;
  const registryColor = t.accentSecondary;
  const outputColor = t.accentPurple;

  const width = 460;
  const height = STAGES.length * ROW_H + 90;

  return (
    <VisualizationContainer footer={STAGES[selected].detail}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          <ArrowMarker id="docker-arch-arrow" color={t.textMuted} />
        </defs>

        {/* Registry, branching into containerd -- a real diagonal FlowArrow, not a floating label */}
        <RectNode t={t} x={REGISTRY_X} y={10} width={REGISTRY_W} height={30} label="Registry" sublabel="image pull/push" color={registryColor} strokeWidth={1.5} />

        {STAGES.map((s, i) => {
          const y = 60 + i * ROW_H;
          const isSelected = selected === i;
          return (
            <g key={s.id} onClick={() => cyc.pick(i)} style={{ cursor: 'pointer' }}>
              <RectNode t={t} x={COL_X} y={y} width={COL_W} height={34} label={s.label} sublabel={s.sublabel} color={color} strokeWidth={isSelected ? 2.5 : 1.5} />
              {i < STAGES.length - 1 && (
                <>
                  <FlowArrow x1={COL_X + COL_W / 2} y1={y + 34} x2={COL_X + COL_W / 2} y2={y + ROW_H} color={t.textMuted} markerId="docker-arch-arrow" />
                  {isSelected && !reducedMotion && (
                    <FlowDots d={line(COL_X + COL_W / 2, y + 34, COL_X + COL_W / 2, y + ROW_H)} color={color} count={1} dur={1.6} r={2.5} />
                  )}
                </>
              )}
              {s.id === 'containerd' && (
                <>
                  <FlowArrow x1={REGISTRY_X + REGISTRY_W / 2} y1={40} x2={COL_X + COL_W - 10} y2={y + 10} color={registryColor} markerId="docker-arch-arrow" />
                  {isSelected && !reducedMotion && (
                    <FlowDots d={line(REGISTRY_X + REGISTRY_W / 2, 40, COL_X + COL_W - 10, y + 10)} color={registryColor} count={1} dur={1.6} r={2.5} />
                  )}
                </>
              )}
            </g>
          );
        })}

        {/* Final: running container -- the real output of the chain */}
        <FlowArrow
          x1={COL_X + COL_W / 2}
          y1={60 + STAGES.length * ROW_H - (ROW_H - 34)}
          x2={COL_X + COL_W / 2}
          y2={60 + STAGES.length * ROW_H}
          color={t.textMuted}
          markerId="docker-arch-arrow"
        />
        {selected === STAGES.length - 1 && !reducedMotion && (
          <FlowDots
            d={line(
              COL_X + COL_W / 2,
              60 + STAGES.length * ROW_H - (ROW_H - 34),
              COL_X + COL_W / 2,
              60 + STAGES.length * ROW_H,
            )}
            color={outputColor}
            count={1}
            dur={1.6}
            r={2.5}
          />
        )}
        <OutputNode x={COL_X} y={60 + STAGES.length * ROW_H} width={COL_W} height={30} label="Running container" color={outputColor} />
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        Click a stage. Same chain (containerd + runc) also runs under Kubernetes' kubelet via the Container Runtime Interface -- see Kubernetes below.
      </div>
    </VisualizationContainer>
  );
}