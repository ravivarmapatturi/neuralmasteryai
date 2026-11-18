import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

type Task = 'asr' | 'tts' | 'diarization' | 'classification';

const TASKS: Record<Task, { label: string; input: string; output: string; description: string }> = {
  asr: { label: 'ASR', input: 'Audio waveform', output: 'Text', description: 'Spoken audio in, a transcript out -- a sequence-to-sequence problem.' },
  tts: { label: 'TTS', input: 'Text', output: 'Audio waveform', description: 'Written text in, natural-sounding speech out -- the exact inverse shape of ASR.' },
  diarization: { label: 'Diarization', input: 'Multi-speaker audio', output: 'Time-stamped speaker labels', description: '"Who spoke when" -- audio in, a segmentation (not a transcript) out.' },
  classification: { label: 'Classification', input: 'Audio clip', output: 'A label', description: 'A sound event, a genre, a scene -- audio in, one discrete label out.' },
};

export default function AudioTaskIODiagram() {
  const t = useVizTokens();
  const TASK_KEYS: Task[] = ['asr', 'tts', 'diarization', 'classification'];
  const { value: autoIdx } = useAutoCycle(TASK_KEYS.length, 3200);
  const [userTask, setUserTask] = useState<Task | null>(null);
  const task = userTask ?? TASK_KEYS[autoIdx];
  const info = TASKS[task];
  const inColor = getConceptColor(t, 'query');
  const outColor = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer={info.description}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {(Object.keys(TASKS) as Task[]).map((k) => (
          <VizButton key={k} variant={task === k ? 'primary' : 'secondary'} onClick={() => setUserTask(k)}>
            {TASKS[k].label}
          </VizButton>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ padding: '14px 18px', borderRadius: 10, background: `${inColor}18`, border: `1px solid ${inColor}`, minWidth: 140, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Input</div>
          <div style={{ fontWeight: 700, color: inColor, fontSize: 14, marginTop: 2 }}>{info.input}</div>
        </div>
        <div style={{ fontSize: 22, color: t.textMuted }}>→</div>
        <div style={{ padding: '10px 16px', borderRadius: 8, background: t.surfaceAlt, border: `1px solid ${t.border}`, fontWeight: 700, fontSize: 13, color: t.textPrimary }}>
          {info.label}
        </div>
        <div style={{ fontSize: 22, color: t.textMuted }}>→</div>
        <div style={{ padding: '14px 18px', borderRadius: 10, background: `${outColor}18`, border: `1px solid ${outColor}`, minWidth: 140, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Output</div>
          <div style={{ fontWeight: 700, color: outColor, fontSize: 14, marginTop: 2 }}>{info.output}</div>
        </div>
      </div>
    </VisualizationContainer>
  );
}
