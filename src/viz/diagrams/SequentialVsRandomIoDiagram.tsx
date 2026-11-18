import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

// Representative real-world figures for a typical SSD -- sequential reads
// approach the device's raw bandwidth; tiny random reads pay a per-seek/
// per-request cost that dominates at small file sizes.
const SEQ_MBPS = 2000;
const RANDOM_OVERHEAD_MS = 0.1; // per-file open/seek overhead

function seqTimeMs(totalMb: number): number {
  return (totalMb / SEQ_MBPS) * 1000;
}
function randomTimeMs(totalMb: number, fileKb: number): number {
  const nFiles = (totalMb * 1024) / fileKb;
  return nFiles * RANDOM_OVERHEAD_MS + seqTimeMs(totalMb); // per-file overhead on top of raw transfer
}

const TOTAL_MB = 1000; // read 1GB total, either as one sequential stream or as many small files
const KB_PRESETS = [50, 10, 200, 25];

export default function SequentialVsRandomIoDiagram() {
  const t = useVizTokens();
  const { value: autoIdx, stop } = useAutoCycle(KB_PRESETS.length, 3000, 0);
  const [userKb, setUserKb] = useState<number | null>(null);
  const fileKb = userKb ?? KB_PRESETS[autoIdx];

  const seq = seqTimeMs(TOTAL_MB);
  const random = randomTimeMs(TOTAL_MB, fileKb);
  const nFiles = Math.round((TOTAL_MB * 1024) / fileKb);
  const seqColor = getConceptColor(t, 'attention');
  const randomColor = t.accentDanger;
  const maxTime = Math.max(seq, random);

  return (
    <VisualizationContainer footer={`Reading ${TOTAL_MB.toLocaleString()}MB total as ${nFiles.toLocaleString()} separate ${fileKb}KB files: ~${(random / 1000).toFixed(1)}s, dominated by per-file open/seek overhead, not the actual data transfer. The same ${TOTAL_MB.toLocaleString()}MB as one sequential stream: ~${(seq / 1000).toFixed(2)}s. This is the concrete, measurable reason formats like TFRecord/WebDataset/Parquet pack many small training examples into large sequential files instead of one file per example.`}>
      <Slider
        label="Individual file size"
        value={fileKb}
        onChange={(v) => {
          stop();
          setUserKb(v);
        }}
        min={5}
        max={500}
        step={5}
        format={(v) => `${v}KB`}
      />
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, marginBottom: 2 }}>Sequential (one large file)</div>
        <div style={{ background: t.surfaceAlt, borderRadius: 6, height: 22, position: 'relative' }}>
          <div style={{ width: `${Math.max(1, (seq / maxTime) * 100)}%`, background: seqColor, height: '100%', borderRadius: 6 }} />
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 12, color: seqColor, marginTop: 2 }}>{(seq / 1000).toFixed(2)}s</div>

        <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, margin: '10px 0 2px' }}>Random ({nFiles.toLocaleString()} small files)</div>
        <div style={{ background: t.surfaceAlt, borderRadius: 6, height: 22, position: 'relative' }}>
          <div style={{ width: `${Math.max(1, (random / maxTime) * 100)}%`, background: randomColor, height: '100%', borderRadius: 6 }} />
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 12, color: randomColor, marginTop: 2 }}>{(random / 1000).toFixed(2)}s</div>
      </div>
    </VisualizationContainer>
  );
}
