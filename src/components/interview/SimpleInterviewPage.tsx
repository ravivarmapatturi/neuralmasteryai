import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDocumentMeta } from '../../lib/useDocumentMeta';
import { correctInterviewTerms } from '../../lib/interviewRoom/dialogue';
import { createASREngineForQuality } from '../../lib/interviewRoom/qualitySettings';
import type { SingleThreadASREngine } from '../../lib/speechTest/engines';
import practice from '../../data/interviewPractice.json';
import { InterviewGraph } from './InterviewGraph';
import { LiveWaveform } from './LiveWaveform';
import Navbar from '../layout/Navbar';
import { judgeAnswer, splitAnswer, type AnswerJudgement } from '../../lib/answerJudge';
import { embed, loadJudge, nli } from '../../lib/mockInterview/engine';
import { speakInBrowser } from '../../lib/interviewRoom/browserVoice';
import { useGamification } from '../../contexts/GamificationContext';
import { INTERVIEW_COMPLETED_POINTS, hasAward } from '../../lib/gamification';
import './interviewRoom.css';
import './simpleInterview.css';

type Step = 'topics' | 'asking' | 'answering' | 'finishing' | 'answer' | 'done';

interface PracticeQuestion {
  id: string;
  title: string;
  answer: string;
  options?: string[];
  sourceUrl?: string;
  followUps?: string[];
  wrongAnswers?: string[];
  rounds?: string[];
  roles?: string[];
}

const ROUNDS: Record<string, string> = {
  screen: 'Phone screen', 'ml-breadth': 'ML breadth', 'ml-depth': 'ML depth', coding: 'Coding',
  'system-design': 'System design', 'design-review': 'Design review', debugging: 'Debugging',
  'take-home': 'Take-home', behavioral: 'Behavioural', customer: 'Customer',
};
const ROLES: Record<string, string> = {
  'applied-ai-engineer': 'Applied AI engineer', 'agentic-ai-engineer': 'Agentic AI engineer',
  'inference-engineer': 'Inference engineer', 'ai-data-engineer': 'AI data engineer',
  'ai-evaluation-reliability-engineer': 'Evaluation and reliability engineer',
  'forward-deployed-ai-engineer': 'Forward-deployed AI engineer',
  'ai-developer-relations-engineer': 'Developer relations engineer',
};

const topics = practice.topics as {
  id: string;
  title: string;
  group: string;
  about: string;
  questions: PracticeQuestion[];
}[];
const baseGraphTopics = topics.map((t) => ({ id: t.id, title: t.title, group: t.group, count: t.questions.length }));
const totalQuestions = baseGraphTopics.reduce((sum, t) => sum + t.count, 0);
const firstTopic = Math.max(0, topics.findIndex((t) => t.id === 'rag'));

function locate(id: string | null) {
  if (!id) return null;
  for (let t = 0; t < topics.length; t++) {
    const q = topics[t].questions.findIndex((x) => x.id === id);
    if (q >= 0) return { topic: t, question: q };
  }
  return null;
}

const LAST_KEY = 'nm-interview-last';

