import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

type Mode = 'atmost' | 'atleast' | 'exactly';

interface Step {
  label: string;
  outcome?: 'lost' | 'duplicate' | 'ok';
}

const SCRIPTS: Record<Mode, { steps: Step[]; verdict: string; explain: string }> = {
  atmost: {
    steps: [
      { label: 'Queue delivers message to consumer' },
      { label: 'Consumer acknowledges immediately (before processing)' },
      { label: 'Consumer crashes mid-processing' },
      { label: 'Queue already marked it delivered -- never redelivers', outcome: 'lost' },
    ],
    verdict: 'Message lost',
    explain: 'Acking before processing is done means a crash after the ack is invisible to the queue -- it thinks the work is finished. Simplest to implement, weakest guarantee: use only when an occasional dropped message is genuinely fine (best-effort metrics, non-critical notifications).',
  },
  atleast: {
    steps: [
      { label: 'Queue delivers message to consumer' },
      { label: 'Consumer processes the message fully' },
      { label: 'Consumer crashes right after finishing, before acking' },
      { label: 'Queue never saw an ack -- redelivers the message', outcome: 'duplicate' },
    ],
    verdict: 'Message processed twice',
    explain: "Acking only after processing succeeds means nothing is ever silently dropped -- but a crash in that narrow window between finishing work and sending the ack causes a redelivery, and the consumer does the work again. This is the default most systems reach for, on the assumption that a duplicate is recoverable and a loss isn't.",
  },
  exactly: {
    steps: [
      { label: 'Queue delivers message to consumer (at-least-once transport)' },
      { label: 'Consumer checks: have I already processed this message ID?' },
      { label: 'If yes: skip re-applying the effect, ack and move on' },
      { label: 'If no: process it, record the ID, then ack', outcome: 'ok' },
    ],
    verdict: 'Effect applied exactly once',
    explain: '"Exactly-once" almost never means the transport guarantees single delivery -- it means at-least-once delivery plus an idempotent consumer that recognizes and discards duplicates by message ID before re-applying an effect. The guarantee lives in the consumer\'s logic, not in the queue.',
  },
};

export default function DeliverySemanticsDiagram() {
  const t = useVizTokens();
  const [mode, setMode] = useState<Mode>('atleast');
  const script = SCRIPTS[mode];

  const outcomeColor = (o?: Step['outcome']) => (o === 'lost' ? t.accentDanger : o === 'duplicate' ? t.accentWarn : o === 'ok' ? t.accentPrimary : t.textSecondary);

  return (
    <VisualizationContainer footer={script.explain}>
      <PillSelect<Mode>
        label="Delivery semantics"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'atmost', label: 'At-Most-Once' },
          { value: 'atleast', label: 'At-Least-Once' },
          { value: 'exactly', label: 'Exactly-Once (effective)' },
        ]}
      />
      <div style={{ marginTop: 8 }}>
        {script.steps.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '6px 0', borderLeft: `2px solid ${t.border}`, paddingLeft: 12, marginLeft: 8 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: t.textMuted, minWidth: 16 }}>{i + 1}</div>
            <div style={{ fontSize: 13, color: s.outcome ? outcomeColor(s.outcome) : t.textPrimary, fontWeight: s.outcome ? 700 : 400 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <SketchBox color={outcomeColor(script.steps[script.steps.length - 1].outcome)} strokeWidth={1.5} style={{ marginTop: 10 }}>
        <div
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            background: `${outcomeColor(script.steps[script.steps.length - 1].outcome)}18`,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: HAND_FONT,
            color: outcomeColor(script.steps[script.steps.length - 1].outcome),
          }}
        >
          Result: {script.verdict}
        </div>
      </SketchBox>
      <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, marginTop: 6 }}>
        Every mode is the same producer -&gt; queue -&gt; consumer pipeline -- what differs is only when the ack happens relative to processing.
      </div>
    </VisualizationContainer>
  );
}
