import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { PillSelect, VisualizationContainer, VisualizationHeader } from '../primitives';
import type { SamplingCandidate, SamplingOptions } from './browserLmSampling';
import './BrowserLmLab.css';

type ModelState = 'idle' | 'loading' | 'ready' | 'error';
type ViewMode = 'text' | 'ids';

interface TokenInfo {
  id: number;
  text: string;
}

interface CandidateInfo extends SamplingCandidate, TokenInfo {}

interface GenerationStep {
  step: number;
  token: CandidateInfo;
  candidates: CandidateInfo[];
  ttftMs: number | null;
  msPerToken: number | null;
}

interface RunSettings extends SamplingOptions {
  maxNewTokens: number;
  seed: number;
}

interface PreviousRun {
  text: string;
  settings: RunSettings;
}

interface WorkerMessage {
  type: string;
  scope?: string;
  runId?: number;
  message?: string;
  file?: string;
  loaded?: number;
  total?: number;
  percent?: number;
  device?: 'webgpu' | 'wasm';
  tokens?: TokenInfo[];
  truncated?: boolean;
  step?: number;
  token?: CandidateInfo;
  candidates?: CandidateInfo[];
  ttftMs?: number | null;
  msPerToken?: number | null;
  generatedTokens?: number;
}

interface ExperimentVariant {
  label: string;
  settings: RunSettings;
}

interface Experiment {
  id: string;
  title: string;
  prompt: string;
  question: string;
  options: string[];
  correctIndex: number;
  variants: ExperimentVariant[];
  notice: string;
}

const DEFAULT_PROMPT = 'The small research robot opened the notebook and';
const DEFAULT_SETTINGS: RunSettings = {
  temperature: 0.8,
  topK: 40,
  topP: 0.95,
  maxNewTokens: 32,
  greedy: false,
  seed: 42,
};

const EXPERIMENTS: Experiment[] = [
  {
    id: 'greedy-loop',
    title: 'Greedy repetition loop',
    prompt: 'The company said that the company said that the company said that',
    question: 'When GPT-2 must always take rank 1, what can it do after it enters a repeated phrase?',
    options: ['Escape by trying a lower-ranked token', 'Keep reinforcing the same local pattern', 'Stop after one repetition'],
    correctIndex: 1,
    variants: [{
      label: 'Run greedy',
      settings: { temperature: 0, topK: 0, topP: 1, maxNewTokens: 40, greedy: true, seed: 7 },
    }],
    notice: 'Greedy decoding has no random branch that can leave a locally likely loop. The exact text varies with the prompt, but rank 1 is chosen at every step.',
  },
  {
    id: 'temperature',
    title: 'Temperature 0 vs. 1.5',
    prompt: 'The old observatory door opened and',
    question: 'Which run gives low-ranked tokens more probability mass?',
    options: ['Temperature 0', 'Temperature 1.5', 'They keep the same distribution'],
    correctIndex: 1,
    variants: [
      { label: 'Run T = 0', settings: { temperature: 0, topK: 0, topP: 1, maxNewTokens: 28, greedy: true, seed: 17 } },
      { label: 'Run T = 1.5', settings: { temperature: 1.5, topK: 50, topP: 0.95, maxNewTokens: 28, greedy: false, seed: 17 } },
    ],
    notice: 'Dividing logits by 1.5 flattens their softmax probabilities. The previous-run strip lets you compare both continuations with the same prompt and seed.',
  },
  {
    id: 'wrong-fact',
    title: 'Confident wrong fact',
    prompt: 'The capital of Australia is Sydney because',
    question: 'If the next-token distribution is sharp, has GPT-2 verified the statement in the prompt?',
    options: ['Yes, high probability verifies it', 'No, probability measures continuation fit, not truth'],
    correctIndex: 1,
    variants: [{
      label: 'Run the false premise',
      settings: { temperature: 0.35, topK: 20, topP: 0.9, maxNewTokens: 32, greedy: false, seed: 91 },
    }],
    notice: 'Canberra is Australia’s capital. A fluent continuation can still extend the false premise because next-token likelihood is not a fact check.',
  },
  {
    id: 'non-english',
    title: 'Non-English token boundaries',
    prompt: 'Hello world. नमस्ते दुनिया। कृत्रिम बुद्धिमत्ता',
    question: 'Compared with the short English phrase, what will GPT-2’s byte-level tokenizer usually do to this Hindi text?',
    options: ['Use fewer token IDs', 'Use many more token IDs', 'Map each word to exactly one ID'],
    correctIndex: 1,
    variants: [{
      label: 'Tokenize and run',
      settings: { temperature: 0.8, topK: 40, topP: 0.95, maxNewTokens: 12, greedy: false, seed: 23 },
    }],
    notice: 'Switch to token-ID view and inspect the prompt. GPT-2’s vocabulary was trained mainly on English text, so these UTF-8 bytes fragment into many token IDs.',
  },
];

