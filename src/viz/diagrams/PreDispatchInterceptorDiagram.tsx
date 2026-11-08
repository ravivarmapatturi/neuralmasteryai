import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, PillSelect } from '../primitives';

type CommandType = 'valid' | 'exfil' | 'destroy';

interface Scenario {
  cmd: string;
  type: CommandType;
  label: string;
  verdict: 'BLOCKED' | 'PERMITTED';
  reason: string;
  exitCode: number;
  durationMs: number;
  mechanism: string;
}

const SCENARIOS: Record<CommandType, Scenario> = {
  valid: {
    type: 'valid',
    label: '1. Pytest Suite (Valid)',
    cmd: 'pytest tests/unit/test_router.py -v',
    verdict: 'PERMITTED',
    reason: 'Path in repo whitelist; binary in execution whitelist; arguments strictly typed.',
    exitCode: 0,
    durationMs: 312,
    mechanism: 'Spawned via os.setsid() into bwrap --unshare-all container with isolated cgroups.',
  },
  exfil: {
    type: 'exfil',
    label: '2. Credential Probe (Malicious)',
    cmd: 'cat /etc/shadow || cat ~/.ssh/id_ed25519',
    verdict: 'BLOCKED',
    reason: 'Regex blocked: illegal filesystem probe targeting credential store paths.',
    exitCode: 126,
    durationMs: 2,
    mechanism: 'Supervisor aborts before process allocation; returns structured error envelope.',
  },
  destroy: {
    type: 'destroy',
    label: '3. Root Deletion (Catastrophic)',
    cmd: 'rm -rf / --no-preserve-root',
    verdict: 'BLOCKED',
    reason: 'Regex blocked: recursive destruction outside isolated temporary sandbox mount.',
    exitCode: 126,
    durationMs: 1,
    mechanism: 'Zero host impact; error envelope fed back to model with violation notice.',
  },
};

