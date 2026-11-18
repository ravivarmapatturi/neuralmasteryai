import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const METHODS = [
  { key: 'full', label: 'Full fine-tune', pct: 100, desc: 'Updates every parameter -- most expressive, most expensive, needs a full model copy per variant.' },
  { key: 'adapters', label: 'Adapters', pct: 3.5, desc: 'Small trainable modules inserted between frozen layers -- one of the original PEFT approaches, predating LoRA.' },
  { key: 'prefix', label: 'Prefix tuning', pct: 2.0, desc: 'Prepends trainable virtual KV vectors at every attention layer.' },
  { key: 'lora', label: 'LoRA', pct: 0.5, desc: 'Frozen weights + small trainable low-rank matrices alongside them.' },
  { key: 'dora', label: 'DoRA', pct: 0.6, desc: "LoRA's low-rank update on direction, plus a separately-trainable magnitude component -- closes some of LoRA's quality gap to full fine-tuning." },
  { key: 'prompt', label: 'Prompt tuning', pct: 0.1, desc: 'Learns continuous soft-prompt embeddings prepended only at the input layer -- fewer params than prefix tuning.' },
  { key: 'ia3', label: 'IA3', pct: 0.03, desc: 'Learns per-channel rescaling vectors that multiply existing activations -- no new weight matrices, no added inference latency once merged.' },
];

/** Relative trainable-parameter footprint across PEFT methods, on a log
 * scale so IA3's tiny footprint doesn't just vanish next to full
 * fine-tuning's 100%. Click a method for what it actually does. */
export default function PeftMethodsComparisonDiagram() {
  const t = useVizTokens();
  const cycle = useAutoCycle(METHODS.length, 3000);
  const selected = METHODS[cycle.value].key;
  const setSelected = (key: string) => cycle.pick(METHODS.findIndex((method) => method.key === key));
  const color = getConceptColor(t, 'attention');
  const active = METHODS.find((m) => m.key === selected)!;
  const maxLog = Math.log10(100);
  const minLog = Math.log10(0.02);

  return (
    <VisualizationContainer footer={active.desc}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {METHODS.map((m) => {
          const logPct = Math.log10(Math.max(m.pct, 0.02));
          const widthPct = ((logPct - minLog) / (maxLog - minLog)) * 100;
          const isSelected = selected === m.key;
          return (
            <div key={m.key} onClick={() => setSelected(m.key)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(m.key); } }} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <div style={{ width: 90, fontSize: 10, color: isSelected ? color : t.textSecondary, fontWeight: isSelected ? 700 : 400 }}>{m.label}</div>
              <div style={{ flex: 1, height: 14, background: t.surfaceAlt, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${widthPct}%`, height: '100%', background: isSelected ? color : t.textMuted, opacity: isSelected ? 0.85 : 0.4 }} />
              </div>
              <div style={{ width: 46, textAlign: 'right', fontSize: 9, fontFamily: 'monospace', color: t.textMuted }}>{m.pct}%</div>
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        Log-scale bars (illustrative percentages) -- click a method for its mechanism.
      </div>
    </VisualizationContainer>
  );
}
