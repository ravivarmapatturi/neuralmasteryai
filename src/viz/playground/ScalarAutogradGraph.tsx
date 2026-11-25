import { useMemo, useState } from 'react';
import { SketchArrow, SketchRect } from '../../components/notebook/RoughShape';
import { useVizTokens } from '../../theme/vizTokens';
import { PillSelect, VisualizationContainer, VisualizationHeader, usePrefersReducedMotion } from '../primitives';
import {
  evaluateAutogradExpression,
  extractExpressionVariables,
} from './scalarAutograd';
import './playgroundTools.css';

interface ExprPreset {
  id: string;
  label: string;
  expr: string;
  env: Record<string, number>;
}

const PRESETS: ExprPreset[] = [
  { id: 'neuron', label: 'tanh(w * x + b)', expr: 'tanh(w * x + b)', env: { w: -3.0, x: 2.0, b: 6.88 } },
  { id: 'mse', label: '(w * x + b - y) ** 2', expr: '(w * x + b - y) ** 2', env: { w: 1.5, x: 2.0, b: -0.5, y: 1.0 } },
  { id: 'fanout', label: 'x * x + tanh(x * w)', expr: 'x * x + tanh(x * w)', env: { x: 1.5, w: 0.8 } },
  { id: 'sigdiv', label: 'sigmoid(w * x) / (1 + b ** 2)', expr: 'sigmoid(w * x) / (1 + b ** 2)', env: { w: 1.2, x: 0.9, b: 0.5 } },
];

