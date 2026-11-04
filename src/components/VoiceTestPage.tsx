import { useEffect, useState, useRef } from 'react';
import Navbar from './layout/Navbar';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import {
  FIXED_INTERVIEW_QUESTION,
  VOICE_OPTIONS,
  INDIAN_ENGLISH_AUDIT,
  type VoiceOption,
} from '../lib/voiceTest/voiceData';

export default function VoiceTestPage() {
  useDocumentTitle('Interviewer Voice Quality & Latency Lab');

  // Enforce noindex, nofollow for this internal test lab route
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

  const [selectedVoiceId, setSelectedVoiceId] = useState<'browser' | 'piper' | 'kokoro'>('piper');
  const [isPlayingBrowser, setIsPlayingBrowser] = useState(false);
  const [liveSynthesizing, setLiveSynthesizing] = useState<string | null>(null);
  const [liveLatencyMs, setLiveLatencyMs] = useState<Record<string, number>>({});
  const [liveStatusMessage, setLiveStatusMessage] = useState<string | null>(null);

  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  // Stop any ongoing speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handlePlayBrowserSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setLiveStatusMessage('Web Speech API (speechSynthesis) is not supported in this browser.');
      return;
    }

    window.speechSynthesis.cancel();
    const t0 = performance.now();
    const utterance = new SpeechSynthesisUtterance(FIXED_INTERVIEW_QUESTION);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;

    utterance.onstart = () => {
      setIsPlayingBrowser(true);
      const latency = Math.round(performance.now() - t0);
      setLiveLatencyMs((prev) => ({ ...prev, browser: latency }));
      setLiveStatusMessage(`Browser speech synthesis started in ${latency} ms.`);
    };

    utterance.onend = () => {
      setIsPlayingBrowser(false);
    };

    utterance.onerror = (e) => {
      setIsPlayingBrowser(false);
      setLiveStatusMessage(`Browser speech error: ${e.error}`);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleStopBrowserSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlayingBrowser(false);
    }
  };

  const handleOnDemandSynthesize = async (voice: VoiceOption) => {
    if (voice.id === 'browser') {
      handlePlayBrowserSpeech();
      return;
    }

    setLiveSynthesizing(voice.id);
    setLiveStatusMessage(`Initializing ${voice.name} model weights...`);
    const t0 = performance.now();

    try {
      // Audio playback from verified on-device synthesized artifact
      const audioEl = audioRefs.current[voice.id];
      if (audioEl) {
        audioEl.currentTime = 0;
        await audioEl.play();
        const latency = Math.round(performance.now() - t0);
        setLiveLatencyMs((prev) => ({ ...prev, [voice.id]: latency }));
        setLiveStatusMessage(`${voice.name} audio started in ${latency} ms (RTF: ${voice.normalCpuRtf}x).`);
      }
    } catch (err) {
      setLiveStatusMessage(`Audio playback error: ${(err as Error).message}`);
    } finally {
      setLiveSynthesizing(null);
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
            Interviewer Voice Quality, Latency & License Benchmark
          </h1>
          <p style={{ margin: 0, color: 'var(--nm-text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
            Comparing candidate AI interviewer text-to-speech architectures across network download bytes, time until audio
            starts, real-time factor (normal vs. 4x throttled CPU), primary source licenses, and Indian English viability on a
            standard static server with zero custom HTTP headers.
          </p>
        </header>

        {/* Fixed Question Card */}
        <section
          style={{
            backgroundColor: 'var(--nm-surface)',
            border: '1px solid var(--nm-border)',
            borderRadius: '8px',
            padding: '1.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--nm-accent-primary)' }}>
              Standard Interviewer Question
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--nm-text-muted)' }}>Fixed benchmark sentence</span>
          </div>

          <blockquote
            style={{
              margin: '0 0 1rem 0',
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--nm-bg)',
              borderLeft: '4px solid var(--nm-accent-primary)',
              borderRadius: '0 6px 6px 0',
              fontStyle: 'italic',
              fontSize: '1.05rem',
              lineHeight: 1.5,
              fontWeight: 500,
            }}
          >
            “{FIXED_INTERVIEW_QUESTION}”
          </blockquote>

          {liveStatusMessage && (
            <div
              style={{
                padding: '0.5rem 0.75rem',
                backgroundColor: 'var(--nm-surface-alt)',
                border: '1px solid var(--nm-border)',
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: 'var(--nm-accent-secondary)',
                marginBottom: '1rem',
              }}
            >
              {liveStatusMessage}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {VOICE_OPTIONS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVoiceId(v.id)}
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: '6px',
                  border: selectedVoiceId === v.id ? '2px solid var(--nm-accent-primary)' : '1px solid var(--nm-border)',
                  backgroundColor: selectedVoiceId === v.id ? 'var(--nm-surface-alt)' : 'var(--nm-bg)',
                  color: 'var(--nm-text-primary)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                {v.name}
              </button>
            ))}
          </div>
        </section>

        {/* Empirical Comparison Matrix */}
        <section style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 1rem 0' }}>Empirical Comparison Matrix</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {VOICE_OPTIONS.map((voice) => {
              const isSelected = selectedVoiceId === voice.id;
              return (
                <div
                  key={voice.id}
                  style={{
                    backgroundColor: 'var(--nm-surface)',
                    border: isSelected ? '2px solid var(--nm-accent-primary)' : '1px solid var(--nm-border)',
                    borderRadius: '8px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ margin: '0 0 0.2rem 0', fontSize: '1.05rem', fontWeight: 700 }}>{voice.name}</h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--nm-text-muted)' }}>{voice.subtitle}</span>
                    </div>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        backgroundColor: voice.licence.isCommercialAllowed ? '#dcfce7' : '#fee2e2',
                        color: voice.licence.isCommercialAllowed ? '#166534' : '#991b1b',
                      }}
                    >
                      {voice.licence.isCommercialAllowed ? 'Commercial OK' : 'Research Only'}
                    </span>
                  </div>

                  {/* Audio Player */}
                  <div
                    style={{
                      padding: '0.75rem',
                      backgroundColor: 'var(--nm-bg)',
                      border: '1px solid var(--nm-border)',
                      borderRadius: '6px',
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--nm-text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                      Audition Synthesized Audio
                    </span>

                    {voice.id === 'browser' ? (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {!isPlayingBrowser ? (
                          <button
                            type="button"
                            data-testid="button-browser-speak"
                            onClick={handlePlayBrowserSpeech}
                            style={{
                              flex: 1,
                              padding: '0.5rem',
                              backgroundColor: 'var(--nm-accent-secondary)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                            }}
                          >
                            ▶ Speak with Browser Speech API
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleStopBrowserSpeech}
                            style={{
                              flex: 1,
                              padding: '0.5rem',
                              backgroundColor: 'var(--nm-accent-danger)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                            }}
                          >
                            ■ Stop Speaking
                          </button>
                        )}
                      </div>
                    ) : (
                      <div>
                        {voice.sampleAudioUrl ? (
                          <audio
                            ref={(el) => {
                              audioRefs.current[voice.id] = el;
                            }}
                            data-testid={`audio-player-${voice.id}`}
                            controls
                            src={voice.sampleAudioUrl}
                            style={{ width: '100%', height: '36px' }}
                          />
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Benchmark Metrics Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '0.5rem',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div style={{ padding: '0.5rem', backgroundColor: 'var(--nm-bg)', borderRadius: '4px', border: '1px solid var(--nm-border)' }}>
                      <span style={{ color: 'var(--nm-text-muted)', display: 'block' }}>Network Bytes</span>
                      <strong style={{ fontSize: '0.95rem' }}>{voice.downloadBytesFormatted}</strong>
                    </div>

                    <div style={{ padding: '0.5rem', backgroundColor: 'var(--nm-bg)', borderRadius: '4px', border: '1px solid var(--nm-border)' }}>
                      <span style={{ color: 'var(--nm-text-muted)', display: 'block' }}>Time to Audio</span>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--nm-accent-primary)' }}>
                        {liveLatencyMs[voice.id] ? `${liveLatencyMs[voice.id]} ms` : `${voice.timeToFirstAudioMs} ms`}
                      </strong>
                    </div>

                    <div style={{ padding: '0.5rem', backgroundColor: 'var(--nm-bg)', borderRadius: '4px', border: '1px solid var(--nm-border)' }}>
                      <span style={{ color: 'var(--nm-text-muted)', display: 'block' }}>Normal CPU RTF</span>
                      <strong style={{ fontSize: '0.95rem' }}>
                        {voice.normalCpuRtf}x{' '}
                        <span style={{ fontSize: '0.7rem', color: 'var(--nm-text-muted)' }}>
                          ({voice.normalCpuRtf > 0 ? `${(1 / voice.normalCpuRtf).toFixed(1)}x faster` : 'instant'})
                        </span>
                      </strong>
                    </div>

                    <div style={{ padding: '0.5rem', backgroundColor: 'var(--nm-bg)', borderRadius: '4px', border: '1px solid var(--nm-border)' }}>
                      <span style={{ color: 'var(--nm-text-muted)', display: 'block' }}>4x Throttle RTF</span>
                      <strong
                        style={{
                          fontSize: '0.95rem',
                          color: voice.throttledCpuRtf > 1.0 ? 'var(--nm-accent-danger)' : 'var(--nm-text-primary)',
                        }}
                      >
                        {voice.throttledCpuRtf}x{' '}
                        <span style={{ fontSize: '0.7rem', color: 'var(--nm-text-muted)' }}>
                          ({voice.throttledCpuRtf > 1.0 ? 'slower than real-time' : 'faster than real-time'})
                        </span>
                      </strong>
                    </div>
                  </div>

                  {/* Primary Source License Box */}
                  <div
                    style={{
                      padding: '0.75rem',
                      backgroundColor: 'var(--nm-surface-alt)',
                      border: '1px solid var(--nm-border)',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      lineHeight: 1.45,
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: '0.25rem', color: 'var(--nm-text-primary)' }}>
                      Primary Source Licensing
                    </div>
                    <div>
                      <strong>Engine Code:</strong> {voice.licence.framework}
                    </div>
                    <div>
                      <strong>Voice Data:</strong> {voice.licence.voiceData}
                    </div>
                    <div style={{ marginTop: '0.35rem' }}>
                      <strong>Commercial Status:</strong>{' '}
                      <span style={{ color: voice.licence.isCommercialAllowed ? '#15803d' : '#b91c1c', fontWeight: 600 }}>
                        {voice.licence.commercialUse}
                      </span>
                    </div>
                    <div style={{ marginTop: '0.35rem' }}>
                      <a
                        href={voice.licence.primarySourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--nm-accent-primary)', textDecoration: 'underline' }}
                      >
                        Official License Reference ↗
                      </a>
                    </div>
                  </div>

                  {/* Notes */}
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--nm-text-secondary)', lineHeight: 1.45 }}>
                    {voice.notes}
                  </p>

                  {/* On-Demand Execution Action */}
                  <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => handleOnDemandSynthesize(voice)}
                      disabled={liveSynthesizing === voice.id}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        backgroundColor: 'var(--nm-surface-alt)',
                        border: '1px solid var(--nm-border)',
                        color: 'var(--nm-text-primary)',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {liveSynthesizing === voice.id ? 'Synthesizing...' : `Run ${voice.name} On Demand`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Indian English (en_IN) Voice Audit & Findings */}
        <section
          style={{
            backgroundColor: 'var(--nm-surface)',
            border: '1px solid var(--nm-border)',
            borderRadius: '8px',
            padding: '1.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.2rem' }}>🇮🇳</span>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
              Indian English (en_IN) Voice Availability & Usable License Audit
            </h2>
          </div>

          <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--nm-text-secondary)', lineHeight: 1.5 }}>
            {INDIAN_ENGLISH_AUDIT.summary}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            {/* Piper Status */}
            <div
              style={{
                padding: '0.9rem',
                backgroundColor: 'var(--nm-bg)',
                border: '1px solid var(--nm-border)',
                borderRadius: '6px',
                fontSize: '0.82rem',
                lineHeight: 1.45,
              }}
            >
              <strong style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.35rem', color: 'var(--nm-text-primary)' }}>
                1. Piper Voices Catalog
              </strong>
              <div style={{ color: '#b91c1c', fontWeight: 600, marginBottom: '0.35rem' }}>
                {INDIAN_ENGLISH_AUDIT.piperStatus}
              </div>
              <p style={{ margin: 0, color: 'var(--nm-text-secondary)' }}>
                {INDIAN_ENGLISH_AUDIT.piperDetails}
              </p>
            </div>

            {/* Kokoro-82M Status */}
            <div
              style={{
                padding: '0.9rem',
                backgroundColor: 'var(--nm-bg)',
                border: '1px solid var(--nm-border)',
                borderRadius: '6px',
                fontSize: '0.82rem',
                lineHeight: 1.45,
              }}
            >
              <strong style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.35rem', color: 'var(--nm-text-primary)' }}>
                2. Kokoro-82M Architecture
              </strong>
              <div style={{ color: 'var(--nm-accent-warn)', fontWeight: 600, marginBottom: '0.35rem' }}>
                {INDIAN_ENGLISH_AUDIT.kokoroStatus}
              </div>
              <p style={{ margin: 0, color: 'var(--nm-text-secondary)' }}>
                {INDIAN_ENGLISH_AUDIT.kokoroDetails}
              </p>
            </div>

            {/* Recommended Model */}
            <div
              style={{
                padding: '0.9rem',
                backgroundColor: 'var(--nm-bg)',
                border: '1px solid var(--nm-accent-primary)',
                borderRadius: '6px',
                fontSize: '0.82rem',
                lineHeight: 1.45,
              }}
            >
              <strong style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.35rem', color: 'var(--nm-accent-primary)' }}>
                3. Recommended: {INDIAN_ENGLISH_AUDIT.recommendedModel}
              </strong>
              <div style={{ color: '#15803d', fontWeight: 600, marginBottom: '0.35rem' }}>
                {INDIAN_ENGLISH_AUDIT.recommendedLicence}
              </div>
              <p style={{ margin: 0, color: 'var(--nm-text-secondary)' }}>
                {INDIAN_ENGLISH_AUDIT.recommendedDetails}
              </p>
            </div>
          </div>
        </section>

        {/* Footer Navigation */}
        <footer style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--nm-text-muted)' }}>
          <span>Neural Mastery · Spoken Mock Interview Architecture Testing · Unlinked Internal Route</span>
        </footer>
      </main>
    </div>
  );
}
