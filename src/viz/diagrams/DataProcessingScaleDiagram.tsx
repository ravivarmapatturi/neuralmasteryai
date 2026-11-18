import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle, usePrefersReducedMotion } from '../primitives';
import { getConceptColor } from './diagramSystem';

const SIZES = [1, 3, 5, 8, 12, 18, 30, 50, 75, 100];

/** Drag dataset size and watch which tool actually fits -- the scaling
 * ladder made concrete instead of abstract "when data gets big." */
export default function DataProcessingScaleDiagram() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const cyc = useAutoCycle(SIZES.length, 2500);
  const sizeGB = SIZES[cyc.value];
  const color = getConceptColor(t, 'attention');
  const dimColor = t.textMuted;

  const machineMemGB = 16; // typical single-machine RAM budget for this exercise
  const tool = sizeGB < machineMemGB * 0.3 ? 'pandas' : sizeGB < machineMemGB * 0.8 ? 'polars' : 'pyspark';

  const TOOLS = [
    { key: 'pandas', label: 'Pandas/NumPy', note: 'fits comfortably in memory' },
    { key: 'polars', label: 'Polars', note: 'single machine, but speed starts mattering' },
    { key: 'pyspark', label: 'PySpark', note: "doesn't fit on one machine's memory at all" },
  ];

  return (
    <VisualizationContainer footer={`At ${sizeGB}GB, on a machine with ~${machineMemGB}GB RAM: ${TOOLS.find((x) => x.key === tool)!.note}.`}>
      <Slider
        label={`Dataset size: ${sizeGB}GB`}
        min={0.1}
        max={100}
        step={0.5}
        value={sizeGB}
        onChange={(v) => {
          const closestIdx = SIZES.reduce((best, curr, idx) => Math.abs(curr - v) < Math.abs(SIZES[best] - v) ? idx : best, 0);
          cyc.pick(closestIdx);
        }}
      />
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        {TOOLS.map((x) => {
          const isActive = tool === x.key;
          return (
            <div
              key={x.key}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '0.6rem',
                borderRadius: 8,
                background: isActive ? `${color}18` : t.surfaceAlt,
                border: `1.5px solid ${isActive ? color : dimColor}`,
                boxShadow: isActive && !reducedMotion ? `0 0 8px ${color}33` : 'none',
                opacity: isActive ? 1 : 0.4,
                transform: isActive && !reducedMotion ? 'scale(1.02)' : 'scale(1)',
                transition: 'all 0.3s ease',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: isActive ? color : dimColor }}>{x.label}</div>
            </div>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}