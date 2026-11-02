import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect } from '../primitives';

type LayerKey = 'layer1' | 'layer2' | 'layer3' | 'passed';

interface FunnelLayer {
  key: LayerKey;
  number: number;
  name: string;
  tools: string;
  illustrativeTime: string;
  catches: string;
  exitGate: string;
  description: string;
}

const LAYERS: Record<LayerKey, FunnelLayer> = {
  layer1: {
    key: 'layer1',
    number: 1,
    name: 'Static Audit (Typecheck & Lint)',
    tools: 'ruff check . && mypy --strict',
    illustrativeTime: '~200ms (illustrative benchmark)',
    catches: 'Syntax errors, invalid imports, wrong argument types, typos',
    exitGate: 'Zero errors; exits immediately before running slower tests',
    description: 'Catches syntactic and typing mistakes in milliseconds before heavy runtimes or PyTorch dependencies are imported into memory.',
  },
  layer2: {
    key: 'layer2',
    number: 2,
    name: 'Deterministic Unit Suites',
    tools: 'pytest tests/unit/ -v',
    illustrativeTime: '~2s (illustrative benchmark)',
    catches: 'Algorithmic errors, edge cases, regression failures, broken math formulas',
    exitGate: '100% of unit assertions pass with zero failures or uncaught warnings',
    description: 'Verifies specific algorithmic transformations against known inputs and expected outputs, isolating algorithmic regressions.',
  },
  layer3: {
    key: 'layer3',
    number: 3,
    name: 'Behavioral Runtime Probes',
    tools: 'python -m tests.smoke && playwright test',
    illustrativeTime: '~8s (illustrative benchmark)',
    catches: 'Process deadlocks, memory leaks, IPC socket timeouts, container escapes',
    exitGate: 'Clean shutdown of child process groups with exit code 0',
    description: 'Executes the real application in a sandboxed runtime to verify that end-to-end user workflows and container boundaries operate without faults.',
  },
  passed: {
    key: 'passed',
    number: 4,
    name: 'Commit & Deployment Authorization',
    tools: 'git commit -m "feat: ..." && git push',
    illustrativeTime: 'Immediate upon 3-gate verification',
    catches: 'Premature victory attempts with unverified claims',
    exitGate: 'Empirical verification artifact attached to commit metadata',
    description: 'Autonomous agents are granted write or merge authority only when all three deterministic layers exit with code 0.',
  },
};

export default function VerificationFunnelDiagram() {
  const t = useVizTokens();
  const [selected, setSelected] = useState<LayerKey>('layer1');
  const active = LAYERS[selected];

  return (
    <VisualizationContainer
      title="The 3-Layer Verification Funnel"
      footer="Fast, deterministic static audits run first; slower behavioral suites run only if earlier gates pass. Timings are illustrative estimates for typical repositories."
    >
      <VisualizationHeader
        eyebrow="VERIFICATION PIPELINE"
        title="Three-Layer Deterministic Gate Architecture"
        description="Inspect the progressive filtering funnel that prevents premature victory by enforcing mechanized proof before staging code."
      />

      <div style={{ margin: '0.75rem 0' }}>
        <PillSelect<LayerKey>
          label="Verification Gate"
          value={selected}
          onChange={setSelected}
          options={[
            { value: 'layer1', label: '1. Static Audit' },
            { value: 'layer2', label: '2. Unit Suites' },
            { value: 'layer3', label: '3. Runtime Probes' },
            { value: 'passed', label: '4. Authorization Gate' },
          ]}
        />
      </div>

      <svg viewBox="0 0 680 250" width="100%" role="img" aria-label="3-Layer Verification Funnel Diagram">
        {/* Funnel Trapezoid 1: Static */}
        <polygon
          points="40,20 640,20 580,75 100,75"
          fill={selected === 'layer1' ? `${t.accentPrimary}25` : t.surfaceAlt}
          stroke={selected === 'layer1' ? t.accentPrimary : t.border}
          strokeWidth={selected === 'layer1' ? 2 : 1}
        />
        <text x={340} y={42} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.textPrimary}>
          LAYER 1: STATIC AUDIT (TYPECHECK)
        </text>
        <text x={340} y={60} textAnchor="middle" fontSize={11} fill={t.textSecondary}>
          ruff check . · mypy --strict · {LAYERS.layer1.illustrativeTime}
        </text>

        {/* Funnel Trapezoid 2: Unit */}
        <polygon
          points="105,83 575,83 515,138 165,138"
          fill={selected === 'layer2' ? `${t.accentPrimary}25` : t.surfaceAlt}
          stroke={selected === 'layer2' ? t.accentPrimary : t.border}
          strokeWidth={selected === 'layer2' ? 2 : 1}
        />
        <text x={340} y={105} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.textPrimary}>
          LAYER 2: DETERMINISTIC UNIT SUITES
        </text>
        <text x={340} y={123} textAnchor="middle" fontSize={11} fill={t.textSecondary}>
          pytest tests/unit/ -v · {LAYERS.layer2.illustrativeTime}
        </text>

        {/* Funnel Trapezoid 3: Runtime */}
        <polygon
          points="170,146 510,146 450,201 230,201"
          fill={selected === 'layer3' ? `${t.accentPrimary}25` : t.surfaceAlt}
          stroke={selected === 'layer3' ? t.accentPrimary : t.border}
          strokeWidth={selected === 'layer3' ? 2 : 1}
        />
        <text x={340} y={168} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.textPrimary}>
          LAYER 3: BEHAVIORAL RUNTIME PROBES
        </text>
        <text x={340} y={186} textAnchor="middle" fontSize={11} fill={t.textSecondary}>
          python -m tests.smoke · {LAYERS.layer3.illustrativeTime}
        </text>

        {/* Output Box: Authorization */}
        <rect
          x={235}
          y={209}
          width={210}
          height={32}
          rx={6}
          fill={selected === 'passed' ? `${t.accentTeal}25` : t.surface}
          stroke={selected === 'passed' ? t.accentTeal : t.border}
          strokeWidth={selected === 'passed' ? 2 : 1}
        />
        <text x={340} y={230} textAnchor="middle" fontSize={11} fontWeight={700} fill={selected === 'passed' ? t.accentTeal : t.textPrimary}>
          ✓ AUTHORIZATION TO COMMIT / STAGE
        </text>
      </svg>

      <div style={{ marginTop: '0.75rem', padding: '0.75rem', borderRadius: 8, background: t.surfaceAlt, border: `1px solid ${t.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>
            {active.name}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: t.accentPrimary, fontFamily: 'monospace' }}>
            {active.tools}
          </span>
        </div>
        <p style={{ margin: '0 0 4px 0', fontSize: 12, color: t.textSecondary }}>
          <strong style={{ color: t.textPrimary }}>Catches:</strong> {active.catches}
        </p>
        <p style={{ margin: 0, fontSize: 12, color: t.textSecondary }}>
          <strong style={{ color: t.textPrimary }}>Mechanics:</strong> {active.description}
        </p>
      </div>
    </VisualizationContainer>
  );
}
