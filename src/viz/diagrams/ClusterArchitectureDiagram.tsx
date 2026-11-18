import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { ArrowMarker, FlowArrow, RectNode, edgeToEdge, type Box } from './architectureShapes';

// Modeled on kubernetes.io's own "Cluster Architecture" reference diagram
// (Figure 1, kubernetes.io/docs/concepts/architecture/) -- not a copy of
// their SVG asset, but the same real structure: kube-apiserver as a HUB
// every other control-plane component and every node talks through (not a
// left-to-right chain), cloud-controller-manager as a real 5th
// (optional) control-plane component, and Pods actually shown running on
// each node -- the entire point of the system, invisible in an earlier
// draft of this diagram.
const CONTROL = [
  { id: 'apiserver', label: 'kube-apiserver', x: 165, y: 96, w: 130, h: 34, detail: 'The front door -- every request (kubectl, every other control-plane component, every node\'s kubelet) goes through it. Handles auth and admission control, then reads/writes cluster state in etcd. The hub every other component connects through -- not a link in a chain.' },
  { id: 'etcd', label: 'etcd', x: 330, y: 60, w: 100, h: 30, detail: "The cluster's source of truth: a consistent, highly-available key-value store holding all API-server data (every object's desired state, and its last observed status)." },
  { id: 'scheduler', label: 'kube-scheduler', x: 20, y: 60, w: 130, h: 30, detail: 'Watches for Pods with no node assigned yet, and picks a suitable node for each one based on resource requests, constraints, and current node capacity.' },
  { id: 'controller-manager', label: 'kube-controller-manager', x: 20, y: 148, w: 150, h: 30, detail: 'Runs the reconciliation loops -- the exact mechanism the diagram above (Deployment desired-state vs. actual-state) visualizes. Watches cluster state and keeps nudging reality toward what was declared.' },
  { id: 'cloud-controller-manager', label: 'cloud-controller-manager', x: 290, y: 148, w: 150, h: 30, sublabel: 'optional', detail: "Optional -- only present when the cluster runs on a cloud provider. Runs cloud-specific control logic (node, route, and load-balancer/service controllers) so cloud-provider-specific code stays out of kube-controller-manager and the core Kubernetes binaries." },
];

const NODE_W = 205;
const NODE_GAP = 20;
const NODE_Y = 240;
const NODE_H = 148;
const NODES_X = [20, 20 + NODE_W + NODE_GAP];

const NODE_COMPONENT_DETAILS: Record<'kubelet' | 'runtime' | 'kube-proxy', string> = {
  kubelet: "The node's own agent: watches the API server for Pods assigned to this node, and tells the container runtime to start/stop their containers accordingly. Reports node and Pod status back up.",
  runtime: "The software that actually runs containers on this node -- containerd or CRI-O, talking to runc underneath via the same OCI-standardized chain Docker uses (see Containers). kubelet talks to it through the Container Runtime Interface (CRI), not a runtime-specific API.",
  'kube-proxy': 'Maintains the network rules on this node that implement Service routing -- the reason a Service address reaches whichever Pod is actually behind it right now.',
};

const CYCLE_COMPONENTS = ['kubectl', 'apiserver', 'scheduler', 'controller-manager', 'etcd', 'kubelet', 'pod'];

/** The real cluster topology: kube-apiserver as a hub every other
 * control-plane component and every node's kubelet connects through
 * (never a left-to-right chain), a real 5th control-plane component
 * (cloud-controller-manager, marked optional), and actual Pods shown
 * running on two concrete worker nodes -- modeled on kubernetes.io's own
 * reference architecture diagram. Click any component for what it does. */
