import { useEffect, useRef, useState } from 'react';
import type { PointResult } from '../../lib/answerJudge';
import type { InterviewAttempt } from '../../lib/interviewAttempts';
import { selectInterviewFollowUp } from '../../lib/interviewFollowUp';
import { speakInBrowser } from '../../lib/interviewRoom/browserVoice';
import { questionSpeechPrompt } from '../../lib/interviewRoom/speechPrompt';
import { INTERVIEW_AUDIO_CONSTRAINTS } from '../../lib/speechTest/audioPreparation';
import type { SingleThreadASREngine } from '../../lib/speechTest/engines';

type FollowUp = NonNullable<InterviewAttempt['followUp']>;
interface Props {
  attempt: InterviewAttempt;
  followUps: string[];
  points?: PointResult[];
  prepareSpeech: () => Promise<SingleThreadASREngine>;
  stopReading: () => void;
  pauseMusic: () => void;
  resumeMusic: () => void;
  save: (attempt: InterviewAttempt) => void;
  onFinalizing: (pending: Promise<void>) => void;
  onActive: (active: boolean) => void;
}

export function FollowUpAnswer({ attempt, followUps, points, prepareSpeech, stopReading, pauseMusic, resumeMusic, save, onFinalizing, onActive }: Props) {
  const [phase, setPhase] = useState<'idle' | 'asking' | 'answering' | 'finishing' | 'saved'>(attempt.followUp?.status === 'saved' ? 'saved' : 'idle');
  const [answer, setAnswer] = useState<FollowUp | undefined>(attempt.followUp);
  const [typing, setTyping] = useState(false);
  const [status, setStatus] = useState('');
  const alive = useRef(true);
  const generation = useRef(0);
  const current = useRef(answer);
  const cancelVoice = useRef<(() => void) | undefined>(undefined);
  const stream = useRef<MediaStream | undefined>(undefined);
  const engine = useRef<SingleThreadASREngine | undefined>(undefined);
  const unsubscribe = useRef<(() => void) | undefined>(undefined);
  const pending = useRef<Promise<void>>(Promise.resolve());
  const latestProps = useRef({ attempt, save, resumeMusic, onActive });
  latestProps.current = { attempt, save, resumeMusic, onActive };
  const stopMic = () => {
    unsubscribe.current?.(); unsubscribe.current = undefined;
    stream.current?.getTracks().forEach(track => track.stop()); stream.current = undefined;
    latestProps.current.resumeMusic();
  };
  const update = (next: FollowUp) => {
    next = { ...next, revision: (current.current?.revision ?? 0) + 1 };
    current.current = next;
    if (alive.current) setAnswer(next);
    const { attempt, save } = latestProps.current;
    save({ ...attempt, followUp: next });
  };
  const stopVoice = () => { cancelVoice.current?.(); cancelVoice.current = undefined; };
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false; generation.current++;
      stopVoice(); stopMic(); engine.current?.cancel(); latestProps.current.onActive(false);
    };
  }, []);

  const listen = async (asTyping = false) => {
    const id = ++generation.current;
    stopVoice(); stopMic();
    setPhase('answering'); setTyping(asTyping);
    setStatus(asTyping ? 'Type your follow-up answer.' : 'Preparing speech recognition…');
    await pending.current;
    if (!alive.current || generation.current !== id || asTyping) return;
    pauseMusic();
    try {
      const speech = await prepareSpeech();
      if (!alive.current || generation.current !== id) return;
      engine.current = speech;
      await speech.prepareForListening();
      if (!alive.current || generation.current !== id) return;
      const mic = await navigator.mediaDevices.getUserMedia({ audio: INTERVIEW_AUDIO_CONSTRAINTS });
      if (!alive.current || generation.current !== id) { mic.getTracks().forEach(track => track.stop()); return; }
      stream.current = mic;
      speech.reset();
      speech.setQuestionPrompt(questionSpeechPrompt(current.current?.question ?? ''));
      unsubscribe.current = speech.subscribe(metrics => {
        const text = (metrics.partialText || metrics.finalText || '').trim();
        if (alive.current && generation.current === id && text && current.current) update({ ...current.current, transcript: text });
      });
      await speech.start(mic);
      if (alive.current && generation.current === id) setStatus('Listening.');
    } catch {
      if (!alive.current || generation.current !== id) return;
      engine.current?.cancel(); stopMic(); setTyping(true);
      setStatus('The microphone is not available. Type your follow-up answer.');
    }
  };

  const begin = () => {
    stopReading();
    const question = selectInterviewFollowUp(followUps, points);
    if (!question) return;
    onActive(true);
    update({ question, transcript: '', status: 'draft', revision: 0 });
    setPhase('asking'); setStatus('The interviewer is reading the follow-up aloud…');
    const id = ++generation.current;
    // Same on-device Kokoro voice as the existing question/answer fallback.
    try { cancelVoice.current = speakInBrowser(question, () => {
      if (alive.current && generation.current === id) void listen();
    }, fraction => {
      if (alive.current && generation.current === id) setStatus(`Preparing the voice (${Math.round(fraction * 100)}%)…`);
    }); } catch { setStatus('The voice is unavailable. You can read the follow-up and answer below.'); }
  };

  const finish = () => {
    const id = ++generation.current;
    const draft = current.current;
    if (!draft) return;
    setPhase('finishing'); setStatus('Finishing your transcript…');
    const speech = !typing && stream.current ? engine.current : undefined;
    const done = speech ? speech.stop(() => stopMic()).then(() => {
      const metrics = speech.getMetrics();
      return (metrics.batchTranscript || metrics.finalText || metrics.partialText || draft.transcript).trim();
    }).catch(() => draft.transcript) : Promise.resolve(draft.transcript);
    pending.current = done.then(text => {
      // Save to this attempt even when the learner navigates during final ASR.
      update({ ...draft, transcript: text, status: 'saved', revision: draft.revision + 1 });
      if (alive.current && generation.current === id) { stopMic(); setPhase('saved'); onActive(false); setStatus('Follow-up saved with this attempt.'); }
    });
    onFinalizing(pending.current);
  };

  return <section className="si-sub-section si-follow-up" aria-label="Spoken follow-up">
    <h3>Follow-up</h3>
    {phase === 'idle' ? <button type="button" onClick={begin}>Answer a follow-up</button> : <>
      <p className="si-follow-up-question">{answer?.question}</p>
      <p role="status">{status}</p>
      {phase === 'asking' && <div className="si-actions">
        <button type="button" onClick={() => void listen()}>Answer now</button>
        <button type="button" onClick={() => void listen(true)}>Type follow-up answer</button>
      </div>}
      {phase === 'answering' && <>
        {typing ? <textarea className="si-answer-box" aria-label="Your follow-up answer" rows={5} value={answer?.transcript ?? ''}
          onChange={event => current.current && update({ ...current.current, transcript: event.target.value })} />
          : <p className="si-follow-up-transcript" aria-live="polite">{answer?.transcript || 'Your words will appear here as you speak…'}</p>}
        <div className="si-actions">
          <button type="button" onClick={finish}>Save follow-up</button>
          <button type="button" onClick={() => {
            engine.current?.cancel(); stopMic();
            void listen(!typing);
          }}>{typing ? 'Use microphone for follow-up' : 'Type follow-up answer'}</button>
        </div>
      </>}
      {(phase === 'saved' || phase === 'finishing') && <p className="si-follow-up-transcript">{answer?.transcript || 'No follow-up answer was captured.'}</p>}
    </>}
  </section>;
}
