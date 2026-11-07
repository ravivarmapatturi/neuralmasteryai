import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDocumentMeta } from '../../lib/useDocumentMeta';
import { correctInterviewTerms } from '../../lib/interviewRoom/dialogue';
import { createASREngineForQuality } from '../../lib/interviewRoom/qualitySettings';
import type { SingleThreadASREngine } from '../../lib/speechTest/engines';
import practice from '../../data/interviewPractice.json';
import { InterviewGraph } from './InterviewGraph';
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
const graphTopics = topics.map((t) => ({ id: t.id, title: t.title, group: t.group, count: t.questions.length }));
const totalQuestions = graphTopics.reduce((sum, t) => sum + t.count, 0);
const firstTopic = Math.max(0, topics.findIndex((t) => t.id === 'rag'));

function locate(id: string | null) {
  if (!id) return null;
  for (let t = 0; t < topics.length; t++) {
    const q = topics[t].questions.findIndex((x) => x.id === id);
    if (q >= 0) return { topic: t, question: q };
  }
  return null;
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
  const [linked, setLinked] = useState(() => locate(params.get('q')));
  const [step, setStep] = useState<Step>('topics');
  const [topicIndex, setTopicIndex] = useState(linked?.topic ?? firstTopic);
  const [questionIndex, setQuestionIndex] = useState(linked?.question ?? 0);
  const [transcript, setTranscript] = useState('');
  const [typing, setTyping] = useState(false);
  const [micStatus, setMicStatus] = useState('');
  const [reading, setReading] = useState(false);
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
      <div className={`si-card${step === 'topics' ? ' si-card-wide' : ''}`}>
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
                    {linkedHere ? 'Start the linked question' : shown.some(({ q }) => isDone(q.id)) ? 'Next unsolved question' : 'Start this topic'}
                  </button>
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
              <Link to="/interview/questions">See the written question list</Link>.
            </p>
          </>
        )}

        {step !== 'topics' && step !== 'done' && (
          <>
            <div className="si-progress">
              <button type="button" className="si-link" onClick={backToTopics}>
                ← Topics
              </button>
              <span>
                {topic.title} · Question {questionIndex + 1} of {topic.questions.length}
              </span>
            </div>
            <h2>{question.title}</h2>
            {question.options && (
              <ol className="si-options" type="A">
                {question.options.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ol>
            )}
          </>
        )}

        {step === 'asking' && (
          <div className="si-actions">
            <p className="si-status" role="status">
              {voiceLoading === null
                ? 'The interviewer is asking…'
                : voiceLoading < 1
                  ? `Preparing the voice on your device, first time only (${Math.round(voiceLoading * 100)}%)…`
                  : 'Preparing the voice…'}
            </p>
            <button
              type="button"
              onClick={() => {
                stopAudio();
                void startAnswering();
              }}
            >
              Skip to answering
            </button>
          </div>
        )}

        {step === 'answering' && (
          <>
            <p className="si-status" role="status">
              {typing ? 'Type your answer below.' : micStatus}
            </p>
            {typing ? (
              <textarea
                className="si-answer-box"
                aria-label="Your answer"
                rows={7}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
              />
            ) : (
              <div className="si-answer-box" aria-live="polite">
                {transcript || 'Your words will appear here as you speak.'}
              </div>
            )}
            <div className="si-actions">
              <button type="button" className="si-primary" id="done" onClick={finishAnswer}>
                I'm done, show the answer
              </button>
              {!typing && (
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
              )}
            </div>
          </>
        )}

        {step === 'finishing' && (
          <p className="si-status" role="status">
            Finishing your transcript…
          </p>
        )}

        {step === 'answer' && (
          <>
            <h3>Your answer</h3>
            <p className="si-yours">{transcript || 'No answer was captured.'}</p>
            {check === 'checking' && (
              <p className="si-status" role="status">
                Checking your answer against the model answer on your device…
              </p>
            )}
            {check === 'failed' && <p className="si-status">Answer checking could not load on this device.</p>}
            {check && typeof check === 'object' && (
              <div className="si-check">
                <h3>How your answer compares · {check.score}%</h3>
                <ul className="si-points">
                  {check.points.map((p) => (
                    <li key={p.point} className={p.verdict}>
                      <span className="si-verdict">
                        {p.verdict === 'covered' ? 'Covered' : p.verdict === 'partial' ? 'Partly covered' : p.verdict === 'conflict' ? 'Check this' : 'Missed'}
                      </span>
                      {p.point}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <h3>Model answer</h3>
            <p className="si-model" id="model-answer">
              {question.answer}
            </p>
            {question.followUps && question.followUps.length > 0 && (
              <>
                <h3>Follow-ups you may get</h3>
                <ul className="si-bullets">
                  {question.followUps.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </>
            )}
            {question.wrongAnswers && question.wrongAnswers.length > 0 && (
              <>
                <h3>Common wrong answers</h3>
                <ul className="si-bullets si-wrong">
                  {question.wrongAnswers.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </>
            )}
            {question.sourceUrl && (
              <p className="si-note">
                <a href={question.sourceUrl}>Full answer and follow-ups in AI Engineering from Scratch</a>
              </p>
            )}
            <div className="si-actions">
              <button type="button" className="si-primary" id="next" onClick={nextQuestion}>
                {questionIndex + 1 < topic.questions.length ? 'Next question' : 'Finish topic'}
              </button>
              {isDone(questionId) ? (
                <span className="si-done" role="status">Completed · +{INTERVIEW_COMPLETED_POINTS} points</span>
              ) : (
                <button type="button" id="mark-complete" onClick={() => awardInterviewCompleted(questionId)}>
                  Mark complete (+{INTERVIEW_COMPLETED_POINTS} points)
                </button>
              )}
              {reading ? (
                <button type="button" onClick={stopAudio}>
                  Stop reading
                </button>
              ) : (
                <button type="button" onClick={() => play(`${questionId}_a`, () => undefined, question.answer)}>
                  Read aloud
                </button>
              )}
            </div>
          </>
        )}

        {step === 'done' && (
          <>
            <h2>That's the topic done.</h2>
            <p className="si-lede">You answered all {topic.questions.length} questions in {topic.title}.</p>
            <div className="si-actions">
              <button type="button" className="si-primary" onClick={backToTopics}>
                Choose another topic
              </button>
            </div>
          </>
        )}
      </div>
    </div>
    </>
  );
}
