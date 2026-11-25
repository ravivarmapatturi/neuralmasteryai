import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { PillSelect, VisualizationContainer, VisualizationHeader, usePrefersReducedMotion } from '../primitives';
import {
  computeAxisTip,
  computeRadarPolygonPoints,
  TECHNIQUE_PROFILES,
  TRADEOFF_AXES,
  type AtlasDomain,
} from './techniqueTradeoffs';
import './playgroundTools.css';

const DEFAULT_SELECTION: Record<AtlasDomain, string[]> = {
  inference: ['paged-kv-cache', 'speculative-decoding', 'awq'],
  training: ['lora', 'qlora', 'rlhf-ppo'],
  agents: ['routing-workflow', 'react', 'tree-of-thoughts'],
};

const CX = 240;
const CY = 185;
const RADIUS = 122;

export default function TechniqueTradeoffComparator() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();

  const [domain, setDomain] = useState<AtlasDomain>('inference');
  const [selectedIds, setSelectedIds] = useState<string[]>(DEFAULT_SELECTION.inference);

  const domainProfiles = useMemo(
    () => TECHNIQUE_PROFILES.filter((p) => p.domain === domain),
    [domain],
  );

  const activeProfiles = useMemo(
    () => domainProfiles.filter((p) => selectedIds.includes(p.id)),
    [domainProfiles, selectedIds],
  );

  const seriesColors = [t.accentSecondary, t.accentPrimary, t.accentWarn];

  const handleDomainChange = (next: AtlasDomain) => {
    setDomain(next);
    setSelectedIds(DEFAULT_SELECTION[next]);
  };

  const toggleTechnique = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.length > 1 ? prev.filter((item) => item !== id) : prev;
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  };

  return (
    <VisualizationContainer
      title="Technique Trade-Off Radar & Comparator"
      footer={`Comparing ${activeProfiles.map((p) => p.name).join(' vs. ')} on illustrative 1–5 engineering rubric scores grounded in the Neural Mastery Atlases.`}
    >
      <div className={`nm-pg${reducedMotion ? ' nm-pg--reduced-motion' : ''}`}>
        <VisualizationHeader
          eyebrow="Atlas trade-off comparator"
          title="Compare up to three techniques across five engineering axes"
          description="Scores are qualitative 1–5 engineering rubric ratings (illustrative) summarized from each Atlas entry's mechanism, failure modes, and runtime constraints."
        />

        <div className="nm-pg__controls" style={{ marginBottom: '1rem' }}>
          <PillSelect<AtlasDomain>
            label="Atlas domain"
            value={domain}
            onChange={handleDomainChange}
            options={[
              { value: 'inference', label: 'Inference Atlas' },
              { value: 'training', label: 'Training Atlas' },
              { value: 'agents', label: 'Agent Architecture Atlas' },
            ]}
          />

          <div>
            <div style={{ fontSize: 14, color: t.textSecondary, marginBottom: 6 }}>
              Select 1 to 3 techniques to overlay
            </div>
            <div className="nm-pg__checks" role="group" aria-label="Select techniques to compare">
              {domainProfiles.map((prof) => {
                const active = selectedIds.includes(prof.id);
                return (
                  <button
                    key={prof.id}
                    type="button"
                    className="nm-pg__chip-btn"
                    aria-pressed={active}
                    onClick={() => toggleTechnique(prof.id)}
                  >
                    {prof.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="nm-pg__grid-2">
          <div className="nm-pg__panel">
            <h3 className="nm-pg__panel-title">5-axis trade-off profile (1 = low, 5 = high)</h3>
            <svg
              viewBox="0 0 480 370"
              width="100%"
              role="img"
              aria-label={`Radar chart comparing ${activeProfiles.map((p) => p.name).join(', ')}`}
            >
              {[1, 2, 3, 4, 5].map((ring) => {
                const pts = TRADEOFF_AXES.map((_, idx) => {
                  const tip = computeAxisTip(idx, CX, CY, (ring / 5) * RADIUS);
                  return `${tip.x.toFixed(1)},${tip.y.toFixed(1)}`;
                }).join(' ');
                return (
                  <polygon
                    key={ring}
                    points={pts}
                    fill="none"
                    stroke={t.border}
                    strokeWidth={ring === 5 ? 1.4 : 0.9}
                    strokeDasharray={ring < 5 ? '3 3' : undefined}
                    opacity={0.65}
                  />
                );
              })}

              {TRADEOFF_AXES.map((axis, idx) => {
                const tip = computeAxisTip(idx, CX, CY, RADIUS);
                const labelPos = computeAxisTip(idx, CX, CY, RADIUS + 28);
                const anchor =
                  Math.abs(labelPos.x - CX) < 15
                    ? 'middle'
                    : labelPos.x > CX
                      ? 'start'
                      : 'end';
                return (
                  <g key={axis.key}>
                    <line x1={CX} y1={CY} x2={tip.x} y2={tip.y} stroke={t.border} strokeWidth={1} opacity={0.7} />
                    <text
                      x={labelPos.x}
                      y={labelPos.y + 4}
                      textAnchor={anchor}
                      fontSize={13}
                      fontWeight={700}
                      fill={t.textPrimary}
                    >
                      {axis.label}
                    </text>
                  </g>
                );
              })}

              {activeProfiles.map((prof, idx) => {
                const color = seriesColors[idx % seriesColors.length];
                const pts = computeRadarPolygonPoints(prof.scores, CX, CY, RADIUS);
                return (
                  <g key={prof.id}>
                    <polygon
                      points={pts}
                      fill={color}
                      fillOpacity={0.14}
                      stroke={color}
                      strokeWidth={2.5}
                    />
                    {TRADEOFF_AXES.map((axis, axIdx) => {
                      const dot = computeAxisTip(axIdx, CX, CY, (prof.scores[axis.key] / 5) * RADIUS);
                      return <circle key={axis.key} cx={dot.x} cy={dot.y} r={4.5} fill={color} />;
                    })}
                  </g>
                );
              })}
            </svg>

            <div className="nm-pg__checks" style={{ justifyContent: 'center' }}>
              {activeProfiles.map((prof, idx) => (
                <span
                  key={prof.id}
                  className="nm-pg__badge"
                  style={{ borderColor: seriesColors[idx % seriesColors.length], color: seriesColors[idx % seriesColors.length] }}
                >
                  {prof.name} ({prof.year})
                </span>
              ))}
            </div>
          </div>

          <div className="nm-pg__panel">
            <h3 className="nm-pg__panel-title">Side-by-side mechanism & limits</h3>
            <div className="nm-pg__table-wrap">
              <table className="nm-pg__table">
                <thead>
                  <tr>
                    <th>Technique</th>
                    <th>Scores (T / M / S / F / R)</th>
                    <th>Watch out / avoid when</th>
                    <th>Learn chapter</th>
                  </tr>
                </thead>
                <tbody>
                  {activeProfiles.map((prof) => {
                    const s = prof.scores;
                    return (
                      <tr key={prof.id}>
                        <td>
                          <strong style={{ color: t.textPrimary }}>{prof.name}</strong>
                          <div style={{ fontSize: 13 }}>{prof.summary}</div>
                        </td>
                        <td style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                          {s.throughput} / {s.memory} / {s.simplicity} / {s.fidelity} / {s.robustness}
                        </td>
                        <td>{prof.avoid}</td>
                        <td>
                          <a className="nm-pg__link" href={prof.learnPath}>
                            Read lesson →
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </VisualizationContainer>
  );
}
