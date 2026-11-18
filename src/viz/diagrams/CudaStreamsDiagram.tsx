import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { PulseRect } from '../primitives/LiveFlow';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

/** One stream forces strict sequencing; multiple streams let data
 * transfer and compute overlap. Toggle to compare the actual timelines. */
export default function CudaStreamsDiagram() {
  const t = useVizTokens();
  const { value, pick } = useAutoCycle(2, 4000, 1);
  const mode: 'single' | 'multi' = value === 0 ? 'single' : 'multi';
  const transferColor = getConceptColor(t, 'query');
  const computeColor = getConceptColor(t, 'attention');
  const width = 560;
  const unit = 4;

  return (
    <VisualizationContainer footer={mode === 'single' ? 'One stream: every operation waits for the previous one -- transfer, then compute, then transfer, then compute, strictly sequential.' : 'Multiple streams: transfer for batch 2 starts WHILE batch 1 is still computing -- the GPU stays busy instead of idling during data transfer.'}>
      <PillSelect<'single' | 'multi'>
        label="Streams"
        value={mode}
        onChange={(m) => {
          const next = typeof m === 'function' ? m(mode) : m;
          pick(next === 'single' ? 0 : 1);
        }}
        options={[{ value: 'single', label: '1 stream' }, { value: 'multi', label: '2 streams (overlapped)' }]}
      />
      <svg width="100%" viewBox={`0 0 ${width} 90`} style={{ display: 'block', marginTop: 8 }}>
        {mode === 'single' ? (
          <>
            <text x={4} y={20} fontSize={8.5} fill={t.textMuted}>stream</text>
            {[0, 1].map((batch) => {
              const xStart = 60 + batch * 22 * unit;
              return (
                <g key={batch}>
                  <rect x={xStart} y={12} width={10 * unit} height={18} fill={transferColor} opacity={0.8} rx={2} />
                  <rect x={xStart + 10 * unit} y={12} width={12 * unit} height={18} fill={computeColor} opacity={0.8} rx={2} />
                </g>
              );
            })}
          </>
        ) : (
          <>
            <text x={4} y={20} fontSize={8.5} fill={t.textMuted}>stream A</text>
            <text x={4} y={50} fontSize={8.5} fill={t.textMuted}>stream B</text>
            <rect x={60} y={12} width={10 * unit} height={18} fill={transferColor} opacity={0.8} rx={2} />
            <rect x={60 + 10 * unit} y={12} width={12 * unit} height={18} fill={computeColor} opacity={0.8} rx={2} />
            <rect x={60 + 10 * unit} y={42} width={10 * unit} height={18} fill={transferColor} opacity={0.8} rx={2} />
            <rect x={60 + 20 * unit} y={42} width={12 * unit} height={18} fill={computeColor} opacity={0.8} rx={2} />
            <line x1={60 + 10 * unit} y1={8} x2={60 + 10 * unit} y2={64} stroke={t.accentPrimary} strokeWidth={1} strokeDasharray="2 2" />
            <PulseRect x={60 + 10 * unit} y={10} w={10 * unit} h={52} color={t.accentPrimary} dur={2.4} />
            <text x={60 + 10 * unit + 4} y={72} fontSize={7.5} fill={t.accentPrimary}>overlap window (transfer + compute)</text>
          </>
        )}
      </svg>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: DIAGRAM_TYPE.caption.size }}>
        <span style={{ color: transferColor }}>■ data transfer</span>
        <span style={{ color: computeColor }}>■ compute</span>
      </div>
    </VisualizationContainer>
  );
}
