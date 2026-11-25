import { useMemo, useState } from 'react';
import { SketchArrow, SketchRect } from '../../components/notebook/RoughShape';
import { useVizTokens } from '../../theme/vizTokens';
import { PillSelect, VisualizationContainer, VisualizationHeader, usePrefersReducedMotion } from '../primitives';
import {
  computeStackTrace,
  STACK_LAYERS,
  type RequestMode,
  type StackLayerId,
} from './aiStackMapData';
import './playgroundTools.css';

const MODE_LABELS: { value: RequestMode; label: string }[] = [
  { value: 'chat', label: 'Single-turn chat' },
  { value: 'rag', label: 'Grounded RAG query' },
  { value: 'agent', label: 'Tool-using agent loop' },
];

export default function AiStackMapTour() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();
  const [focusLayer, setFocusLayer] = useState<StackLayerId>('runtimes');
  const [requestMode, setRequestMode] = useState<RequestMode>('rag');
  const [prefixCacheEnabled, setPrefixCacheEnabled] = useState(true);
  const [evalGateEnabled, setEvalGateEnabled] = useState(true);

  const trace = useMemo(
    () => computeStackTrace(requestMode, prefixCacheEnabled, evalGateEnabled),
    [requestMode, prefixCacheEnabled, evalGateEnabled],
  );

  const activeSpec = STACK_LAYERS.find((layer) => layer.id === focusLayer) ?? STACK_LAYERS[0];
  const activeLayerLat = trace.layerLatencies[activeSpec.id];
  const sharePct = trace.totalLatencyMs > 0 ? Math.round((activeLayerLat / trace.totalLatencyMs) * 100) : 0;

  return (
    <VisualizationContainer
      title="AI Stack Map Interactive Tour"
      footer={`Illustrative request trace for ${requestMode} mode: ${trace.totalLatencyMs} ms across ${trace.activeLayers.length} active layers (${trace.modelCalls} model call${trace.modelCalls > 1 ? 's' : ''}, ${trace.prefillTokens.toLocaleString()} prefill tokens computed).`}
    >
      <div className={`nm-pg${reducedMotion ? ' nm-pg--reduced-motion' : ''}`}>
        <VisualizationHeader
          eyebrow="Full-stack AI request map"
          title="Trace one request across every layer"
          description="Select a workload shape and click any layer in the stack to inspect what flows through it, what breaks without it, and how caching changes latency."
        />

        <div className="nm-pg__controls" style={{ marginBottom: '1rem' }}>
          <PillSelect<RequestMode>
            label="Request path"
            value={requestMode}
            onChange={setRequestMode}
            options={MODE_LABELS}
          />

          <div className="nm-pg__checks" role="group" aria-label="Stack optimizations and gates">
            <button
              type="button"
              className="nm-pg__chip-btn"
              aria-pressed={prefixCacheEnabled}
              onClick={() => setPrefixCacheEnabled((v) => !v)}
            >
              KV prefix cache: {prefixCacheEnabled ? 'On' : 'Off'}
            </button>
            <button
              type="button"
              className="nm-pg__chip-btn"
              aria-pressed={evalGateEnabled}
              onClick={() => setEvalGateEnabled((v) => !v)}
            >
              Eval & guardrail gate: {evalGateEnabled ? 'On' : 'Off'}
            </button>
          </div>
        </div>

        <div className="nm-pg__kpis" aria-label="Illustrative request telemetry">
          <div className="nm-pg__kpi">
            Illustrative latency
            <strong>{trace.totalLatencyMs} ms</strong>
          </div>
          <div className="nm-pg__kpi">
            Model calls
            <strong>{trace.modelCalls}</strong>
          </div>
          <div className="nm-pg__kpi">
            Un-cached prefill tokens
            <strong>{trace.prefillTokens.toLocaleString()}</strong>
          </div>
          <div className={`nm-pg__kpi ${evalGateEnabled ? 'nm-pg__kpi--good' : 'nm-pg__kpi--warn'}`}>
            Guardrail status
            <strong>{evalGateEnabled ? 'Verified' : 'Unchecked'}</strong>
          </div>
        </div>

        <div className="nm-pg__grid-2">
          <div className="nm-pg__panel">
            <h3 className="nm-pg__panel-title">Dependency graph (click a layer)</h3>
            <svg
              viewBox="0 0 680 390"
              width="100%"
              role="img"
              aria-label={`AI stack dependency diagram in ${requestMode} mode highlighting ${activeSpec.label}`}
            >
              {/* Arrows showing request flow from Frameworks -> Agents -> Runtimes -> Hardware -> Evals */}
              <SketchArrow points={[[185, 62], [350, 62]]} color={t.textMuted} strokeWidth={1.6} id="stack-edge-req" />
              <SketchArrow points={[[480, 96], [480, 146]]} color={trace.activeLayers.includes('agents') ? t.accentPurple : t.border} strokeWidth={1.6} id="stack-edge-ag" />
              <SketchArrow points={[[480, 212], [480, 260]]} color={t.accentSecondary} strokeWidth={1.6} id="stack-edge-rt" />
              <SketchArrow points={[[350, 294], [250, 294]]} color={t.accentPrimary} strokeWidth={1.6} id="stack-edge-hw" />
              <SketchArrow points={[[135, 256], [135, 212]]} color={evalGateEnabled ? t.accentWarn : t.border} strokeWidth={1.6} id="stack-edge-ev" />

              <text x={268} y={50} textAnchor="middle" fontSize={13} fill={t.textSecondary}>
                Prompt + chunks
              </text>
              <text x={560} y={125} textAnchor="middle" fontSize={13} fill={t.textSecondary}>
                Tool plan
              </text>
              <text x={565} y={240} textAnchor="middle" fontSize={13} fill={t.textSecondary}>
                Token batch
              </text>
              <text x={300} y={282} textAnchor="middle" fontSize={13} fill={t.textSecondary}>
                Logits
              </text>

              {[
                { id: 'frameworks' as StackLayerId, x: 35, y: 26, w: 150, h: 72, color: t.accentSecondary },
                { id: 'agents' as StackLayerId, x: 355, y: 26, w: 250, h: 70, color: t.accentPurple },
                { id: 'runtimes' as StackLayerId, x: 355, y: 148, w: 250, h: 64, color: t.accentTeal },
                { id: 'hardware' as StackLayerId, x: 35, y: 258, w: 215, h: 72, color: t.accentPrimary },
                { id: 'evals' as StackLayerId, x: 35, y: 142, w: 215, h: 68, color: t.accentWarn },
              ].map((box) => {
                const layer = STACK_LAYERS.find((l) => l.id === box.id)!;
                const isUsed = trace.activeLayers.includes(box.id);
                const isSelected = focusLayer === box.id;
                const ms = trace.layerLatencies[box.id];
                return (
                  <g
                    key={box.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Inspect ${layer.label}`}
                    onClick={() => setFocusLayer(box.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setFocusLayer(box.id);
                      }
                    }}
                    style={{ cursor: 'pointer', opacity: isUsed ? 1 : 0.4 }}
                  >
                    <rect
                      x={box.x}
                      y={box.y}
                      width={box.w}
                      height={box.h}
                      rx={8}
                      fill={isSelected ? t.surfaceAlt : t.background}
                    />
                    <SketchRect
                      x={box.x}
                      y={box.y}
                      width={box.w}
                      height={box.h}
                      color={isSelected ? box.color : t.border}
                      strokeWidth={isSelected ? 2.6 : 1.5}
                      id={`stack-node-${box.id}`}
                    />
                    <text
                      x={box.x + box.w / 2}
                      y={box.y + 28}
                      textAnchor="middle"
                      fontSize={15}
                      fontWeight={700}
                      fill={isSelected ? box.color : t.textPrimary}
                    >
                      {layer.shortLabel}
                    </text>
                    <text
                      x={box.x + box.w / 2}
                      y={box.y + 50}
                      textAnchor="middle"
                      fontSize={13}
                      fill={t.textSecondary}
                    >
                      {isUsed ? `${ms} ms (illustrative)` : 'Bypassed in path'}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="nm-pg__panel">
            <h3 className="nm-pg__panel-title">{activeSpec.label}</h3>
            <p className="nm-pg__sub">{activeSpec.role}</p>

            <div className="nm-pg__checks" style={{ marginBottom: '0.75rem' }}>
              {STACK_LAYERS.map((layer) => (
                <button
                  key={layer.id}
                  type="button"
                  className="nm-pg__chip-btn"
                  aria-pressed={focusLayer === layer.id}
                  onClick={() => setFocusLayer(layer.id)}
                >
                  {layer.shortLabel}
                </button>
              ))}
            </div>

            <dl style={{ margin: 0, display: 'grid', gap: '0.55rem', fontSize: 15 }}>
              <div>
                <dt style={{ fontWeight: 700, color: t.textPrimary }}>Layer inputs</dt>
                <dd style={{ margin: 0, color: t.textSecondary }}>{activeSpec.inputs}</dd>
              </div>
              <div>
                <dt style={{ fontWeight: 700, color: t.textPrimary }}>Layer outputs</dt>
                <dd style={{ margin: 0, color: t.textSecondary }}>{activeSpec.outputs}</dd>
              </div>
              <div>
                <dt style={{ fontWeight: 700, color: t.textPrimary }}>Illustrative latency share</dt>
                <dd style={{ margin: 0, color: t.textSecondary }}>
                  {trace.activeLayers.includes(activeSpec.id)
                    ? `${activeLayerLat} ms (${sharePct}% of total request)`
                    : 'Not active in this request mode'}
                </dd>
              </div>
              <div>
                <dt style={{ fontWeight: 700, color: t.accentDanger }}>What breaks if omitted</dt>
                <dd style={{ margin: 0, color: t.textSecondary }}>{activeSpec.ifSkipped}</dd>
              </div>
            </dl>

            <p style={{ margin: '0.9rem 0 0', fontSize: 15 }}>
              <a className="nm-pg__link" href={activeSpec.learnPath}>
                Open Learn chapter: {activeSpec.learnTitle} →
              </a>
            </p>
          </div>
        </div>
      </div>
    </VisualizationContainer>
  );
}
