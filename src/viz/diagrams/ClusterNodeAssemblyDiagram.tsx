import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, ControlRow, useAutoCycle, usePrefersReducedMotion } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type SubNodeId = 'model' | 'tool' | 'memory';

interface SubNode {
  id: SubNodeId;
  label: string;
  required: boolean;
  description: string;
}

// n8n's real constraint, not a simplification: the AI Agent root node
// requires a chat-model sub-node and at least one tool sub-node to run at
// all; memory is optional. Modeled here exactly as n8n enforces it.
const SUB_NODES: SubNode[] = [
  { id: 'model', label: 'Chat Model', required: true, description: 'e.g. OpenAI, Anthropic -- the reasoning engine.' },
  { id: 'tool', label: 'Tool', required: true, description: 'e.g. an HTTP Request node, a database node, or a remote MCP server -- at least one is mandatory.' },
  { id: 'memory', label: 'Memory', required: false, description: 'Optional -- Simple Memory for testing, Postgres/Redis for production.' },
];

const AUTO_PRESETS: Set<SubNodeId>[] = [
  new Set([]),
  new Set<SubNodeId>(['model']),
  new Set<SubNodeId>(['model', 'tool']),
  new Set<SubNodeId>(['model', 'tool', 'memory']),
];

/** Assemble n8n's AI Agent cluster node by attaching sub-nodes one at a
 * time -- the root node genuinely will not run without a model and at
 * least one tool, which this lets you verify rather than take on faith. */
export default function ClusterNodeAssemblyDiagram() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const [manual, setManual] = useState<Set<SubNodeId> | null>(null);
  const cyc = useAutoCycle(AUTO_PRESETS.length, 3000);
  const attached = manual ?? AUTO_PRESETS[cyc.value];
  const color = getConceptColor(t, 'attention');

  const toggle = (id: SubNodeId) => {
    const next = new Set(attached);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setManual(next);
  };

  const reset = () => {
    setManual(null);
    cyc.pick(0);
  };

  const missingRequired = SUB_NODES.filter((s) => s.required && !attached.has(s.id));
  const canRun = missingRequired.length === 0;

  const footer = canRun
    ? 'Runnable: a Chat Model and at least one Tool are both attached -- n8n treats this exactly as "will execute," Memory being present or absent either way.'
    : `Not runnable yet -- n8n's AI Agent node hard-requires: ${missingRequired.map((s) => s.label).join(', ')}. This isn't a UI suggestion, it's an execution precondition.`;

  return (
    <VisualizationContainer footer={footer} title="n8n AI Agent cluster-node assembly">
      <ControlRow>
        <VizButton variant="secondary" onClick={reset}>Reset</VizButton>
        <span style={{ fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>
          {canRun ? 'Status: Runnable' : 'Status: Incomplete'}
        </span>
      </ControlRow>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
        <div
          style={{
            padding: '14px 18px',
            borderRadius: 10,
            fontWeight: 700,
            fontSize: DIAGRAM_TYPE.secondaryLabel.size,
            background: canRun ? `${color}20` : t.surfaceAlt,
            border: `2px solid ${canRun ? color : t.border}`,
            boxShadow: canRun && !reducedMotion ? `0 0 12px ${color}44` : 'none',
            textAlign: 'center',
            minWidth: 120,
            transition: 'all 0.3s ease',
          }}
        >
          AI Agent
          <div style={{ fontWeight: 400, fontSize: 11, marginTop: 4, color: canRun ? color : t.textSecondary }}>
            {canRun ? 'Ready to execute' : 'root node'}
          </div>
        </div>

        <div style={{ fontSize: 20, color: t.textSecondary }}>+</div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {SUB_NODES.map((s) => {
            const on = attached.has(s.id);
            return (
              <button
                key={s.id}
                onClick={() => toggle(s.id)}
                style={{
                  cursor: 'pointer',
                  padding: '10px 12px',
                  borderRadius: 8,
                  minWidth: 110,
                  textAlign: 'left',
                  background: on ? `${color}18` : t.surface,
                  border: `1.5px solid ${on ? color : s.required ? `${t.accentDanger}88` : t.border}`,
                  boxShadow: on && !reducedMotion ? `0 0 6px ${color}25` : 'none',
                  color: t.textPrimary,
                  fontFamily: 'inherit',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: DIAGRAM_TYPE.secondaryLabel.size }}>
                  {s.label} {s.required && <span style={{ color: t.accentDanger }}>*</span>}
                </div>
                <div style={{ fontSize: 11, color: on ? color : t.textSecondary, marginTop: 2 }}>
                  {on ? 'attached' : 'click to attach'}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </VisualizationContainer>
  );
}