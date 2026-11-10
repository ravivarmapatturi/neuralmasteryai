import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useDocumentMeta } from '../../lib/useDocumentMeta';
import {
  interviewRoomQuestions,
  spokenTransitions,
  pickSessionQuestions,
} from '../../lib/interviewRoom/questions';
import type {
  InterviewRoomQuestion,
  TurnRecord,
  QuestionDebrief,
  EvaluatedPoint,
  QuestionSessionRecord,
  SessionDebrief,
} from '../../lib/interviewRoom/types';
import {
  correctInterviewTerms,
  detectMisconceptions,
  evaluatePoints,
  chooseDialogueAction,
  generateDebrief,
  generateSessionDebrief,
  END_OF_ANSWER_PAUSE_SECONDS,
} from '../../lib/interviewRoom/dialogue';
import type { SingleThreadASREngine } from '../../lib/speechTest/engines';
import {
  detectDeviceCapability,
  shouldWarnBeforeDownload,
  createASREngineForQuality,
  QUALITY_PROFILES,
  type QualityOption,
  type DeviceCapability,
} from '../../lib/interviewRoom/qualitySettings';
import { embed, nli, loadJudge } from '../../lib/mockInterview/engine';
import { playInterviewerAudio } from '../../lib/interviewRoom/voiceAudio';
import { SileroVADDetector } from '../../lib/interviewRoom/sileroVad';
import { LiveWaveform } from './LiveWaveform';
import type { JudgeModels } from '../../lib/answerJudge';
import './interviewRoom.css';

type ScreenState = 'setup' | 'mic' | 'speaking' | 'listening' | 'evaluating' | 'debrief';

