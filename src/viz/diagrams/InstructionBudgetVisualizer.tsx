import { useMemo, useState } from 'react';
import { FONT_FAMILY, RADIUS, useVizTokens } from '../../theme/vizTokens';
import {
  PillSelect,
  StickyNote,
  StickyRow,
  VisualizationContainer,
  VisualizationHeader,
  VizButton,
} from '../primitives';
import {
  buildInstructionBudgetTrace,
  calculateInstructionBudget,
  type InstructionBudgetConfig,
  type InstructionStrategy,
} from '../lib/instructionBudget';
import { usePlaygroundPlayback } from './usePlaygroundPlayback';

const STRATEGY_NAME: Record<InstructionStrategy, string> = {
  inline: 'Full files (copy every source token)',
  map: 'Repository map (signatures and paths)',
};

const FORMULA: Record<InstructionStrategy, string> = {
  inline: String.raw`C_{\text{files}}=I+V+Nf`,
  map: String.raw`C_{\text{map}}=I+V+Nm`,
};

function NumberInput({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void }) {
  const t = useVizTokens();
  return (
    <label style={{ display: 'block', minWidth: 130, fontSize: 15 }}>
      <span style={{ display: 'block', marginBottom: 3, fontWeight: 700 }}>{label}</span>
      <input aria-label={label} type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Math.max(min, Math.min(max, Math.round(Number(event.target.value) || min))))} style={{ width: '100%', boxSizing: 'border-box', minHeight: 34, padding: '4px 7px', border: `1.5px solid ${t.border}`, borderRadius: RADIUS.sm, background: t.background, color: t.textPrimary, font: 'inherit', fontVariantNumeric: 'tabular-nums' }} />
    </label>
  );
}

