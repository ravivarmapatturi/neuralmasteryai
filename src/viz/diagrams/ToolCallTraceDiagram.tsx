import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const TRACE = [
  { role: 'user', text: '"Is it a good day to fly a drone in Austin?"' },
  { role: 'model', text: 'call get_weather(city="Austin")' },
  { role: 'tool', text: '→ {wind: "22mph", precip: "0%"}' },
  { role: 'model', text: 'call get_faa_drone_rules(wind_limit=true)' },
  { role: 'tool', text: '→ {max_safe_wind: "20mph"}' },
  { role: 'model', text: 'Final: "Not ideal — 22mph wind exceeds the recommended 20mph limit."' },
];

/** A concrete, realistic trace -- two tool calls in sequence, each result
 * feeding into the next decision, before the model has enough to answer.
 * Step through it turn by turn. */
export default function ToolCallTraceDiagram() {
  const t = useVizTokens();
  const cyc = useAutoCycle(TRACE.length, 2200);
  const step = cyc.value;
  const setStep = cyc.pick;
  const roleColor = (r: string) => (r === 'user' ? t.textMuted : r === 'model' ? getConceptColor(t, 'attention') : getConceptColor(t, 'value'));

  return (
    <VisualizationContainer footer="Two tool calls in sequence, each observed result shaping the next decision -- the model only produces a final answer once it has both pieces of information it needed.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {TRACE.slice(0, step + 1).map((t2, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'baseline', opacity: i === step ? 1 : 0.55 }}>
            <span style={{ width: 46, fontSize: 9, fontWeight: 700, color: roleColor(t2.role), textTransform: 'uppercase', flexShrink: 0 }}>{t2.role}</span>
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: t.textSecondary }}>{t2.text}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
        <VizButton onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>← prev</VizButton>
        <VizButton onClick={() => setStep(Math.min(TRACE.length - 1, step + 1))} disabled={step === TRACE.length - 1}>next →</VizButton>
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 6 }}>
        Turn {step + 1} of {TRACE.length}
      </div>
    </VisualizationContainer>
  );
}
