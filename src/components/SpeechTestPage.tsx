import { useEffect, useMemo, useRef, useState } from 'react';
import Navbar from './layout/Navbar';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import {
  BaseSpeechEngine,
  BrowserSpeechEngine,
  MoonshineEngine,
  SherpaOnnxEngine,
  MoonshineSingleThreadEngine,
  type EngineMetrics,
  detectBrowser,
  getJSHeapMB,
} from '../lib/speechTest/engines';
import { PauseTracker, type PauseReport, DEFAULT_PAUSE_THRESHOLDS } from '../lib/speechTest/pauseTracker';
import { AudioVADPipeline } from '../lib/speechTest/vad';
import { computeWER, type WERResult } from '../lib/speechTest/wer';

export const FIXED_READING_PARAGRAPHS = [
  {
    id: 'foundation',
    label: 'Foundation Models (Standard)',
    text: 'A foundation model is trained on broad data at scale and can be adapted to a wide range of downstream tasks, whereas a traditional machine learning model is trained on a specific dataset for a single dedicated task.',
  },
  {
    id: 'benchmark',
    label: 'LibriSpeech Audio Benchmark',
    text: 'He hoped there would be stew for dinner, turnips and carrots and bruised potatoes, and fat mutton pieces to be ladled out in thick, peppered flower-fat and sauce.',
  },
] as const;

export const FIXED_READING_PARAGRAPH = FIXED_READING_PARAGRAPHS[0].text;

const FREE_ANSWER_PROMPT =
  'What is a foundation model, and how is it different from a regular ML model?';

type EngineId = 'browser' | 'moonshine' | 'sherpa' | 'moonshine-single';