export default function ClusterArchitectureDiagram() {
  const t = useVizTokens();
  const { value: selIdx, pick } = useAutoCycle(CYCLE_COMPONENTS.length, 3000, 1);
  const selected = CYCLE_COMPONENTS[selIdx];
  const controlColor = t.accentSecondary;
  const workerColor = t.accentPrimary;
  const podColor = t.accentWarn;
  const kubectlColor = t.textSecondary;

  const allDetails: Record<string, string> = {
    kubectl: 'What you actually run -- kubectl apply sends a request to the API server; it does not talk to any other component directly.',
    ...Object.fromEntries(CONTROL.map((c) => [c.id, c.detail])),
    ...NODE_COMPONENT_DETAILS,
    pod: 'The actual point of the whole system -- everything above exists to get Pods running on a node and reachable. kubelet starts them via the runtime; kube-proxy makes them reachable through a Service.',
  };

  const width = 460;
  const height = NODE_Y + NODE_H + 30;
  const apiserverBox = CONTROL[0];

  return (
    <VisualizationContainer footer={allDetails[selected]}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          <ArrowMarker id="cluster-arrow" color={t.textMuted} />
        </defs>

        {/* kubectl -> apiserver */}
        <g onClick={() => pick(CYCLE_COMPONENTS.indexOf('kubectl'))} style={{ cursor: 'pointer' }}>
          <RectNode t={t} x={165} y={8} width={130} height={26} label="kubectl" color={kubectlColor} strokeWidth={selected === 'kubectl' ? 2.5 : 1.5} />
        </g>
        <FlowArrow x1={230} y1={34} x2={230} y2={96} color={t.textMuted} markerId="cluster-arrow" />

        {/* Control plane region */}
        <rect x={10} y={48} width={440} height={140} rx={10} fill={`${controlColor}08`} stroke={controlColor} strokeWidth={1.2} strokeDasharray="4 3" />
        <text x={20} y={42} fontSize={9.5} fontWeight={700} fill={controlColor} style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Control Plane
        </text>

        {/* Hub-and-spoke: apiserver <-> each of the other 4, real radiating lines,
            each one clipped at both boxes' own edges so it never crosses either label */}
        {CONTROL.filter((c) => c.id !== 'apiserver').map((c) => {
          const { from, to } = edgeToEdge(apiserverBox, c);
          return <FlowArrow key={c.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} color={t.textMuted} markerId="cluster-arrow" />;
        })}

        {CONTROL.map((c) => (
          <g key={c.id} onClick={() => { const idx = CYCLE_COMPONENTS.indexOf(c.id); if (idx !== -1) pick(idx); }} style={{ cursor: 'pointer' }}>
            <RectNode t={t} x={c.x} y={c.y} width={c.w} height={c.h} label={c.label} sublabel={c.sublabel} color={controlColor} strokeWidth={selected === c.id ? 2.5 : 1.5} />
          </g>
        ))}

        {/* Worker nodes: two concrete nodes, side by side, each with Pods + kubelet + runtime + kube-proxy */}
        {NODES_X.map((nx, ni) => (
          <g key={ni}>
            <rect x={nx} y={NODE_Y} width={NODE_W} height={NODE_H} rx={10} fill={`${workerColor}08`} stroke={workerColor} strokeWidth={1.2} strokeDasharray="4 3" />
            <text x={nx + 10} y={NODE_Y - 6} fontSize={9.5} fontWeight={700} fill={workerColor} style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Worker Node {ni + 1}
            </text>

            {/* apiserver -> this node's kubelet -- clipped at both boxes' own edges */}
            {(() => {
              const kubeletBox: Box = { x: nx + 15, y: NODE_Y + 42, w: NODE_W - 30, h: 26 };
              const { from, to } = edgeToEdge(apiserverBox, kubeletBox);
              return <FlowArrow x1={from.x} y1={from.y} x2={to.x} y2={to.y} color={t.textMuted} markerId="cluster-arrow" />;
            })()}

            {/* Pods running on this node -- the actual point of the system */}
            <g onClick={() => pick(CYCLE_COMPONENTS.indexOf('pod'))} style={{ cursor: 'pointer' }}>
              <RectNode t={t} x={nx + 12} y={NODE_Y + 10} width={80} height={22} label="Pod" color={podColor} strokeWidth={selected === 'pod' ? 2.5 : 1.5} />
              <RectNode t={t} x={nx + NODE_W - 92} y={NODE_Y + 10} width={80} height={22} label="Pod" color={podColor} strokeWidth={selected === 'pod' ? 2.5 : 1.5} />
            </g>

            <g onClick={() => pick(CYCLE_COMPONENTS.indexOf('kubelet'))} style={{ cursor: 'pointer' }}>
              <RectNode t={t} x={nx + 15} y={NODE_Y + 42} width={NODE_W - 30} height={26} label="kubelet" color={workerColor} strokeWidth={selected === 'kubelet' ? 2.5 : 1.5} />
            </g>
            <FlowArrow x1={nx + NODE_W / 2} y1={NODE_Y + 68} x2={nx + NODE_W / 2} y2={NODE_Y + 74} color={t.textMuted} markerId="cluster-arrow" />
            <g onClick={() => pick(CYCLE_COMPONENTS.indexOf('kubelet'))} style={{ cursor: 'pointer' }}>
              <RectNode t={t} x={nx + 15} y={NODE_Y + 74} width={(NODE_W - 40) / 2} height={26} label="Runtime" color={workerColor} strokeWidth={selected === 'runtime' ? 2.5 : 1.5} />
            </g>
            <g onClick={() => pick(CYCLE_COMPONENTS.indexOf('kubelet'))} style={{ cursor: 'pointer' }}>
              <RectNode t={t} x={nx + 25 + (NODE_W - 40) / 2} y={NODE_Y + 74} width={(NODE_W - 40) / 2} height={26} label="kube-proxy" color={workerColor} strokeWidth={selected === 'kube-proxy' ? 2.5 : 1.5} />
            </g>
          </g>
        ))}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        Click a component. kube-apiserver is a HUB -- scheduler, controller-manager, cloud-controller-manager, and every node's kubelet all talk through it (and it alone talks to etcd), not a left-to-right chain.
      </div>
    </VisualizationContainer>
  );
}
