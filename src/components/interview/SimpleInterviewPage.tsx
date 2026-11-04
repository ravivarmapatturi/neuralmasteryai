import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentMeta } from '../../lib/useDocumentMeta';
import { interviewRoomQuestions } from '../../lib/interviewRoom/questions';
import { correctInterviewTerms } from '../../lib/interviewRoom/dialogue';
import { createASREngineForQuality } from '../../lib/interviewRoom/qualitySettings';
import type { SingleThreadASREngine } from '../../lib/speechTest/engines';
import modelAnswers from '../../data/interviewModelAnswers.json';
import './interviewRoom.css';
import './simpleInterview.css';

type Step = 'topics' | 'asking' | 'answering' | 'finishing' | 'answer' | 'done';

const topics = modelAnswers.topics;
const answers = modelAnswers.answers as Record<string, string>;

function clipUrl(name: string) {
  return `/audio/interview-voice/${name}.opus`;
}

function looksLikePhone() {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return /Android|iPhone|iPad/i.test(navigator.userAgent) || (memory !== undefined && memory < 4);
}

export default function SimpleInterviewPage() {
  useDocumentMeta('AI Interview Practice', 'Pick a topic, hear an AI engineering interview question, answer out loud, then hear and read a model answer. Runs in your browser.');

  const [step, setStep] = useState<Step>('topics');
  const [topicIndex, setTopicIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [typing, setTyping] = useState(false);
  const [micStatus, setMicStatus] = useState('');
  const [reading, setReading] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const engineRef = useRef<SingleThreadASREngine | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const answeringRef = useRef(false);
  const enginePromiseRef = useRef<Promise<void> | null>(null);

  const topic = topics[topicIndex];
  const questionId = topic.questions[questionIndex];
  const question = interviewRoomQuestions.find((q) => q.id === questionId);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current = null;
    }
    setReading(false);
  }, []);

  const play = useCallback(
    (name: string, onFinish: () => void) => {
      stopAudio();
      const audio = new Audio(clipUrl(name));
      audioRef.current = audio;
      setReading(true);
      const finish = () => {
        if (audioRef.current !== audio) return;
        audioRef.current = null;
        setReading(false);
        onFinish();
      };
      audio.onended = finish;
      audio.onerror = finish;
      audio.play().catch(finish);
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
      play(`${id}_q`, () => {
        void startAnswering();
      });
    },
    [play, startAnswering]
  );

  const beginTopic = (index: number) => {
    void prepareEngine().catch(() => undefined);
    setTopicIndex(index);
    setQuestionIndex(0);
    ask(topics[index].questions[0]);
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
    setTranscript(correctInterviewTerms(finalText, questionId));
    setStep('answer');
    play(`${questionId}_a`, () => undefined);
  };

  const nextQuestion = () => {
    stopAudio();
    const next = questionIndex + 1;
    if (next >= topic.questions.length) {
      setStep('done');
      return;
    }
    setQuestionIndex(next);
    ask(topic.questions[next]);
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
    <div className="interview-room-wrap simple-interview">
      <div className="si-card">
        {step === 'topics' && (
          <>
            <h1>Practise out loud.</h1>
            <p className="si-lede">
              Pick a topic. You will hear a question, answer it in your own words, then hear and read a model answer.
            </p>
            <div className="si-topics">
              {topics.map((t, i) => (
                <button key={t.id} type="button" className="si-topic" onClick={() => beginTopic(i)}>
                  <strong>{t.title}</strong>
                  <span>
                    {t.questions.length} {t.questions.length === 1 ? 'question' : 'questions'}
                  </span>
                </button>
              ))}
            </div>
            <p className="si-note">
              Your voice is processed in your browser and is not uploaded. Looking for the written list?{' '}
              <Link to="/interview/questions">See all interview questions</Link>.
            </p>
          </>
        )}

        {step !== 'topics' && step !== 'done' && question && (
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
          </>
        )}

        {step === 'asking' && (
          <div className="si-actions">
            <p className="si-status" role="status">
              The interviewer is asking…
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
            <h3>Model answer</h3>
            <p className="si-model" id="model-answer">
              {answers[questionId]}
            </p>
            <div className="si-actions">
              <button type="button" className="si-primary" id="next" onClick={nextQuestion}>
                {questionIndex + 1 < topic.questions.length ? 'Next question' : 'Finish topic'}
              </button>
              {reading ? (
                <button type="button" onClick={stopAudio}>
                  Stop reading
                </button>
              ) : (
                <button type="button" onClick={() => play(`${questionId}_a`, () => undefined)}>
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
  );
}
