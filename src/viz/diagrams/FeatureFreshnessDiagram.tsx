import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

/** Drag staleness and watch a real-time feature actually stop meaning
 * what its name claims. */
export default function FeatureFreshnessDiagram() {
  const t = useVizTokens();
  const [staleMin, setStaleMin] = useState(3);
  const okColor = t.accentPrimary;
  const badColor = t.accentDanger;
  const color = getConceptColor(t, 'attention');
  const isStale = staleMin > 5;

  return (
    <VisualizationContainer footer={isStale ? `"user's last-hour click count" is ${staleMin} minutes old -- for a fraud-detection model reacting to what a user just did, this is functionally the same as not having the feature at all.` : `"user's last-hour click count" is ${staleMin} minutes old -- fresh enough to reflect what actually just happened.`}>
      <Slider label={`Feature age: ${staleMin} min`} min={0} max={20} step={1} value={staleMin} onChange={setStaleMin} />
      <SketchBox color={isStale ? badColor : okColor} strokeWidth={1.5} style={{ marginTop: 10 }}>
        <div style={{ padding: '0.7rem', borderRadius: 9, background: isStale ? `${badColor}15` : `${okColor}15`, textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: isStale ? badColor : okColor, fontFamily: HAND_FONT }}>{isStale ? '⚠ stale -- defeats the point of real-time' : '✓ fresh'}</div>
        </div>
      </SketchBox>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        <span style={{ color, fontFamily: HAND_FONT }}>Freshness requirements are use-case specific</span> -- a fraud model needs seconds, a weekly-refresh recommendation feature can tolerate hours.
      </div>
    </VisualizationContainer>
  );
}
