import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, useAutoCycle } from '../primitives';
import { getConceptColor } from './diagramSystem';

type Task = 'classification' | 'detection' | 'segmentation' | 'tracking';
const TASKS: Record<Task, { label: string; output: string; supervision: string; metric: string; detail: string }> = {
  detection: { label: 'Detect', output: 'boxes + labels', supervision: 'bounding boxes', metric: 'mAP', detail: 'The system must find an unknown number of objects and say where each one is.' },
  segmentation: { label: 'Segment', output: 'label per pixel', supervision: 'pixel masks', metric: 'IoU / Dice', detail: 'Every pixel receives a class, preserving boundaries that a box cannot express.' },
  tracking: { label: 'Track', output: 'boxes + identity over time', supervision: 'boxes + track IDs', metric: 'MOTA / IDF1', detail: 'Detection is not enough: the same object must keep its identity as frames change.' },
  classification: { label: 'Classify', output: 'one label', supervision: 'image label', metric: 'accuracy / F1', detail: 'One decision summarizes the entire frame: “is this item defective?”' },
};

const TASK_KEYS: Task[] = ['detection', 'segmentation', 'tracking', 'classification'];

export default function VisionTaskTaxonomyDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(TASK_KEYS.length, 3200);
  const [userActive, setUserActive] = useState<Task | null>(null);
  const active = userActive ?? TASK_KEYS[autoIdx];
  const c = getConceptColor(t, 'attention');

  const draw = (task: Task) => {
    if (task === 'classification') return <><rect x="107" y="20" width="120" height="78" rx="8" fill={t.surfaceAlt} stroke={t.border}/><circle cx="167" cy="54" r="22" fill={`${c}33`} /><text x="167" y="58" textAnchor="middle" fontSize="20">⌁</text><rect x="245" y="42" width="86" height="34" rx="17" fill={`${c}28`} stroke={c}/><text x="288" y="63" textAnchor="middle" fontSize="11" fill={c}>cat · 92%</text></>;
    if (task === 'detection') return <><rect x="70" y="17" width="210" height="88" rx="8" fill={t.surfaceAlt} stroke={t.border}/><circle cx="126" cy="58" r="18" fill={`${c}33`}/><rect x="100" y="31" width="54" height="54" fill="none" stroke={c} strokeWidth="2"/><rect x="190" y="43" width="53" height="38" fill="none" stroke={t.accentWarn} strokeWidth="2"/><text x="101" y="27" fontSize="9" fill={c}>cat</text><text x="190" y="39" fontSize="9" fill={t.accentWarn}>ball</text></>;
    if (task === 'segmentation') return <><rect x="78" y="16" width="200" height="90" rx="8" fill={t.surfaceAlt} stroke={t.border}/>{Array.from({ length: 8 }, (_, row) => Array.from({ length: 14 }, (_, col) => <rect key={`${row}-${col}`} x={87 + col * 13} y={24 + row * 9} width="12" height="8" fill={col < 7 ? `${c}${row > 1 && row < 7 ? '88' : '35'}` : `${t.accentWarn}${row > 3 ? '88' : '30'}`} />))}</>;
    return <><rect x="48" y="15" width="118" height="88" rx="8" fill={t.surfaceAlt} stroke={t.border}/><rect x="215" y="15" width="118" height="88" rx="8" fill={t.surfaceAlt} stroke={t.border}/><rect x="84" y="43" width="32" height="32" fill="none" stroke={c} strokeWidth="2"/><rect x="257" y="55" width="32" height="32" fill="none" stroke={c} strokeWidth="2"/><path d="M116 59 C160 59 184 71 257 71" fill="none" stroke={c} strokeWidth="2" strokeDasharray="4 3"/><text x="100" y="94" textAnchor="middle" fontSize="9" fill={c}>ID 27</text><text x="273" y="98" textAnchor="middle" fontSize="9" fill={c}>ID 27</text></>;
  };

  return (
    <VisualizationContainer footer={TASKS[active].detail}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {TASK_KEYS.map(k => (
          <VizButton key={k} variant={active === k ? 'primary' : 'secondary'} onClick={() => setUserActive(k)}>
            {TASKS[k].label}
          </VizButton>
        ))}
      </div>
      <svg width="100%" viewBox="0 0 380 118" style={{ display: 'block' }}>{draw(active)}</svg>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 12 }}>
        <div><b>Output</b><br/>{TASKS[active].output}</div>
        <div><b>Labels</b><br/>{TASKS[active].supervision}</div>
        <div><b>Metric</b><br/>{TASKS[active].metric}</div>
      </div>
    </VisualizationContainer>
  );
}
