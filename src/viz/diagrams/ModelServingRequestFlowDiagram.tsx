import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const STAGES = [
  { key: 'auth', label: 'Auth', desc: 'API key/JWT checked before anything else -- an unauthenticated request never reaches the model.' },
  { key: 'validate', label: 'Validate', desc: 'Pydantic checks the request body against the expected schema -- malformed input fails fast with a clear 422, not a crash inside the model.' },
  { key: 'deserialize', label: 'Deserialize', desc: 'JSON (or Protobuf, on performance-sensitive paths) converted into whatever tensor/array shape the model actually expects.' },
  { key: 'model', label: 'Model inference', desc: 'The actual forward pass -- everything before this exists to get a clean, valid input here.' },
  { key: 'serialize', label: 'Serialize response', desc: 'Model output converted back to JSON for the client.' },
];

/** The path a request actually takes before it reaches "call
 * model.predict()" -- click a stage to see what it guards against. */
export default function ModelServingRequestFlowDiagram() {
  const t = useVizTokens();
  const [active, setActive] = useState('validate');
  const color = getConceptColor(t, 'attention');
  const info = STAGES.find((s) => s.key === active)!;
  const width = 600;
  const y = 40;

  return (
    <VisualizationContainer footer={info.desc}>
      <svg width="100%" viewBox={`0 0 ${width} 70`} style={{ display: 'block' }}>
        <defs>
          <marker id="msrf-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.textMuted} />
          </marker>
        </defs>
        {STAGES.map((s, i) => {
          const stepDelta = (width - 100) / (STAGES.length - 1);
          const x = 55 + i * stepDelta;
          const isActive = active === s.key;
          return (
            <g key={s.key}>
              {i > 0 && <line x1={55 + (i - 1) * stepDelta + 47} y1={y} x2={x - 53} y2={y} stroke={t.textMuted} strokeWidth={1.5} markerEnd="url(#msrf-arrow)" />}
              <g onClick={() => setActive(s.key)} onMouseEnter={() => setActive(s.key)} style={{ cursor: 'pointer' }}>
                <rect x={x - 47} y={y - 18} width={94} height={36} rx={7} fill={isActive ? `${color}30` : t.surfaceAlt} stroke={color} strokeWidth={isActive ? 2.5 : 1.5} />
                <text x={x} y={y + 4} textAnchor="middle" fontSize={9.5} fontWeight={isActive ? 700 : 500} fill={color}>{s.label}</text>
              </g>
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        Every stage before "model inference" exists to make sure a bad request never reaches the GPU.
      </div>
    </VisualizationContainer>
  );
}
