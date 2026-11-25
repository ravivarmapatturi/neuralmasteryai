import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { PillSelect, VisualizationContainer, VisualizationHeader, usePrefersReducedMotion } from '../primitives';
import { runSandboxPipeline, SAMPLE_WORKSPACE_FILES } from './shellSandbox';
import './playgroundTools.css';

type PresetFamily = 'grep' | 'jq' | 'docker' | 'kubectl';

export default function ShellPipelineSandbox() {
  const t = useVizTokens();
  const reducedMotion = usePrefersReducedMotion();

  const [family, setFamily] = useState<PresetFamily>('grep');
  const [selectedFile, setSelectedFile] = useState(SAMPLE_WORKSPACE_FILES[0].name);

  // Interactive flag state for preset builders
  const [grepIgnoreCase, setGrepIgnoreCase] = useState(false);
  const [grepInvert, setGrepInvert] = useState(false);
  const [grepLineNums, setGrepLineNums] = useState(true);
  const [grepCountOnly, setGrepCountOnly] = useState(false);
  const [grepPattern, setGrepPattern] = useState('ERROR');

  const [jqRaw, setJqRaw] = useState(false);
  const [jqFilter, setJqFilter] = useState('.route');
  const [jqSlowOnly, setJqSlowOnly] = useState(false);

  const [dockerAll, setDockerAll] = useState(true);
  const [dockerFilterExited, setDockerFilterExited] = useState(false);
  const [dockerJson, setDockerJson] = useState(false);

  const [kubeAllNs, setKubeAllNs] = useState(true);
  const [kubeWide, setKubeWide] = useState(true);
  const [kubeNonRunning, setKubeNonRunning] = useState(false);

  const [customMode, setCustomMode] = useState(false);
  const [customPipeline, setCustomPipeline] = useState('cat api.log | grep -i error | awk $1,$5');

  const generatedPipeline = useMemo(() => {
    if (family === 'grep') {
      const flags = `${grepIgnoreCase ? 'i' : ''}${grepInvert ? 'v' : ''}${grepLineNums ? 'n' : ''}${grepCountOnly ? 'c' : ''}`;
      const flagStr = flags ? ` -${flags}` : '';
      return `cat api.log | grep${flagStr} "${grepPattern}"`;
    }
    if (family === 'jq') {
      const selectClause = jqSlowOnly ? 'select(.latency_ms > 500) | ' : '';
      const rawFlag = jqRaw ? '-r ' : '';
      return `cat metrics.jsonl | jq ${rawFlag}'${selectClause}${jqFilter}'`;
    }
    if (family === 'docker') {
      const parts = ['docker ps'];
      if (dockerAll) parts.push('-a');
      if (dockerFilterExited) parts.push('--filter status=exited');
      if (dockerJson) parts.push('--format=json');
      return `${parts.join(' ')} | grep -i vllm`;
    }
    const parts = ['kubectl get pods'];
    if (kubeAllNs) parts.push('-A');
    if (kubeWide) parts.push('-o wide');
    if (kubeNonRunning) parts.push('--field-selector status.phase!=Running');
    return `${parts.join(' ')} | grep -v NAME`;
  }, [
    family,
    grepIgnoreCase,
    grepInvert,
    grepLineNums,
    grepCountOnly,
    grepPattern,
    jqRaw,
    jqFilter,
    jqSlowOnly,
    dockerAll,
    dockerFilterExited,
    dockerJson,
    kubeAllNs,
    kubeWide,
    kubeNonRunning,
  ]);

  const activePipeline = customMode ? customPipeline : generatedPipeline;
  const result = useMemo(() => runSandboxPipeline(activePipeline), [activePipeline]);
  const previewFile = SAMPLE_WORKSPACE_FILES.find((f) => f.name === selectedFile) ?? SAMPLE_WORKSPACE_FILES[0];

  return (
    <VisualizationContainer
      title="Shell Pipeline & Flag Sandbox"
      footer={`Simulated read-only pipeline: "${activePipeline}" across ${result.stages.length} stage${result.stages.length === 1 ? '' : 's'}, final exit code ${result.finalExitCode}.`}
    >
      <div className={`nm-pg${reducedMotion ? ' nm-pg--reduced-motion' : ''}`}>
        <VisualizationHeader
          eyebrow="Safe simulated pipe runner"
          title="Toggle flags and trace stdin to stdout at each pipe stage"
          description="Runs purely in your browser over a fixed sample workspace (no OS shell). Watch how flags reshape output and exit codes between stages."
        />

        <div className="nm-pg__controls" style={{ marginBottom: '1rem' }}>
          <PillSelect<PresetFamily>
            label="Command preset family"
            value={family}
            onChange={(val) => {
              const next = typeof val === 'function' ? val(family) : val;
              setFamily(next);
              setCustomMode(false);
            }}
            options={[
              { value: 'grep', label: 'grep log triage' },
              { value: 'jq', label: 'jq JSON stream' },
              { value: 'docker', label: 'docker ps' },
              { value: 'kubectl', label: 'kubectl get pods' },
            ]}
          />

          {!customMode && family === 'grep' && (
            <div className="nm-pg__panel">
              <div className="nm-pg__checks" style={{ marginBottom: '0.65rem' }}>
                <button type="button" className="nm-pg__chip-btn" aria-pressed={grepIgnoreCase} onClick={() => setGrepIgnoreCase((v) => !v)}>
                  -i (ignore case)
                </button>
                <button type="button" className="nm-pg__chip-btn" aria-pressed={grepInvert} onClick={() => setGrepInvert((v) => !v)}>
                  -v (invert match)
                </button>
                <button type="button" className="nm-pg__chip-btn" aria-pressed={grepLineNums} onClick={() => setGrepLineNums((v) => !v)}>
                  -n (line numbers)
                </button>
                <button type="button" className="nm-pg__chip-btn" aria-pressed={grepCountOnly} onClick={() => setGrepCountOnly((v) => !v)}>
                  -c (count only)
                </button>
              </div>
              <label className="nm-pg__field">
                <span>Pattern</span>
                <input type="text" value={grepPattern} onChange={(e) => setGrepPattern(e.target.value)} />
              </label>
            </div>
          )}

          {!customMode && family === 'jq' && (
            <div className="nm-pg__panel">
              <div className="nm-pg__checks" style={{ marginBottom: '0.65rem' }}>
                <button type="button" className="nm-pg__chip-btn" aria-pressed={jqRaw} onClick={() => setJqRaw((v) => !v)}>
                  -r (raw unquoted string)
                </button>
                <button type="button" className="nm-pg__chip-btn" aria-pressed={jqSlowOnly} onClick={() => setJqSlowOnly((v) => !v)}>
                  select(.latency_ms &gt; 500)
                </button>
              </div>
              <PillSelect<string>
                label="Field extractor"
                value={jqFilter}
                onChange={setJqFilter}
                options={[
                  { value: '.route', label: '.route' },
                  { value: '.status', label: '.status' },
                  { value: '.latency_ms', label: '.latency_ms' },
                  { value: '.', label: '. (whole object)' },
                ]}
              />
            </div>
          )}

          {!customMode && family === 'docker' && (
            <div className="nm-pg__panel">
              <div className="nm-pg__checks">
                <button type="button" className="nm-pg__chip-btn" aria-pressed={dockerAll} onClick={() => setDockerAll((v) => !v)}>
                  -a (include exited)
                </button>
                <button type="button" className="nm-pg__chip-btn" aria-pressed={dockerFilterExited} onClick={() => setDockerFilterExited((v) => !v)}>
                  --filter status=exited
                </button>
                <button type="button" className="nm-pg__chip-btn" aria-pressed={dockerJson} onClick={() => setDockerJson((v) => !v)}>
                  --format=json
                </button>
              </div>
            </div>
          )}

          {!customMode && family === 'kubectl' && (
            <div className="nm-pg__panel">
              <div className="nm-pg__checks">
                <button type="button" className="nm-pg__chip-btn" aria-pressed={kubeAllNs} onClick={() => setKubeAllNs((v) => !v)}>
                  -A (all namespaces)
                </button>
                <button type="button" className="nm-pg__chip-btn" aria-pressed={kubeWide} onClick={() => setKubeWide((v) => !v)}>
                  -o wide (show node)
                </button>
                <button type="button" className="nm-pg__chip-btn" aria-pressed={kubeNonRunning} onClick={() => setKubeNonRunning((v) => !v)}>
                  --field-selector status.phase!=Running
                </button>
              </div>
            </div>
          )}

          <div className="nm-pg__panel nm-pg__panel--alt">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.45rem' }}>
              <strong style={{ fontSize: 15 }}>Active command pipeline</strong>
              <button
                type="button"
                className="nm-pg__chip-btn"
                aria-pressed={customMode}
                onClick={() => {
                  if (!customMode) setCustomPipeline(generatedPipeline);
                  setCustomMode((v) => !v);
                }}
              >
                {customMode ? 'Switch back to flag toggles' : 'Edit pipeline string'}
              </button>
            </div>
            {customMode ? (
              <label className="nm-pg__field">
                <span>Custom simulated pipeline (allowed: cat, grep, jq, awk, sort, head, wc, docker ps, kubectl get pods)</span>
                <input
                  type="text"
                  value={customPipeline}
                  onChange={(e) => setCustomPipeline(e.target.value)}
                />
              </label>
            ) : (
              <pre className="nm-pg__mono" style={{ color: t.accentSecondary }}>$ {activePipeline}</pre>
            )}
          </div>
        </div>

        <div className="nm-pg__grid-2">
          <div className="nm-pg__panel">
            <h3 className="nm-pg__panel-title">Stage-by-stage stdout trace</h3>
            {result.stages.map((stage, idx) => (
              <div
                key={`${idx}-${stage.command}`}
                style={{
                  padding: '0.65rem 0.75rem',
                  marginBottom: '0.75rem',
                  border: `1.5px solid ${stage.exitCode === 0 ? t.border : t.accentDanger}`,
                  borderRadius: '10px 3px 12px 4px / 4px 12px 3px 10px',
                  background: t.surface,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <code style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>
                    Stage {idx + 1}: {stage.command}
                  </code>
                  <span className={`nm-pg__badge ${stage.exitCode === 0 ? 'nm-pg__badge--good' : 'nm-pg__badge--bad'}`}>
                    exit {stage.exitCode}
                  </span>
                </div>
                {stage.stderr ? (
                  <pre className="nm-pg__mono" style={{ color: t.accentDanger }}>{stage.stderr}</pre>
                ) : (
                  <pre className="nm-pg__mono" style={{ color: t.textSecondary }}>
                    {stage.stdout || '(empty stdout — 0 matching lines)'}
                  </pre>
                )}
              </div>
            ))}
          </div>

          <div className="nm-pg__panel">
            <h3 className="nm-pg__panel-title">Sample workspace files</h3>
            <div className="nm-pg__checks" style={{ marginBottom: '0.65rem' }}>
              {SAMPLE_WORKSPACE_FILES.map((file) => (
                <button
                  key={file.name}
                  type="button"
                  className="nm-pg__chip-btn"
                  aria-pressed={selectedFile === file.name}
                  onClick={() => setSelectedFile(file.name)}
                >
                  {file.name}
                </button>
              ))}
            </div>
            <p className="nm-pg__sub">{previewFile.description}</p>
            <pre
              className="nm-pg__mono"
              style={{
                padding: '0.75rem',
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                color: t.textPrimary,
              }}
            >
              {previewFile.content}
            </pre>
          </div>
        </div>
      </div>
    </VisualizationContainer>
  );
}