export default function ScalarAutogradGraph() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();

  const [expr, setExpr] = useState(PRESETS[0].expr);
  const [env, setEnv] = useState<Record<string, number>>(PRESETS[0].env);
  const [stepLimit, setStepLimit] = useState<number>(999);

  const parsedVars = useMemo(() => {
    try {
      return extractExpressionVariables(expr);
    } catch {
      return Object.keys(env);
    }
  }, [expr, env]);

  const evalResult = useMemo(() => {
    try {
      return { ok: true as const, graph: evaluateAutogradExpression(expr, env, stepLimit) };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
    }
  }, [expr, env, stepLimit]);

  // Numerical central finite difference verification for each leaf variable
  const finiteDiffs = useMemo(() => {
    if (!evalResult.ok) return {};
    const h = 1e-5;
    const out: Record<string, number> = {};
    for (const v of evalResult.graph.variables) {
      const base = env[v] ?? 1.0;
      try {
        const plus = evaluateAutogradExpression(expr, { ...env, [v]: base + h }).outputValue;
        const minus = evaluateAutogradExpression(expr, { ...env, [v]: base - h }).outputValue;
        out[v] = (plus - minus) / (2 * h);
      } catch {
        out[v] = Number.NaN;
      }
    }
    return out;
  }, [evalResult, env, expr]);

  const graph = evalResult.ok ? evalResult.graph : null;
  const totalSteps = graph ? graph.backwardOrder.length : 0;
  const activeStep = graph ? Math.min(stepLimit, totalSteps) : 0;
  const currentBackwardNodeId =
    graph && activeStep > 0 ? graph.backwardOrder[activeStep - 1] : null;

  // Deterministic depth-column DAG coordinates
  const layout = useMemo(() => {
    if (!graph) return { coords: {} as Record<number, { x: number; y: number }>, width: 680, height: 260 };
    const maxDepth = Math.max(0, ...graph.nodes.map((n) => n.depth));
    const colBuckets = new Map<number, number[]>();
    for (const n of graph.nodes) {
      const list = colBuckets.get(n.depth) ?? [];
      list.push(n.id);
      colBuckets.set(n.depth, list);
    }
    const maxRows = Math.max(1, ...[...colBuckets.values()].map((b) => b.length));
    const colGap = 155;
    const rowGap = 78;
    const width = Math.max(620, (maxDepth + 1) * colGap + 40);
    const height = Math.max(220, maxRows * rowGap + 40);
    const coords: Record<number, { x: number; y: number }> = {};

    for (const [depth, ids] of colBuckets.entries()) {
      const totalH = (ids.length - 1) * rowGap;
      const startY = height / 2 - totalH / 2 - 26;
      ids.forEach((id, idx) => {
        coords[id] = { x: 24 + depth * colGap, y: startY + idx * rowGap };
      });
    }
    return { coords, width, height };
  }, [graph]);

  return (
    <VisualizationContainer
      title="Scalar Autograd Expression Graph"
      footer={
        graph
          ? `Forward output = ${graph.outputValue.toFixed(4)}. Reverse-mode backward step ${activeStep}/${totalSteps}. Supported ops: +, -, *, /, **, tanh, sigmoid, relu, exp.`
          : 'Fix expression syntax above to compute forward values and reverse-mode gradients.'
      }
    >
      <div className={`nm-pg${reducedMotion ? ' nm-pg--reduced-motion' : ''}`}>
        <VisualizationHeader
          eyebrow="Micrograd reverse-mode autodiff"
          title="Type any scalar expression and trace gradients backward"
          description="Forward values flow left to right; calling backward() walks reverse topological order from output grad = 1.0000 back to each variable."
        />

        <div className="nm-pg__controls" style={{ marginBottom: '1rem' }}>
          <PillSelect<string>
            label="Expression preset"
            value={PRESETS.find((p) => p.expr === expr)?.id ?? 'custom'}
            onChange={(id) => {
              const found = PRESETS.find((p) => p.id === id);
              if (!found) return;
              setExpr(found.expr);
              setEnv(found.env);
              setStepLimit(999);
            }}
            options={PRESETS.map((p) => ({ value: p.id, label: p.label }))}
          />

          <label className="nm-pg__field">
            <span>Scalar expression (variables become live inputs below)</span>
            <input
              type="text"
              value={expr}
              onChange={(e) => {
                setExpr(e.target.value);
                setStepLimit(999);
              }}
            />
          </label>

          {parsedVars.length > 0 && (
            <div className="nm-pg__kpis" aria-label="Leaf variable values">
              {parsedVars.map((v) => (
                <label key={v} className="nm-pg__field">
                  <span>{v}</span>
                  <input
                    type="number"
                    step={0.1}
                    value={env[v] ?? 1.0}
                    onChange={(e) => setEnv((prev) => ({ ...prev, [v]: Number(e.target.value) }))}
                  />
                </label>
              ))}
            </div>
          )}

          {graph && (
            <div className="nm-pg__checks" role="group" aria-label="Reverse-mode backward stepper">
              <button
                type="button"
                className="nm-pg__chip-btn"
                onClick={() => setStepLimit(0)}
              >
                Reset gradients (forward only)
              </button>
              <button
                type="button"
                className="nm-pg__chip-btn"
                disabled={activeStep >= totalSteps}
                onClick={() => setStepLimit((s) => Math.min(totalSteps, (s >= totalSteps ? 0 : s) + 1))}
              >
                Step backward ({activeStep}/{totalSteps})
              </button>
              <button
                type="button"
                className="nm-pg__chip-btn nm-pg__chip-btn--primary"
                onClick={() => setStepLimit(totalSteps)}
              >
                Run full backward()
              </button>
            </div>
          )}
        </div>

        {!evalResult.ok && (
          <p className="nm-pg__sub" style={{ color: t.accentDanger, fontWeight: 700 }} role="alert">
            {evalResult.error}
          </p>
        )}

        {graph && (
          <>
            <div className="nm-pg__panel" style={{ marginBottom: '1rem' }}>
              <h3 className="nm-pg__panel-title">Computation DAG (forward data & reverse grad)</h3>
              <svg
                viewBox={`0 0 ${layout.width} ${layout.height}`}
                width="100%"
                role="img"
                aria-label={`Scalar autograd DAG for ${expr} evaluating to ${graph.outputValue.toFixed(4)}`}
              >
                {graph.nodes.map((node) =>
                  node.parents.map((pId) => {
                    const from = layout.coords[pId];
                    const to = layout.coords[node.id];
                    if (!from || !to) return null;
                    const isHot = currentBackwardNodeId === node.id;
                    return (
                      <SketchArrow
                        key={`${pId}->${node.id}`}
                        points={[
                          [from.x + 118, from.y + 26],
                          [to.x - 4, to.y + 26],
                        ]}
                        color={isHot ? t.accentWarn : t.textMuted}
                        strokeWidth={isHot ? 2.4 : 1.4}
                        id={`ag-edge-${pId}-${node.id}`}
                      />
                    );
                  }),
                )}

                {graph.nodes.map((node) => {
                  const pos = layout.coords[node.id];
                  if (!pos) return null;
                  const isCurrent = currentBackwardNodeId === node.id;
                  const isOutput = node.id === graph.outputId;
                  const stroke = isCurrent
                    ? t.accentWarn
                    : isOutput
                      ? t.accentPrimary
                      : node.op === 'var'
                        ? t.accentSecondary
                        : t.border;
                  return (
                    <g key={node.id}>
                      <rect
                        x={pos.x}
                        y={pos.y}
                        width={118}
                        height={52}
                        rx={7}
                        fill={isCurrent || isOutput ? t.surfaceAlt : t.background}
                      />
                      <SketchRect
                        x={pos.x}
                        y={pos.y}
                        width={118}
                        height={52}
                        color={stroke}
                        strokeWidth={isCurrent || isOutput ? 2.4 : 1.4}
                        id={`ag-node-${node.id}`}
                      />
                      <text x={pos.x + 10} y={pos.y + 18} fontSize={13} fontWeight={700} fill={t.textPrimary}>
                        {node.label} = {node.data.toFixed(3)}
                      </text>
                      <text x={pos.x + 10} y={pos.y + 39} fontSize={13} fontWeight={600} fill={node.grad !== 0 ? t.accentPrimary : t.textMuted}>
                        grad {node.grad.toFixed(4)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="nm-pg__panel">
              <h3 className="nm-pg__panel-title">Leaf gradients vs. central finite-difference check</h3>
              <div className="nm-pg__table-wrap">
                <table className="nm-pg__table">
                  <thead>
                    <tr>
                      <th>Variable</th>
                      <th>Value</th>
                      <th>Autograd ∂out/∂var</th>
                      <th>Finite diff (h = 1e-5)</th>
                      <th>Abs error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {graph.variables.map((v) => {
                      const ag = graph.gradients[v] ?? 0;
                      const fd = finiteDiffs[v] ?? Number.NaN;
                      const err = Number.isFinite(fd) ? Math.abs(ag - fd) : Number.NaN;
                      return (
                        <tr key={v}>
                          <td><strong>{v}</strong></td>
                          <td>{(env[v] ?? 1.0).toFixed(3)}</td>
                          <td style={{ color: t.accentPrimary, fontWeight: 700 }}>{ag.toFixed(6)}</td>
                          <td>{Number.isFinite(fd) ? fd.toFixed(6) : '—'}</td>
                          <td>{activeStep === totalSteps && Number.isFinite(err) ? err.toExponential(2) : 'Step to leaf'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </VisualizationContainer>
  );
}
