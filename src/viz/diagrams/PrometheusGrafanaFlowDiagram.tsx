import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';

const STAGES = [
  { key: 'expose', label: 'Service exposes /metrics', desc: 'Your service exposes a plain-text /metrics endpoint -- counters, gauges, histograms.' },
  { key: 'scrape', label: 'Prometheus scrapes it', desc: 'On a fixed interval, Prometheus pulls that endpoint and stores the values as a time series.' },
  { key: 'query', label: 'PromQL queries the series', desc: 'Most alerting rules and dashboards are built directly on PromQL queries over that stored time series.' },
  { key: 'grafana', label: 'Grafana visualizes', desc: 'Decoupled from the backend -- the same Grafana dashboards can pull from Prometheus, Loki, or other data sources.' },
];

/** The actual pull-based pipeline -- click a stage for what happens
 * there. */
export default function PrometheusGrafanaFlowDiagram() {
  const t = useVizTokens();
  const [active, setActive] = useState('scrape');
  const color = getConceptColor(t, 'attention');
  const info = STAGES.find((s) => s.key === active)!;
  const width = 560;
  const y = 40;

  return (
    <VisualizationContainer footer={info.desc}>
      <svg width="100%" viewBox={`0 0 ${width} 70`} style={{ display: 'block' }}>
        <defs>
          <marker id="pg-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.textMuted} />
          </marker>
        </defs>
        {STAGES.map((s, i) => {
          const x = 65 + i * 145;
          const isActive = active === s.key;
          return (
            <g key={s.key}>
              {i > 0 && <line x1={65 + (i - 1) * 145 + 60} y1={y} x2={x - 66} y2={y} stroke={t.textMuted} strokeWidth={1.5} markerEnd="url(#pg-arrow)" />}
              <g onClick={() => setActive(s.key)} onMouseEnter={() => setActive(s.key)} style={{ cursor: 'pointer' }}>
                <rect x={x - 60} y={y - 18} width={120} height={36} rx={7} fill={isActive ? `${color}30` : t.surfaceAlt} stroke={color} strokeWidth={isActive ? 2.5 : 1.5} />
                <text x={x} y={y + 4} textAnchor="middle" fontSize={8} fontWeight={isActive ? 700 : 500} fill={color}>{s.label}</text>
              </g>
            </g>
          );
        })}
      </svg>
    </VisualizationContainer>
  );
}
