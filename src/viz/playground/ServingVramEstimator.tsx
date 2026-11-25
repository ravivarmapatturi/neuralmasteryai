import { useMemo, useState } from 'react';
import { SketchRect } from '../../components/notebook/RoughShape';
import { useVizTokens } from '../../theme/vizTokens';
import { PillSelect, Slider, VisualizationContainer, VisualizationHeader, usePrefersReducedMotion } from '../primitives';
import {
  computeServingVram,
  GPU_SKUS,
  MODEL_PRESETS,
} from './servingVramMath';
import './playgroundTools.css';

export default function ServingVramEstimator() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();

  const [presetId, setPresetId] = useState(MODEL_PRESETS[0].id);
  const [paramsB, setParamsB] = useState(MODEL_PRESETS[0].paramsB);
  const [layers, setLayers] = useState(MODEL_PRESETS[0].layers);
  const [kvHeads, setKvHeads] = useState(MODEL_PRESETS[0].kvHeads);
  const [headDim, setHeadDim] = useState(MODEL_PRESETS[0].headDim);

  const [weightBytes, setWeightBytes] = useState<number>(2);
  const [kvBytes, setKvBytes] = useState<number>(2);
  const [contextLength, setContextLength] = useState(8192);
  const [batchSize, setBatchSize] = useState(16);
  const [overheadGiB, setOverheadGiB] = useState(2);
  const [gpuId, setGpuId] = useState('a100-80');
  const [gpuCount, setGpuCount] = useState<number>(1);

  const gpu = GPU_SKUS.find((g) => g.id === gpuId) ?? GPU_SKUS[3];

  const applyModelPreset = (id: string) => {
    const found = MODEL_PRESETS.find((m) => m.id === id);
    if (!found) return;
    setPresetId(id);
    setParamsB(found.paramsB);
    setLayers(found.layers);
    setKvHeads(found.kvHeads);
    setHeadDim(found.headDim);
  };

  const result = useMemo(
    () =>
      computeServingVram({
        paramsB,
        weightBytes,
        layers,
        kvHeads,
        headDim,
        kvBytes,
        contextLength,
        batchSize,
        overheadGiB,
        gpuVramGiB: gpu.vramGiB,
        gpuBandwidthGBs: gpu.bandwidthGBs,
        gpuCount,
      }),
    [paramsB, weightBytes, layers, kvHeads, headDim, kvBytes, contextLength, batchSize, overheadGiB, gpu, gpuCount],
  );

  // Scale bar cleanly against max(pool, needed)
  const barScaleGiB = Math.max(result.poolVramGiB, result.totalVramNeededGiB, 1);
  const barWidth = 600;
  const wWidth = (result.weightsGiB / barScaleGiB) * barWidth;
  const kvWidth = (result.totalKvGiB / barScaleGiB) * barWidth;
  const ovWidth = (overheadGiB / barScaleGiB) * barWidth;
  const poolCapX = 40 + (result.poolVramGiB / barScaleGiB) * barWidth;

  return (
    <VisualizationContainer
      title="Serving & VRAM Sizing Estimator"
      footer={`Total VRAM needed: ${result.totalVramNeededGiB.toFixed(1)} GiB (${result.weightsGiB.toFixed(1)} GiB weights + ${result.totalKvGiB.toFixed(1)} GiB KV cache + ${overheadGiB} GiB runtime) against ${result.poolVramGiB} GiB across ${gpuCount}x ${gpu.label}.`}
    >
      <div className={`nm-pg${reducedMotion ? ' nm-pg--reduced-motion' : ''}`}>
        <VisualizationHeader
          eyebrow="Capacity & memory-bandwidth math"
          title="Size weights, KV cache concurrency, and decode throughput"
          description="Every byte of KV cache competes directly with batch concurrency. Change precision, KV heads, or context length to watch hardware requirements shift."
        />

        <div className="nm-pg__grid-2" style={{ marginBottom: '1rem' }}>
          <div className="nm-pg__panel">
            <h3 className="nm-pg__panel-title">Model & workload inputs</h3>
            <label className="nm-pg__field" style={{ marginBottom: '0.75rem' }}>
              <span>Architecture preset</span>
              <select value={presetId} onChange={(e) => applyModelPreset(e.target.value)}>
                {MODEL_PRESETS.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </label>

            <Slider
              label="Parameters (billions)"
              value={paramsB}
              onChange={setParamsB}
              min={1}
              max={120}
              step={0.5}
              format={(v) => `${v.toFixed(1)}B`}
            />
            <Slider
              label="KV heads per layer (GQA)"
              value={kvHeads}
              onChange={setKvHeads}
              min={1}
              max={64}
              step={1}
              format={(v) => `${v} KV heads`}
            />
            <Slider
              label="Context length per sequence"
              value={contextLength}
              onChange={setContextLength}
              min={1024}
              max={65536}
              step={1024}
              format={(v) => `${v.toLocaleString()} tok`}
            />
            <Slider
              label="Concurrent sequences (batch B)"
              value={batchSize}
              onChange={setBatchSize}
              min={1}
              max={64}
              step={1}
              format={(v) => `${v} seqs`}
            />
            <Slider
              label="CUDA runtime & activation overhead"
              value={overheadGiB}
              onChange={setOverheadGiB}
              min={0}
              max={8}
              step={0.5}
              format={(v) => `${v.toFixed(1)} GiB`}
            />
          </div>

          <div className="nm-pg__panel">
            <h3 className="nm-pg__panel-title">Precision & GPU pool</h3>
            <PillSelect<number>
              label="Weight precision"
              value={weightBytes}
              onChange={setWeightBytes}
              options={[
                { value: 2, label: 'BF16 (2 B)' },
                { value: 1, label: 'FP8 / INT8 (1 B)' },
                { value: 0.5, label: 'INT4 (0.5 B)' },
              ]}
            />
            <PillSelect<number>
              label="KV cache precision"
              value={kvBytes}
              onChange={setKvBytes}
              options={[
                { value: 2, label: 'BF16 (2 B)' },
                { value: 1, label: 'FP8 (1 B)' },
              ]}
            />

            <label className="nm-pg__field" style={{ margin: '0.65rem 0' }}>
              <span>GPU hardware SKU</span>
              <select value={gpuId} onChange={(e) => setGpuId(e.target.value)}>
                {GPU_SKUS.map((sku) => (
                  <option key={sku.id} value={sku.id}>{sku.label}</option>
                ))}
              </select>
            </label>

            <PillSelect<number>
              label="GPU count"
              value={gpuCount}
              onChange={setGpuCount}
              options={[
                { value: 1, label: '1 GPU' },
                { value: 2, label: '2 GPUs' },
                { value: 4, label: '4 GPUs' },
                { value: 8, label: '8 GPUs' },
              ]}
            />

            <div className="nm-pg__formula">
              Weights = {paramsB.toFixed(2)}e9 × {weightBytes} B / 1024³ = <strong>{result.weightsGiB.toFixed(2)} GiB</strong>
              <br />
              KV / tok = 2 × {layers} × {kvHeads} × {headDim} × {kvBytes} B = <strong>{result.kvKiBPerToken.toFixed(0)} KiB/tok</strong> ({result.kvPerSeqGiB.toFixed(2)} GiB/seq)
              <br />
              Total = {result.weightsGiB.toFixed(2)} + ({batchSize} × {result.kvPerSeqGiB.toFixed(2)}) + {overheadGiB.toFixed(1)} = <strong>{result.totalVramNeededGiB.toFixed(2)} GiB</strong>
            </div>
          </div>
        </div>

        <div className="nm-pg__kpis" aria-label="Calculated VRAM and decode metrics">
          <div className={`nm-pg__kpi ${result.fitsInPool ? 'nm-pg__kpi--good' : 'nm-pg__kpi--bad'}`}>
            Pool status ({result.poolVramGiB} GiB)
            <strong>{result.fitsInPool ? `Fits (+${result.freeHeadroomGiB.toFixed(1)} GiB)` : `OOM (${Math.abs(result.freeHeadroomGiB).toFixed(1)} GiB short)`}</strong>
          </div>
          <div className="nm-pg__kpi">
            Minimum GPUs needed
            <strong>{result.minGpusNeeded} × {gpu.vramGiB} GiB</strong>
          </div>
          <div className="nm-pg__kpi">
            Max concurrent @ {contextLength.toLocaleString()} tok
            <strong>{result.maxConcurrentSeqs} seqs</strong>
          </div>
          <div className="nm-pg__kpi">
            Aggregate decode ceiling
            <strong>{Math.round(result.batchedAggregateCeilingTokS).toLocaleString()} tok/s</strong>
          </div>
        </div>

        <div className="nm-pg__panel">
          <h3 className="nm-pg__panel-title">GPU memory allocation map</h3>
          <svg
            viewBox="0 0 680 140"
            width="100%"
            role="img"
            aria-label={`Stacked GPU memory allocation bar showing ${result.weightsGiB.toFixed(1)} GiB weights, ${result.totalKvGiB.toFixed(1)} GiB KV cache, and ${overheadGiB} GiB overhead`}
          >
            <rect x={40} y={32} width={barWidth} height={36} rx={6} fill={t.surfaceAlt} stroke={t.border} />
            <rect x={40} y={32} width={Math.max(2, wWidth)} height={36} fill={t.accentSecondary} />
            <rect x={40 + wWidth} y={32} width={Math.max(2, kvWidth)} height={36} fill={t.accentPrimary} />
            <rect x={40 + wWidth + kvWidth} y={32} width={Math.max(0, ovWidth)} height={36} fill={t.accentPurple} />
            <SketchRect
              x={40}
              y={32}
              width={barWidth}
              height={36}
              color={result.fitsInPool ? t.border : t.accentDanger}
              strokeWidth={1.6}
              id="vram-bar-frame"
            />

            {/* Pool ceiling marker */}
            <line
              x1={poolCapX}
              y1={18}
              x2={poolCapX}
              y2={82}
              stroke={result.fitsInPool ? t.textPrimary : t.accentDanger}
              strokeWidth={2.5}
              strokeDasharray="5 3"
            />
            <text
              x={Math.min(poolCapX, 580)}
              y={14}
              textAnchor="middle"
              fontSize={13}
              fontWeight={700}
              fill={result.fitsInPool ? t.textPrimary : t.accentDanger}
            >
              Pool limit: {result.poolVramGiB} GiB
            </text>

            {/* Legend */}
            <rect x={40} y={102} width={14} height={14} rx={3} fill={t.accentSecondary} />
            <text x={60} y={114} fontSize={14} fill={t.textPrimary}>
              Weights {result.weightsGiB.toFixed(1)} GiB
            </text>
            <rect x={225} y={102} width={14} height={14} rx={3} fill={t.accentPrimary} />
            <text x={245} y={114} fontSize={14} fill={t.textPrimary}>
              KV cache {result.totalKvGiB.toFixed(1)} GiB
            </text>
            <rect x={425} y={102} width={14} height={14} rx={3} fill={t.accentPurple} />
            <text x={445} y={114} fontSize={14} fill={t.textPrimary}>
              Overhead {overheadGiB.toFixed(1)} GiB
            </text>
          </svg>
          <p className="nm-pg__sub" style={{ margin: '0.35rem 0 0' }}>
            Single-sequence weight-bandwidth ceiling on one {gpu.label.split(' (')[0]}: <strong>{result.singleSeqDecodeCeilingTokS.toFixed(1)} tok/s</strong> (computed from {gpu.bandwidthGBs.toLocaleString()} GB/s ÷ {(paramsB * weightBytes).toFixed(2)} GB weights). Real throughput sits lower due to kernel overhead and KV reads.
          </p>
        </div>
      </div>
    </VisualizationContainer>
  );
}
