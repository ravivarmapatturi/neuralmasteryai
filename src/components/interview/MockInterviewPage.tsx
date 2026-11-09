import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../layout/Navbar';
import Markdown from '../content/Markdown';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useFocusMusic } from '../../contexts/FocusMusicContext';
import {
  MOCK_ROLES,
  buildTimedMockPlan,
  evaluateCriteriaChecklist,
  formatTime,
  formatDurationHuman,
  readActiveSession,
  saveActiveSession,
  clearActiveSession,
  readRecentQuestionIds,
  recordRecentQuestionIds,
  saveCompletedSession,
  type MockRole,
  type MockLength,
  type ActiveMockSession,
  type SelfRating,
} from '../../lib/mockInterview/timedMock';
import { speak, stopSpeaking, startRecording, transcribe } from '../../lib/mockInterview/engine';
import './timedMock.css';

type ScreenState = 'setup' | 'interview' | 'scorecard';
type AnswerMode = 'voice' | 'typed';

export default function MockInterviewPage() {
  useDocumentTitle('Timed mock interview — 30 or 60 min role practice');
  const { pause: pauseFocusMusic } = useFocusMusic();

  // Setup options
  const [selectedRole, setSelectedRole] = useState<MockRole>('applied-ai');
  const [selectedLength, setSelectedLength] = useState<MockLength>(30);

  // Active session state
  const [screen, setScreen] = useState<ScreenState>('setup');
  const [session, setSession] = useState<ActiveMockSession | null>(null);
  const [hasSavedSession, setHasSavedSession] = useState(false);

  // Per-question answering state
  const [answerMode, setAnswerMode] = useState<AnswerMode>('voice');
  const [isRecording, setIsRecording] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [questionElapsed, setQuestionElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isMuted, setIsMuted] = useState(false);

  // Active recording & interval refs
  const recordingRef = useRef<Awaited<ReturnType<typeof startRecording>> | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  // Check for in-progress session on initial mount
  useEffect(() => {
    const existing = readActiveSession();
    if (existing) {
      setHasSavedSession(true);
      setSession(existing);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const cleanupAudio = () => {
    if (recordingRef.current) {
      recordingRef.current.cancel();
      recordingRef.current = null;
    }
    stopSpeaking();
  };

  // Timer loop for active interview
  useEffect(() => {
    if (screen !== 'interview' || isPaused || isProcessing) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    timerIntervalRef.current = window.setInterval(() => {
      setQuestionElapsed(prev => prev + 1);
      setSession(prev => {
        if (!prev) return null;
        const updated = {
          ...prev,
          totalElapsedSeconds: prev.totalElapsedSeconds + 1,
        };
        saveActiveSession(updated);
        return updated;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [screen, isPaused, isProcessing]);

  // Read current question aloud when question starts
  useEffect(() => {
    if (screen === 'interview' && session && !isPaused && !isMuted) {
      const currentQ = session.questions[session.currentQuestionIndex];
      if (currentQ) {
        speak(currentQ.title);
      }
    }
  }, [screen, session?.currentQuestionIndex, isPaused, isMuted]);

  // Start new interview
  const handleStartInterview = (role: MockRole, length: MockLength) => {
    pauseFocusMusic();
    cleanupAudio();
    setErrorMessage('');

    const recentIds = readRecentQuestionIds();
    const questions = buildTimedMockPlan(role, length, { recentQuestionIds: recentIds });

    const newSession: ActiveMockSession = {
      id: `mock-${Date.now()}`,
      role,
      roleLabel: MOCK_ROLES[role].label,
      targetMinutes: length,
      startedAt: Date.now(),
      totalElapsedSeconds: 0,
      currentQuestionIndex: 0,
      isPaused: false,
      questions,
      answers: [],
    };

    setSession(newSession);
    saveActiveSession(newSession);
    setScreen('interview');
    setQuestionElapsed(0);
    setTypedAnswer('');
    setIsPaused(false);
    setIsRecording(false);
  };

  // Resume saved session
  const handleResumeSavedSession = () => {
    if (!session) return;
    pauseFocusMusic();
    setScreen('interview');
    setIsPaused(false);
    setQuestionElapsed(0);
    setTypedAnswer('');
  };

  const handleDiscardSavedSession = () => {
    clearActiveSession();
    setHasSavedSession(false);
    setSession(null);
  };

  // Toggle pause
  const handleTogglePause = () => {
    if (isRecording) {
      // Cannot pause during live audio capture without stopping
      handleStopRecording();
    }
    stopSpeaking();
    const nextPaused = !isPaused;
    setIsPaused(nextPaused);
    if (session) {
      const updated = { ...session, isPaused: nextPaused };
      setSession(updated);
      saveActiveSession(updated);
    }
  };

  // Start voice recording
  const handleStartRecording = async () => {
    setErrorMessage('');
    stopSpeaking();
    try {
      const rec = await startRecording();
      recordingRef.current = rec;
      setIsRecording(true);
    } catch {
      setErrorMessage('Microphone access unavailable or denied. You can type your answer instead.');
      setAnswerMode('typed');
    }
  };

  // Stop voice recording and transcribe
  const handleStopRecording = async () => {
    if (!recordingRef.current) return;
    const rec = recordingRef.current;
    recordingRef.current = null;
    setIsRecording(false);
    setIsProcessing(true);

    try {
      const { audio } = await rec.stop();
      const transcript = await transcribe(audio);
      await recordCurrentAnswer(transcript || '(No speech detected)');
    } catch {
      setErrorMessage('Could not process speech recording. You can type your answer instead.');
      setAnswerMode('typed');
      setIsProcessing(false);
    }
  };

  // Submit typed answer
  const handleSubmitTypedAnswer = async () => {
    if (!typedAnswer.trim()) return;
    setIsProcessing(true);
    await recordCurrentAnswer(typedAnswer.trim());
  };

  // Record answer and transition
  const recordCurrentAnswer = async (transcript: string) => {
    if (!session) return;
    const currentQ = session.questions[session.currentQuestionIndex];
    if (!currentQ) return;

    // Evaluate criteria checklist
    const evaluatedCriteria = evaluateCriteriaChecklist(transcript, currentQ.criteria);

    const answerRecord = {
      questionId: currentQ.id,
      transcript,
      seconds: questionElapsed,
      selfRating: undefined,
      evaluatedCriteria,
    };

    const nextAnswers = [...session.answers, answerRecord];
    const nextIndex = session.currentQuestionIndex + 1;

    if (nextIndex < session.questions.length) {
      // Move to next question
      const updated: ActiveMockSession = {
        ...session,
        currentQuestionIndex: nextIndex,
        answers: nextAnswers,
      };
      setSession(updated);
      saveActiveSession(updated);
      setQuestionElapsed(0);
      setTypedAnswer('');
      setIsProcessing(false);
      setIsRecording(false);
    } else {
      // Completed all questions -> Go to scorecard
      const completed: ActiveMockSession = {
        ...session,
        currentQuestionIndex: nextIndex,
        answers: nextAnswers,
        completedAt: Date.now(),
      };
      setSession(completed);
      clearActiveSession();
      saveCompletedSession(completed);
      recordRecentQuestionIds(session.questions.map(q => q.id));
      setIsProcessing(false);
      setScreen('scorecard');
    }
  };

  // Skip question if needed
  const handleSkipQuestion = async () => {
    cleanupAudio();
    await recordCurrentAnswer('(Skipped)');
  };

  // Update candidate self-rating on scorecard
  const handleUpdateRating = (questionId: string, rating: SelfRating) => {
    if (!session) return;
    const updatedAnswers = session.answers.map(a => {
      if (a.questionId === questionId) {
        return { ...a, selfRating: rating };
      }
      return a;
    });

    const updatedSession: ActiveMockSession = {
      ...session,
      answers: updatedAnswers,
    };
    setSession(updatedSession);
    saveCompletedSession(updatedSession);
  };

  // Scorecard tally
  const ratingsTally = {
    gotIt: session?.answers.filter(a => a.selfRating === 'got-it').length || 0,
    partly: session?.answers.filter(a => a.selfRating === 'partly').length || 0,
    missedIt: session?.answers.filter(a => a.selfRating === 'missed-it').length || 0,
    unrated: session?.answers.filter(a => !a.selfRating).length || 0,
  };

  const currentQuestion = session?.questions[session.currentQuestionIndex];
  const softLimit = currentQuestion?.softLimitSeconds || 300;
  const isOvertime = questionElapsed > softLimit;
  const totalTargetSeconds = (session?.targetMinutes || 30) * 60;
  const totalRemainingSeconds = Math.max(0, totalTargetSeconds - (session?.totalElapsedSeconds || 0));

  return (
    <div className="nb-theme" style={{ minHeight: '100vh' }}>
      <Navbar />
      <main className="nm-timed-mock-shell">
        <p className="nm-mock-eyebrow">
          <Link to="/interview">INTERVIEW</Link> / TIMED MOCK
        </p>

        {/* ================= STAGE 1: SETUP ================= */}
        {screen === 'setup' && (
          <section aria-labelledby="timed-mock-heading">
            <h1 id="timed-mock-heading" className="nm-mock-title">
              Timed mock interview
            </h1>
            <p className="nm-mock-lede">
              Practise under real interview pressure. Pick a role and duration to get a curated mix of screen, depth, system design, debugging, and behavioral questions. Answers are evaluated only at the end on your scorecard.
            </p>

            {hasSavedSession && session && session.currentQuestionIndex < session.questions.length && (
              <div className="nm-mock-resume-banner" role="region" aria-label="In-progress session detected">
                <div className="nm-mock-resume-banner-header">In-progress interview found</div>
                <p className="nm-mock-resume-banner-text">
                  You have an unfinished session for <strong>{session.roleLabel}</strong> ({session.targetMinutes} min, Question {session.currentQuestionIndex + 1} of {session.questions.length}).
                </p>
                <div className="nm-mock-resume-actions">
                  <button
                    type="button"
                    className="nm-mock-btn-primary"
                    onClick={handleResumeSavedSession}
                  >
                    Resume session →
                  </button>
                  <button
                    type="button"
                    className="nm-mock-btn-secondary"
                    onClick={handleDiscardSavedSession}
                  >
                    Discard & start new
                  </button>
                </div>
              </div>
            )}

            <div className="nm-mock-section">
              <h2 className="nm-mock-section-title">1. Select your target role</h2>
              <div className="nm-mock-role-grid" role="radiogroup" aria-label="Target role">
                {(Object.keys(MOCK_ROLES) as MockRole[]).map(roleKey => {
                  const r = MOCK_ROLES[roleKey];
                  const isSelected = selectedRole === roleKey;
                  return (
                    <button
                      key={roleKey}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      className={`nm-mock-role-card${isSelected ? ' is-active' : ''}`}
                      onClick={() => setSelectedRole(roleKey)}
                    >
                      <div className="nm-mock-role-card-header">
                        <span className="nm-mock-role-name">{r.label}</span>
                        {isSelected && <span className="nm-mock-role-badge">Selected</span>}
                      </div>
                      <p className="nm-mock-role-desc">{r.tagline}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="nm-mock-section">
              <h2 className="nm-mock-section-title">2. Choose interview duration</h2>
              <div className="nm-mock-length-group" role="radiogroup" aria-label="Interview duration">
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedLength === 30}
                  className={`nm-mock-length-btn${selectedLength === 30 ? ' is-active' : ''}`}
                  onClick={() => setSelectedLength(30)}
                >
                  <span className="nm-mock-length-name">30 minutes</span>
                  <span className="nm-mock-length-meta">5 questions · 1 screen, 1 depth, 1 system design, 1 debugging, 1 behavioral</span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedLength === 60}
                  className={`nm-mock-length-btn${selectedLength === 60 ? ' is-active' : ''}`}
                  onClick={() => setSelectedLength(60)}
                >
                  <span className="nm-mock-length-name">60 minutes</span>
                  <span className="nm-mock-length-meta">10 questions · 2 screen, 2 depth, 2 system design, 2 debugging, 2 behavioral</span>
                </button>
              </div>
            </div>

            <div className="nm-mock-guidelines">
              <ul className="nm-mock-guidelines-list">
                <li><strong>Voice or typing:</strong> The interviewer reads each question aloud; answer out loud or type if preferred.</li>
                <li><strong>Realistic timing:</strong> A soft per-question limit suggests when to wrap up without cutting you off.</li>
                <li><strong>No spoilers:</strong> Model answers and evaluation checklists are revealed only on your final scorecard.</li>
                <li><strong>Self-assessment:</strong> Rate each answer at the end (Got it / Partly / Missed it). No artificial percent grades.</li>
                <li><strong>Private & resumable:</strong> Runs client-side; reload or pause anytime to take a breath.</li>
              </ul>
            </div>

            <button
              type="button"
              className="nm-mock-btn-primary"
              onClick={() => handleStartInterview(selectedRole, selectedLength)}
            >
              Start {selectedLength}-minute mock interview →
            </button>
          </section>
        )}

        {/* ================= STAGE 2: ACTIVE INTERVIEW ================= */}
        {screen === 'interview' && session && currentQuestion && (
          <section aria-labelledby="active-question-heading">
            <header className="nm-mock-active-header">
              <div className="nm-mock-meta-bar">
                <div className="nm-mock-meta-left">
                  <span className="nm-mock-tag">{session.roleLabel}</span>
                  <span className="nm-mock-tag nm-mock-round-tag">{currentQuestion.roundLabel}</span>
                  <span className="nm-mock-tag">
                    Question {session.currentQuestionIndex + 1} of {session.questions.length}
                  </span>
                </div>
                <div className="nm-mock-meta-right">
                  <span className="nm-mock-total-timer" title="Total interview time remaining">
                    ⏱ {formatTime(totalRemainingSeconds)} left
                  </span>
                  <button
                    type="button"
                    className="nm-mock-pause-btn"
                    onClick={handleTogglePause}
                  >
                    {isPaused ? '▶ Resume' : '⏸ Pause'}
                  </button>
                </div>
              </div>

              {/* Step indicator */}
              <div className="nm-mock-progress-strip" aria-hidden="true">
                {session.questions.map((_, idx) => (
                  <span
                    key={idx}
                    className={`nm-mock-step-dot${
                      idx < session.currentQuestionIndex
                        ? ' is-completed'
                        : idx === session.currentQuestionIndex
                        ? ' is-current'
                        : ''
                    }`}
                  />
                ))}
              </div>
            </header>

            {isPaused ? (
              <div className="nm-mock-paused-overlay" role="dialog" aria-label="Interview paused">
                <h2 className="nm-mock-paused-title">Interview paused</h2>
                <p className="nm-mock-paused-text">
                  All timers and audio are paused. Take a moment to think or step away. Your progress is saved.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="nm-mock-btn-primary"
                    onClick={handleTogglePause}
                  >
                    Resume interview →
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Question Card */}
                <div className="nm-mock-question-card">
                  <h2 id="active-question-heading" className="nm-mock-question-title">
                    {currentQuestion.title}
                  </h2>
                  <div className="nm-mock-audio-control">
                    <button
                      type="button"
                      className="nm-mock-speak-btn"
                      onClick={() => speak(currentQuestion.title)}
                      disabled={isRecording}
                    >
                      🔊 Read question aloud
                    </button>
                    <button
                      type="button"
                      className="nm-mock-speak-btn"
                      onClick={() => {
                        stopSpeaking();
                        setIsMuted(!isMuted);
                      }}
                    >
                      {isMuted ? '🔇 Questions muted' : '🔈 Questions unmuted'}
                    </button>
                  </div>
                </div>

                {/* Per-Question Timer & Soft Limit */}
                <div className="nm-mock-timer-panel">
                  <div className="nm-mock-timer-display">
                    <span className={`nm-mock-timer-digits${isOvertime ? ' is-overtime' : ''}`}>
                      {formatTime(questionElapsed)}
                    </span>
                    <span className="nm-mock-timer-limit">
                      / suggested {formatTime(softLimit)}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--nm-text-secondary)' }}>
                    Round: {currentQuestion.roundLabel}
                  </span>
                </div>

                {isOvertime && (
                  <div className="nm-mock-soft-limit-alert" role="status">
                    <span>⚠️</span>
                    <span>
                      You have passed the suggested {formatDurationHuman(softLimit)} mark. Wrap up your thought and move to the next question when ready.
                    </span>
                  </div>
                )}

                {errorMessage && (
                  <div className="nm-mock-soft-limit-alert" style={{ borderColor: 'var(--nm-accent-danger)' }} role="alert">
                    <span>⚠️</span>
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Answer Mode Toggle */}
                <div className="nm-mock-mode-tabs" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={answerMode === 'voice'}
                    className={`nm-mock-tab-btn${answerMode === 'voice' ? ' is-active' : ''}`}
                    onClick={() => setAnswerMode('voice')}
                    disabled={isRecording}
                  >
                    Answer by voice
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={answerMode === 'typed'}
                    className={`nm-mock-tab-btn${answerMode === 'typed' ? ' is-active' : ''}`}
                    onClick={() => {
                      if (isRecording) handleStopRecording();
                      setAnswerMode('typed');
                    }}
                  >
                    Type your answer
                  </button>
                </div>

                {/* Voice Input Panel */}
                {answerMode === 'voice' && (
                  <div className="nm-mock-voice-panel">
                    {!isRecording ? (
                      <button
                        type="button"
                        className="nm-mock-mic-button"
                        onClick={handleStartRecording}
                        disabled={isProcessing}
                      >
                        <span aria-hidden="true">●</span>
                        <span>Start answering</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="nm-mock-mic-button is-recording"
                        onClick={handleStopRecording}
                        disabled={isProcessing}
                      >
                        <span className="nm-mock-pulse-dot" aria-hidden="true" />
                        <span>Finish answer ({formatTime(questionElapsed)}) →</span>
                      </button>
                    )}
                    <p className="nm-mock-voice-hint">
                      {isRecording
                        ? 'Listening to your answer on-device. State your approach, trade-offs, and verification.'
                        : 'Take a breath to organize your thoughts, then press start and answer out loud.'}
                    </p>
                  </div>
                )}

                {/* Typed Input Panel */}
                {answerMode === 'typed' && (
                  <div className="nm-mock-typed-panel">
                    <label htmlFor="mock-typed-answer" className="sr-only">Type your answer</label>
                    <textarea
                      id="mock-typed-answer"
                      className="nm-mock-textarea"
                      placeholder="Type your response as you would explain it to an interviewer..."
                      value={typedAnswer}
                      onChange={e => setTypedAnswer(e.target.value)}
                      disabled={isProcessing}
                    />
                    <div className="nm-mock-typed-meta">
                      <span>{typedAnswer.trim() ? typedAnswer.trim().split(/\s+/).length : 0} words</span>
                      <span>
                        ~{Math.max(1, Math.round(((typedAnswer.trim().split(/\s+/).length || 0) / 140) * 60))}s estimated speaking time
                      </span>
                    </div>
                  </div>
                )}

                {/* Footer Navigation */}
                <div className="nm-mock-nav-actions">
                  <button
                    type="button"
                    className="nm-mock-btn-secondary"
                    onClick={handleSkipQuestion}
                    disabled={isProcessing || isRecording}
                  >
                    Skip question
                  </button>

                  {answerMode === 'typed' ? (
                    <button
                      type="button"
                      className="nm-mock-btn-primary"
                      onClick={handleSubmitTypedAnswer}
                      disabled={isProcessing || !typedAnswer.trim()}
                    >
                      {session.currentQuestionIndex + 1 === session.questions.length
                        ? 'Finish interview & see scorecard →'
                        : 'Submit answer & next question →'}
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.875rem', color: 'var(--nm-text-secondary)' }}>
                      Press “Finish answer” above when done speaking.
                    </span>
                  )}
                </div>
              </>
            )}
          </section>
        )}

        {/* ================= STAGE 3: SCORECARD ================= */}
        {screen === 'scorecard' && session && (
          <section aria-labelledby="scorecard-heading">
            <header className="nm-mock-scorecard-header">
              <h1 id="scorecard-heading" className="nm-mock-title">
                Interview scorecard
              </h1>
              <p className="nm-mock-lede">
                Review your session for <strong>{session.roleLabel}</strong> ({session.targetMinutes} min format). Check your transcripts against the model answers and key points, then rate each answer honestly.
              </p>

              {/* Summary Stats without percent grade and without pass prediction */}
              <div className="nm-mock-summary-stats">
                <div className="nm-mock-stat-box">
                  <span className="nm-mock-stat-value">{session.answers.length} of {session.questions.length}</span>
                  <span className="nm-mock-stat-label">Questions answered</span>
                </div>
                <div className="nm-mock-stat-box">
                  <span className="nm-mock-stat-value">{formatDurationHuman(session.totalElapsedSeconds)}</span>
                  <span className="nm-mock-stat-label">Total time taken</span>
                </div>
                <div className="nm-mock-stat-box">
                  <span className="nm-mock-stat-value">{session.targetMinutes}m</span>
                  <span className="nm-mock-stat-label">Session target</span>
                </div>
              </div>

              {/* Self-Rating Tally */}
              <div className="nm-mock-ratings-tally" role="region" aria-label="Self-assessment tally">
                <span className="nm-mock-tally-pill" style={{ color: '#059669' }}>
                  ✓ {ratingsTally.gotIt} Got it
                </span>
                <span className="nm-mock-tally-pill" style={{ color: '#d97706' }}>
                  ~ {ratingsTally.partly} Partly
                </span>
                <span className="nm-mock-tally-pill" style={{ color: '#dc2626' }}>
                  ✗ {ratingsTally.missedIt} Missed it
                </span>
                {ratingsTally.unrated > 0 && (
                  <span className="nm-mock-tally-pill" style={{ color: 'var(--nm-text-secondary)' }}>
                    ○ {ratingsTally.unrated} Unrated
                  </span>
                )}
              </div>
            </header>

            {/* Questions breakdown */}
            <div className="nm-mock-scorecard-list">
              {session.questions.map((q, idx) => {
                const answerRecord = session.answers.find(a => a.questionId === q.id);
                const transcript = answerRecord?.transcript || '(No answer recorded)';
                const secondsTaken = answerRecord?.seconds || 0;
                const criteriaResults = answerRecord?.evaluatedCriteria || [];

                return (
                  <details
                    key={q.id}
                    className="nm-mock-question-report"
                    open={idx === 0}
                  >
                    <summary className="nm-mock-report-summary">
                      <div className="nm-mock-report-summary-left">
                        <span className="nm-mock-report-qnum">
                          Question {idx + 1} · {q.roundLabel}
                        </span>
                        <h3 className="nm-mock-report-title">{q.title}</h3>
                      </div>
                      <div className="nm-mock-report-summary-right">
                        <span style={{ fontSize: '0.8125rem', color: 'var(--nm-text-secondary)' }}>
                          ⏱ {formatDurationHuman(secondsTaken)}
                        </span>
                        {answerRecord?.selfRating && (
                          <span
                            className="nm-mock-check-badge"
                            style={{
                              background:
                                answerRecord.selfRating === 'got-it'
                                  ? 'color-mix(in srgb, #10b981 18%, transparent)'
                                  : answerRecord.selfRating === 'partly'
                                  ? 'color-mix(in srgb, #f59e0b 18%, transparent)'
                                  : 'color-mix(in srgb, #ef4444 18%, transparent)',
                              color:
                                answerRecord.selfRating === 'got-it'
                                  ? '#059669'
                                  : answerRecord.selfRating === 'partly'
                                  ? '#d97706'
                                  : '#dc2626',
                            }}
                          >
                            {answerRecord.selfRating === 'got-it'
                              ? 'Got it'
                              : answerRecord.selfRating === 'partly'
                              ? 'Partly'
                              : 'Missed it'}
                          </span>
                        )}
                      </div>
                    </summary>

                    <div className="nm-mock-report-body">
                      {/* Candidate's transcript */}
                      <div>
                        <h4 className="nm-mock-report-section-title">Your answer</h4>
                        <blockquote className="nm-mock-transcript-box">
                          {transcript}
                        </blockquote>
                      </div>

                      {/* Covered / Not detected checklist where key points exist */}
                      {criteriaResults.length > 0 && (
                        <div>
                          <h4 className="nm-mock-report-section-title">Key points checklist</h4>
                          <ul className="nm-mock-checklist">
                            {criteriaResults.map((item, cIdx) => (
                              <li key={cIdx} className="nm-mock-checklist-item">
                                <span
                                  className={`nm-mock-check-badge${
                                    item.covered ? ' is-covered' : ' is-missed'
                                  }`}
                                >
                                  {item.covered ? '✓ Covered' : '○ Not detected'}
                                </span>
                                <div>
                                  <div>{item.point}</div>
                                  {item.evidence && (
                                    <div className="nm-mock-evidence-quote">
                                      “{item.evidence}”
                                    </div>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Candidate self-rating */}
                      <div>
                        <h4 className="nm-mock-report-section-title">Your self-assessment</h4>
                        <div
                          className="nm-mock-self-rating-group"
                          role="radiogroup"
                          aria-label={`Self-rating for question ${idx + 1}`}
                        >
                          <button
                            type="button"
                            role="radio"
                            aria-checked={answerRecord?.selfRating === 'got-it'}
                            className={`nm-mock-rating-btn got-it${
                              answerRecord?.selfRating === 'got-it' ? ' is-active' : ''
                            }`}
                            onClick={() => handleUpdateRating(q.id, 'got-it')}
                          >
                            ✓ Got it
                          </button>
                          <button
                            type="button"
                            role="radio"
                            aria-checked={answerRecord?.selfRating === 'partly'}
                            className={`nm-mock-rating-btn partly${
                              answerRecord?.selfRating === 'partly' ? ' is-active' : ''
                            }`}
                            onClick={() => handleUpdateRating(q.id, 'partly')}
                          >
                            ~ Partly
                          </button>
                          <button
                            type="button"
                            role="radio"
                            aria-checked={answerRecord?.selfRating === 'missed-it'}
                            className={`nm-mock-rating-btn missed-it${
                              answerRecord?.selfRating === 'missed-it' ? ' is-active' : ''
                            }`}
                            onClick={() => handleUpdateRating(q.id, 'missed-it')}
                          >
                            ✗ Missed it
                          </button>
                        </div>
                      </div>

                      {/* Model answer */}
                      <div>
                        <h4 className="nm-mock-report-section-title">Model answer</h4>
                        <div style={{ lineHeight: 1.6 }}>
                          <Markdown source={q.answer} />
                        </div>
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="nm-mock-btn-primary"
                onClick={() => setScreen('setup')}
              >
                Start another mock interview →
              </button>
              <Link to="/interview" className="nm-mock-btn-secondary">
                Back to interview practice
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