function InstructionBudgetPlayground({ compact }: { compact: boolean }) {
  const t = useVizTokens();
  const [config, setConfig] = useState<InstructionBudgetConfig>({
    strategy: 'map',
    fileCount: 60,
    tokensPerFile: 1_800,
    mapTokensPerFile: 45,
    instructionTokens: 3_500,
    verificationTokens: 2_000,
    contextWindow: 32_000,
  });
  const [prediction, setPrediction] = useState<'fits' | 'overflows'>('fits');
  const [predictionResult, setPredictionResult] = useState<boolean | null>(null);
  const trace = useMemo(() => buildInstructionBudgetTrace(config, 7), [config]);
  const playback = usePlaygroundPlayback(trace.length, 1100);
  const current = trace[playback.step] ?? trace[0];
  const currentByStrategy = useMemo(() => ({
    inline: calculateInstructionBudget({ ...config, strategy: 'inline', fileCount: current.loadedFiles }),
    map: calculateInstructionBudget({ ...config, strategy: 'map', fileCount: current.loadedFiles }),
  }), [config, current.loadedFiles]);
  const final = useMemo(() => calculateInstructionBudget(config), [config]);
  const active = currentByStrategy[config.strategy];

  const allocationColors = {
    instructions: t.accentPurple,
    repository: t.accentSecondary,
    verification: t.accentWarn,
    remaining: t.accentPrimary,
  } as const;

  const update = <K extends keyof InstructionBudgetConfig>(key: K, value: InstructionBudgetConfig[K]) => {
    setConfig((state) => ({ ...state, [key]: value }));
    setPredictionResult(null);
    playback.reset();
  };

  const runPrediction = () => {
    setPredictionResult(prediction === (final.fits ? 'fits' : 'overflows'));
    playback.setStep(trace.length - 1);
  };

  const bar = (strategy: InstructionStrategy, y: number) => {
    const result = currentByStrategy[strategy];
    const activeStrategy = strategy === config.strategy;
    let cursor = 126;
    return (
      <g key={strategy}>
        <text x={116} y={y + 23} textAnchor="end" fontSize={15} fontWeight={activeStrategy ? 700 : 400} fill={activeStrategy ? t.textPrimary : t.textSecondary}>{strategy === 'inline' ? 'Full files' : 'Repository map'}</text>
        <rect x={126} y={y} width={594} height={34} rx={6} fill={t.surfaceAlt} stroke={activeStrategy ? t.accentPrimary : t.border} strokeWidth={activeStrategy ? 2.5 : 1.2} />
        <g clipPath={`url(#instruction-bar-${strategy})`}>
          {result.allocations.map((allocation) => {
            const width = (allocation.tokens / config.contextWindow) * 594;
            const x = cursor;
            cursor += width;
            return <rect key={allocation.id} x={x} y={y + 2} width={Math.max(0, width)} height={30} fill={allocationColors[allocation.id]} fillOpacity={0.8} />;
          })}
        </g>
        {result.overflowTokens > 0 && <path d={`M720 ${y - 3} l10 20 l-10 20`} fill="none" stroke={t.accentDanger} strokeWidth={3} />}
        <text x={126} y={y + 54} fontSize={14} fill={result.fits ? t.textSecondary : t.accentDanger}>{result.totalTokens.toLocaleString()} tokens · {result.fits ? `${result.remainingTokens.toLocaleString()} left` : `${result.overflowTokens.toLocaleString()} over the window`}</text>
      </g>
    );
  };

  const happened = `${current.loadedFiles} of ${config.fileCount} files are represented. ${STRATEGY_NAME[config.strategy]} now uses ${active.totalTokens.toLocaleString()} of ${config.contextWindow.toLocaleString()} tokens.`;

  return (
    <>
      {!compact && (
        <>
          <VisualizationHeader
            eyebrow="Live playground"
            title="A context window is a fixed budget, so repository detail competes with instructions"
            description="This solves a packing problem: keep the rules and verification notes visible while giving an agent enough code structure to find the files it actually needs."
          />
          <PillSelect<InstructionStrategy>
            label="Repository context (what the prompt carries)"
            value={config.strategy}
            onChange={(next) => update('strategy', typeof next === 'function' ? next(config.strategy) : next)}
            options={[
              { value: 'inline', label: 'Copy full files' },
              { value: 'map', label: 'Use a repository map' },
            ]}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, alignItems: 'end', marginBottom: 8 }}>
            <NumberInput label="Files represented (N)" value={config.fileCount} min={1} max={500} step={5} onChange={(value) => update('fileCount', value)} />
            <NumberInput label="Tokens / full file (f)" value={config.tokensPerFile} min={50} max={10_000} step={50} onChange={(value) => update('tokensPerFile', value)} />
            <NumberInput label="Map tokens / file (m)" value={config.mapTokensPerFile} min={5} max={500} step={5} onChange={(value) => update('mapTokensPerFile', value)} />
            <NumberInput label="Instruction tokens (I)" value={config.instructionTokens} min={0} max={30_000} step={100} onChange={(value) => update('instructionTokens', value)} />
            <NumberInput label="Verification tokens (V)" value={config.verificationTokens} min={0} max={20_000} step={100} onChange={(value) => update('verificationTokens', value)} />
            <NumberInput label="Context window" value={config.contextWindow} min={1_000} max={200_000} step={1_000} onChange={(value) => update('contextWindow', value)} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 7, fontSize: 15 }}>
            <VizButton onClick={playback.toggle}>{playback.playing ? 'Pause' : 'Play'}</VizButton>
            <VizButton variant="secondary" onClick={playback.next}>Step →</VizButton>
            <VizButton variant="secondary" onClick={playback.reset}>Reset</VizButton>
            <span aria-live="polite">Loaded <strong>{current.loadedFiles}</strong> of {config.fileCount} files · <strong style={{ color: active.fits ? t.accentPrimary : t.accentDanger }}>{(active.utilization * 100).toFixed(1)}%</strong> of the context window</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 18px', marginBottom: 4, fontSize: 15 }} aria-label="Context allocation colours">
            <span><span style={{ display: 'inline-block', width: 18, height: 8, marginRight: 6, background: allocationColors.instructions }} />Instructions</span>
            <span><span style={{ display: 'inline-block', width: 18, height: 8, marginRight: 6, background: allocationColors.repository }} />Repository context</span>
            <span><span style={{ display: 'inline-block', width: 18, height: 8, marginRight: 6, background: allocationColors.verification }} />Verification notes</span>
            <span><span style={{ display: 'inline-block', width: 18, height: 8, marginRight: 6, background: allocationColors.remaining }} />Room left</span>
          </div>
        </>
      )}

      <svg width="100%" viewBox="0 0 760 260" role="img" aria-label={`${current.loadedFiles} files use ${active.totalTokens} tokens under ${STRATEGY_NAME[config.strategy]}`} style={{ display: 'block', fontFamily: FONT_FAMILY }}>
        <defs>
          <clipPath id="instruction-bar-inline"><rect x={126} y={50} width={594} height={34} rx={6} /></clipPath>
          <clipPath id="instruction-bar-map"><rect x={126} y={142} width={594} height={34} rx={6} /></clipPath>
        </defs>
        <text x={20} y={22} fontSize={16} fontWeight={700} fill={t.textPrimary}>What fills the {config.contextWindow.toLocaleString()}-token window?</text>
        <line x1={720} y1={38} x2={720} y2={210} stroke={t.accentDanger} strokeWidth={2} strokeDasharray="6 5" />
        <text x={720} y={232} textAnchor="end" fontSize={14} fill={t.accentDanger}>context limit</text>
        {bar('inline', 50)}
        {bar('map', 142)}
      </svg>

      {compact ? (
        <StickyRow>
          <StickyNote title={STRATEGY_NAME[config.strategy]} latex={FORMULA[config.strategy]} color="yellow" tilt={-1}><p>I is instructions, V is verification, N is files, and f or m is tokens per file.</p></StickyNote>
          <StickyNote title={`Step ${playback.step + 1} of ${trace.length}`} color="blue" tilt={1} live><p>{happened}</p></StickyNote>
        </StickyRow>
      ) : (
        <>
          <StickyRow>
            <StickyNote title={STRATEGY_NAME.inline} latex={FORMULA.inline} color="yellow" tilt={-1} active={config.strategy === 'inline'} onSelect={() => update('strategy', 'inline')}><p>f is the average number of tokens copied from one complete source file.</p></StickyNote>
            <StickyNote title={STRATEGY_NAME.map} latex={FORMULA.map} color="pink" tilt={1} active={config.strategy === 'map'} onSelect={() => update('strategy', 'map')}><p>m is the smaller path-and-signature entry kept for one file.</p></StickyNote>
          </StickyRow>
          <StickyRow>
            <StickyNote title="Worked numbers" color="green" tilt={1}>
              <p>{config.instructionTokens.toLocaleString()} + {config.verificationTokens.toLocaleString()} + {current.loadedFiles} × {config.strategy === 'inline' ? config.tokensPerFile.toLocaleString() : config.mapTokensPerFile.toLocaleString()} = <strong>{active.totalTokens.toLocaleString()} tokens</strong>.</p>
            </StickyNote>
            <StickyNote title={`What just happened · step ${playback.step + 1}`} color="blue" tilt={-1} live><p>{happened}</p></StickyNote>
          </StickyRow>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingTop: 8, borderTop: `1px dashed ${t.border}`, fontSize: 15 }}>
            <strong style={{ color: t.accentWarn }}>Predict first:</strong>
            <span>When all {config.fileCount} files are represented, does {STRATEGY_NAME[config.strategy].toLowerCase()} fit?</span>
            <select aria-label="Predicted context budget result" value={prediction} onChange={(event) => { setPrediction(event.target.value as 'fits' | 'overflows'); setPredictionResult(null); }} style={{ minHeight: 34, border: `1.5px solid ${t.border}`, borderRadius: RADIUS.sm, background: t.background, color: t.textPrimary, font: 'inherit' }}>
              <option value="fits">Fits in the window</option>
              <option value="overflows">Overflows the window</option>
            </select>
            <VizButton onClick={runPrediction}>Load every file</VizButton>
            {predictionResult !== null && <span role="status" style={{ color: predictionResult ? t.accentPrimary : t.accentDanger, fontWeight: 700 }}>{predictionResult ? 'Correct.' : final.fits ? `It fits with ${final.remainingTokens.toLocaleString()} tokens left.` : `It overflows by ${final.overflowTokens.toLocaleString()} tokens.`}</span>}
          </div>
        </>
      )}
    </>
  );
}

export default function InstructionBudgetVisualizer({ compact = false }: { compact?: boolean }) {
  return (
    <VisualizationContainer
      title="Instruction budget playground"
      footer="The bars are exact token-accounting arithmetic over the editable inputs. A repository map represents paths and signatures; it does not replace opening the full source files that the agent later chooses to inspect."
    >
      <InstructionBudgetPlayground compact={compact} />
    </VisualizationContainer>
  );
}