export default function PreDispatchInterceptorDiagram() {
  const t = useVizTokens();
  const [selected, setSelected] = useState<CommandType>('valid');
  const sc = SCENARIOS[selected];
  const isBlocked = sc.verdict === 'BLOCKED';

  return (
    <VisualizationContainer
      title="Harness Pre-Dispatch Interceptor"
      footer="Pre-dispatch validation screens tool call arguments against regex patterns and path whitelists in under 2ms before any process group is allocated."
    >
      <VisualizationHeader
        eyebrow="HARNESS SECURITY"
        title="Command Screening & Sandbox Dispatch Flow"
        description="Inspect how the harness supervisor inspects tool arguments before execution, aborting malicious invocations before spawning isolated worker namespaces."
      />

      <div style={{ margin: '0.75rem 0' }}>
        <PillSelect<CommandType>
          label="Tool Call Input"
          value={selected}
          onChange={setSelected}
          options={[
            { value: 'valid', label: SCENARIOS.valid.label },
            { value: 'exfil', label: SCENARIOS.exfil.label },
            { value: 'destroy', label: SCENARIOS.destroy.label },
          ]}
        />
      </div>

      <svg viewBox="0 0 680 280" width="100%" role="img" aria-label="Pre-Dispatch Interceptor Flow Diagram">
        <defs>
          <marker id="pdi-arrow-primary" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.accentPrimary} />
          </marker>
          <marker id="pdi-arrow-danger" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.accentDanger} />
          </marker>
          <marker id="pdi-arrow-border" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.border} />
          </marker>
        </defs>

        {/* Step 1: Model Emits Tool Call */}
        <rect x={20} y={20} width={180} height={64} rx={8} fill={t.surface} stroke={t.border} strokeWidth={1.5} />
        <text x={110} y={44} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.textPrimary}>Model Emits Tool Call</text>
        <text x={110} y={64} textAnchor="middle" fontSize={11} fill={t.textSecondary} fontFamily="monospace">run_command(cmd)</text>

        {/* Arrow to Interceptor */}
        <line x1={200} y1={52} x2={248} y2={52} stroke={t.accentPrimary} strokeWidth={2} markerEnd="url(#pdi-arrow-primary)" />

        {/* Step 2: Supervisor Pre-Dispatch Interceptor */}
        <rect x={250} y={15} width={200} height={74} rx={8} fill={t.surfaceAlt} stroke={t.accentPrimary} strokeWidth={2} />
        <text x={350} y={38} textAnchor="middle" fontSize={12} fontWeight={700} fill={t.accentPrimary}>Harness Pre-Dispatch</text>
        <text x={350} y={56} textAnchor="middle" fontSize={11} fill={t.textSecondary}>• AST syntax audit</text>
        <text x={350} y={72} textAnchor="middle" fontSize={11} fill={t.textSecondary}>• Path whitelist check</text>

        {/* Branch Lines */}
        <line x1={350} y1={89} x2={350} y2={125} stroke={t.border} strokeWidth={2} />
        <line x1={180} y1={125} x2={520} y2={125} stroke={t.border} strokeWidth={2} />
        <line
          x1={180}
          y1={125}
          x2={180}
          y2={148}
          stroke={isBlocked ? t.accentDanger : t.border}
          strokeWidth={2}
          markerEnd={isBlocked ? 'url(#pdi-arrow-danger)' : 'url(#pdi-arrow-border)'}
        />
        <line
          x1={520}
          y1={125}
          x2={520}
          y2={148}
          stroke={!isBlocked ? t.accentPrimary : t.border}
          strokeWidth={2}
          markerEnd={!isBlocked ? 'url(#pdi-arrow-primary)' : 'url(#pdi-arrow-border)'}
        />

        {/* Left Branch: Blocked */}
        <rect
          x={90}
          y={150}
          width={180}
          height={110}
          rx={8}
          fill={isBlocked ? `${t.accentDanger}15` : t.surface}
          stroke={isBlocked ? t.accentDanger : t.border}
          strokeWidth={isBlocked ? 2 : 1}
        />
        <text x={180} y={174} textAnchor="middle" fontSize={12} fontWeight={700} fill={isBlocked ? t.accentDanger : t.textSecondary}>
          REJECT TURN
        </text>
        <text x={180} y={194} textAnchor="middle" fontSize={11} fill={t.textPrimary}>Exit Code: 126</text>
        <text x={180} y={212} textAnchor="middle" fontSize={11} fill={t.accentDanger} fontFamily="monospace">SECURITY_VIOLATION</text>
        <text x={180} y={230} textAnchor="middle" fontSize={10} fill={t.textSecondary}>Duration: ~1-2ms (Static Check)</text>
        <text x={180} y={246} textAnchor="middle" fontSize={10} fill={t.textSecondary}>Host Impact: Zero</text>

        {/* Right Branch: Permitted */}
        <rect
          x={430}
          y={150}
          width={180}
          height={110}
          rx={8}
          fill={!isBlocked ? `${t.accentPrimary}15` : t.surface}
          stroke={!isBlocked ? t.accentPrimary : t.border}
          strokeWidth={!isBlocked ? 2 : 1}
        />
        <text x={520} y={174} textAnchor="middle" fontSize={12} fontWeight={700} fill={!isBlocked ? t.accentPrimary : t.textSecondary}>
          SPAWN SANDBOX JAIL
        </text>
        <text x={520} y={194} textAnchor="middle" fontSize={11} fill={t.textPrimary}>os.setsid() Process Group</text>
        <text x={520} y={212} textAnchor="middle" fontSize={11} fill={t.accentTeal} fontFamily="monospace">bwrap --unshare-all</text>
        <text x={520} y={230} textAnchor="middle" fontSize={10} fill={t.textSecondary}>cgroups: pids.max=64, mem=512M</text>
        <text x={520} y={246} textAnchor="middle" fontSize={10} fill={t.textSecondary}>Timeout: 10,000ms wall-clock</text>
      </svg>

      <div style={{ marginTop: '0.75rem', padding: '0.75rem', borderRadius: 8, background: t.surfaceAlt, border: `1px solid ${t.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, fontFamily: 'monospace' }}>
            $ {sc.cmd}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 4,
              background: isBlocked ? `${t.accentDanger}22` : `${t.accentPrimary}22`,
              color: isBlocked ? t.accentDanger : t.accentPrimary,
            }}
          >
            {sc.verdict} (exit {sc.exitCode})
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: t.textSecondary }}>
          {sc.reason} {sc.mechanism}
        </p>
      </div>
    </VisualizationContainer>
  );
}
