import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const UNIT_MS: Record<'unit' | 'integration' | 'e2e', number> = { unit: 5, integration: 200, e2e: 4000 };

const SHAPES = {
  pyramid: { unit: 200, integration: 30, e2e: 5 },
  inverted: { unit: 10, integration: 30, e2e: 100 },
};

const SHAPES_LIST: ('pyramid' | 'inverted')[] = ['pyramid', 'inverted'];

export default function TestingPyramidDiagram() {
  const t = useVizTokens();
  const { value: shapeIdx, stop } = useAutoCycle(SHAPES_LIST.length, 3800, 0);
  const [userShape, setUserShape] = useState<'pyramid' | 'inverted' | null>(null);
  const shape = userShape ?? SHAPES_LIST[shapeIdx];
  const counts = SHAPES[shape];
  const totalMs = counts.unit * UNIT_MS.unit + counts.integration * UNIT_MS.integration + counts.e2e * UNIT_MS.e2e;
  const color = getConceptColor(t, 'attention');
  const warnColor = t.accentDanger;

  const tiers: { key: keyof typeof counts; label: string }[] = [
    { key: 'e2e', label: 'End-to-end' },
    { key: 'integration', label: 'Integration' },
    { key: 'unit', label: 'Unit' },
  ];
  const maxCount = Math.max(counts.unit, SHAPES.inverted.unit, SHAPES.pyramid.unit);

  return (
    <VisualizationContainer
      footer={
        shape === 'pyramid'
          ? `Pyramid shape: ${counts.unit} unit + ${counts.integration} integration + ${counts.e2e} end-to-end tests, total suite runtime ~${(totalMs / 1000).toFixed(1)}s -- fast enough to run on every save.`
          : `Inverted: ${counts.unit} unit + ${counts.integration} integration + ${counts.e2e} end-to-end tests -- fewer total tests, but total runtime ~${(totalMs / 1000).toFixed(0)}s, dominated by the slow end-to-end tests. A suite this slow gets run less often, which defeats the entire point of having it.`
      }
    >
      <div style={{ marginBottom: 12 }}>
        <VizButton
          variant={shape === 'pyramid' ? 'primary' : 'secondary'}
          onClick={() => {
            stop();
            setUserShape('pyramid');
          }}
        >
          Pyramid (correct)
        </VizButton>{' '}
        <VizButton
          variant={shape === 'inverted' ? 'primary' : 'secondary'}
          onClick={() => {
            stop();
            setUserShape('inverted');
          }}
        >
          Inverted (bad)
        </VizButton>
      </div>
      {tiers.map((tier) => {
        const width = (counts[tier.key] / maxCount) * 300;
        return (
          <div key={tier.key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 80, fontSize: 12, color: t.textMuted, textAlign: 'right' }}>{tier.label}</div>
            <div style={{ width: Math.max(4, width), height: 20, background: shape === 'inverted' && tier.key === 'e2e' ? warnColor : color, opacity: 0.6, borderRadius: 3 }} />
            <div style={{ fontSize: 12, fontFamily: 'monospace', color: t.textSecondary }}>{counts[tier.key]}</div>
          </div>
        );
      })}
      <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, marginTop: 8 }}>
        Total suite runtime: <strong style={{ color: shape === 'inverted' ? warnColor : color }}>{(totalMs / 1000).toFixed(1)}s</strong>
      </div>
    </VisualizationContainer>
  );
}
