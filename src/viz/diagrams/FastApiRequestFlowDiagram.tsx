import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const STAGES = [
  { key: 'route', label: 'Route match', code: '@app.post("/v1/generate")', desc: 'FastAPI matches the incoming method + path to this path operation.' },
  { key: 'validate', label: 'Request validation', code: 'async def generate(req: GenerateRequest):', desc: 'The JSON body is parsed and validated against the Pydantic model. A mismatch returns 422 automatically -- your function body never even runs.' },
  { key: 'handler', label: 'Your function runs', code: '    result = await model.run(req.prompt)', desc: '`async def` lets FastAPI handle many concurrent in-flight requests on one process without blocking -- the right default when most of the time is spent waiting on a model call.' },
  { key: 'response', label: 'Response validation', code: '    return GenerateResponse(text=result)', desc: 'The return value is validated against the declared response model -- what you send back is guaranteed to match what you documented.' },
  { key: 'docs', label: 'OpenAPI docs', code: '# auto-generated at /docs', desc: 'FastAPI generates interactive API documentation directly from your type hints and Pydantic models -- no separate spec to keep in sync.' },
];

/** A request's actual path through a FastAPI endpoint, stage by stage --
 * click one for what happens there. */
export default function FastApiRequestFlowDiagram() {
  const t = useVizTokens();
  const { value: activeIdx, pick: setActiveIdx, stop } = useAutoCycle(STAGES.length, 3000, 1);
  const color = getConceptColor(t, 'attention');
  const info = STAGES[activeIdx];
  const active = info.key;

  return (
    <VisualizationContainer footer={info.desc}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {STAGES.map((s, i) => {
          const isActive = active === s.key;
          return (
            <div key={s.key}>
              <div
                onClick={() => { stop(); setActiveIdx(i); }}
                onMouseEnter={() => { stop(); setActiveIdx(i); }}
                style={{ cursor: 'pointer', padding: '0.5rem 0.7rem', borderRadius: 7, background: isActive ? `${color}18` : t.surfaceAlt, border: `1.5px solid ${isActive ? color : t.border}` }}
              >
                <div style={{ fontSize: 11.5, fontWeight: isActive ? 700 : 500, color: isActive ? color : t.textPrimary, marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 10.5, color: t.textMuted }}>{s.code}</div>
              </div>
              {i < STAGES.length - 1 && (
                <svg width="100%" height="14" viewBox="0 0 20 14" style={{ display: 'block' }}>
                  <line x1={10} y1={0} x2={10} y2={10} stroke={t.textMuted} strokeWidth={1.5} />
                  <path d="M 5,8 L 10,14 L 15,8 Z" fill={t.textMuted} />
                </svg>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        Click a stage -- Pydantic models validate both directions, so the endpoint's actual behavior can't drift from its declared types.
      </div>
    </VisualizationContainer>
  );
}