function readLast() {
  try {
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}

function clipUrl(name: string) {
  return `/audio/interview-voice/${name.replaceAll(':', '__')}.opus`;
}

function looksLikePhone() {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return /Android|iPhone|iPad/i.test(navigator.userAgent) || (memory !== undefined && memory < 4);
}

export default function SimpleInterviewPage() {
  useDocumentMeta('AI Interview Practice', 'Pick a topic, hear an AI engineering interview question, answer out loud, then hear and read a model answer. Runs in your browser.');

  const [params] = useSearchParams();
  // A link like /interview?q=<id> (the home page's daily question) opens on that question.
  // Otherwise it offers to resume the last question you opened.
  const [resuming] = useState(() => !locate(params.get('q')) && !!locate(readLast()));
  const [linked, setLinked] = useState(() => locate(params.get('q')) ?? locate(readLast()));
  const sharedTopic = topics.findIndex((t) => t.id === params.get('topic'));
  const [step, setStep] = useState<Step>('topics');
  const [topicIndex, setTopicIndex] = useState(sharedTopic >= 0 ? sharedTopic : (linked?.topic ?? firstTopic));
  const [shareStatus, setShareStatus] = useState('');
  const [questionIndex, setQuestionIndex] = useState(linked?.question ?? 0);
  const [transcript, setTranscript] = useState('');
  const [typing, setTyping] = useState(false);
  const [micStatus, setMicStatus] = useState('');
  const [reading, setReading] = useState(false);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [check, setCheck] = useState<AnswerJudgement | 'checking' | 'failed' | null>(null);
  const { events, awardInterviewCompleted } = useGamification();
  const [round, setRound] = useState('');
  const [role, setRole] = useState('');
  const matches = (q: PracticeQuestion) =>
    (!round || (q.rounds ?? []).includes(round)) && (!role || (q.roles ?? []).includes(role));
  const isDone = (id: string) => hasAward(events, `/interview#${id}`, 'interview');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const engineRef = useRef<SingleThreadASREngine | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const answeringRef = useRef(false);
  const enginePromiseRef = useRef<Promise<void> | null>(null);

  const topic = topics[topicIndex];
  const completedTopicCount = topic.questions.filter((q) => isDone(q.id)).length;
  const topicProgressPct = Math.round((completedTopicCount / Math.max(1, topic.questions.length)) * 100);

  const handleComplete = () => {
    awardInterviewCompleted(questionId);
  };
  const graphTopics = useMemo(
    () => baseGraphTopics.map((g, i) => ({ ...g, done: topics[i].questions.filter((q) => hasAward(events, `/interview#${q.id}`, 'interview')).length })),
    [events]
  );
  const linkedHere = linked && linked.topic === topicIndex ? linked : null;
  const shown = topic.questions.map((q, i) => ({ q, i })).filter(({ q }) => matches(q));
  const question = topic.questions[questionIndex];
  const questionId = question.id;

  const voiceCancelRef = useRef<(() => void) | null>(null);
  const [voiceLoading, setVoiceLoading] = useState<number | null>(null);

  const stopAudio = useCallback(() => {
    voiceCancelRef.current?.();
    voiceCancelRef.current = null;
    setVoiceLoading(null);
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current = null;
    }
    setReading(false);
  }, []);

  const play = useCallback(
    (name: string, onFinish: () => void, text?: string) => {
      stopAudio();
      const audio = new Audio(clipUrl(name));
      audioRef.current = audio;
      setReading(true);
      const done = () => {
        voiceCancelRef.current = null;
        setVoiceLoading(null);
        setReading(false);
        onFinish();
      };
      const finish = (missing: boolean) => {
        if (audioRef.current !== audio) return;
        audioRef.current = null;
        // No recorded clip: generate the voice on this device instead (skipped on phones to spare memory).
        if (missing && text && !looksLikePhone()) {
          setVoiceLoading(0);
          voiceCancelRef.current = speakInBrowser(text, done, (f) => setVoiceLoading(f), () => setVoiceLoading(null));
          return;
        }
        done();
      };
      audio.onended = () => finish(false);
      audio.onerror = () => finish(true);
      // A clip that has not started within 4 seconds is treated as missing, so the page never waits forever.
      const stalled = window.setTimeout(() => {
        if (audioRef.current === audio && audio.currentTime === 0) finish(true);
      }, 4000);
      audio.onplaying = () => {
        window.clearTimeout(stalled);
        setVoiceLoading(null);
      };
      audio.play().catch(() => finish(true));
    },
    [stopAudio]
  );

  const stopMic = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setMicStream(null);
  }, []);

  // Download starts when the topic is chosen, so the first answer is not spoken into a loading model
  const prepareEngine = useCallback(() => {
    if (!enginePromiseRef.current) {
      enginePromiseRef.current = (async () => {
        let engine = createASREngineForQuality(looksLikePhone() ? 'fast' : 'better');
        try {
          await engine.load();
        } catch {
          engine = createASREngineForQuality('fast');
          await engine.load();
        }
        engineRef.current = engine;
      })().catch((err) => {
        enginePromiseRef.current = null;
        throw err;
      });
    }
    return enginePromiseRef.current;
  }, []);

  const startAnswering = useCallback(async () => {
    setStep('answering');
    setTranscript('');
    if (typing) return;
    answeringRef.current = true;
    try {
      setMicStatus('Allow your microphone to answer out loud.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!answeringRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      setMicStream(stream);
      setMicStatus('Please wait, speech recognition is still getting ready on your device…');
      await prepareEngine();
      if (!answeringRef.current) return;
      const engine = engineRef.current;
      if (!engine) throw new Error('Speech engine unavailable');
      engine.reset();
      unsubscribeRef.current = engine.subscribe((m) => {
        const text = (m.partialText || m.finalText || '').trim();
        if (answeringRef.current && text) setTranscript(text);
      });
      await engine.start(stream);
      setMicStatus('Listening. Your voice stays on your device.');
    } catch {
      stopMic();
      setTyping(true);
      setMicStatus('The microphone is not available, so please type your answer.');
    }
  }, [typing, stopMic, prepareEngine]);

  const ask = useCallback(
    (id: string) => {
      setStep('asking');
      try {
        localStorage.setItem(LAST_KEY, id);
      } catch {
        // Private mode: resume is simply unavailable.
      }
      const q = topics.flatMap((t) => t.questions).find((x) => x.id === id);
      const spoken = q ? q.title + (q.options ? ` The options are: ${q.options.join('. ')}` : '') : undefined;
      play(
        `${id}_q`,
        () => {
          void startAnswering();
        },
        spoken
      );
    },
    [play, startAnswering]
  );

  const startQuestion = (index: number) => {
    void prepareEngine().catch(() => undefined);
    setQuestionIndex(index);
    ask(topic.questions[index].id);
  };

  const finishAnswer = async () => {
    answeringRef.current = false;
    let finalText = transcript;
    if (!typing && engineRef.current && streamRef.current) {
      setStep('finishing');
      try {
        await engineRef.current.stop();
        const m = engineRef.current.getMetrics();
        finalText = (m.batchTranscript || m.finalText || m.partialText || transcript).trim();
      } catch {
        finalText = transcript;
      }
    }
    stopMic();
    const spoken = correctInterviewTerms(finalText, questionId);
    setTranscript(spoken);
    setStep('answer');
    setCheck(null);
    if (spoken.trim().split(/\s+/).length >= 5) {
      // Each sentence of the model answer is one point to cover. Models run in a worker on this device.
      setCheck('checking');
      const points = splitAnswer(question.answer).slice(0, 6);
      loadJudge()
        .then(() => judgeAnswer(spoken, points, question.answer, { embed, nli }))
        .then(setCheck)
        .catch(() => setCheck('failed'));
    }
    play(`${questionId}_a`, () => undefined, question.answer);
  };

  const nextQuestion = () => {
    stopAudio();
    let next = questionIndex + 1;
    while (next < topic.questions.length && !matches(topic.questions[next])) next++;
    if (next >= topic.questions.length) {
      setStep('done');
      return;
    }
    setQuestionIndex(next);
    ask(topic.questions[next].id);
  };

  const backToTopics = () => {
    answeringRef.current = false;
    stopAudio();
    stopMic();
    void engineRef.current?.stop().catch(() => undefined);
    setStep('topics');
  };

  useEffect(() => setShareStatus(''), [topicIndex]);

  const shareTopic = async () => {
    const done = topic.questions.filter((q) => isDone(q.id)).length;
    const url = `${window.location.origin}/interview?topic=${topic.id}`;
    const text = `I completed ${done} of ${topic.questions.length} ${topic.title} interview questions on Neural Mastery.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${topic.title} interview practice`, text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setShareStatus('Link copied.');
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setShareStatus(`Copy this link: ${url}`);
    }
  };

  // Space answers (or finishes answering), N moves to the next question. Ignored while typing or on a focused control.
  const keysRef = useRef<(e: KeyboardEvent) => void>(() => undefined);
  keysRef.current = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const el = e.target as HTMLElement | null;
    if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(el.tagName))) return;
    if (e.key === ' ' && step === 'asking') {
      e.preventDefault();
      stopAudio();
      void startAnswering();
    } else if (e.key === ' ' && step === 'answering') {
      e.preventDefault();
      void finishAnswer();
    } else if ((e.key === 'n' || e.key === 'N') && step === 'answer') {
      e.preventDefault();
      nextQuestion();
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keysRef.current(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(
    () => () => {
      answeringRef.current = false;
      stopAudio();
      stopMic();
      engineRef.current?.destroy();
    },
    [stopAudio, stopMic]
  );

  return (
    <>
    <Navbar />
    <div className="interview-room-wrap simple-interview">
      <div className={`si-card${step === 'topics' || step === 'answer' ? ' si-card-wide' : ' si-card-stage'}`}>
        {step === 'topics' && (
          <>
            <h1>Interview practice</h1>
            <p className="si-lede">
              {graphTopics.length} topics, {totalQuestions} questions. Lines show which topics build on each other.
            </p>
            <div className="si-map">
              <InterviewGraph
                topics={graphTopics}
                activeId={topic.id}
                onActivate={(id) => setTopicIndex(topics.findIndex((t) => t.id === id))}
              />
              <aside className="si-panel" aria-live="polite">
                <select
                  className="si-topic-select"
                  aria-label="Topic"
                  value={topic.id}
                  onChange={(e) => setTopicIndex(topics.findIndex((t) => t.id === e.target.value))}
                >
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
                <div className="si-filters">
                  <select aria-label="Interview round" value={round} onChange={(e) => setRound(e.target.value)}>
                    <option value="">All rounds</option>
                    {Object.entries(ROUNDS).map(([id, label]) => (
                      <option key={id} value={id}>{label}</option>
                    ))}
                  </select>
                  <select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="">All roles</option>
                    {Object.entries(ROLES).map(([id, label]) => (
                      <option key={id} value={id}>{label}</option>
                    ))}
                  </select>
                </div>
                <p className="si-count">
                  {round || role ? `${shown.length} of ${topic.questions.length}` : topic.questions.length} questions ·{' '}
                  {shown.filter(({ q }) => isDone(q.id)).length} completed
                </p>
                <h2>{topic.title}</h2>
                <p className="si-lede">{topic.about}</p>
                {linkedHere && (
                  <p className="si-linked">
                    <strong>{topic.questions[linkedHere.question].title}</strong>
                  </p>
                )}
                <div className="si-actions">
                  <button
                    type="button"
                    className="si-primary"
                    id="start-topic"
                    disabled={shown.length === 0 && !linkedHere}
                    onClick={() => {
                      setLinked(null);
                      startQuestion(linkedHere ? linkedHere.question : (shown.find(({ q }) => !isDone(q.id)) ?? shown[0]).i);
                    }}
                  >
                    {linkedHere ? (resuming ? 'Resume where you left off' : 'Start the linked question') : shown.some(({ q }) => isDone(q.id)) ? 'Next unsolved question' : 'Start this topic'}
                  </button>
                  {topic.questions.every((q) => isDone(q.id)) && (
                    <button type="button" onClick={shareTopic}>
                      Share this topic
                    </button>
                  )}
                  {shareStatus && <span className="si-done" role="status">{shareStatus}</span>}
                </div>
                <ol className="si-list">
                  {shown.length === 0 && <li className="si-empty">No questions in this topic match these filters.</li>}
                  {shown.map(({ q, i }) => (
                    <li key={q.id}>
                      <button type="button" className={isDone(q.id) ? 'done' : undefined} onClick={() => startQuestion(i)}>
                        {isDone(q.id) && <span className="si-tick">Completed</span>}
                        {q.title}
                      </button>
                    </li>
                  ))}
                </ol>
              </aside>
            </div>
            <p className="si-note">
              Your voice is processed in your browser and is not uploaded. Many questions are adapted from{' '}
              <a href="https://github.com/rohitg00/ai-engineering-from-scratch">AI Engineering from Scratch</a> by Rohit
              Ghumare (<a href="/ai-engineering-from-scratch-LICENSE.txt">MIT licence</a>).{' '}
              <Link to="/interview/questions">See the written question list</Link> or the{' '}
              <Link to="/leaderboard?tab=interview">interview leaderboard</Link>.
            </p>
          </>
        )}

        {step !== 'topics' && step !== 'done' && (
          <header className="si-stage-header">
            <div className="si-progress-header">
              <button type="button" className="si-link" onClick={backToTopics}>
                ← Topics
              </button>
              <div className="si-progress-tags">
                <span className="si-topic-pill">{topic.title}</span>
                <span className="si-counter">
                  Question {questionIndex + 1} of {topic.questions.length}
                </span>
                <span className="si-done-counter">
                  {completedTopicCount} of {topic.questions.length} completed
                </span>
              </div>
            </div>
            <div
              className="si-progress-track"
              role="progressbar"
              aria-valuenow={topicProgressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${topic.title} progress`}
            >
              <div className="si-progress-bar" style={{ width: `${topicProgressPct}%` }} />
            </div>
            <p className="si-keys">Keyboard: Space to answer or finish, N for next question.</p>
            <h2 className="si-question-title">{question.title}</h2>
            {question.options && (
              <ol className="si-options" type="A">
                {question.options.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ol>
            )}
          </header>
        )}

        {step === 'asking' && (
          <div className="si-speaker-card si-speaker-asking">
            <div className="si-speaker-identity">
              <div className="si-speaker-avatar si-avatar-interviewer" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
              </div>
              <div className="si-speaker-info">
                <span className="si-speaker-label">Interviewer speaking</span>
                <p className="si-status" role="status">
                  {voiceLoading === null
                    ? 'The interviewer is reading the question aloud…'
                    : voiceLoading < 1
                      ? `Preparing the voice on your device (${Math.round(voiceLoading * 100)}%)…`
                      : 'Preparing the voice…'}
                </p>
              </div>
            </div>
            <div className="si-speaker-wave" aria-hidden="true">
              <LiveWaveform active={true} stream={null} height={46} barColor="var(--accent)" />
            </div>
            <div className="si-actions">
              <button
                type="button"
                className="si-primary"
                onClick={() => {
                  stopAudio();
                  void startAnswering();
                }}
              >
                Skip to answering <span className="si-key-hint">Space</span>
              </button>
            </div>
          </div>
        )}

        {step === 'answering' && (
          <div className="si-speaker-card si-speaker-answering">
            <div className="si-speaker-identity">
              <div className={`si-speaker-avatar ${typing ? 'si-avatar-typing' : 'si-avatar-listening'}`} aria-hidden="true">
                {typing ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="14" x="2" y="5" rx="2" />
                    <line x1="6" x2="6.01" y1="9" y2="9" />
                    <line x1="10" x2="10.01" y1="9" y2="9" />
                    <line x1="14" x2="14.01" y1="9" y2="9" />
                    <line x1="18" x2="18.01" y1="9" y2="9" />
                    <line x1="8" x2="16" y1="15" y2="15" />
                  </svg>
                ) : (
                  <span className="si-recording-dot" />
                )}
              </div>
              <div className="si-speaker-info">
                <span className="si-speaker-label">{typing ? 'Typing your answer' : 'Listening to you'}</span>
                <p className="si-status" role="status">
                  {typing ? 'Type your explanation below.' : micStatus}
                </p>
              </div>
            </div>
            {!typing && (
              <div className="si-speaker-wave" aria-hidden="true">
                <LiveWaveform active={true} stream={micStream} height={46} barColor="var(--accent)" />
              </div>
            )}
            {typing ? (
              <textarea
                className="si-answer-box"
                aria-label="Your answer"
                rows={7}
                placeholder="Type your explanation as you would talk it through with an interviewer..."
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
              />
            ) : (
              <div className="si-answer-box" aria-live="polite">
                {transcript || <span className="si-placeholder">Your words will appear here as you speak…</span>}
              </div>
            )}
            <div className="si-actions si-sticky">
              <button type="button" className="si-primary" id="done" onClick={finishAnswer}>
                I'm done, show the answer <span className="si-key-hint">Space</span>
              </button>
              {!typing ? (
                <button
                  type="button"
                  onClick={() => {
                    answeringRef.current = false;
                    void engineRef.current?.stop().catch(() => undefined);
                    stopMic();
                    setTyping(true);
                  }}
                >
                  Type instead
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setTyping(false);
                    void startAnswering();
                  }}
                >
                  Use microphone
                </button>
              )}
            </div>
          </div>
        )}

        {step === 'finishing' && (
          <div className="si-speaker-card si-speaker-checking">
            <div className="si-speaker-identity">
              <div className="si-speaker-avatar si-avatar-checking" aria-hidden="true">
                <span className="si-checking-spinner" />
              </div>
              <div className="si-speaker-info">
                <span className="si-speaker-label">Checking your answer</span>
                <p className="si-status" role="status">
                  Finishing your transcript and evaluating key points on your device…
                </p>
              </div>
            </div>
            <div className="si-speaker-wave" aria-hidden="true">
              <LiveWaveform active={false} processing={true} height={38} barColor="var(--good)" />
            </div>
          </div>
        )}

        {step === 'answer' && (
          <div className="si-answer-stage">
            <div className="si-comparison-grid">
              <section className="si-col-yours" aria-label="Your answer and evaluation">
                <div className="si-panel-header">
                  <h3>Your answer</h3>
                  <span className="si-type-tag">{typing ? 'Typed' : 'Spoken'}</span>
                </div>
                <p className="si-yours">{transcript || 'No answer was captured.'}</p>

                {check === 'checking' && (
                  <div className="si-check-loading">
                    <p className="si-status" role="status">
                      Checking your answer against the model answer on your device…
                    </p>
                    <div className="si-speaker-wave" aria-hidden="true">
                      <LiveWaveform active={false} processing={true} height={32} barColor="var(--good)" />
                    </div>
                  </div>
                )}
                {check === 'failed' && (
                  <p className="si-status si-failed-status">Answer checking could not load on this device.</p>
                )}
                {check && typeof check === 'object' && (
                  <div className="si-check">
                    <div className="si-check-header">
                      <h3>How your answer compares</h3>
                      <span className="si-score-pill">{check.score}% coverage</span>
                    </div>
                    <ul className="si-points">
                      {check.points.map((p) => (
                        <li key={p.point} className={p.verdict}>
                          <span className="si-verdict">
                            {p.verdict === 'covered'
                              ? 'Covered'
                              : p.verdict === 'partial'
                                ? 'Partly covered'
                                : p.verdict === 'conflict'
                                  ? 'Check this'
                                  : 'Missed'}
                          </span>
                          {p.point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

              <section className="si-col-model" aria-label="Model answer and follow-ups">
                <div className="si-panel-header">
                  <h3>Model answer</h3>
                  {reading ? (
                    <button type="button" className="si-audio-toggle on" onClick={stopAudio} aria-label="Stop reading aloud">
                      <span className="si-audio-pulse" aria-hidden="true" /> Stop reading
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="si-audio-toggle"
                      onClick={() => play(`${questionId}_a`, () => undefined, question.answer)}
                      aria-label="Read model answer aloud"
                    >
                      Read aloud
                    </button>
                  )}
                </div>
                <div className="si-model" id="model-answer">
                  {question.answer}
                </div>

                {question.followUps && question.followUps.length > 0 && (
                  <div className="si-sub-section">
                    <h3>Follow-ups you may get</h3>
                    <ul className="si-bullets">
                      {question.followUps.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {question.wrongAnswers && question.wrongAnswers.length > 0 && (
                  <div className="si-sub-section si-wrong-section">
                    <h3>Common misconceptions</h3>
                    <ul className="si-bullets si-wrong">
                      {question.wrongAnswers.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {question.sourceUrl && (
                  <p className="si-note">
                    <a href={question.sourceUrl} target="_blank" rel="noopener noreferrer">
                      Full answer and follow-ups in AI Engineering from Scratch
                    </a>
                  </p>
                )}
              </section>
            </div>

            <div className="si-actions si-sticky">
              <button type="button" className="si-primary" id="next" onClick={nextQuestion}>
                {questionIndex + 1 < topic.questions.length ? 'Next question' : 'Finish topic'}{' '}
                <span className="si-key-hint">N</span>
              </button>
              {isDone(questionId) ? (
                <span className="si-done" role="status">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }} aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Completed · +{INTERVIEW_COMPLETED_POINTS} points
                </span>
              ) : transcript.trim().length > 0 ? (
                <button type="button" id="mark-complete" onClick={handleComplete}>
                  Mark complete <span className="si-wide-only">(+{INTERVIEW_COMPLETED_POINTS} points)</span>
                </button>
              ) : null}
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="si-done-stage">
            <div className="si-done-icon-wrap" aria-hidden="true">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2>That's the topic done.</h2>
            <p className="si-lede">
              You reached the end of {topic.title}. {topic.questions.filter((q) => isDone(q.id)).length} of{' '}
              {topic.questions.length} questions are marked complete.
            </p>
            <div className="si-actions">
              <button type="button" className="si-primary" onClick={backToTopics}>
                Choose another topic
              </button>
              <button type="button" onClick={shareTopic}>
                Share this topic
              </button>
              {shareStatus && <span className="si-done" role="status">{shareStatus}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
