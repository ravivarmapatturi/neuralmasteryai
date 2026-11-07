import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const TOTAL_WORK_UNITS = 100;
const COORDINATION_LATENCY_PER_AGENT = 6; // fixed round-trip cost per delegate+synthesize hop
const COORDINATION_CALLS_PER_AGENT = 2; // one delegate call, one result-integration call

/** A single fixed task, split across N specialized agents: real formulas,
 * not illustrative bars. Wall-clock time assumes perfect parallelism
 * across agents (a best case, stated as such) plus a fixed per-agent
 * coordination round-trip; coordination calls and inter-agent handoff
 * points (the literal count of trust boundaries a downstream agent's
 * output crosses before reaching the user) both scale with N. */
export default function AgentSplitTradeoffDiagram() {
  const t = useVizTokens();
  const [agentCount, setAgentCount] = useState(1);
  const color = getConceptColor(t, 'attention');
  const colorWarn = t.accentDanger;

  const isSingle = agentCount === 1;
  const parallelWork = TOTAL_WORK_UNITS / agentCount;
  const coordinationLatency = isSingle ? 0 : agentCount * COORDINATION_LATENCY_PER_AGENT;
  const wallClockTime = parallelWork + coordinationLatency;
  const coordinationCalls = isSingle ? 0 : agentCount * COORDINATION_CALLS_PER_AGENT;
  const handoffPoints = isSingle ? 0 : agentCount; // each specialist's output crosses one trust boundary back to the supervisor

  const singleAgentTime = TOTAL_WORK_UNITS; // baseline for comparison
  const speedup = singleAgentTime / wallClockTime;

  const maxBar = Math.max(singleAgentTime, wallClockTime, coordinationCalls * 10, handoffPoints * 10);
  const barWidth = (v: number) => `${Math.max((v / maxBar) * 100, 2)}%`;

  const footer = isSingle
    ? `1 agent, sequential: ${TOTAL_WORK_UNITS} work units take ${wallClockTime} time units. Zero coordination calls, zero inter-agent handoff points -- nothing to gate, nothing to inject through.`
    : `${agentCount} agents in parallel: ${wallClockTime.toFixed(0)} time units (${speedup.toFixed(2)}x vs. 1 agent) -- but ${coordinationCalls} coordination LLM calls now exist that didn't before, and ${handoffPoints} inter-agent handoff points where one agent's output is trusted, unfiltered input to another (see Agent Security Gateway's tool-policy gating for the mitigation pattern this maps onto).`;

  return (
    <VisualizationContainer footer={footer} title="Single-agent vs. multi-agent cost/complexity tradeoff">
      <Slider label="Specialized agents" value={agentCount} onChange={setAgentCount} min={1} max={5} step={1} format={(v) => String(v)} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
        <BarRow label="Wall-clock time" value={wallClockTime} display={`${wallClockTime.toFixed(0)}`} width={barWidth(wallClockTime)} color={color} t={t} />
        <BarRow label="Coordination LLM calls" value={coordinationCalls} display={String(coordinationCalls)} width={barWidth(coordinationCalls * 10)} color={t.textSecondary} t={t} />
        <BarRow label="Inter-agent handoff points" value={handoffPoints} display={String(handoffPoints)} width={barWidth(handoffPoints * 10)} color={colorWarn} t={t} />
      </div>
    </VisualizationContainer>
  );
}

function BarRow({ label, display, width, color, t }: { label: string; value: number; display: string; width: string; color: string; t: ReturnType<typeof useVizTokens> }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: DIAGRAM_TYPE.secondaryLabel.size, marginBottom: 3 }}>
        <span style={{ color: t.textSecondary }}>{label}</span>
        <span style={{ fontWeight: 600 }}>{display}</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: t.surfaceAlt, overflow: 'hidden' }}>
        <div style={{ height: '100%', width, background: color, borderRadius: 4, transition: 'width 0.2s' }} />
      </div>
    </div>
  );
}
