import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { PillSelect, Slider, VisualizationContainer, VisualizationHeader, usePrefersReducedMotion } from '../primitives';
import { computeProjectMonthlyCost, PROJECT_PRESETS } from './projectCostMath';
import './playgroundTools.css';

export default function ProjectCostEstimator() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();

  const [presetId, setPresetId] = useState(PROJECT_PRESETS[2].id);
  const [dau, setDau] = useState(PROJECT_PRESETS[2].dau);
  const [reqPerUser, setReqPerUser] = useState(PROJECT_PRESETS[2].requestsPerUserPerDay);
  const [turnsPerRequest, setTurnsPerRequest] = useState(PROJECT_PRESETS[2].turnsPerRequest);
  const [staticPrefixTokens, setStaticPrefixTokens] = useState(PROJECT_PRESETS[2].staticPrefixTokens);
  const [freshInputTokens, setFreshInputTokens] = useState(PROJECT_PRESETS[2].freshInputTokens);
  const [historyGrowthPerTurn, setHistoryGrowthPerTurn] = useState(PROJECT_PRESETS[2].historyGrowthPerTurn);
  const [outputTokensPerTurn, setOutputTokensPerTurn] = useState(PROJECT_PRESETS[2].outputTokensPerTurn);
  const [cacheHitRate, setCacheHitRate] = useState(PROJECT_PRESETS[2].cacheHitRate);
  const [inputPricePer1M, setInputPricePer1M] = useState(PROJECT_PRESETS[2].inputPricePer1M);
  const [outputPricePer1M, setOutputPricePer1M] = useState(PROJECT_PRESETS[2].outputPricePer1M);

  const applyPreset = (id: string) => {
    const p = PROJECT_PRESETS.find((item) => item.id === id);
    if (!p) return;
    setPresetId(id);
    setDau(p.dau);
    setReqPerUser(p.requestsPerUserPerDay);
    setTurnsPerRequest(p.turnsPerRequest);
    setStaticPrefixTokens(p.staticPrefixTokens);
    setFreshInputTokens(p.freshInputTokens);
    setHistoryGrowthPerTurn(p.historyGrowthPerTurn);
    setOutputTokensPerTurn(p.outputTokensPerTurn);
    setCacheHitRate(p.cacheHitRate);
    setInputPricePer1M(p.inputPricePer1M);
    setOutputPricePer1M(p.outputPricePer1M);
  };

  const monthlyRequests = dau * reqPerUser * 30;
  const result = useMemo(
    () =>
      computeProjectMonthlyCost({
        monthlyRequests,
        turnsPerRequest,
        staticPrefixTokens,
        freshInputTokens,
        historyGrowthPerTurn,
        outputTokensPerTurn,
        cacheHitRate,
        cacheReadMultiplier: 0.1,
        inputPricePer1M,
        outputPricePer1M,
      }),
    [
      monthlyRequests,
      turnsPerRequest,
      staticPrefixTokens,
      freshInputTokens,
      historyGrowthPerTurn,
      outputTokensPerTurn,
      cacheHitRate,
      inputPricePer1M,
      outputPricePer1M,
    ],
  );

  const scopeAdvice =
    result.monthlyCostTotal < 50
      ? 'Fits a solo weekend or afternoon budget without dedicated infra.'
      : result.monthlyCostTotal < 2000
        ? 'Manageable for early beta traffic; enforce per-task step caps and prefix caching.'
        : 'High production spend — add model routing, retrieval pruning, and burn-velocity alarms.';

  const totalCostBar = Math.max(result.totalCostPerReq, 1e-9);
  const uncachedBarW = (result.uncachedInputCostPerReq / totalCostBar) * 600;
  const cachedBarW = (result.cachedReadCostPerReq / totalCostBar) * 600;
  const outputBarW = (result.outputCostPerReq / totalCostBar) * 600;

  return (
    <VisualizationContainer
      title="Project Scope & Monthly Cost Estimator"
      footer={`Illustrative provider pricing ($${inputPricePer1M}/1M in, $${outputPricePer1M}/1M out, 10% cached read rate): ${monthlyRequests.toLocaleString()} monthly requests cost $${result.totalCostPerReq.toFixed(4)}/req or $${result.monthlyCostTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}/month.`}
    >
      <div className={`nm-pg${reducedMotion ? ' nm-pg--reduced-motion' : ''}`}>
        <VisualizationHeader
          eyebrow="Project unit economics"
          title="Estimate monthly LLM API bills before building"
          description="Multi-turn agents resend growing history on every step. Adjust daily users, turns, prefix caching, and pricing tiers to inspect how costs compound."
        />

        <div className="nm-pg__controls" style={{ marginBottom: '1rem' }}>
          <PillSelect<string>
            label="Project ladder preset"
            value={presetId}
            onChange={applyPreset}
            options={PROJECT_PRESETS.map((p) => ({ value: p.id, label: p.label }))}
          />
        </div>

        <div className="nm-pg__grid-2" style={{ marginBottom: '1rem' }}>
          <div className="nm-pg__panel">
            <h3 className="nm-pg__panel-title">Traffic & agent loop shape</h3>
            <Slider label="Daily active users (DAU)" value={dau} onChange={setDau} min={50} max={20000} step={50} format={(v) => v.toLocaleString()} />
            <Slider label="Requests per user / day" value={reqPerUser} onChange={setReqPerUser} min={1} max={30} step={1} format={(v) => `${v}/day`} />
            <Slider label="Turns / agent steps per request (T)" value={turnsPerRequest} onChange={setTurnsPerRequest} min={1} max={12} step={1} format={(v) => `${v} turn${v > 1 ? 's' : ''}`} />
            <Slider label="History growth per turn (G tokens)" value={historyGrowthPerTurn} onChange={setHistoryGrowthPerTurn} min={0} max={2500} step={100} format={(v) => `${v.toLocaleString()} tok`} />
          </div>

          <div className="nm-pg__panel">
            <h3 className="nm-pg__panel-title">Context tokens, cache & pricing</h3>
            <Slider label="Static prefix tokens (S)" value={staticPrefixTokens} onChange={setStaticPrefixTokens} min={0} max={8000} step={200} format={(v) => v.toLocaleString()} />
            <Slider label="Fresh input per turn (F)" value={freshInputTokens} onChange={setFreshInputTokens} min={100} max={8000} step={100} format={(v) => v.toLocaleString()} />
            <Slider label="Output tokens per turn (O)" value={outputTokensPerTurn} onChange={setOutputTokensPerTurn} min={50} max={1500} step={50} format={(v) => v.toLocaleString()} />
            <Slider label="Prefix cache hit rate (h)" value={cacheHitRate} onChange={setCacheHitRate} min={0} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} />

            <PillSelect<string>
              label="Illustrative model pricing tier (input / output per 1M tokens)"
              value={`${inputPricePer1M}/${outputPricePer1M}`}
              onChange={(val) => {
                const str = typeof val === 'function' ? val(`${inputPricePer1M}/${outputPricePer1M}`) : val;
                const [inp, outp] = str.split('/').map(Number);
                setInputPricePer1M(inp);
                setOutputPricePer1M(outp);
              }}
              options={[
                { value: '0.25/1', label: 'Small ($0.25 / $1.00)' },
                { value: '3/15', label: 'Mid ($3.00 / $15.00)' },
                { value: '15/75', label: 'Frontier ($15.00 / $75.00)' },
              ]}
            />
          </div>
        </div>

        <div className="nm-pg__kpis" aria-label="Monthly bill summary">
          <div className="nm-pg__kpi">
            Monthly requests (30d)
            <strong>{monthlyRequests.toLocaleString()}</strong>
          </div>
          <div className="nm-pg__kpi">
            Cost per request
            <strong>${result.totalCostPerReq.toFixed(4)}</strong>
          </div>
          <div className={`nm-pg__kpi ${result.monthlyCostTotal > 2000 ? 'nm-pg__kpi--warn' : 'nm-pg__kpi--good'}`}>
            Monthly API bill
            <strong>${result.monthlyCostTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
          </div>
          <div className="nm-pg__kpi nm-pg__kpi--good">
            Saved by prefix cache
            <strong>${result.monthlyCacheSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo</strong>
          </div>
        </div>

        <div className="nm-pg__formula">
          Input/req = T·(S + F) + G·T·(T - 1)/2 = <strong>{result.totalInputTokensPerReq.toLocaleString()} tokens</strong> · Output/req = T·O = <strong>{result.outputTokensPerReq.toLocaleString()} tokens</strong>
          <br />
          Cost/req = ({result.uncachedInputTokensPerReq.toLocaleString()}·${inputPricePer1M} + {result.cachedReadTokensPerReq.toLocaleString()}·${(inputPricePer1M * 0.1).toFixed(3)} + {result.outputTokensPerReq.toLocaleString()}·${outputPricePer1M}) / 10⁶ = <strong>${result.totalCostPerReq.toFixed(4)}</strong>
        </div>

        <div className="nm-pg__panel">
          <h3 className="nm-pg__panel-title">Per-request cost split & multi-turn growth</h3>
          <svg
            viewBox="0 0 680 110"
            width="100%"
            role="img"
            aria-label={`Cost split bar: uncached input $${result.uncachedInputCostPerReq.toFixed(4)}, cached reads $${result.cachedReadCostPerReq.toFixed(4)}, output $${result.outputCostPerReq.toFixed(4)}`}
          >
            <rect x={40} y={20} width={Math.max(1, uncachedBarW)} height={28} fill={t.accentWarn} />
            <rect x={40 + uncachedBarW} y={20} width={Math.max(0, cachedBarW)} height={28} fill={t.accentPrimary} />
            <rect x={40 + uncachedBarW + cachedBarW} y={20} width={Math.max(1, outputBarW)} height={28} fill={t.accentSecondary} />

            <rect x={40} y={70} width={14} height={14} rx={3} fill={t.accentWarn} />
            <text x={60} y={82} fontSize={14} fill={t.textPrimary}>
              Uncached input (${result.uncachedInputCostPerReq.toFixed(4)})
            </text>
            <rect x={265} y={70} width={14} height={14} rx={3} fill={t.accentPrimary} />
            <text x={285} y={82} fontSize={14} fill={t.textPrimary}>
              Cached reads (${result.cachedReadCostPerReq.toFixed(4)})
            </text>
            <rect x={475} y={70} width={14} height={14} rx={3} fill={t.accentSecondary} />
            <text x={495} y={82} fontSize={14} fill={t.textPrimary}>
              Output (${result.outputCostPerReq.toFixed(4)})
            </text>
          </svg>
          <p className="nm-pg__sub" style={{ margin: '0.35rem 0 0' }}>
            <strong>Scope note:</strong> {scopeAdvice}
          </p>
        </div>
      </div>
    </VisualizationContainer>
  );
}
