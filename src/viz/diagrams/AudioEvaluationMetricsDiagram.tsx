import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, useAutoCycle } from '../primitives';

type Task = 'asr' | 'tts' | 'diarization' | 'classification';

const METRICS: Record<Task, { task: string; metric: string; measures: string; direction: string }> = {
  asr: { task: 'ASR', metric: 'Word Error Rate (WER)', measures: 'Edit distance (insertions + deletions + substitutions) between predicted and reference transcript, divided by reference word count.', direction: 'Lower is better -- 0% is a perfect transcript.' },
  tts: { task: 'TTS', metric: 'MOS (Mean Opinion Score)', measures: 'Human listeners rate naturalness/quality on a 1-5 scale, averaged -- automated proxies (e.g. PESQ) exist but human judgment remains the ground truth for "does this sound natural."', direction: 'Higher is better -- 5.0 is indistinguishable from real human speech.' },
  diarization: { task: 'Diarization', metric: 'Diarization Error Rate (DER)', measures: 'Fraction of audio time attributed to the wrong speaker (or missed/falsely detected as speech at all), combining segmentation errors and speaker-confusion errors.', direction: 'Lower is better -- 0% means every moment is attributed to the correct speaker.' },
  classification: { task: 'Classification', metric: 'Accuracy / F1', measures: 'Standard classification metrics -- accuracy for balanced label sets, F1 when classes are imbalanced (e.g. rare sound events).', direction: 'Higher is better -- same metrics as any other classification task.' },
};

export default function AudioEvaluationMetricsDiagram() {
  const t = useVizTokens();
  const TASK_KEYS: Task[] = ['asr', 'tts', 'diarization', 'classification'];
  const { value: autoIdx } = useAutoCycle(TASK_KEYS.length, 3200);
  const [userTask, setUserTask] = useState<Task | null>(null);
  const task = userTask ?? TASK_KEYS[autoIdx];
  const info = METRICS[task];

  return (
    <VisualizationContainer footer="Every task here needs its own metric because 'correct' means something different each time -- exact text match, perceived naturalness, correct speaker attribution, and correct label are four genuinely different notions of success.">
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {(Object.keys(METRICS) as Task[]).map((k) => (
          <VizButton key={k} variant={task === k ? 'primary' : 'secondary'} onClick={() => setUserTask(k)}>
            {METRICS[k].task}
          </VizButton>
        ))}
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
        <tbody>
          <tr>
            <td style={{ padding: '8px 10px', borderBottom: `1px solid ${t.border}`, color: t.textMuted, fontWeight: 600, width: 100 }}>Metric</td>
            <td style={{ padding: '8px 10px', borderBottom: `1px solid ${t.border}`, color: t.textPrimary, fontWeight: 700 }}>{info.metric}</td>
          </tr>
          <tr>
            <td style={{ padding: '8px 10px', borderBottom: `1px solid ${t.border}`, color: t.textMuted, fontWeight: 600, verticalAlign: 'top' }}>Measures</td>
            <td style={{ padding: '8px 10px', borderBottom: `1px solid ${t.border}`, color: t.textPrimary }}>{info.measures}</td>
          </tr>
          <tr>
            <td style={{ padding: '8px 10px', color: t.textMuted, fontWeight: 600 }}>Direction</td>
            <td style={{ padding: '8px 10px', color: t.textPrimary }}>{info.direction}</td>
          </tr>
        </tbody>
      </table>
    </VisualizationContainer>
  );
}