export default function InterviewRoomPage() {
  useDocumentTitle('Neural Mastery · Interview Room');
  useDocumentMeta(
    'Neural Mastery · Spoken Interview Room',
    'Real-time spoken AI engineering interview room. Practice out loud with browser speech synthesis and on-device transcription and evaluation.'
  );

  // Configuration options
  const [track, setTrack] = useState('genai');
  const [level, setLevel] = useState('mid');
  const [lengthSetting, setLengthSetting] = useState<'4' | '2' | '1'>('4'); // '4' (20 min), '2' (10 min), or '1' (focused)
  const [sessionIndex, setSessionIndex] = useState(() => {
    try {
      const stored = localStorage.getItem('nm_interview_room_session_idx');
      return stored ? parseInt(stored, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });

  // Screen and flow state
  const [screen, setScreen] = useState<ScreenState>('setup');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [turnIndex, setTurnIndex] = useState(0);
  const [history, setHistory] = useState<TurnRecord[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__NM_CURRENT_TURN__ = turnIndex;
      (window as any).__NM_CURRENT_SCREEN__ = screen;
      (window as any).__NM_HISTORY__ = history;
    }
  }, [turnIndex, screen, history]);

  // Current question and turn
  const questionCount = useMemo(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const countParam = params.get('count');
      if (countParam === '1') return 1;
      if (countParam === '2') return 2;
      if (countParam === '4') return 4;
    }
    return lengthSetting === '1' ? 1 : lengthSetting === '2' ? 2 : 4;
  }, [lengthSetting]);
  const questionsToRun = useMemo(() => {
    let seedQ: string | undefined;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      seedQ = params.get('q') || undefined;
    }
    return pickSessionQuestions(interviewRoomQuestions, questionCount, sessionIndex, seedQ);
  }, [questionCount, sessionIndex]);
  const currentQuestion: InterviewRoomQuestion = questionsToRun[questionIndex] || interviewRoomQuestions[0];
  const [currentSpokenText, setCurrentSpokenText] = useState(currentQuestion.spoken_question);
  const [currentTextQuestion, setCurrentTextQuestion] = useState(currentQuestion.spoken_question);
  const [showQuestionText, setShowQuestionText] = useState(false);

  // Speech and live transcription
  const [isTypingMode, setIsTypingMode] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [settledWords, setSettledWords] = useState('');
  const [freshWords, setFreshWords] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  // Debrief result
  const [debrief, setDebrief] = useState<QuestionDebrief | null>(null);
  const [sessionDebrief, setSessionDebrief] = useState<SessionDebrief | null>(null);
  const [completedRecords, setCompletedRecords] = useState<QuestionSessionRecord[]>([]);
  const [usefulFeedback, setUsefulFeedback] = useState<string | null>(() => {
    try {
      return localStorage.getItem('nm_interview_room_useful');
    } catch {
      return null;
    }
  });

  // Quality & capability settings
  const [capability] = useState<DeviceCapability>(() => detectDeviceCapability());
  const [qualitySetting, setQualitySetting] = useState<QualityOption>(() => capability.recommended);
  const [qualityWarning, setQualityWarning] = useState<string | null>(() =>
    shouldWarnBeforeDownload(capability.recommended, capability)
  );
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);

  // Background speech & judge engine
  const engineRef = useRef<SingleThreadASREngine | null>(null);
  const judgeModelsRef = useRef<JudgeModels>({
    embed: (texts: string[]) => embed(texts),
    nli: (pairs: [string, string][]) => nli(pairs),
  });
  const [modelStatus, setModelStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [modelProgressPct, setModelProgressPct] = useState(0);
  const [currentProbedPointId, setCurrentProbedPointId] = useState<string | undefined>(undefined);
  const [currentProbedMisconceptionId, setCurrentProbedMisconceptionId] = useState<string | undefined>(undefined);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const lastSpeechTimeRef = useRef<number>(0);
  const hasSpokenRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const stopAudioPlaybackRef = useRef<(() => void) | null>(null);
  const startListeningStepRef = useRef<() => void>(() => {});
  const vadDetectorRef = useRef<SileroVADDetector | null>(null);

  // Initialize background models on mount or when quality setting changes
  useEffect(() => {
    const engine = createASREngineForQuality(qualitySetting);
    engineRef.current = engine;
    setModelStatus('loading');
    setModelProgressPct(0);

    // Preload judge models (all-MiniLM-L6-v2 and mobilebert NLI) in background worker
    loadJudge().catch((err) => {
      console.warn('[InterviewRoom] Judge model preloading notice:', err.message);
    });

    const unsubscribe = engine.subscribe((m) => {
      if (m.status === 'ready') {
        setModelStatus('ready');
      } else if (m.status === 'error') {
        setModelStatus('error');
        if (qualitySetting === 'better') {
          console.warn('[InterviewRoom] Better accuracy model failed. Falling back to Fast.');
          setFallbackNotice(
            'Better accuracy model (~62 MB) could not be loaded on this device. Automatically switched to Fast (Moonshine Tiny).'
          );
          setQualitySetting('fast');
        }
      }
      if (m.downloadProgressPct != null) {
        setModelProgressPct(m.downloadProgressPct);
      }
    });

    engine.load().catch((err) => {
      console.warn('[InterviewRoom] Model preloading notice:', err.message);
      setModelStatus('error');
      if (qualitySetting === 'better') {
        console.warn('[InterviewRoom] Better accuracy model failed to load. Falling back to Fast.');
        setFallbackNotice(
          'Better accuracy model (~62 MB) could not be loaded on this device. Automatically switched to Fast (Moonshine Tiny).'
        );
        setQualitySetting('fast');
      }
    });

    return () => {
      unsubscribe();
      try {
        engine.destroy();
      } catch {
        // Ignore
      }
      engineRef.current = null;
    };
  }, [qualitySetting]);

  // Cleanup media & speech on unmount
  useEffect(() => {
    return () => {
      if (stopAudioPlaybackRef.current) {
        stopAudioPlaybackRef.current();
        stopAudioPlaybackRef.current = null;
      }
      try {
        window.speechSynthesis?.cancel();
      } catch {}
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
    };
  }, []);

  // Progress tag displayed in the top bar
  const getProgressTag = (): string => {
    if (screen === 'setup' || screen === 'mic') return '';
    if (screen === 'debrief') {
      const count = sessionDebrief?.questionDebriefs.length || completedRecords.length || 1;
      return count > 1
        ? `Debrief · GenAI Engineer, mid-level · ${count} questions`
        : `Debrief · GenAI Engineer, mid-level`;
    }
    const qTotal = questionsToRun.length;
    const qNum = questionIndex + 1;
    if (turnIndex > 0) return `Question ${qNum} of ${qTotal} · Follow-up`;
    return `Question ${qNum} of ${qTotal}`;
  };

  // Start interviewer speaking with pre-recorded static audio clips, falling back to speech synthesis
  const startSpeakingStep = useCallback(
    (spokenText: string, textQuestion: string, clipIds?: string[]) => {
      if (stopAudioPlaybackRef.current) {
        stopAudioPlaybackRef.current();
        stopAudioPlaybackRef.current = null;
      }

      setScreen('speaking');
      setCurrentSpokenText(spokenText);
      setCurrentTextQuestion(textQuestion);
      setShowQuestionText(false);

      if (typeof window !== 'undefined' && (window as any).__NM_TEST_AUTOSKIP_SPEAKING__) {
        startListeningStepRef.current();
        return;
      }

      const cancel = playInterviewerAudio({
        clipIds,
        fallbackText: spokenText,
        onDone: () => {
          stopAudioPlaybackRef.current = null;
          startListeningStepRef.current();
        },
        onActiveAudio: (audio) => {
          activeAudioRef.current = audio;
        },
      });

      stopAudioPlaybackRef.current = cancel;
    },
    []
  );

  // Start listening step
  const startListeningStep = useCallback(async () => {
    setScreen('listening');
    setLiveTranscript('');
    setSettledWords('');
    setFreshWords('');
    setElapsedSeconds(0);
    hasSpokenRef.current = false;
    lastSpeechTimeRef.current = Date.now();
    isTransitioningRef.current = false;

    // Start elapsed clock
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);

    // If using mic and engine
    if (!isTypingMode && engineRef.current) {
      try {
        // Start capture exactly at listening: request active microphone stream
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        // Initialize Silero VAD end-of-speech detector
        const vad = new SileroVADDetector({
          endOfSpeechPauseSeconds: END_OF_ANSWER_PAUSE_SECONDS,
          onSpeechStart: () => {
            hasSpokenRef.current = true;
            lastSpeechTimeRef.current = Date.now();
          },
          onEndOfAnswer: () => {
            if (!isTransitioningRef.current) {
              handleAnswerFinished();
            }
          },
        });
        vadDetectorRef.current = vad;

        await engineRef.current.start(stream);

        engineRef.current.subscribe((m) => {
          const text = (m.partialText || m.finalText || '').trim();
          if (text) {
            hasSpokenRef.current = true;
            lastSpeechTimeRef.current = Date.now();
            vadDetectorRef.current?.processFrame(0.9, Date.now());
            setLiveTranscript(text);

            const words = text.split(/\s+/);
            if (words.length <= 3) {
              setSettledWords('');
              setFreshWords(text);
            } else {
              setSettledWords(words.slice(0, words.length - 3).join(' '));
              setFreshWords(words.slice(words.length - 3).join(' '));
            }
          }
        });

        // End-of-answer pause detection monitor with Silero VAD
        if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);
        silenceTimerRef.current = setInterval(() => {
          if (isTransitioningRef.current) return;
          const engineLastSpeech = engineRef.current?.getLastAudioSpeechTime() || 0;
          if (engineLastSpeech > 0) {
            hasSpokenRef.current = true;
          }
          if (!hasSpokenRef.current) return;
          const lastActive = Math.max(lastSpeechTimeRef.current, engineLastSpeech);
          const silenceDuration = (Date.now() - lastActive) / 1000;
          vadDetectorRef.current?.processFrame(0.01, Date.now());
          if (silenceDuration >= END_OF_ANSWER_PAUSE_SECONDS) {
            // Long pause detected! Conclude answer
            handleAnswerFinished();
          }
        }, 500);
      } catch (err) {
        console.warn('[InterviewRoom] Mic start error:', err);
        setIsTypingMode(true);
      }
    }
  }, [isTypingMode]);
  startListeningStepRef.current = startListeningStep;

  // Finish current answer turn (via pause timeout or "I'm finished" button)
  const handleAnswerFinished = useCallback(async () => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);

    setScreen('evaluating');
    setStatusMessage('Reviewing your response...');

    let answerText = liveTranscript.trim();

    // If using live audio engine, stop it to get batch pass
    if (!isTypingMode && engineRef.current) {
      try {
        await engineRef.current.stop();
        const metrics = engineRef.current.getMetrics();
        const batchPass = metrics.batchTranscript || metrics.finalText || metrics.partialText;
        if (batchPass && batchPass.trim()) {
          answerText = batchPass.trim();
        }
      } catch (err) {
        console.warn('[InterviewRoom] Engine stop notice:', err);
      }
    }

    // Stop active mic tracks so capture does not leak across turns or into interviewer speaking
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    // Apply technical term corrections
    const cleanAnswer = correctInterviewTerms(answerText, currentQuestion.id);
    if (typeof window !== 'undefined') {
      (window as any).__NM_LAST_TURN_ANSWER__ = cleanAnswer;
    }

    // Record turn in history
    const turnRecord: TurnRecord = {
      turnIndex,
      questionText: currentTextQuestion,
      spokenText: currentSpokenText,
      isFollowUp: turnIndex > 0,
      probedPointId: currentProbedPointId,
      probedMisconceptionId: currentProbedMisconceptionId,
      learnerAnswer: cleanAnswer,
    };
    const newHistory = [...history, turnRecord];
    setHistory(newHistory);

    // Evaluate against rubrics across all answers for this question using real MiniLM & NLI judge models
    const allAnswers = newHistory.map((t) => t.learnerAnswer).filter(Boolean).join(' ');
    const misconception = detectMisconceptions(allAnswers, currentQuestion);
    const evaluatedPoints: EvaluatedPoint[] = await evaluatePoints(allAnswers, currentQuestion, judgeModelsRef.current);

    // Decide next step via Dialogue Rules
    const action = chooseDialogueAction(
      turnIndex,
      newHistory,
      cleanAnswer,
      currentQuestion,
      evaluatedPoints,
      misconception
    );

    if (action.type === 'follow_up') {
      const nextTurn = turnIndex + 1;
      setTurnIndex(nextTurn);
      setCurrentProbedPointId(action.probedPointId);
      setCurrentProbedMisconceptionId(action.probedMisconceptionId);
      startSpeakingStep(
        action.spokenQuestion,
        action.textQuestion,
        action.clipId ? [action.clipId] : undefined
      );
    } else {
      // Question completed
      setCurrentProbedPointId(undefined);
      setCurrentProbedMisconceptionId(undefined);
      const debriefData = generateDebrief(currentQuestion, newHistory, evaluatedPoints);
      const newRecord: QuestionSessionRecord = {
        question: currentQuestion,
        turns: newHistory,
        evaluatedPoints,
        debrief: debriefData,
      };
      const updatedRecords = [...completedRecords, newRecord];
      setCompletedRecords(updatedRecords);

      if (questionIndex + 1 < questionsToRun.length) {
        // Multi-question session: advance to next question with spoken transition
        const nextIdx = questionIndex + 1;
        setQuestionIndex(nextIdx);
        setTurnIndex(0);
        setHistory([]);
        const nextQ = questionsToRun[nextIdx];
        const transIndex = (questionIndex % 5) + 1;
        const transClipId = `transition_0${transIndex}`;
        const nextQClipId = `${nextQ.id}_q`;
        const transition = spokenTransitions[questionIndex % spokenTransitions.length] || '';
        const spoken = transition ? `${transition} ${nextQ.spoken_question}` : nextQ.spoken_question;
        startSpeakingStep(spoken, nextQ.spoken_question, [transClipId, nextQClipId]);
      } else {
        // All session questions completed: generate session debrief across questions
        const sessionDebriefData = generateSessionDebrief(updatedRecords);
        setSessionDebrief(sessionDebriefData);
        setDebrief(debriefData);
        setScreen('debrief');
      }
    }
  }, [liveTranscript, isTypingMode, turnIndex, currentTextQuestion, currentSpokenText, history, currentQuestion, currentProbedPointId, currentProbedMisconceptionId, startSpeakingStep, completedRecords, questionIndex, questionsToRun]);

  // Begin interview from setup
  const handleBegin = () => {
    const nextIdx = sessionIndex + 1;
    setSessionIndex(nextIdx);
    try {
      localStorage.setItem('nm_interview_room_session_idx', String(nextIdx));
    } catch {}
    setCompletedRecords([]);
    setSessionDebrief(null);
    setScreen('mic');
  };

  // Request microphone permission
  const handleAllowMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
      setIsTypingMode(false);
      setQuestionIndex(0);
      setTurnIndex(0);
      setHistory([]);
      setCompletedRecords([]);
      setSessionDebrief(null);
      startSpeakingStep(currentQuestion.spoken_question, currentQuestion.spoken_question, [`${currentQuestion.id}_q`]);
    } catch (err) {
      console.warn('[InterviewRoom] Mic permission denied/failed:', err);
      setStatusMessage('Microphone access unavailable. Continuing with text input.');
      setIsTypingMode(true);
      setQuestionIndex(0);
      setTurnIndex(0);
      setHistory([]);
      setCompletedRecords([]);
      setSessionDebrief(null);
      startSpeakingStep(currentQuestion.spoken_question, currentQuestion.spoken_question, [`${currentQuestion.id}_q`]);
    }
  };

  // Fallback to typing mode directly
  const handleFallbackTyping = () => {
    setIsTypingMode(true);
    setQuestionIndex(0);
    setTurnIndex(0);
    setHistory([]);
    setCompletedRecords([]);
    setSessionDebrief(null);
    startSpeakingStep(currentQuestion.spoken_question, currentQuestion.spoken_question, [`${currentQuestion.id}_q`]);
  };

  // Restart / Answer again
  const handleAnswerAgain = () => {
    setQuestionIndex(0);
    setTurnIndex(0);
    setHistory([]);
    setDebrief(null);
    setSessionDebrief(null);
    setCompletedRecords([]);
    startSpeakingStep(questionsToRun[0].spoken_question, questionsToRun[0].spoken_question, [`${questionsToRun[0].id}_q`]);
  };

  // Next question in multi-question round
  const handleNextQuestion = () => {
    const nextIdx = questionIndex + 1;
    setQuestionIndex(nextIdx);
    setTurnIndex(0);
    setHistory([]);
    setDebrief(null);
    const nextQ = questionsToRun[nextIdx];
    if (nextQ) {
      const transIndex = (questionIndex % 5) + 1;
      const transClipId = `transition_0${transIndex}`;
      const nextQClipId = `${nextQ.id}_q`;
      const transition = spokenTransitions[questionIndex % spokenTransitions.length] || '';
      const spoken = transition ? `${transition} ${nextQ.spoken_question}` : nextQ.spoken_question;
      startSpeakingStep(spoken, nextQ.spoken_question, [transClipId, nextQClipId]);
    } else {
      setScreen('setup');
    }
  };

  // Start over completely
  const handleRestart = () => {
    if (stopAudioPlaybackRef.current) {
      stopAudioPlaybackRef.current();
      stopAudioPlaybackRef.current = null;
    }
    try {
      window.speechSynthesis?.cancel();
    } catch {}
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setQuestionIndex(0);
    setTurnIndex(0);
    setHistory([]);
    setDebrief(null);
    setSessionDebrief(null);
    setCompletedRecords([]);
    setScreen('setup');
  };

  // Record useful feedback
  const handleUseful = (val: 'yes' | 'no') => {
    setUsefulFeedback(val);
    try {
      localStorage.setItem('nm_interview_room_useful', val);
    } catch {}
  };

  const formatClock = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="interview-room-wrap">
      <div className="wrap">
        {/* Top Header */}
        <div className="top">
          <Link to="/interview" id="exit-room" style={{ textDecoration: 'none', color: 'inherit' }}>
            Neural Mastery · Interview
          </Link>
          <span id="progress">{getProgressTag()}</span>
        </div>

        {/* Main Stage */}
        <main id="room" className="stack" aria-live="polite">
          {/* SCREEN 1: SETUP */}
          {screen === 'setup' && (
            <>
              <h1>Practise the real thing.</h1>
              <p>
                The interviewer asks out loud. You answer out loud. You get the debrief at the end, as
                you would after a real round.
              </p>

              <div className="fields">
                <label htmlFor="track">
                  Track
                  <select id="track" value={track} onChange={(e) => setTrack(e.target.value)}>
                    <option value="genai">GenAI Engineer</option>
                    <option value="ml" disabled>
                      ML Engineer (in review)
                    </option>
                    <option value="ds" disabled>
                      Data Scientist (in review)
                    </option>
                    <option value="mlops" disabled>
                      MLOps Engineer (in review)
                    </option>
                  </select>
                </label>

                <label htmlFor="level">
                  Level
                  <select id="level" value={level} onChange={(e) => setLevel(e.target.value)}>
                    <option value="mid">Mid-level (2–5 years)</option>
                    <option value="junior" disabled>
                      Junior (coming soon)
                    </option>
                    <option value="senior" disabled>
                      Senior (coming soon)
                    </option>
                  </select>
                </label>

                <label htmlFor="length">
                  Length
                  <select
                    id="length"
                    value={lengthSetting}
                    onChange={(e) => setLengthSetting(e.target.value as '4' | '2' | '1')}
                  >
                    <option value="4">20 minutes, 4 questions</option>
                    <option value="2">10 minutes, 2 questions</option>
                    <option value="1">Focused practice, 1 question</option>
                  </select>
                </label>

                <label htmlFor="quality">
                  Quality
                  <select
                    id="quality"
                    value={qualitySetting}
                    onChange={(e) => {
                      const nextQ = e.target.value as QualityOption;
                      setQualitySetting(nextQ);
                      setQualityWarning(shouldWarnBeforeDownload(nextQ, capability));
                      setFallbackNotice(null);
                    }}
                  >
                    {Object.values(QUALITY_PROFILES)
                      .filter((p) => !p.hidden)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label} · {p.downloadSizeMB}
                        </option>
                      ))}
                  </select>
                  <span style={{ fontSize: '11px', color: 'var(--soft)', fontWeight: 400, marginTop: '2px' }}>
                    {qualitySetting === capability.recommended
                      ? `✓ Recommended: ${capability.reason}`
                      : `Device recommendation: ${QUALITY_PROFILES[capability.recommended].label}`}
                  </span>
                </label>
              </div>

              {/* Warnings and Fallback Notices */}
              {qualityWarning && (
                <div
                  className="note"
                  style={{
                    fontSize: '13px',
                    color: 'var(--warn)',
                    padding: '8px 12px',
                    background: 'var(--warn-fill)',
                    borderRadius: '6px',
                  }}
                >
                  ⚠️ {qualityWarning}
                </div>
              )}

              {fallbackNotice && (
                <div
                  className="note"
                  style={{
                    fontSize: '13px',
                    color: 'var(--bad)',
                    padding: '8px 12px',
                    background: 'var(--bad-fill)',
                    borderRadius: '6px',
                  }}
                >
                  ⚠️ {fallbackNotice}
                </div>
              )}

              {/* Background Model Preloading Status */}
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--soft)',
                  fontFamily: 'var(--mono)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {modelStatus === 'loading' && (
                  <span>
                    Preparing speech model ({QUALITY_PROFILES[qualitySetting].modelName})...{' '}
                    {modelProgressPct}%
                  </span>
                )}
                {modelStatus === 'ready' && (
                  <span style={{ color: 'var(--good)' }}>
                    ● Speech model ready ({QUALITY_PROFILES[qualitySetting].modelName})
                  </span>
                )}
                {modelStatus === 'error' && (
                  <span>Speech model loading in background. Voice & typing both available.</span>
                )}
              </div>

              <div className="actions">
                <button className="primary" id="begin" onClick={handleBegin}>
                  Start the interview
                </button>
              </div>
            </>
          )}

          {/* SCREEN 2: MICROPHONE ALLOWANCE */}
          {screen === 'mic' && (
            <>
              <h2>Allow your microphone</h2>
              <p>
                You only do this once. After that the interview runs by voice, with nothing to click while
                you answer.
              </p>

              {statusMessage && <p className="note">{statusMessage}</p>}

              <div className="actions">
                <button className="primary" id="mic" onClick={handleAllowMic}>
                  Enable microphone and begin
                </button>
                <button type="button" onClick={handleFallbackTyping}>
                  Or type your answers
                </button>
              </div>
            </>
          )}

          {/* SCREEN 3: INTERVIEWER SPEAKING */}
          {screen === 'speaking' && (
            <>
              <div className="who on">
                <span className="bars">
                  <i></i>
                  <i></i>
                  <i></i>
                  <i></i>
                </span>
                <span>Interviewer is speaking</span>
              </div>

              <div>
                <button id="show" onClick={() => setShowQuestionText(!showQuestionText)}>
                  {showQuestionText ? 'Hide question text' : 'Repeat the question as text'}
                </button>
                {showQuestionText && (
                  <p id="qtext" style={{ marginTop: '10px' }}>
                    {currentTextQuestion}
                  </p>
                )}
              </div>

              <div className="actions">
                <button
                  type="button"
                  style={{ fontSize: '13px', padding: '6px 12px' }}
                  onClick={() => {
                    if (stopAudioPlaybackRef.current) {
                      stopAudioPlaybackRef.current();
                      stopAudioPlaybackRef.current = null;
                    }
                    try {
                      window.speechSynthesis?.cancel();
                    } catch {}
                    startListeningStep();
                  }}
                >
                  Skip speaking →
                </button>
              </div>
            </>
          )}

          {/* SCREEN 4: LISTENING */}
          {screen === 'listening' && (
            <>
              <div className="who on">
                <span className="bars">
                  <i></i>
                  <i></i>
                  <i></i>
                  <i></i>
                </span>
                <span>
                  Listening · <span className="clock" id="clock">{formatClock(elapsedSeconds)}</span> ·{' '}
                  {isTypingMode ? 'Type your answer' : 'Your answer'}
                </span>
              </div>

              {isTypingMode ? (
                <textarea
                  className="live"
                  style={{ width: '100%', minHeight: '160px', resize: 'vertical' }}
                  value={liveTranscript}
                  onChange={(e) => setLiveTranscript(e.target.value)}
                  placeholder="Type your explanation as you would talk it through with an interviewer..."
                  rows={6}
                />
              ) : (
                <>
                  <LiveWaveform
                    active={true}
                    stream={mediaStreamRef.current}
                    height={44}
                    style={{
                      margin: '10px 0 12px 0',
                      border: '1px solid var(--line)',
                      background: 'var(--surface)',
                      borderRadius: '8px',
                    }}
                  />
                  <div className="live" id="live">
                    {settledWords}{' '}
                    <span className="fresh">{freshWords}</span>
                    <span className="caret"></span>
                  </div>
                </>
              )}

              <div>
                <button id="show" onClick={() => setShowQuestionText(!showQuestionText)}>
                  {showQuestionText ? 'Hide question text' : 'Repeat the question as text'}
                </button>
                {showQuestionText && (
                  <p id="qtext" style={{ marginTop: '10px' }}>
                    {currentTextQuestion}
                  </p>
                )}
              </div>

              <p className="note" id="end">
                When you stop talking for a few seconds, the interviewer continues.
              </p>

              <div className="actions">
                <button className="primary" id="done" onClick={handleAnswerFinished}>
                  I'm finished
                </button>
                <button id="skip" onClick={handleAnswerFinished}>
                  Skip ahead
                </button>
                {!isTypingMode && (
                  <button type="button" onClick={() => setIsTypingMode(true)}>
                    Switch to typing
                  </button>
                )}
                {questionIndex + 1 < questionsToRun.length && (
                  <button type="button" onClick={handleNextQuestion}>
                    Next question →
                  </button>
                )}
              </div>
            </>
          )}

          {/* SCREEN: EVALUATING TRANSITION */}
          {screen === 'evaluating' && (
            <div className="stack" style={{ textAlign: 'center', padding: '40px 0' }}>
              <div className="who on" style={{ justifyContent: 'center' }}>
                <span className="bars">
                  <i></i>
                  <i></i>
                  <i></i>
                  <i></i>
                </span>
                <span>{statusMessage}</span>
              </div>
            </div>
          )}

          {/* SCREEN 5: DEBRIEF */}
          {screen === 'debrief' && (debrief || sessionDebrief) && (() => {
            const activeDebrief: SessionDebrief =
              sessionDebrief ||
              generateSessionDebrief([
                {
                  question: currentQuestion,
                  turns: history,
                  evaluatedPoints: [],
                  debrief: debrief!,
                },
              ]);

            return (
              <>
                {/* Call banner */}
                <div className="call">
                  <span style={{ font: '500 13px var(--mono)' }}>
                    {activeDebrief.questionDebriefs.length > 1
                      ? `Interviewer's call across ${activeDebrief.questionDebriefs.length} questions`
                      : "Interviewer's call on this question"}
                  </span>
                  <strong>{activeDebrief.overallCall}</strong>
                  <p>{activeDebrief.overallSummary}</p>
                </div>

                {/* Practise this next */}
                <div className="next">
                  <h3>Practise this next</h3>
                  <p style={{ marginTop: '6px' }}>{activeDebrief.practiceAction}</p>
                  <div className="actions" style={{ marginTop: '12px' }}>
                    <button className="primary" id="again" onClick={handleAnswerAgain}>
                      {activeDebrief.questionDebriefs.length > 1 ? 'Start another session' : 'Answer it again'}
                    </button>
                    <Link
                      to={activeDebrief.practiceRoute}
                      className="btn-link"
                      style={{ textDecoration: 'none' }}
                    >
                      Open {activeDebrief.practiceTitle} ↗
                    </Link>
                  </div>
                </div>

                {/* Question breakdown: Multi-question vs Single question */}
                {activeDebrief.questionDebriefs.length > 1 ? (
                  <div className="session-questions" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, borderBottom: '1px solid var(--line)', paddingBottom: '8px', margin: 0 }}>
                      Per-Question Breakdown
                    </h3>
                    {activeDebrief.questionDebriefs.map((record, i) => (
                      <div key={record.question.id} className="stack" style={{ gap: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px' }}>
                          <div>
                            <span style={{ fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--soft)' }}>
                              Question {i + 1} of {activeDebrief.questionDebriefs.length}
                            </span>
                            <h4 style={{ fontSize: '16px', fontWeight: 600, margin: '2px 0 0 0' }}>
                              {record.question.title}
                            </h4>
                          </div>
                          <span
                            className={`pill ${
                              record.debrief.overallCall === 'Strong'
                                ? 'strong'
                                : record.debrief.overallCall === 'Getting there'
                                ? 'ok'
                                : 'gap'
                            }`}
                          >
                            {record.debrief.overallCall}
                          </span>
                        </div>
                        <p style={{ fontSize: '14px', lineHeight: 1.5, color: 'var(--soft)' }}>
                          {record.debrief.overallSummary}
                        </p>
                        <div className="rows">
                          {record.debrief.rows.map((row, rIdx) => (
                            <div className="row" key={rIdx}>
                              <div className="stack" style={{ gap: '6px' }}>
                                <b>{row.label}</b>
                                <span className={`pill ${row.pillClass}`}>{row.pill}</span>
                              </div>
                              <div>
                                <p>{row.text}</p>
                                {row.quote && <blockquote>{row.quote}</blockquote>}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="stack">
                          <h5 style={{ fontSize: '13px', fontFamily: 'var(--mono)', color: 'var(--soft)', margin: 0 }}>
                            Your answer, marked
                          </h5>
                          <p
                            className="live"
                            style={{ minHeight: 0, fontSize: '14px' }}
                            dangerouslySetInnerHTML={{ __html: record.debrief.markedAnswerHtml }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Single question rubric rows */}
                    <div className="rows">
                      {activeDebrief.questionDebriefs[0].debrief.rows.map((row, i) => (
                        <div className="row" key={i}>
                          <div className="stack" style={{ gap: '6px' }}>
                            <b>{row.label}</b>
                            <span className={`pill ${row.pillClass}`}>{row.pill}</span>
                          </div>
                          <div>
                            <p>{row.text}</p>
                            {row.quote && <blockquote>{row.quote}</blockquote>}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Marked answer */}
                    <div className="stack">
                      <h3>Your answer, marked</h3>
                      <p
                        className="live"
                        style={{ minHeight: 0 }}
                        dangerouslySetInnerHTML={{
                          __html: activeDebrief.questionDebriefs[0].debrief.markedAnswerHtml,
                        }}
                      />
                      <p className="note">Green: covered. Amber: recheck or not heard yet.</p>
                    </div>
                  </>
                )}

                {/* Was this useful? Local storage widget */}
                <div
                  style={{
                    padding: '12px 16px',
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '15px', fontWeight: 600 }}>Was this debrief useful?</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      className={usefulFeedback === 'yes' ? 'primary' : ''}
                      style={{ padding: '6px 14px', fontSize: '14px' }}
                      onClick={() => handleUseful('yes')}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      className={usefulFeedback === 'no' ? 'primary' : ''}
                      style={{ padding: '6px 14px', fontSize: '14px' }}
                      onClick={() => handleUseful('no')}
                    >
                      No
                    </button>
                    {usefulFeedback && (
                      <span style={{ fontSize: '13px', color: 'var(--soft)' }}>
                        Thank you! Saved locally.
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="actions">
                  <button id="restart" onClick={handleRestart}>
                    Start over
                  </button>
                </div>
              </>
            );
          })()}
        </main>

        {/* Footnote */}
        <p className="note" id="foot">
          Automated estimate: speech recognition can mishear words and accent nuances. All speech
          processing, transcription, and evaluations run locally in your browser; your audio and
          answers never leave this device.
        </p>
      </div>
    </div>
  );
}
