import { useMemo } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import { generateClasses, trainSgd, type LossType, type PenaltyType } from '../lib/classifiers';

// Restricted to configs where "w·x+b = 0" is the actual decision boundary
// (log-odds / hinge margin both cross zero at the real class boundary) --
// squared-error-on-{0,1}-labels would need a 0.5 threshold instead, a
// different comparison than this diagram is making.
const CONFIGS: { key: string; loss: LossType; penalty: PenaltyType; label: string }[] = [
  { key: 'logreg-l2', loss: 'log', penalty: 'l2', label: 'Logistic Regression (L2)' },
  { key: 'logreg-none', loss: 'log', penalty: 'none', label: 'Logistic Regression (unregularized)' },
  { key: 'svm', loss: 'hinge', penalty: 'l2', label: 'Linear SVM (hinge + L2)' },
];

export default function SgdLossPenaltyDiagram() {
  const t = useVizTokens();
  const configCycle = useAutoCycle(CONFIGS.length, 2800, 2);
  const configKey = CONFIGS[configCycle.value].key;
  const config = CONFIGS.find((c) => c.key === configKey)!;

  const points = useMemo(() => generateClasses(3, false), []);
  const { w, b } = useMemo(() => trainSgd(points, config.loss, config.penalty, 15, 0.02, 0.05, 11), [config]);

  const width = 300, height = 260, scale = 55, ox = width / 2, oy = height / 2;
  const px = (x: number) => ox + x * scale;
  const py = (y: number) => oy - y * scale;
  // boundary: w0*x + w1*y + b = 0 -> y = -(w0*x+b)/w1
  const boundaryY = (x: number) => -(w[0] * x + b) / (w[1] || 1e-6);

  return (
    <VisualizationContainer footer={`Same generic SGD loop (${'`'}for each point: score = w·x+b, grad = loss'(y, score), w -= lr*(grad*x + penalty), b -= lr*grad${'`'}), same real 120-point dataset -- only the loss/penalty plugged in differs. Real fitted boundary for ${config.label}: w=(${w[0].toFixed(2)}, ${w[1].toFixed(2)}), b=${b.toFixed(2)}.`}>
      <PillSelect label="Loss + penalty combination" value={configKey} onChange={(v) => configCycle.pick(CONFIGS.findIndex((c) => c.key === v))} options={CONFIGS.map((c) => ({ value: c.key, label: c.label }))} />

      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', marginTop: 8, maxWidth: 300, margin: '8px auto 0' }}>
        {points.map((p, i) => (
          <circle key={i} cx={px(p.x)} cy={py(p.y)} r={3.5} fill={p.label === 1 ? t.accentPrimary : t.accentDanger} fillOpacity={0.75} />
        ))}
        <line x1={px(-2.6)} y1={py(boundaryY(-2.6))} x2={px(2.6)} y2={py(boundaryY(2.6))} stroke={t.accentWarn} strokeWidth={2.5} />
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted }}>
        Switch configurations and watch the real boundary shift -- same engine, same data, genuinely different fitted line because the loss function's gradient is genuinely different.
      </div>
    </VisualizationContainer>
  );
}