function visibleToken(text: string): string {
  return text
    .replace(/ /g, '·')
    .replace(/\n/g, '↵')
    .replace(/\t/g, '⇥');
}

function formatDuration(value: number | null | undefined): string {
  return value == null ? '—' : `${Math.round(value)} ms`;
}

function formatMegabytes(bytes: number | undefined): string {
  return `${((bytes ?? 0) / (1024 * 1024)).toFixed(1)} MB`;
}

function cutoffLabel(candidate: CandidateInfo, selectedId: number): string {
  if (candidate.id === selectedId) return 'sampled';
  if (candidate.cutByGreedy) return 'cut by greedy';
  if (candidate.cutByTopK) return 'cut by top-k';
  if (candidate.cutByTopP) return 'cut by top-p';
  return 'kept';
}

export default function BrowserLmLab() {
  const t = useVizTokens();
  const workerRef = useRef<Worker | null>(null);
  const activeRunIdRef = useRef(0);
  const followLatestRef = useRef(true);
  const activeExperimentRef = useRef<string | null>(null);

  const [modelState, setModelState] = useState<ModelState>('idle');
  const [statusMessage, setStatusMessage] = useState('The model has not been downloaded.');
  const [runtimeDevice, setRuntimeDevice] = useState<'webgpu' | 'wasm' | null>(null);
  const [progress, setProgress] = useState({ percent: 0, loaded: 0, total: 0, file: '' });
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [stopping, setStopping] = useState(false);

  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [temperature, setTemperature] = useState(DEFAULT_SETTINGS.temperature);
  const [topK, setTopK] = useState(DEFAULT_SETTINGS.topK);
  const [topP, setTopP] = useState(DEFAULT_SETTINGS.topP);
  const [maxNewTokens, setMaxNewTokens] = useState(DEFAULT_SETTINGS.maxNewTokens);
  const [greedy, setGreedy] = useState(DEFAULT_SETTINGS.greedy);
  const [seed, setSeed] = useState(DEFAULT_SETTINGS.seed);
  const [viewMode, setViewMode] = useState<ViewMode>('text');

  const [promptTokens, setPromptTokens] = useState<TokenInfo[]>([]);
  const [promptTruncated, setPromptTruncated] = useState(false);
  const [steps, setSteps] = useState<GenerationStep[]>([]);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [metrics, setMetrics] = useState({ ttftMs: null as number | null, msPerToken: null as number | null });
  const [currentRunSettings, setCurrentRunSettings] = useState<RunSettings>(DEFAULT_SETTINGS);
  const [previousRun, setPreviousRun] = useState<PreviousRun | null>(null);

  const [selectedExperiment, setSelectedExperiment] = useState(EXPERIMENTS[0].id);
  const [predictions, setPredictions] = useState<Record<string, number>>({});
  const [completedExperiment, setCompletedExperiment] = useState<string | null>(null);

  const handleWorkerMessage = useCallback((event: MessageEvent<WorkerMessage>) => {
    const message = event.data;
    if (message.runId !== undefined && message.runId !== activeRunIdRef.current) return;

    if (message.type === 'progress') {
      setProgress({
        percent: message.percent ?? 0,
        loaded: message.loaded ?? 0,
        total: message.total ?? 0,
        file: message.file ?? '',
      });
    } else if (message.type === 'status' || message.type === 'fallback') {
      setStatusMessage(message.message ?? 'Loading model…');
    } else if (message.type === 'ready') {
      setModelState('ready');
      setRuntimeDevice(message.device ?? null);
      setStatusMessage(`Model ready on ${message.device === 'webgpu' ? 'WebGPU' : 'WebAssembly'}.`);
      setError(null);
    } else if (message.type === 'prompt-tokens') {
      setPromptTokens(message.tokens ?? []);
      setPromptTruncated(Boolean(message.truncated));
    } else if (message.type === 'generation-started') {
      setRuntimeDevice(message.device ?? null);
    } else if (message.type === 'generation-restarted') {
      followLatestRef.current = true;
      setSteps([]);
      setSelectedStep(null);
      setMetrics({ ttftMs: null, msPerToken: null });
    } else if (message.type === 'token' && message.token && message.candidates && message.step !== undefined) {
      const step: GenerationStep = {
        step: message.step,
        token: message.token,
        candidates: message.candidates,
        ttftMs: message.ttftMs ?? null,
        msPerToken: message.msPerToken ?? null,
      };
      setSteps((current) => [...current, step]);
      setMetrics({ ttftMs: step.ttftMs, msPerToken: step.msPerToken });
      if (followLatestRef.current) setSelectedStep(message.step);
    } else if (message.type === 'done' || message.type === 'stopped') {
      setGenerating(false);
      setStopping(false);
      setMetrics({ ttftMs: message.ttftMs ?? null, msPerToken: message.msPerToken ?? null });
      setStatusMessage(message.type === 'stopped' ? 'Generation stopped.' : 'Generation complete.');
      if (message.type === 'done') setCompletedExperiment(activeExperimentRef.current);
      activeExperimentRef.current = null;
    } else if (message.type === 'error') {
      setGenerating(false);
      setStopping(false);
      setError(message.message ?? 'The browser model failed.');
      if (message.scope === 'load') setModelState('error');
    }
  }, []);

  const ensureWorker = useCallback((): Worker => {
    if (workerRef.current) return workerRef.current;
    if (typeof Worker === 'undefined') throw new Error('This browser does not provide Web Workers.');
    const worker = new Worker(new URL('../../workers/browserLmWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = handleWorkerMessage;
    worker.onerror = () => {
      setGenerating(false);
      setStopping(false);
      setModelState('error');
      setError('The model worker stopped unexpectedly. Retry to start a fresh worker.');
    };
    worker.onmessageerror = () => {
      setGenerating(false);
      setStopping(false);
      setError('The model worker returned data this browser could not read. Retry the model.');
    };
    workerRef.current = worker;
    return worker;
  }, [handleWorkerMessage]);

  useEffect(() => () => workerRef.current?.terminate(), []);

  const loadModel = useCallback(() => {
    try {
      const worker = ensureWorker();
      setModelState('loading');
      setStatusMessage('Preparing the browser-only model download…');
      setProgress({ percent: 0, loaded: 0, total: 0, file: '' });
      setError(null);
      worker.postMessage({ type: 'load' });
    } catch (loadError) {
      setModelState('error');
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    }
  }, [ensureWorker]);

  const retryModel = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setRuntimeDevice(null);
    setModelState('idle');
    loadModel();
  }, [loadModel]);

  const settings = useMemo<RunSettings>(() => ({
    temperature,
    topK,
    topP,
    maxNewTokens,
    greedy,
    seed,
  }), [temperature, topK, topP, maxNewTokens, greedy, seed]);

  const startGeneration = useCallback((nextPrompt = prompt, nextSettings = settings, experimentId: string | null = null) => {
    if (modelState !== 'ready' || generating || !nextPrompt.trim()) return;
    const worker = ensureWorker();
    if (steps.length > 0) {
      setPreviousRun({
        text: steps.map((step) => step.token.text).join(''),
        settings: currentRunSettings,
      });
    }

    const runId = activeRunIdRef.current + 1;
    activeRunIdRef.current = runId;
    activeExperimentRef.current = experimentId;
    followLatestRef.current = true;
    setPromptTokens([]);
    setPromptTruncated(false);
    setSteps([]);
    setSelectedStep(null);
    setMetrics({ ttftMs: null, msPerToken: null });
    setCurrentRunSettings(nextSettings);
    setCompletedExperiment(null);
    setError(null);
    setGenerating(true);
    setStopping(false);
    setStatusMessage('Tokenizing the prompt, then running prefill…');
    worker.postMessage({
      type: 'generate',
      runId,
      payload: { prompt: nextPrompt, ...nextSettings },
    });
  }, [currentRunSettings, ensureWorker, generating, modelState, prompt, settings, steps]);

  const stopGeneration = useCallback(() => {
    if (!generating) return;
    setStopping(true);
    setStatusMessage('Stopping after the current token…');
    workerRef.current?.postMessage({ type: 'stop' });
  }, [generating]);

  const applyExperiment = useCallback((experiment: Experiment, variant: ExperimentVariant) => {
    setPrompt(experiment.prompt);
    setTemperature(variant.settings.temperature);
    setTopK(variant.settings.topK);
    setTopP(variant.settings.topP);
    setMaxNewTokens(variant.settings.maxNewTokens);
    setGreedy(variant.settings.greedy);
    setSeed(variant.settings.seed);
    startGeneration(experiment.prompt, variant.settings, experiment.id);
  }, [startGeneration]);

  const experiment = EXPERIMENTS.find((item) => item.id === selectedExperiment)!;
  const prediction = predictions[experiment.id];
  const inspectedStep = selectedStep == null ? null : steps[selectedStep] ?? null;
  const topProbability = inspectedStep?.candidates[0]?.probability ?? 1;

  return (
    <VisualizationContainer
      title="Run a real language model"
      footer="This is Xenova/gpt2 running locally through int8 ONNX weights. Quantization can shift probabilities slightly, and GPT-2 is a small completion model rather than a factual authority."
    >
      <div className="browser-lm">
        <VisualizationHeader
          eyebrow="Live ONNX model in your browser"
          title="Run a real language model"
          description="Load GPT-2 only when you choose, then inspect the real next-token distribution at every generated step."
        />

        <p className="browser-lm__runtime-line" role="status" aria-live="polite">
          <strong>Runtime:</strong>
          <span>{statusMessage}</span>
          {runtimeDevice && <span>int8 · {runtimeDevice === 'webgpu' ? 'WebGPU' : 'WASM'} · browser cache enabled</span>}
        </p>

        {modelState === 'loading' && (
          <div className="browser-lm__progress">
            <div>{progress.file ? `Downloading ${progress.file}` : statusMessage}</div>
            <div
              className="browser-lm__progress-track"
              role="progressbar"
              aria-label="Model download progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress.percent)}
            >
              <div className="browser-lm__progress-fill" style={{ width: `${progress.percent}%` }} />
            </div>
            <div>{progress.total > 0 ? `${formatMegabytes(progress.loaded)} of ${formatMegabytes(progress.total)} (${Math.round(progress.percent)}%)` : 'Reading cached files or waiting for size metadata…'}</div>
          </div>
        )}

        {error && (
          <div className="browser-lm__error" role="alert">
            <strong>The local model could not continue.</strong> {error}
            <div className="browser-lm__button-row" style={{ marginTop: '0.65rem' }}>
              <button type="button" className="browser-lm__button" onClick={retryModel}>Retry model</button>
            </div>
          </div>
        )}

        <div className="browser-lm__layout">
          <section className="browser-lm__controls" aria-label="Generation controls">
            <label className="browser-lm__field">
              <span>Prompt</span>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                maxLength={1500}
                disabled={generating}
              />
            </label>

            <div className="browser-lm__control-grid">
              <label className="browser-lm__slider">
                <span className="browser-lm__slider-head"><span>Temperature</span><output>{greedy ? '0 (greedy)' : temperature.toFixed(2)}</output></span>
                <input type="range" min={0.05} max={2} step={0.05} value={temperature} disabled={greedy || generating} onChange={(event) => setTemperature(Number(event.target.value))} />
              </label>
              <label className="browser-lm__slider">
                <span className="browser-lm__slider-head"><span>Top-k</span><output>{topK === 0 ? 'off' : topK}</output></span>
                <input type="range" min={0} max={100} step={1} value={topK} disabled={greedy || generating} onChange={(event) => setTopK(Number(event.target.value))} />
              </label>
              <label className="browser-lm__slider">
                <span className="browser-lm__slider-head"><span>Top-p</span><output>{topP === 1 ? 'off' : topP.toFixed(2)}</output></span>
                <input type="range" min={0.05} max={1} step={0.05} value={topP} disabled={greedy || generating} onChange={(event) => setTopP(Number(event.target.value))} />
              </label>
              <label className="browser-lm__slider">
                <span className="browser-lm__slider-head"><span>Max new tokens</span><output>{maxNewTokens}</output></span>
                <input type="range" min={1} max={80} step={1} value={maxNewTokens} disabled={generating} onChange={(event) => setMaxNewTokens(Number(event.target.value))} />
              </label>
            </div>

            <div className="browser-lm__check-row">
              <label>
                <input type="checkbox" checked={greedy} disabled={generating} onChange={(event) => setGreedy(event.target.checked)} />
                Greedy decoding
              </label>
              <label className="browser-lm__field" style={{ flexDirection: 'row', alignItems: 'center' }}>
                <span>Seed</span>
                <input type="number" min={0} max={4294967295} step={1} value={seed} disabled={generating} onChange={(event) => setSeed(Number(event.target.value))} style={{ width: '8rem' }} />
              </label>
            </div>

            <div className="browser-lm__button-row">
              {modelState !== 'ready' ? (
                <button type="button" className="browser-lm__button browser-lm__button--primary" onClick={loadModel} disabled={modelState === 'loading'}>
                  {modelState === 'loading' ? 'Loading model…' : 'Load model (~280 MB, once)'}
                </button>
              ) : (
                <button type="button" className="browser-lm__button browser-lm__button--primary" onClick={() => startGeneration()} disabled={generating || !prompt.trim()}>
                  {generating ? 'Generating token by token…' : 'Generate'}
                </button>
              )}
              {generating && (
                <button type="button" className="browser-lm__button" onClick={stopGeneration} disabled={stopping}>
                  {stopping ? 'Stopping…' : 'Stop'}
                </button>
              )}
            </div>
          </section>

          <section className="browser-lm__stage" aria-label="Generated tokens and next-token probabilities">
            <div className="browser-lm__metrics" aria-label="Generation timing">
              <div className="browser-lm__metric">Time to first token<strong>{formatDuration(metrics.ttftMs)}</strong></div>
              <div className="browser-lm__metric">Decode average<strong>{metrics.msPerToken == null ? '—' : `${Math.round(metrics.msPerToken)} ms/token`}</strong></div>
              <div className="browser-lm__metric">Prompt tokens<strong>{promptTokens.length || '—'}</strong></div>
              <div className="browser-lm__metric">Generated tokens<strong>{steps.length}</strong></div>
            </div>

            <div className="browser-lm__output">
              <div className="browser-lm__output-head">
                <h3>Token stream</h3>
                <div className="browser-lm__view-toggle" aria-label="Token display mode">
                  <PillSelect<ViewMode>
                    value={viewMode}
                    onChange={setViewMode}
                    options={[
                      { value: 'text', label: 'Text view' },
                      { value: 'ids', label: 'Token-ID view' },
                    ]}
                  />
                </div>
              </div>

              {steps.length === 0 && promptTokens.length === 0 ? (
                <p className="browser-lm__empty">Load the model, write a prompt, and generate. Every emitted token becomes a button you can inspect.</p>
              ) : (
                <div className="browser-lm__token-stream">
                  {viewMode === 'text' ? (
                    <span className="browser-lm__prompt-text">{prompt}</span>
                  ) : promptTokens.map((token, index) => (
                    <span className="browser-lm__prompt-token" key={`prompt-${index}-${token.id}`} title={token.text}>id {token.id}</span>
                  ))}
                  {steps.map((step, index) => (
                    <button
                      type="button"
                      key={`${index}-${step.token.id}`}
                      className="browser-lm__token"
                      aria-pressed={selectedStep === index}
                      aria-label={`Inspect generated token ${index + 1}: ${visibleToken(step.token.text)}`}
                      title={`Token ${step.token.id}: ${step.token.text}`}
                      onClick={() => {
                        followLatestRef.current = false;
                        setSelectedStep(index);
                      }}
                    >
                      {viewMode === 'text' ? visibleToken(step.token.text) : `id ${step.token.id}`}
                    </button>
                  ))}
                </div>
              )}
              {promptTruncated && <p className="browser-lm__empty">The prompt was trimmed to leave room inside GPT-2’s 1,024-token context.</p>}

              {previousRun && (
                <div className="browser-lm__previous">
                  <strong>Previous run:</strong> {visibleToken(previousRun.text)}<br />
                  T={previousRun.settings.greedy ? 0 : previousRun.settings.temperature.toFixed(2)}, top-k={previousRun.settings.topK || 'off'}, top-p={previousRun.settings.topP === 1 ? 'off' : previousRun.settings.topP.toFixed(2)}, seed={previousRun.settings.seed}
                </div>
              )}
            </div>

            {inspectedStep && (
              <div className="browser-lm__candidates">
                <h3>Step {inspectedStep.step + 1}: top 10 next-token candidates</h3>
                <p className="browser-lm__runtime-line">
                  Temperature-scaled probabilities before filtering. Top-k runs first, then top-p; kept candidates are renormalized before the seeded draw.
                </p>
                <ol className="browser-lm__candidate-list">
                  {inspectedStep.candidates.map((candidate) => {
                    const status = cutoffLabel(candidate, inspectedStep.token.id);
                    const kept = status === 'kept' || status === 'sampled';
                    return (
                      <li className="browser-lm__candidate" key={candidate.id}>
                        <span className="browser-lm__candidate-token">{candidate.rank}. {visibleToken(candidate.text)} <span>id {candidate.id}</span></span>
                        <span>
                          <span className="browser-lm__probability-track" aria-label={`${(candidate.probability * 100).toFixed(2)} percent probability`}>
                            <span className="browser-lm__probability-fill" style={{ width: `${(candidate.probability / topProbability) * 100}%`, background: kept ? t.accentPrimary : t.border, display: 'block' }} />
                          </span>
                          <span>{(candidate.probability * 100).toFixed(2)}%</span>
                        </span>
                        <span className="browser-lm__candidate-status" data-kept={kept}>{status}{kept && candidate.finalProbability > 0 ? ` · ${(candidate.finalProbability * 100).toFixed(2)}% after renormalizing` : ''}</span>
                      </li>
                    );
                  })}
                </ol>
                {!inspectedStep.candidates.some((candidate) => candidate.id === inspectedStep.token.id) && (
                  <p className="browser-lm__empty">The seeded draw selected id {inspectedStep.token.id}, outside the displayed top 10.</p>
                )}
              </div>
            )}
          </section>
        </div>

        <section className="browser-lm__experiments" aria-labelledby="browser-lm-experiments-heading">
          <h3 id="browser-lm-experiments-heading">Preset experiments: predict first, then run</h3>
          <div className="browser-lm__experiment-tabs" role="tablist" aria-label="Preset experiments">
            {EXPERIMENTS.map((item) => (
              <button
                type="button"
                role="tab"
                aria-selected={selectedExperiment === item.id}
                key={item.id}
                className="browser-lm__button"
                onClick={() => setSelectedExperiment(item.id)}
              >
                {item.title}
              </button>
            ))}
          </div>

          <div className="browser-lm__experiment-body" role="tabpanel">
            <p className="browser-lm__experiment-question"><strong>Predict:</strong> {experiment.question}</p>
            <div className="browser-lm__prediction-options">
              {experiment.options.map((option, index) => (
                <button
                  type="button"
                  key={option}
                  className="browser-lm__button"
                  aria-pressed={prediction === index}
                  onClick={() => setPredictions((current) => ({ ...current, [experiment.id]: index }))}
                >
                  {option}
                </button>
              ))}
            </div>
            <div className="browser-lm__experiment-runs">
              {experiment.variants.map((variant) => (
                <button
                  type="button"
                  key={variant.label}
                  className="browser-lm__button browser-lm__button--primary"
                  disabled={prediction === undefined || modelState !== 'ready' || generating}
                  onClick={() => applyExperiment(experiment, variant)}
                >
                  {variant.label}
                </button>
              ))}
            </div>
            {prediction === undefined && <p className="browser-lm__experiment-note">Choose a prediction before the run buttons become available.</p>}
            {prediction !== undefined && modelState !== 'ready' && <p className="browser-lm__experiment-note">Load the model above, then run this preset.</p>}
            {completedExperiment === experiment.id && (
              <p className="browser-lm__experiment-note"><strong>{prediction === experiment.correctIndex ? 'Your prediction matches the mechanism.' : 'Compare your prediction with the trace.'}</strong> {experiment.notice}</p>
            )}
          </div>
        </section>
      </div>
    </VisualizationContainer>
  );
}
