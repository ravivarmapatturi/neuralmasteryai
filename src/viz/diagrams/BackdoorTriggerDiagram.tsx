import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { triggerDetectionProbability } from '../lib/aisecurity';

export default function BackdoorTriggerDiagram() {
  const t = useVizTokens();
  const [triggerSpaceLog, setTriggerSpaceLog] = useState(4); // 10^4 possible trigger patterns
  const [tests, setTests] = useState(1000);

  const triggerSpaceSize = Math.round(10 ** triggerSpaceLog);
  const detectProb = useMemo(() => triggerDetectionProbability(triggerSpaceSize, tests), [triggerSpaceSize, tests]);

  const width = 420;
  const height = 150;
  const samples = Array.from({ length: 60 }, (_, i) => Math.round((i / 59) * 20000));
  const px = (n: number) => (n / 20000) * width;
  const py = (v: number) => height - v * height;
  const curve = samples.map((n) => [px(n), py(triggerDetectionProbability(triggerSpaceSize, n))]);

  return (
    <VisualizationContainer footer={`With ${triggerSpaceSize.toLocaleString()} possible trigger patterns and ${tests.toLocaleString()} random black-box test inputs, real probability of randomly stumbling onto the exact trigger = ${(detectProb * 100).toFixed(3)}% -- computed from 1−(1−1/N)^tests, the same math as the deception-detection diagram on Alignment & RLHF, just with "possible triggers" standing in for "possible bad behaviors." The model performs correctly on every input except the trigger, which normal evaluation has essentially no reason to ever generate.`}>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <Slider label="possible trigger patterns (10^x)" value={triggerSpaceLog} onChange={setTriggerSpaceLog} min={2} max={8} step={0.5} />
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <Slider label="random black-box tests run" value={tests} onChange={setTests} min={10} max={20000} step={10} />
        </div>
      </div>

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8 }}>
        <polyline points={curve.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={t.accentDanger} strokeWidth={2.5} />
        <line x1={px(tests)} y1={0} x2={px(tests)} y2={height} stroke={t.accentWarn} strokeWidth={1.5} strokeDasharray="3 3" />
        <circle cx={px(tests)} cy={py(detectProb)} r={5} fill={t.accentWarn} />
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>
        This is why supply-chain trust for pretrained/fine-tuned models matters as much as it does: a backdoor introduced during training is extremely difficult to find through black-box testing alone, since you'd need to already suspect a specific trigger to find it.
      </div>
    </VisualizationContainer>
  );
}