export default function SpeechTestPage() {
  useDocumentTitle('Live Speech & End-of-Answer Test Lab');

  // Ensure noindex, nofollow for this internal test lab route
  useEffect(() => {
    let meta = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const created = !meta;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'robots';
      document.head.appendChild(meta);
    }
    const previous = meta.content;
    meta.content = 'noindex, nofollow';
    return () => {
      if (created) {
        meta?.remove();
      } else if (meta) {
        meta.content = previous;
      }
    };
  }, []);

  const [selectedEngineId, setSelectedEngineId] = useState<EngineId>('browser');
  const [selectedParagraphId, setSelectedParagraphId] = useState<'foundation' | 'benchmark'>('foundation');
  const [activeTab, setActiveTab] = useState<'fixed' | 'free'>('fixed');
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Pause tracking state
  const pauseTrackerRef = useRef<PauseTracker>(new PauseTracker(DEFAULT_PAUSE_THRESHOLDS));
  const [pauseReport, setPauseReport] = useState<PauseReport>(pauseTrackerRef.current.getReport());

  // Speech engines instances (lazy initialized)
  const enginesRef = useRef<Record<EngineId, BaseSpeechEngine>>({
    browser: new BrowserSpeechEngine(),
    moonshine: new MoonshineEngine(),
    'moonshine-single': new MoonshineSingleThreadEngine(),
    sherpa: new SherpaOnnxEngine(),
  });

  const [metrics, setMetrics] = useState<Record<EngineId, EngineMetrics>>({
    browser: enginesRef.current.browser.getMetrics(),
    moonshine: enginesRef.current.moonshine.getMetrics(),
    'moonshine-single': enginesRef.current['moonshine-single'].getMetrics(),
    sherpa: enginesRef.current.sherpa.getMetrics(),
  });

  const pipelineRef = useRef<AudioVADPipeline | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Subscribe to engine metrics
  useEffect(() => {
    const unsubs = Object.entries(enginesRef.current).map(([id, eng]) =>
      eng.subscribe((m) => {
        setMetrics((prev) => ({ ...prev, [id]: m }));
      })
    );
    return () => {
      unsubs.forEach((u) => u());
    };
  }, []);

  // Continuous loop to update pause tracker progress
  useEffect(() => {
    let timer: number;
    if (isRecording) {
      timer = window.setInterval(() => {
        pauseTrackerRef.current.tick(performance.now());
        setPauseReport(pauseTrackerRef.current.getReport());
      }, 50);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      pipelineRef.current?.stop();
      Object.values(enginesRef.current).forEach((eng) => eng.destroy());
    };
  }, []);

  const currentEngine = enginesRef.current[selectedEngineId];
  const currentMetrics = metrics[selectedEngineId];
  const activeParagraph = FIXED_READING_PARAGRAPHS.find((p) => p.id === selectedParagraphId) ?? FIXED_READING_PARAGRAPHS[0];

  // Compute Word Error Rate against the selected paragraph
  const werResult: WERResult = useMemo(() => {
    const transcript = currentMetrics.partialText || currentMetrics.finalText;
    return computeWER(activeParagraph.text, transcript);
  }, [currentMetrics.partialText, currentMetrics.finalText, activeParagraph.text]);

  // Handle engine selection & explicit on-demand load
  const handleSelectEngine = async (id: EngineId) => {
    if (isRecording) {
      await handleStop();
    }
    setSelectedEngineId(id);
    const eng = enginesRef.current[id];
    if (eng.getMetrics().status === 'idle') {
      try {
        await eng.load();
      } catch {
        // Error state already recorded in engine metrics
      }
    }
  };

  const handleStart = async () => {
    setMicError(null);
    pauseTrackerRef.current.reset();
    setPauseReport(pauseTrackerRef.current.getReport());
    currentEngine.reset();

    try {
      // Initialize Audio + VAD pipeline
      const pipeline = new AudioVADPipeline({
        onSpeechStart: (timestamp) => {
          pauseTrackerRef.current.onSpeechStart(timestamp);
          setPauseReport(pauseTrackerRef.current.getReport());
          currentEngine.onSpeechActivity(true, timestamp);
        },
        onSpeechEnd: (timestamp) => {
          pauseTrackerRef.current.onSpeechEnd(timestamp);
          setPauseReport(pauseTrackerRef.current.getReport());
          currentEngine.onSpeechActivity(false, timestamp);
        },
        onAudioLevel: (lvl) => setAudioLevel(lvl),
        onError: (err) => setMicError(err),
      });

      pipelineRef.current = pipeline;
      const stream = await pipeline.start();
      mediaStreamRef.current = stream;

      // Ensure model is loaded first if not ready
      if (currentEngine.getMetrics().status === 'idle') {
        await currentEngine.load();
      }

      await currentEngine.start(stream);
      setIsRecording(true);
    } catch (err: any) {
      setMicError(err.message || 'Could not start audio capture.');
      setIsRecording(false);
    }
  };

  const handleStop = async () => {
    setIsRecording(false);
    setAudioLevel(0);
    pauseTrackerRef.current.finalize(performance.now());
    setPauseReport(pauseTrackerRef.current.getReport());

    if (currentEngine) {
      await currentEngine.stop();
    }
    if (pipelineRef.current) {
      pipelineRef.current.stop();
      pipelineRef.current = null;
    }
  };

  const handleCopyResults = () => {
    const payload = {
      testTimestamp: new Date().toISOString(),
      browser: detectBrowser(),
      device: currentMetrics.device,
      selectedEngine: {
        id: selectedEngineId,
        name: currentEngine.name,
      },
      evaluationMode: activeTab,
      prompt: activeTab === 'fixed' ? activeParagraph.text : FREE_ANSWER_PROMPT,
      recognizedTranscript: currentMetrics.partialText || currentMetrics.finalText,
      metrics: {
        timeToFirstWordMs: currentMetrics.timeToFirstWordMs,
        lagBehindSpeechMs: currentMetrics.lagBehindSpeechMs,
        downloadBytes: currentMetrics.downloadBytes,
        downloadMB: Math.round((currentMetrics.downloadBytes / (1024 * 1024)) * 10) / 10,
        loadTimeMs: currentMetrics.loadTimeMs,
        peakJSHeapMB: currentMetrics.peakJSHeapMB ?? getJSHeapMB(),
      },
      wordErrorRate:
        activeTab === 'fixed'
          ? {
              wer: werResult.wer,
              werPercent: werResult.werPercent,
              substitutions: werResult.substitutions,
              deletions: werResult.deletions,
              insertions: werResult.insertions,
              correct: werResult.correct,
            }
          : null,
      endOfAnswerDetection: {
        speechDurationSeconds: pauseReport.speechDurationSeconds,
        finalSilenceSeconds: pauseReport.currentSilenceSeconds,
        thresholds: pauseReport.thresholds,
        analysisSummary: pauseReport.summary,
      },
    };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(JSON.stringify(payload, null, 2))
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        })
        .catch((err) => {
          console.warn('Clipboard write fallback:', err);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        });
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--nm-bg)', minHeight: '100vh', color: 'var(--nm-text-primary)' }}>
      <Navbar />

      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '1.5rem 1rem' }}>
        {/* Header */}
        <header style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                backgroundColor: 'var(--nm-surface-alt)',
                color: 'var(--nm-accent-secondary)',
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--nm-border)',
              }}
            >
              Engineering Test Lab · Noindex
            </span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0', lineHeight: 1.25 }}>
            Live Speech & End-of-Answer Latency Test
          </h1>
          <p style={{ margin: 0, color: 'var(--nm-text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
            Benchmarking live streaming transcription models, first-word response lag, peak heap memory, and Voice Activity
            Detection pause thresholds for spoken mock interview systems.
          </p>
        </header>

        {/* Engine Switcher */}
        <section
          style={{
            backgroundColor: 'var(--nm-surface)',
            border: '1px solid var(--nm-border)',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Choose Transcription Engine to Test</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--nm-text-muted)' }}>Models load only when selected</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
            {/* Option 1 */}
            <button
              type="button"
              onClick={() => handleSelectEngine('browser')}
              style={{
                textAlign: 'left',
                padding: '0.75rem 0.9rem',
                borderRadius: '6px',
                border: selectedEngineId === 'browser' ? '2px solid var(--nm-accent-secondary)' : '1px solid var(--nm-border)',
                backgroundColor: selectedEngineId === 'browser' ? 'var(--nm-surface-alt)' : 'var(--nm-bg)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <strong style={{ fontSize: '0.95rem' }}>1. Browser Speech</strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--nm-accent-secondary)', fontWeight: 600 }}>0 MB download</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--nm-text-secondary)' }}>
                Web Speech API with <code>interimResults</code> on. Zero download; uses browser speech service.
              </p>
            </button>

            {/* Option 2 */}
            <button
              type="button"
              onClick={() => handleSelectEngine('moonshine')}
              style={{
                textAlign: 'left',
                padding: '0.75rem 0.9rem',
                borderRadius: '6px',
                border: selectedEngineId === 'moonshine' ? '2px solid var(--nm-accent-primary)' : '1px solid var(--nm-border)',
                backgroundColor: selectedEngineId === 'moonshine' ? 'var(--nm-surface-alt)' : 'var(--nm-bg)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <strong style={{ fontSize: '0.95rem' }}>2. Moonshine Tiny</strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--nm-accent-primary)', fontWeight: 600 }}>~64 MB WASM</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--nm-text-secondary)' }}>
                Official Useful Sensors / moonshine-ai streaming tiny on device via WebAssembly.
              </p>
            </button>

            {/* Option 3 */}
            <button
              type="button"
              onClick={() => handleSelectEngine('sherpa')}
              style={{
                textAlign: 'left',
                padding: '0.75rem 0.9rem',
                borderRadius: '6px',
                border: selectedEngineId === 'sherpa' ? '2px solid var(--nm-accent-warn)' : '1px solid var(--nm-border)',
                backgroundColor: selectedEngineId === 'sherpa' ? 'var(--nm-surface-alt)' : 'var(--nm-bg)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <strong style={{ fontSize: '0.95rem' }}>3. sherpa-onnx</strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--nm-accent-warn)', fontWeight: 600 }}>~84 MB WASM</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--nm-text-secondary)' }}>
                k2-fsa WebAssembly streaming English model (Zipformer GigaSpeech / 20M).
              </p>
            </button>

            {/* Option 4 */}
            <button
              type="button"
              onClick={() => handleSelectEngine('moonshine-single')}
              style={{
                textAlign: 'left',
                padding: '0.75rem 0.9rem',
                borderRadius: '6px',
                border: selectedEngineId === 'moonshine-single' ? '2px solid var(--nm-accent-success)' : '1px solid var(--nm-border)',
                backgroundColor: selectedEngineId === 'moonshine-single' ? 'var(--nm-surface-alt)' : 'var(--nm-bg)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <strong style={{ fontSize: '0.95rem' }}>4. Moonshine Tiny (Single-Threaded)</strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--nm-accent-success)', fontWeight: 600 }}>~28 MB · No COOP/COEP</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--nm-text-secondary)' }}>
                Web Worker single-threaded ONNX Web. Growing audio windows, live partial words & stable settled prefix.
              </p>
            </button>
          </div>

          {/* Privacy & Engine Notice */}
          <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--nm-text-muted)' }}>
            {selectedEngineId === 'browser' ? (
              <span>
                <strong>Privacy note:</strong> Option 1 uses your browser’s speech recognition service (Google/Apple), which
                may send audio remotely for transcription.
              </span>
            ) : (
              <span>
                <strong>Privacy guarantee:</strong> Option {selectedEngineId === 'moonshine' ? '2 (Moonshine)' : selectedEngineId === 'moonshine-single' ? '4 (Moonshine Single-Threaded)' : '3 (sherpa-onnx)'}{' '}
                runs 100% on device. Zero audio or transcript leaves your browser.
              </span>
            )}
          </div>
        </section>

        {/* Microphone Error Alert */}
        {micError && (
          <div
            role="alert"
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#fee2e2',
              border: '1px solid #ef4444',
              color: '#991b1b',
              borderRadius: '6px',
              marginBottom: '1.25rem',
              fontSize: '0.9rem',
            }}
          >
            <strong>Microphone notice:</strong> {micError}
          </div>
        )}

        {/* Engine Error Alert */}
        {currentMetrics.errorMessage && (
          <div
            role="alert"
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#fef3c7',
              border: '1px solid #f59e0b',
              color: '#92400e',
              borderRadius: '6px',
              marginBottom: '1.25rem',
              fontSize: '0.85rem',
              lineHeight: 1.45,
            }}
          >
            <strong>Engine status:</strong> {currentMetrics.errorMessage}
          </div>
        )}

        {/* Test Script Section */}
        <section
          style={{
            backgroundColor: 'var(--nm-surface)',
            border: '1px solid var(--nm-border)',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.25rem',
          }}
        >
          {/* Tabs for Test Mode */}
          <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--nm-border)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setActiveTab('fixed')}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '4px',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                backgroundColor: activeTab === 'fixed' ? 'var(--nm-surface-alt)' : 'transparent',
                color: activeTab === 'fixed' ? 'var(--nm-text-primary)' : 'var(--nm-text-secondary)',
                cursor: 'pointer',
              }}
            >
              Mode A: Fixed Paragraph (WER Accuracy)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('free')}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '4px',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                backgroundColor: activeTab === 'free' ? 'var(--nm-surface-alt)' : 'transparent',
                color: activeTab === 'free' ? 'var(--nm-text-primary)' : 'var(--nm-text-secondary)',
                cursor: 'pointer',
              }}
            >
              Mode B: Spoken Answer Prompt
            </button>
          </div>

          {activeTab === 'fixed' ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--nm-text-muted)' }}>
                  Read this paragraph aloud to compute real-time Word Error Rate (WER) against reference ground truth:
                </p>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {FIXED_READING_PARAGRAPHS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      data-testid={`select-paragraph-${p.id}`}
                      onClick={() => setSelectedParagraphId(p.id)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        borderRadius: '4px',
                        border: '1px solid var(--nm-border)',
                        backgroundColor: selectedParagraphId === p.id ? 'var(--nm-accent-primary)' : 'var(--nm-bg)',
                        color: selectedParagraphId === p.id ? '#ffffff' : 'var(--nm-text-muted)',
                        cursor: 'pointer',
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <blockquote
                style={{
                  margin: '0 0 0.75rem 0',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--nm-bg)',
                  borderLeft: '4px solid var(--nm-accent-secondary)',
                  borderRadius: '0 6px 6px 0',
                  fontStyle: 'italic',
                  fontSize: '0.95rem',
                  lineHeight: 1.5,
                }}
              >
                “{activeParagraph.text}”
              </blockquote>
            </div>
          ) : (
            <div>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--nm-text-muted)' }}>
                Spoken interview prompt (test thinking pauses and speech latency):
              </p>
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--nm-bg)',
                  borderLeft: '4px solid var(--nm-accent-primary)',
                  borderRadius: '0 6px 6px 0',
                  fontWeight: 600,
                  fontSize: '1rem',
                }}
              >
                {FREE_ANSWER_PROMPT}
              </div>
            </div>
          )}

          {/* Audio & Recognition Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            {!isRecording ? (
              <button
                type="button"
                data-testid="button-start-test"
                onClick={handleStart}
                disabled={currentMetrics.status === 'loading'}
                style={{
                  padding: '0.6rem 1.25rem',
                  backgroundColor: currentMetrics.status === 'loading' ? 'var(--nm-text-muted)' : 'var(--nm-accent-primary)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: currentMetrics.status === 'loading' ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ffffff' }} />
                {currentMetrics.status === 'loading'
                  ? `Loading Model (${currentMetrics.downloadProgressPct}%)...`
                  : 'Start Microphone Test'}
              </button>
            ) : (
              <button
                type="button"
                data-testid="button-stop-test"
                onClick={handleStop}
                style={{
                  padding: '0.6rem 1.25rem',
                  backgroundColor: 'var(--nm-accent-danger)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span style={{ width: '10px', height: '10px', backgroundColor: '#ffffff' }} />
                Stop Microphone
              </button>
            )}

            {/* Volume indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '160px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--nm-text-muted)' }}>Mic:</span>
              <div
                style={{
                  flex: 1,
                  height: '8px',
                  backgroundColor: 'var(--nm-border)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${audioLevel}%`,
                    backgroundColor: audioLevel > 50 ? 'var(--nm-accent-warn)' : 'var(--nm-accent-primary)',
                    transition: 'width 0.08s ease-out',
                  }}
                />
              </div>
              <span style={{ fontSize: '0.75rem', minWidth: '35px', textAlign: 'right', color: 'var(--nm-text-muted)' }}>
                {audioLevel}%
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopyResults}
              style={{
                padding: '0.55rem 0.9rem',
                backgroundColor: 'var(--nm-surface-alt)',
                border: '1px solid var(--nm-border)',
                color: 'var(--nm-text-primary)',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              {copied ? '✓ JSON Copied!' : 'Copy Results (JSON)'}
            </button>
          </div>
        </section>

        {/* Live Metrics Grid */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1.25rem',
          }}
        >
          {/* Time to First Word */}
          <div data-testid="metric-first-word" style={{ backgroundColor: 'var(--nm-surface)', border: '1px solid var(--nm-border)', borderRadius: '6px', padding: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--nm-text-muted)', display: 'block' }}>First Word Lag</span>
            <strong style={{ fontSize: '1.2rem', color: 'var(--nm-accent-primary)' }}>
              {currentMetrics.timeToFirstWordMs !== null ? `${currentMetrics.timeToFirstWordMs} ms` : '—'}
            </strong>
          </div>

          {/* Live Audio Lag */}
          <div data-testid="metric-speech-lag" style={{ backgroundColor: 'var(--nm-surface)', border: '1px solid var(--nm-border)', borderRadius: '6px', padding: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--nm-text-muted)', display: 'block' }}>Lag Behind Speech</span>
            <strong style={{ fontSize: '1.2rem', color: 'var(--nm-accent-secondary)' }}>
              {currentMetrics.lagBehindSpeechMs !== null ? `${currentMetrics.lagBehindSpeechMs} ms` : '—'}
            </strong>
          </div>

          {/* Download Size */}
          <div data-testid="metric-download-bytes" style={{ backgroundColor: 'var(--nm-surface)', border: '1px solid var(--nm-border)', borderRadius: '6px', padding: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--nm-text-muted)', display: 'block' }}>Download Bytes</span>
            <strong style={{ fontSize: '1.2rem' }}>
              {currentMetrics.downloadBytes > 0
                ? `${(currentMetrics.downloadBytes / (1024 * 1024)).toFixed(1)} MB`
                : '0 KB'}
            </strong>
          </div>

          {/* Model Load Time */}
          <div data-testid="metric-load-time" style={{ backgroundColor: 'var(--nm-surface)', border: '1px solid var(--nm-border)', borderRadius: '6px', padding: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--nm-text-muted)', display: 'block' }}>Model Load Time</span>
            <strong style={{ fontSize: '1.2rem' }}>
              {currentMetrics.loadTimeMs !== null ? `${currentMetrics.loadTimeMs} ms` : '0 ms'}
            </strong>
          </div>

          {/* Peak JS Heap */}
          <div data-testid="metric-peak-heap" style={{ backgroundColor: 'var(--nm-surface)', border: '1px solid var(--nm-border)', borderRadius: '6px', padding: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--nm-text-muted)', display: 'block' }}>Peak JS Heap</span>
            <strong style={{ fontSize: '1.2rem' }}>
              {currentMetrics.peakJSHeapMB !== null ? `${currentMetrics.peakJSHeapMB} MB` : 'N/A'}
            </strong>
          </div>

          {/* Accuracy (WER) if in fixed mode */}
          {activeTab === 'fixed' && (
            <div data-testid="metric-wer" style={{ backgroundColor: 'var(--nm-surface)', border: '1px solid var(--nm-border)', borderRadius: '6px', padding: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--nm-text-muted)', display: 'block' }}>Word Error Rate</span>
              <strong
                style={{
                  fontSize: '1.2rem',
                  color: werResult.werPercent < 15 ? 'var(--nm-accent-primary)' : 'var(--nm-accent-danger)',
                }}
              >
                {werResult.hypothesisWordCount > 0 ? `${werResult.werPercent}%` : '—'}
              </strong>
            </div>
          )}

          {/* Update Interval & Word Revisions (Option 4 / Single-Threaded) */}
          {selectedEngineId === 'moonshine-single' && (
            <>
              <div data-testid="metric-update-interval" style={{ backgroundColor: 'var(--nm-surface)', border: '1px solid var(--nm-border)', borderRadius: '6px', padding: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--nm-text-muted)', display: 'block' }}>Update Interval</span>
                <strong style={{ fontSize: '1.2rem', color: 'var(--nm-accent-secondary)' }}>
                  {currentMetrics.updateIntervalMs !== undefined && currentMetrics.updateIntervalMs !== null
                    ? `${currentMetrics.updateIntervalMs} ms`
                    : '—'}
                </strong>
              </div>
              <div data-testid="metric-word-revisions" style={{ backgroundColor: 'var(--nm-surface)', border: '1px solid var(--nm-border)', borderRadius: '6px', padding: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--nm-text-muted)', display: 'block' }}>Earlier Word Changes</span>
                <strong style={{ fontSize: '1.2rem', color: (currentMetrics.earlierWordRevisions ?? 0) === 0 ? 'var(--nm-accent-success)' : 'var(--nm-accent-warn)' }}>
                  {currentMetrics.earlierWordRevisions ?? 0}
                </strong>
              </div>
            </>
          )}
        </section>

        {/* Live Partial & Final Transcript */}
        <section
          style={{
            backgroundColor: 'var(--nm-surface)',
            border: '1px solid var(--nm-border)',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Live Transcript Output</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--nm-text-muted)' }}>
              Engine: {currentEngine.name} ({currentMetrics.device})
            </span>
          </div>

          <div
            data-testid="live-transcript"
            tabIndex={0}
            role="region"
            aria-label="Live spoken transcript"
            style={{
              minHeight: '110px',
              backgroundColor: 'var(--nm-bg)',
              border: '1px solid var(--nm-border)',
              borderRadius: '6px',
              padding: '0.75rem 1rem',
              fontSize: '1rem',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {currentMetrics.partialText || currentMetrics.finalText ? (
              <span>
                {currentMetrics.finalText && currentMetrics.partialText.startsWith(currentMetrics.finalText) ? (
                  <>
                    <span>{currentMetrics.finalText}</span>
                    {currentMetrics.partialText.length > currentMetrics.finalText.length && (
                      <span style={{ color: 'var(--nm-accent-secondary)', marginLeft: '0.25rem', fontWeight: 500 }}>
                        {currentMetrics.partialText.slice(currentMetrics.finalText.length).trim()}
                      </span>
                    )}
                  </>
                ) : (
                  <span>{currentMetrics.partialText || currentMetrics.finalText}</span>
                )}
              </span>
            ) : (
              <span style={{ color: 'var(--nm-text-muted)', fontStyle: 'italic' }}>
                {isRecording
                  ? 'Listening for speech… speak into the microphone.'
                  : 'Click “Start Microphone Test” and speak to benchmark live transcription.'}
              </span>
            )}
          </div>

          {/* WER Breakdown when in fixed reading mode */}
          {activeTab === 'fixed' && werResult.hypothesisWordCount > 0 && (
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--nm-text-muted)', flexWrap: 'wrap' }}>
              <span>Correct: <strong>{werResult.correct}</strong></span>
              <span>Substitutions: <strong>{werResult.substitutions}</strong></span>
              <span>Deletions: <strong>{werResult.deletions}</strong></span>
              <span>Insertions: <strong>{werResult.insertions}</strong></span>
              <span>Words recognized: <strong>{werResult.hypothesisWordCount} / {werResult.referenceWordCount}</strong></span>
            </div>
          )}
        </section>

        {/* End-of-Answer Detection (Silero VAD & Pause Analysis) */}
        <section
          style={{
            backgroundColor: 'var(--nm-surface)',
            border: '1px solid var(--nm-border)',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>End-of-Answer Voice Activity Detection</h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--nm-text-muted)' }}>
                Simulating answer endings at 1.5s, 2.5s, 4.0s, and 6.0s pauses without stopping audio
              </span>
            </div>
            <div style={{ fontSize: '0.85rem' }}>
              Silence: <strong style={{ color: pauseReport.currentSilenceSeconds > 1.5 ? 'var(--nm-accent-warn)' : 'var(--nm-text-primary)' }}>{pauseReport.currentSilenceSeconds}s</strong>
            </div>
          </div>

          {/* Live Silence Progress Bar */}
          <div style={{ height: '8px', backgroundColor: 'var(--nm-border)', borderRadius: '4px', overflow: 'hidden', marginBottom: '1rem' }}>
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, (pauseReport.currentSilenceSeconds / 6.0) * 100)}%`,
                backgroundColor:
                  pauseReport.currentSilenceSeconds >= 4.0
                    ? 'var(--nm-accent-primary)'
                    : pauseReport.currentSilenceSeconds >= 2.5
                    ? 'var(--nm-accent-warn)'
                    : 'var(--nm-accent-secondary)',
                transition: 'width 0.05s linear',
              }}
            />
          </div>

          {/* Pause Thresholds Matrix */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            {[1.5, 2.5, 4.0, 6.0].map((t) => {
              const state = pauseReport.thresholds[t];
              const isCutIn = state.cutInCount > 0;

              return (
                <div
                  key={t}
                  style={{
                    backgroundColor: 'var(--nm-bg)',
                    border: '1px solid var(--nm-border)',
                    borderRadius: '6px',
                    padding: '0.75rem',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{t}s Pause</span>
                    {state.isCurrentlyTriggered && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          padding: '0.1rem 0.35rem',
                          borderRadius: '3px',
                          backgroundColor: 'var(--nm-accent-warn)',
                          color: '#ffffff',
                          fontWeight: 700,
                        }}
                      >
                        REACHED
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    Triggered: <strong>{state.triggerCount}</strong>
                  </div>

                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: isCutIn ? 'var(--nm-accent-danger)' : 'var(--nm-accent-primary)',
                      fontWeight: 600,
                    }}
                  >
                    {isCutIn ? `Cut in: ${state.cutInCount} time${state.cutInCount > 1 ? 's' : ''}!` : 'No cut-in'}
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--nm-text-muted)', marginTop: '0.25rem' }}>
                    Clean ends: <strong>{state.cleanEndCount}</strong>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary verdict */}
          <div
            style={{
              padding: '0.6rem 0.85rem',
              backgroundColor: 'var(--nm-surface-alt)',
              borderRadius: '6px',
              fontSize: '0.85rem',
              color: 'var(--nm-text-primary)',
            }}
          >
            <strong>Pause Analysis:</strong> {pauseReport.summary}
          </div>
        </section>

        {/* Environmental Metadata */}
        <footer
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem',
            color: 'var(--nm-text-muted)',
            flexWrap: 'wrap',
            gap: '0.5rem',
            paddingTop: '0.5rem',
          }}
        >
          <span>Detected browser: <strong>{detectBrowser()}</strong></span>
          <span>Runtime: <strong>{currentMetrics.device}</strong></span>
          <span>Results stay on device</span>
        </footer>
      </main>
    </div>
  );
}
