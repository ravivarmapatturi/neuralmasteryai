import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

/** Drag register usage per thread block and watch how many blocks/warps
 * actually fit on one SM -- fewer registers per thread means more warps
 * resident, which means more latency-hiding when one warp stalls. */
export default function OccupancyDiagram() {
  const t = useVizTokens();
  const [regsPerThread, setRegsPerThread] = useState(32);
  const color = getConceptColor(t, 'attention');

  const MAX_REGS_PER_SM = 65536;
  const THREADS_PER_WARP = 32;
  const MAX_WARPS_PER_SM = 64; // hardware limit, illustrative
  const warpsFittingByRegs = Math.floor(MAX_REGS_PER_SM / (regsPerThread * THREADS_PER_WARP));
  const residentWarps = Math.min(warpsFittingByRegs, MAX_WARPS_PER_SM);
  const occupancyPct = Math.round((residentWarps / MAX_WARPS_PER_SM) * 100);

  return (
    <VisualizationContainer footer={`${regsPerThread} registers/thread → ${residentWarps} of ${MAX_WARPS_PER_SM} max warps resident (${occupancyPct}% occupancy). ${occupancyPct < 50 ? 'Fewer warps resident means less latency-hiding capacity -- when one warp stalls on memory, there are fewer other ready warps to switch to.' : 'Plenty of warps resident -- good latency-hiding capacity.'}`}>
      <Slider label={`Registers used per thread: ${regsPerThread}`} min={16} max={128} step={8} value={regsPerThread} onChange={setRegsPerThread} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(16, 1fr)', gap: 3, marginTop: 10 }}>
        {Array.from({ length: MAX_WARPS_PER_SM }, (_, i) => (
          <SketchBox key={i} color={i < residentWarps ? color : t.border} strokeWidth={1} style={{ aspectRatio: '1', opacity: i < residentWarps ? 0.85 : 0.4 }}>
            <div style={{ width: '100%', height: '100%', borderRadius: 3, background: i < residentWarps ? color : t.surfaceAlt }} />
          </SketchBox>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        Each cell = one warp slot on this SM. Filled = resident and schedulable; empty = spare capacity going unused.
      </div>
    </VisualizationContainer>
  );
}
