import { SystemDesignCanvas } from './SystemDesignCanvas';
import references from '../../data/systemDesignReferences.json';
import { emptySketch, type SystemDesignSketch } from '../../lib/systemDesignSketch';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useDocumentMeta } from '../../lib/useDocumentMeta';
import { correctInterviewTerms } from '../../lib/interviewRoom/dialogue';
import { canUseHighEndSpeech, rememberedSpeechModel, rememberSpeechModel, type SpeechModelChoice } from '../../lib/interviewRoom/speechDevice';
import { createASREngineForQuality, QUALITY_PROFILES } from '../../lib/interviewRoom/qualitySettings';
import { INTERVIEW_AUDIO_CONSTRAINTS } from '../../lib/speechTest/audioPreparation';
import { questionSpeechPrompt } from '../../lib/interviewRoom/speechPrompt';
import { useFocusMusic } from '../../contexts/FocusMusicContext';
import type { SingleThreadASREngine } from '../../lib/speechTest/engines';
import practice from '../../data/interviewPractice.json';
import { LearnLinks } from './LearnLinks';
import { InterviewGraph } from './InterviewGraph';
import { DeliveryRow } from './DeliveryRow';
import { measureDelivery, type DeliveryTiming } from '../../lib/interviewDelivery';
import { useInterviewLearning } from '../../contexts/InterviewLearningContext';
import { rateQuestion, reviewDueAt, RATING_LABELS, type SelfRating } from '../../lib/interviewLearning';
import { FollowUpAnswer } from './FollowUpAnswer';
import { LiveWaveform } from './LiveWaveform';
import Navbar from '../layout/Navbar';
import { judgePracticeAnswer, SHOW_COVERAGE_SCORE, splitAnswer, precomputeModelAnswerEmbeddings, type AnswerJudgement } from '../../lib/answerJudge';
import { embed, loadJudge, nli } from '../../lib/mockInterview/engine';
import { speakInBrowser } from '../../lib/interviewRoom/browserVoice';
import { useInterviewAttempts } from '../../contexts/InterviewAttemptsContext';
import { compareAttempts, type InterviewAttempt } from '../../lib/interviewAttempts';
import { useGamification } from '../../contexts/GamificationContext';
import { INTERVIEW_COMPLETED_POINTS, hasAward } from '../../lib/gamification';
import { CategoryVisual } from '../widgets/CategoryVisual';
import './interviewRoom.css';
import './simpleInterview.css';

const PracticeWorkspace = lazy(() => import('../practice/PracticeWorkspace'));

type Step = 'topics' | 'asking' | 'answering' | 'answer' | 'code' | 'done';

interface PracticeQuestion {
  id: string;
  title: string;
  answer: string;
  keyPoints?: string[];
  options?: string[];
  sourceUrl?: string;
  followUps?: string[];
  wrongAnswers?: string[];
  tradeOffs?: string[];
  rounds?: string[];
  roles?: string[];
  level?: string;
  problemId?: string;
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
const LEVELS: Record<string, string> = {
  mid: 'Mid-level',
  senior: 'Senior',
  staff: 'Staff',
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
const BOOKMARKS_KEY = 'nm-interview-bookmarks';

function readLast() {
  try {
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}

function readBookmarks(): Set<string> {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writeBookmarks(set: Set<string>) {
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // Private mode
  }
}

function clipUrl(name: string) {
  return `/audio/interview-voice/${name.replaceAll(':', '__')}.opus`;
}

function looksLikePhone() {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return /Android|iPhone|iPad/i.test(navigator.userAgent) || (memory !== undefined && memory < 4);
}

// Each question has its own address, such as /interview/q/repo__rag__rerank-pool-size.
function questionPath(id: string) {
  return `/interview/q/${encodeURIComponent(id.replaceAll(':', '__'))}`;
}

function questionFromPath(pathname: string) {
  const match = pathname.match(/\/interview\/q\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]).replaceAll('__', ':') : null;
}

const READ_ALOUD_KEY = 'nm-interview-read-aloud';
function readAloudPreference(): boolean {
  try {
    return localStorage.getItem(READ_ALOUD_KEY) === 'true';
  } catch {
    return false;
  }
}
function writeAloudPreference(enabled: boolean) {
  try {
    localStorage.setItem(READ_ALOUD_KEY, enabled ? 'true' : 'false');
  } catch {}
}

interface CatalogItem {
  q: PracticeQuestion;
  topicId: string;
  topicTitle: string;
  topicIndex: number;
  questionIndex: number;
}

// Question addresses stay clean: the id already names the topic, so only real filters follow it.
function questionQuery() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('topic') !== 'all') params.delete('topic');
  const query = params.toString();
  return query ? `?${query}` : '';
}

function SpeechModelStatus({ ready, loading, progress }: { ready: boolean; loading: boolean; progress: number }) {
  if (!ready && !loading) return null;
  const pct = ready ? 100 : Math.round(progress);
  const circumference = 2 * Math.PI * 9;
  return (
    <span className={`si-model-status${ready ? ' is-ready' : ''}`} role="status">
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <circle className="si-model-track" cx="12" cy="12" r="9" />
        <circle
          className="si-model-arc"
          cx="12"
          cy="12"
          r="9"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
          transform="rotate(-90 12 12)"
        />
        {ready && <path className="si-model-check" d="M7.5 12.5l3 3 6-6.5" />}
      </svg>
      {ready ? 'Ready' : `Loading ${pct}%`}
    </span>
  );
}

export default function SimpleInterviewPage() {
  const [params] = useSearchParams();
  const rawQ = params.get('q');
  const isDirectQuestionQ = Boolean(rawQ && locate(rawQ));
  const initialSearch = params.get('search') ?? (!isDirectQuestionQ && rawQ ? rawQ : '');
  const [searchQuery, setSearchQuery] = useState(initialSearch);

  // A link like /interview/q/<id> or /interview/q/<id>/ opens directly on that question in the room (B1).
  const [pathQuestion] = useState(() => questionFromPath(window.location.pathname));
  const directQuestion = useMemo(() => locate(pathQuestion), [pathQuestion]);
  const allowResume = !['topic','role','level','round','status','search'].some(key=>params.has(key)) && !initialSearch;
  const [resuming] = useState(() => allowResume && !pathQuestion && !locate(params.get('q')) && !!locate(readLast()));
  const [linked, setLinked] = useState(() => directQuestion ?? locate(rawQ) ?? (allowResume ? locate(readLast()) : null));
  const sharedTopic = topics.findIndex((t) => t.id === params.get('topic'));

  const INPUT_MODE_KEY = 'nm-interview-input-mode';
  const [inputMode, setInputMode] = useState<string | null>(() => {
    try {
      return localStorage.getItem(INPUT_MODE_KEY);
    } catch {
      return null;
    }
  });
  const [showInputPrimer, setShowInputPrimer] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [topicFilter, setTopicFilter] = useState(() => {
    const pTopic = params.get('topic');
    if (pTopic === 'all') return 'all';
    if (pTopic && topics.some((t) => t.id === pTopic)) return pTopic;
    if (sharedTopic >= 0) return topics[sharedTopic].id;
    if (directQuestion) return topics[directQuestion.topic].id;
    if (linked) return topics[linked.topic].id;
    return initialSearch ? 'all' : (topics[firstTopic]?.id ?? 'rag');
  });

  const [step, setStep] = useState<Step>(() => {
    if (directQuestion) return 'asking';
    return 'topics';
  });
  const [reviewSession,setReviewSession]=useState<string[] | null>(null);
  const previousStepRef = useRef<Step>('asking');
  const [topicIndex, setTopicIndex] = useState(() => {
    if (directQuestion) return directQuestion.topic;
    if (sharedTopic >= 0) return sharedTopic;
    if (linked) return linked.topic;
    return firstTopic;
  });
  const [shareStatus, setShareStatus] = useState('');
  const [questionIndex, setQuestionIndex] = useState(() => {
    if (directQuestion) return directQuestion.question;
    return linked?.question ?? 0;
  });
  const [readAloud, setReadAloud] = useState<boolean>(() => readAloudPreference());
  const toggleReadAloud = useCallback(() => {
    setReadAloud((prev) => {
      const next = !prev;
      writeAloudPreference(next);
      return next;
    });
  }, []);
  const [transcript, setTranscript] = useState('');
  const [sketch, setSketch] = useState<SystemDesignSketch>(emptySketch);
  const [typing, setTyping] = useState(false);
  const [micStatus, setMicStatus] = useState('');
  const [micError, setMicError] = useState<string | null>(null);

  const [status, setStatus] = useState(() => {
    const pStatus = params.get('status');
    if (pStatus) return pStatus;
    if (params.get('unanswered') === '1' || params.get('unanswered') === 'true') return 'unanswered';
    if (params.get('bookmarked') === '1' || params.get('bookmarked') === 'true') return 'bookmarked';
    return '';
  });
  const [round, setRound] = useState(() => params.get('round') ?? '');
  const [role, setRole] = useState(() => params.get('role') ?? '');
  const [level, setLevel] = useState(() => params.get('level') ?? '');
  const [bookmarks, setBookmarks] = useState<Set<string>>(() => readBookmarks());

  const toggleBookmark = useCallback((id: string) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeBookmarks(next);
      return next;
    });
  }, []);

  const updateUrlFilters = useCallback(
    (updates: {
      search?: string;
      topic?: string;
      status?: string;
      level?: string;
      round?: string;
      role?: string;
    }) => {
      const nextParams = new URLSearchParams(window.location.search);
      const nextSearch = updates.search !== undefined ? updates.search : searchQuery;
      const nextTopic = updates.topic !== undefined ? updates.topic : topicFilter;
      const nextStatus = updates.status !== undefined ? updates.status : status;
      const nextLevel = updates.level !== undefined ? updates.level : level;
      const nextRound = updates.round !== undefined ? updates.round : round;
      const nextRole = updates.role !== undefined ? updates.role : role;

      if (nextSearch.trim()) {
        nextParams.set('search', nextSearch.trim());
        nextParams.delete('q');
      } else {
        nextParams.delete('search');
        if (!isDirectQuestionQ) nextParams.delete('q');
      }

      if (nextTopic && nextTopic !== 'all') nextParams.set('topic', nextTopic);
      else if (nextTopic === 'all') nextParams.set('topic', 'all');
      else nextParams.delete('topic');

      if (nextStatus) {
        nextParams.set('status', nextStatus);
        nextParams.delete('unanswered');
        nextParams.delete('bookmarked');
      } else {
        nextParams.delete('status');
        nextParams.delete('unanswered');
        nextParams.delete('bookmarked');
      }

      if (nextLevel) nextParams.set('level', nextLevel);
      else nextParams.delete('level');

      if (nextRound) nextParams.set('round', nextRound);
      else nextParams.delete('round');

      if (nextRole) nextParams.set('role', nextRole);
      else nextParams.delete('role');

      const queryStr = nextParams.toString();
      const newUrl = window.location.pathname + (queryStr ? `?${queryStr}` : '');
      window.history.replaceState(null, '', newUrl);
    },
    [searchQuery, topicFilter, status, level, round, role, isDirectQuestionQ]
  );
  const [speechChoice, setSpeechChoice] = useState<SpeechModelChoice>('default');
  const speechChoiceRef = useRef<SpeechModelChoice>('default');
  const [highEndEligible, setHighEndEligible] = useState(false);
  const [speechLoading, setSpeechLoading] = useState(false);
  const [speechProgress, setSpeechProgress] = useState(0);
  const [speechReady, setSpeechReady] = useState(false);
  const [speechNotice, setSpeechNotice] = useState('');
  const speechGeneration = useRef(0);
  useEffect(() => {
    let active = true;
    void canUseHighEndSpeech().then(eligible => {
      if (!active) return;
      setHighEndEligible(eligible);
      if (eligible && !enginePromiseRef.current) {
        const choice = rememberedSpeechModel();
        speechChoiceRef.current = choice; setSpeechChoice(choice);
      }
    });
    return () => { active = false; };
  }, []);
  const [reading, setReading] = useState(false);
  const [followUpActive, setFollowUpActive] = useState(false);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const reviewRef = useRef(0);
  const finishingRef = useRef<Promise<void>>(Promise.resolve());
  const [check, setCheck] = useState<AnswerJudgement | 'checking' | 'failed' | null>(null);
  const { attempts, save: saveAttempt, syncState } = useInterviewAttempts();
  const { records: learning, save: saveLearning, ready: learningReady } = useInterviewLearning();
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const { events, awardInterviewCompleted } = useGamification();
  const isDone = useCallback((id: string) => Boolean(learning.find(r=>r.questionId===id)?.completion) || hasAward(events, `/interview#${id}`, 'interview'), [events,learning]);

  const allCatalogQuestions = useMemo(() => {
    const list: CatalogItem[] = [];
    topics.forEach((t, tIdx) => {
      t.questions.forEach((q, qIdx) => {
        list.push({ q, topicId: t.id, topicTitle: t.title, topicIndex: tIdx, questionIndex: qIdx });
      });
    });
    return list;
  }, []);

  useEffect(()=>{
    if(learningReady===false)return;
    const imported=allCatalogQuestions.flatMap(({q})=>{
      if(learning.some(r=>r.questionId===q.id && r.completion))return [];
      const event=events.find(e=>e.kind==='interview' && e.permalink===`/interview#${q.id}`);
      if(!event)return [];
      const time=new Date(`${event.date}T12:00:00`).getTime();
      return Number.isFinite(time) ? [{questionId:q.id,completion:{time,attemptId:`legacy:${q.id}`}}] : [];
    });
    if(imported.length)saveLearning(imported);
  },[events,learning,learningReady,allCatalogQuestions,saveLearning]);



  const filteredList = useMemo(() => {
    return allCatalogQuestions.filter(({ q, topicId, topicTitle }) => {
      if (topicFilter !== 'all' && topicId !== topicFilter) return false;
      if (level && q.level !== level) return false;
      if (round && !(q.rounds ?? []).includes(round)) return false;
      if (role && !(q.roles ?? []).includes(role)) return false;
      if (status === 'unanswered' || status === 'unanswered-bookmarked') {
        if (isDone(q.id)) return false;
      }
      if (status === 'bookmarked' || status === 'unanswered-bookmarked') {
        if (!bookmarks.has(q.id)) return false;
      }
      if (searchQuery.trim()) {
        const term = searchQuery.toLowerCase().trim();
        const inTitle = q.title.toLowerCase().includes(term);
        const inTopic = topicTitle.toLowerCase().includes(term);
        const inAnswer = q.answer.toLowerCase().includes(term);
        if (!inTitle && !inTopic && !inAnswer) return false;
      }
      return true;
    });
  }, [allCatalogQuestions, topicFilter, level, round, role, status, searchQuery, bookmarks, isDone]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { playing: focusPlaying, pause: pauseFocusMusic, play: playFocusMusic } = useFocusMusic();
  const focusPlayingRef = useRef(focusPlaying);
  focusPlayingRef.current = focusPlaying;
  const resumeFocusRef = useRef(false);
  const engineRef = useRef<SingleThreadASREngine | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const answeringRef = useRef(false);
  const enginePromiseRef = useRef<Promise<void> | null>(null);

  const topic = topics[topicIndex];

  const handleComplete = () => {
    awardInterviewCompleted(questionId);
    if(!learning.find(r=>r.questionId===questionId)?.completion)saveLearning([{questionId,completion:{time:Date.now(),attemptId:attemptId ?? crypto.randomUUID()}}]);
  };
  const completedTotal = topics.reduce((sum, t) => sum + t.questions.filter((q) => isDone(q.id)).length, 0);
  const graphTopics = useMemo(
    () => baseGraphTopics.map((g, i) => ({ ...g, done: topics[i].questions.filter((q) => isDone(q.id)).length })),
    [isDone]
  );
  const linkedHere = linked && linked.topic === topicIndex ? linked : null;
  const question = topic.questions[questionIndex];

  const pageTitle = useMemo(() => {
    if (step !== 'topics' && question) {
      return `${question.title} | AI Engineering Interview`;
    }
    if (topicFilter !== 'all' && topic) {
      return `${topic.title} Interview Questions | Neural Mastery`;
    }
    return 'AI Engineering Interview Practice | Neural Mastery';
  }, [step, question, topicFilter, topic]);

  const pageDesc = useMemo(() => {
    if (step !== 'topics' && question) {
      return `Practice this ${topic?.title || 'AI engineering'} interview question: "${question.title}". Answer out loud or in writing with on-device evaluation.`;
    }
    if (topicFilter !== 'all' && topic) {
      return `${topic.title}: ${topic.about || `Practice ${topic.title} AI engineering interview questions.`}`;
    }
    return 'Practice 900+ AI engineering, deep learning, and system design interview questions with live feedback and worked model answers.';
  }, [step, question, topicFilter, topic]);

  useDocumentTitle(pageTitle);
  useDocumentMeta(pageTitle, pageDesc);
  const questionId = question.id;
  const referenceDiagram = (references as Record<string, SystemDesignSketch & { note: string }>)[questionId];
  const earlier = attempts.filter(a => a.questionId === questionId && a.id !== attemptId).slice().reverse();
  const latest = attempts.find(a => a.id === attemptId && a.questionId === questionId);
  const currentLearning = learning.find(r=>r.questionId===questionId);
  const selfRating = currentLearning?.rating && currentLearning.rating.attemptId===attemptId ? currentLearning.rating : undefined;
  const comparison = latest && earlier[0] ? compareAttempts(earlier[0], latest) : null;

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
        audio.pause();
        audio.onended = null;
        audio.onerror = null;
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
    if (resumeFocusRef.current) { resumeFocusRef.current = false; void playFocusMusic().catch(() => undefined); }
  }, [playFocusMusic]);

  // Download starts when the topic is chosen, so the first answer is not spoken into a loading model
  const prepareEngine = useCallback(() => {
    if (!enginePromiseRef.current) {
      const generation = speechGeneration.current;
      setSpeechLoading(true);
      setSpeechProgress(0);
      setSpeechReady(false);
      enginePromiseRef.current = (async () => {
        const load = async (candidate: SingleThreadASREngine) => {
          const off = candidate.subscribe(m => {
            if (m.status === 'loading' && generation === speechGeneration.current) setSpeechProgress(p => Math.max(p, m.downloadProgressPct));
            if (answeringRef.current && m.status === 'loading') setMicStatus(`Preparing speech recognition… ${m.downloadProgressPct}%`);
          });
          engineRef.current = candidate;
          try { await candidate.load(); } finally { off(); }
          if (generation !== speechGeneration.current) throw new Error('Speech preparation cancelled');
        };
        const requested = speechChoiceRef.current;
        let engine = createASREngineForQuality(requested === 'turbo' ? 'best' : looksLikePhone() ? 'fast' : 'better');
        try {
          await load(engine);
        } catch {
          engine.destroy();
          if (generation !== speechGeneration.current) return;
          if (requested === 'turbo') {
            speechChoiceRef.current = 'default'; setSpeechChoice('default'); rememberSpeechModel('default');
            setSpeechNotice('High accuracy unavailable. Using Standard.');
          } else {
            setSpeechNotice('Standard unavailable. Using lightweight speech recognition.');
          }
          engine = createASREngineForQuality(requested === 'turbo' ? 'better' : 'fast');
          await load(engine);
        }
        engineRef.current = engine;
        if (generation === speechGeneration.current) setSpeechReady(true);
      })().catch((err) => {
        if (generation === speechGeneration.current) enginePromiseRef.current = null;
        throw err;
      }).finally(() => { if (generation === speechGeneration.current) setSpeechLoading(false); });
    }
    return enginePromiseRef.current;
  }, []);

  const prepareFollowUpSpeech = useCallback(async () => {
    await finishingRef.current;
    await prepareEngine();
    if (!engineRef.current) throw new Error('Speech engine unavailable');
    return engineRef.current;
  }, [prepareEngine]);
  const pauseForFollowUp = () => {
    if (focusPlayingRef.current) resumeFocusRef.current = true;
    pauseFocusMusic();
  };
  const resumeAfterFollowUp = () => {
    if (resumeFocusRef.current) { resumeFocusRef.current = false; void playFocusMusic().catch(() => undefined); }
  };

  const switchSpeechModel = async (choice: SpeechModelChoice) => {
    if (answeringRef.current || transcribing) return;
    speechChoiceRef.current = choice; setSpeechChoice(choice); rememberSpeechModel(choice);
    setSpeechNotice('');
    speechGeneration.current++;
    setSpeechReady(false);
    setSpeechProgress(0);
    engineRef.current?.destroy(); engineRef.current = null; enginePromiseRef.current = null;
    // Selecting the optional model explicitly authorizes its background download.
    void prepareEngine().catch(() => setSpeechNotice('Speech recognition unavailable. You can type your answer.'));
  };

  const startAnswering = useCallback(async (promptQuestion?: string, forceSpeech = false) => {
    setStep('answering');
    setTranscript('');
    setCheck(null);
    setTranscribing(false);
    const generation = ++reviewRef.current;
    await finishingRef.current;
    if (reviewRef.current !== generation) return;
    if (typing && !forceSpeech) return;
    answeringRef.current = true;
    stopAudio();
    if (focusPlayingRef.current) resumeFocusRef.current = true;
    pauseFocusMusic();
    setMicError(null);
    try {
      setMicStatus('Allow your microphone to answer out loud.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: INTERVIEW_AUDIO_CONSTRAINTS });
      if (!answeringRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      setMicStream(stream);
      setMicStatus('Please wait, speech recognition is still getting ready on your device…');
      await prepareEngine();
      await engineRef.current?.prepareForListening();
      if (!answeringRef.current) return;
      const engine = engineRef.current;
      if (!engine) throw new Error('Speech engine unavailable');
      engine.reset();
      engine.setQuestionPrompt(questionSpeechPrompt(promptQuestion ?? question.title));
      unsubscribeRef.current = engine.subscribe((m) => {
        const text = (m.partialText || m.finalText || '').trim();
        if (answeringRef.current && text) setTranscript(text);
      });
      await engine.start(stream);
      setMicStatus('Listening.');
      void loadJudge()
        .then(() => {
          const points = splitAnswer(question.answer).slice(0, 6);
          return precomputeModelAnswerEmbeddings(points, question.answer, embed);
        })
        .catch(() => undefined);
    } catch (err) {
      engineRef.current?.cancel();
      stopMic();
      setTyping(true);
      let errorMsg = 'Microphone access is unavailable. Please type your explanation below.';
      const errName = (err && typeof err === 'object' && 'name' in err) ? String((err as { name: unknown }).name) : '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        errorMsg = 'Microphone access was denied. Please allow microphone permissions in your browser address bar to speak your answers, or type below.';
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        errorMsg = 'No microphone device was detected. You can type your explanation below.';
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        errorMsg = 'Microphone is currently in use by another application. You can type your answer below.';
      }
      setMicError(errorMsg);
      setMicStatus(errorMsg);
    }
  }, [typing, stopMic, prepareEngine, stopAudio, pauseFocusMusic, question.title]);

  const handleStartAnswering = useCallback((promptQuestion?: string) => {
    stopAudio();
    const mode = inputMode ?? (() => {
      try {
        return localStorage.getItem(INPUT_MODE_KEY);
      } catch {
        return null;
      }
    })();
    setStep('answering');
    if (!mode) {
      setShowInputPrimer(true);
    } else if (mode === 'type') {
      setTyping(true);
    } else {
      setTyping(false);
      void startAnswering(promptQuestion, true);
    }
  }, [inputMode, stopAudio, startAnswering]);

  const chooseVoice = useCallback(() => {
    try {
      localStorage.setItem(INPUT_MODE_KEY, 'voice');
    } catch {}
    setInputMode('voice');
    setShowInputPrimer(false);
    setTyping(false);
    void startAnswering(undefined, true);
  }, [startAnswering]);

  const chooseType = useCallback(() => {
    try {
      localStorage.setItem(INPUT_MODE_KEY, 'type');
    } catch {}
    setInputMode('type');
    setShowInputPrimer(false);
    setTyping(true);
  }, []);

  const ask = useCallback(
    (id: string) => {
      reviewRef.current++;
      setAttemptId(null);
      setSketch(emptySketch());
      setStep('asking');
      setShowInputPrimer(false);
      try {
        localStorage.setItem(LAST_KEY, id);
      } catch {
        // Private mode: resume is simply unavailable.
      }
      const q = topics.flatMap((t) => t.questions).find((x) => x.id === id);
      if (readAloudPreference()) {
        const spoken = q ? q.title + (q.options ? ` The options are: ${q.options.join('. ')}` : '') : undefined;
        play(
          `${id}_q`,
          () => {
            handleStartAnswering(q?.title);
          },
          spoken
        );
      }
    },
    [play, handleStartAnswering]
  );

  const readQuestion = () => {
    writeAloudPreference(true);
    setReadAloud(true);
    const q = topics.flatMap((t) => t.questions).find((x) => x.id === questionId);
    const spoken = q ? q.title + (q.options ? ` The options are: ${q.options.join('. ')}` : '') : undefined;
    play(
      `${questionId}_q`,
      () => {
        if (step === 'asking') {
          handleStartAnswering(q?.title);
        }
      },
      spoken
    );
  };

  const startQuestion = (index: number) => {
    setReviewSession(null);
    void prepareEngine().catch(() => undefined);
    setQuestionIndex(index);
    const qStr = questionQuery();
    window.history.pushState(null, '', questionPath(topic.questions[index].id) + qStr);
    ask(topic.questions[index].id);
  };

  const startQuestionFromItem = (item: CatalogItem, session:string[] | null = null) => {
    setReviewSession(session);
    void prepareEngine().catch(() => undefined);
    setTopicIndex(item.topicIndex);
    setQuestionIndex(item.questionIndex);
    const qStr = questionQuery();
    window.history.pushState(null, '', questionPath(item.q.id) + qStr);
    ask(item.q.id);
  };

  const goToItem = (item: CatalogItem) => {
    reviewRef.current++;
    answeringRef.current = false;
    stopAudio();
    stopMic();
    void engineRef.current?.stop().catch(() => undefined);
    setTranscript('');
    setCheck(null);
    setTranscribing(false);
    setTopicIndex(item.topicIndex);
    setQuestionIndex(item.questionIndex);
    const qStr = questionQuery();
    window.history.pushState(null, '', questionPath(item.q.id) + qStr);
    ask(item.q.id);
  };

  // The model answer appears and starts reading at once; transcript and checking finish behind it.
  const finishAnswer = () => {
    answeringRef.current = false;
    const id = ++reviewRef.current;
    const liveText = transcript;
    const engine = !typing && streamRef.current ? engineRef.current : null;
    const current = question;
    const draft: InterviewAttempt = { id: crypto.randomUUID(), questionId: current.id, time: Date.now(), transcript: '', points: [],
      source: current.keyPoints?.length ? 'rubric' : 'reference', status: 'unchecked', revision: 0,
      ...(current.rounds?.includes('system-design') ? { sketch } : {}) };
    saveAttempt({ ...draft, transcript: correctInterviewTerms(liveText, current.id, current.title) });
    setAttemptId(draft.id);
    setStep('answer');
    setCheck(null);
    setTranscribing(Boolean(engine));
    setTranscript(correctInterviewTerms(liveText, current.id, current.title));

    let deliveryTiming: DeliveryTiming | undefined;
    const finalize = engine
      ? engine.stop(() => { stopMic(); }).then(() => {
          const m = engine.getMetrics();
          deliveryTiming = m.deliveryTiming;
          if (speechChoiceRef.current === 'turbo' && m.finalModelUsed && !m.finalModelUsed.includes('large-v3-turbo')) {
            speechChoiceRef.current = 'default'; setSpeechChoice('default'); rememberSpeechModel('default');
            setSpeechNotice('High accuracy unavailable. Using Standard.');
            engine.destroy(); engineRef.current = null; enginePromiseRef.current = null;
          }
          return (m.batchTranscript || m.finalText || m.partialText || liveText).trim();
        }).catch(() => { deliveryTiming = engine.getMetrics().deliveryTiming; return liveText; })
      : Promise.resolve(liveText);
    finishingRef.current = finalize.then(() => undefined);
    void finalize.then((finalText) => {
      const spoken = correctInterviewTerms(finalText, current.id, current.title);
      const attempt = { ...draft, transcript: spoken, revision: 1,
        ...(deliveryTiming ? { delivery: measureDelivery(finalText, deliveryTiming) } : {}) };
      saveAttempt(attempt);
      if (spoken.trim()) saveLearning([{questionId:current.id,completion:{time:attempt.time,attemptId:attempt.id}}]);
      if (reviewRef.current === id) {
        stopMic();
        setTranscript(spoken);
        setTranscribing(false);
      }
      if (!current.keyPoints?.length && spoken.trim().split(/\s+/).length < 5) return;
      if (reviewRef.current === id) setCheck('checking');
      (spoken.trim() ? loadJudge() : Promise.resolve())
        .then(() => judgePracticeAnswer(spoken, current, { embed, nli }))
        .then((result) => {
          saveAttempt({ ...attempt, revision: 2, status: 'checked', points: result.points,
            ...(attempt.source === 'reference' ? { score: result.score } : {}) });
          if (reviewRef.current === id) setCheck(result);
        })
        .catch(() => {
          saveAttempt({ ...attempt, revision: 2, status: 'failed' });
          if (reviewRef.current === id) setCheck('failed');
        });
    });
  };

  // Moves to a question from any step: stops whatever is playing or listening, then asks it.
  const goToQuestion = (index: number) => {
    reviewRef.current++;
    answeringRef.current = false;
    stopAudio();
    stopMic();
    void engineRef.current?.stop().catch(() => undefined);
    setTranscript('');
    setCheck(null);
    setTranscribing(false);
    if (index !== questionIndex) {
      setQuestionIndex(index);
      const qStr = questionQuery();
      window.history.pushState(null, '', questionPath(topic.questions[index].id) + qStr);
    }
    ask(topic.questions[index].id);
  };

  const navigationList = reviewSession ? reviewSession.map(id=>allCatalogQuestions.find(item=>item.q.id===id)).filter((item):item is CatalogItem=>Boolean(item)) : filteredList;
  const currentFilteredIndex = navigationList.findIndex((item) => item.q.id === question.id);
  const previousItem = currentFilteredIndex > 0 ? navigationList[currentFilteredIndex - 1] : null;
  const nextItem = currentFilteredIndex >= 0 && currentFilteredIndex < navigationList.length - 1 ? navigationList[currentFilteredIndex + 1] : null;

  const previousQuestion = () => {
    if (!previousItem) return;
    goToItem(previousItem);
  };

  const nextQuestion = () => {
    if (!nextItem) {
      stopAudio();
      setStep('done');
      return;
    }
    goToItem(nextItem);
  };

  const backToTopics = () => {
    reviewRef.current++;
    answeringRef.current = false;
    stopAudio();
    stopMic();
    void engineRef.current?.stop().catch(() => undefined);
    const qStr = window.location.search;
    if (window.location.pathname !== '/interview/') window.history.pushState(null, '', '/interview/' + qStr);
    setStep('topics');
  };

  // Clicking today's question on the home page goes straight into that question.
  const location = useLocation();
  const autostarted = useRef(false);
  useEffect(() => {
    const wantsStart = (location.state as { autostart?: boolean } | null)?.autostart;
    if (!wantsStart || autostarted.current || !pathQuestion || !linked) return;
    autostarted.current = true;
    startQuestion(linked.question);
  });

  // The browser's back button returns to the topic graph.
  useEffect(() => {
    const onPop = () => {
      if (!questionFromPath(window.location.pathname)) backToTopics();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  });

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
      handleStartAnswering();
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
      speechGeneration.current++;
      engineRef.current?.destroy();
    },
    [stopAudio, stopMic]
  );

  const isRoomStep = step === 'asking' || step === 'answering';
  useEffect(() => {
    if (isRoomStep) {
      document.body.classList.add('si-viewport-lock');
    } else {
      document.body.classList.remove('si-viewport-lock');
    }
    return () => {
      document.body.classList.remove('si-viewport-lock');
    };
  }, [isRoomStep]);

  return (
    <>
    <Navbar />
    <div className={`interview-room-wrap simple-interview${isRoomStep ? ' si-room-active' : ''}`}>
      <div className={`si-card${step === 'topics' ? ' si-card-wide' : ' si-card-stage'}`}>
        {step === 'topics' && (
          highEndEligible ? (
            <div className="si-speech-model">
              <label htmlFor="speech-model">Speech model</label>
              <select id="speech-model" value={speechChoice} disabled={transcribing || followUpActive} onChange={event => void switchSpeechModel(event.target.value as SpeechModelChoice)}>
                <option value="default">Standard</option>
                <option value="turbo">High accuracy · {QUALITY_PROFILES.best.downloadSizeMB}</option>
              </select>
              <SpeechModelStatus ready={speechReady} loading={speechLoading} progress={speechProgress} />
            </div>
          ) : (
            <div className="si-speech-model">
              Speech model: Standard
              <SpeechModelStatus ready={speechReady} loading={speechLoading} progress={speechProgress} />
            </div>
          )
        )}
        {speechNotice && (
          <div className="si-notice-banner" role="status">
            <span>{speechNotice}</span>
            <button
              type="button"
              className="si-notice-dismiss"
              aria-label="Dismiss notice"
              onClick={() => setSpeechNotice('')}
            >
              ×
            </button>
          </div>
        )}
        {step === 'topics' && (
          <>
            <h1>Interview practice</h1>
            <p className="si-lede">
              <strong>{completedTotal}</strong> of <strong>{totalQuestions}</strong> questions completed across {graphTopics.length} topics.
            </p>
            <div className="si-map">
              <InterviewGraph
                topics={graphTopics}
                activeId={topicFilter === 'all' ? '' : topic.id}
                onActivate={(id) => {
                  setTopicFilter(id);
                  const idx = topics.findIndex((t) => t.id === id);
                  if (idx >= 0) setTopicIndex(idx);
                  updateUrlFilters({ topic: id });
                }}
              />
              <aside className="si-panel" aria-live="polite">
                <div className="si-search-wrap">
                  <label htmlFor="interview-search" className="sr-only">Search all questions</label>
                  <div className="si-search-input-box">
                    <svg className="si-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      type="search"
                      id="interview-search"
                      placeholder="Search all questions…"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        updateUrlFilters({ search: e.target.value });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setSearchQuery('');
                          updateUrlFilters({ search: '' });
                        }
                      }}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        className="si-search-clear"
                        aria-label="Clear search"
                        onClick={() => {
                          setSearchQuery('');
                          updateUrlFilters({ search: '' });
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                <select
                  className="si-topic-select"
                  aria-label="Topic"
                  value={topicFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTopicFilter(val);
                    if (val !== 'all') {
                      const idx = topics.findIndex((t) => t.id === val);
                      if (idx >= 0) setTopicIndex(idx);
                    }
                    updateUrlFilters({ topic: val });
                  }}
                >
                  <option value="all">All topics ({totalQuestions})</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.questions.length})
                    </option>
                  ))}
                </select>

                <div className="si-filters">
                  <select
                    aria-label="Question status"
                    value={status}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStatus(val);
                      updateUrlFilters({ status: val });
                    }}
                  >
                    <option value="">All questions</option>
                    <option value="unanswered">Unanswered</option>
                    <option value="bookmarked">Bookmarked ({bookmarks.size})</option>
                    <option value="unanswered-bookmarked">Unanswered & Bookmarked</option>
                  </select>
                  <select
                    aria-label="Experience level"
                    value={level}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLevel(val);
                      updateUrlFilters({ level: val });
                    }}
                  >
                    <option value="">All levels</option>
                    {Object.entries(LEVELS).map(([id, label]) => (
                      <option key={id} value={id}>{label}</option>
                    ))}
                  </select>
                  <select
                    aria-label="Interview round"
                    value={round}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRound(val);
                      updateUrlFilters({ round: val });
                    }}
                  >
                    <option value="">All rounds</option>
                    {Object.entries(ROUNDS).map(([id, label]) => (
                      <option key={id} value={id}>{label}</option>
                    ))}
                  </select>
                  <select
                    aria-label="Role"
                    value={role}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRole(val);
                      updateUrlFilters({ role: val });
                    }}
                  >
                    <option value="">All roles</option>
                    {Object.entries(ROLES).map(([id, label]) => (
                      <option key={id} value={id}>{label}</option>
                    ))}
                  </select>
                </div>

                <p className="si-count">
                  {filteredList.length} question{filteredList.length === 1 ? '' : 's'} ·{' '}
                  {filteredList.filter(({ q }) => isDone(q.id)).length} completed ·{' '}
                  {filteredList.filter(({ q }) => bookmarks.has(q.id)).length} bookmarked
                </p>

                <div className="si-topic-widget" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', margin: '0.85rem 0' }}>
                  <div className="nm-category-widget-visual" aria-hidden="true" style={{ width: 68, height: 48, flexShrink: 0 }}>
                    <CategoryVisual topic={topicFilter === 'all' ? (topics[0]?.id ?? 'rag') : topic.id} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{topicFilter === 'all' ? 'All topics' : topic.title}</h2>
                    <p className="si-lede" style={{ margin: '0.25rem 0 0', fontSize: '0.88rem' }}>
                      {topicFilter === 'all' ? `Search and practice across all ${totalQuestions} AI engineering interview questions.` : topic.about}
                    </p>
                  </div>
                </div>

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
                    disabled={filteredList.length === 0 && !linkedHere}
                    onClick={() => {
                      setLinked(null);
                      if (linkedHere) {
                        startQuestion(linkedHere.question);
                      } else if (filteredList.length > 0) {
                        const nextUnsolved = filteredList.find(({ q }) => !isDone(q.id)) ?? filteredList[0];
                        startQuestionFromItem(nextUnsolved);
                      }
                    }}
                  >
                    {linkedHere
                      ? (resuming ? 'Resume where you left off' : 'Start the linked question')
                      : filteredList.some(({ q }) => isDone(q.id))
                        ? 'Next unsolved question'
                        : topicFilter === 'all'
                          ? 'Start practicing'
                          : 'Start this topic'}
                  </button>
                  {topicFilter !== 'all' && topic.questions.every((q) => isDone(q.id)) && (
                    <button type="button" onClick={shareTopic}>
                      Share this topic
                    </button>
                  )}
                  {shareStatus && <span className="si-done" role="status">{shareStatus}</span>}
                </div>

                <ol className="si-list">
                  {filteredList.length === 0 && (
                    <li className="si-empty">No questions match these filters. Try clearing your search or filters.</li>
                  )}
                  {filteredList.map((item) => (
                    <li key={item.q.id} className="si-list-item">
                      <button
                        type="button"
                        className={`si-question-btn${isDone(item.q.id) ? ' done' : ''}`}
                        onClick={() => startQuestionFromItem(item)}
                      >
                        {isDone(item.q.id) && <span className="si-tick">Completed</span>}
                        {item.q.problemId && <span className="si-coding-pill">Python</span>}
                        {topicFilter === 'all' && <span className="si-topic-tag">{item.topicTitle}</span>}
                        {item.q.level && <span className={`si-level-tag si-level-${item.q.level}`}>{LEVELS[item.q.level] ?? item.q.level}</span>}
                        <span className="si-q-text">{item.q.title}</span>
                      </button>
                      <button
                        type="button"
                        className={`si-bookmark-btn${bookmarks.has(item.q.id) ? ' is-bookmarked' : ''}`}
                        aria-label={bookmarks.has(item.q.id) ? `Remove bookmark for ${item.q.title}` : `Bookmark ${item.q.title}`}
                        aria-pressed={bookmarks.has(item.q.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBookmark(item.q.id);
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill={bookmarks.has(item.q.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ol>
              </aside>
            </div>
          </>
        )}

        {step !== 'topics' && step !== 'done' && (
          <header className="si-stage-header si-slim-header">
            <div className="si-slim-header-row">
              <div className="si-slim-left">
                <button type="button" className="si-link si-header-back" onClick={backToTopics} aria-label="Back to topics">
                  ← Topics
                </button>
                <span className="si-header-topic">{topic.title}</span>
                {question.level && (
                  <span className={`si-level-pill si-level-${question.level}`}>
                    {LEVELS[question.level] ?? question.level}
                  </span>
                )}
              </div>
              <div className="si-slim-center">
                <span className="si-counter" aria-label="Question progress">
                  {currentFilteredIndex >= 0
                    ? `${currentFilteredIndex + 1} / ${navigationList.length}`
                    : `${questionIndex + 1} / ${topic.questions.length}`}
                </span>
              </div>
              <div className="si-slim-right">
                <button
                  type="button"
                  className={`si-header-icon-btn${bookmarks.has(question.id) ? ' is-bookmarked' : ''}`}
                  id="bookmark-question"
                  aria-label={bookmarks.has(question.id) ? 'Remove bookmark' : 'Bookmark this question'}
                  aria-pressed={bookmarks.has(question.id)}
                  onClick={() => toggleBookmark(question.id)}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill={bookmarks.has(question.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`si-header-icon-btn${readAloud ? ' on' : ''}`}
                  id="read-question"
                  disabled={followUpActive}
                  aria-label={readAloud ? 'Turn off read aloud' : 'Read question aloud'}
                  aria-pressed={readAloud}
                  onClick={() => {
                    toggleReadAloud();
                    if (!readAloud) readQuestion();
                    else stopAudio();
                  }}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M11 5 6 9H2v6h4l5 4z" />
                    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                    <path d="M18.5 5.5a9 9 0 0 1 0 13" />
                  </svg>
                </button>
                <div className="si-settings-wrapper">
                  <button
                    type="button"
                    className={`si-header-icon-btn${settingsOpen ? ' on' : ''}`}
                    id="room-settings-btn"
                    aria-label="Speech settings"
                    aria-expanded={settingsOpen}
                    onClick={() => setSettingsOpen((prev) => !prev)}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                  </button>
                  {settingsOpen && (
                    <div className="si-settings-dropdown" role="dialog" aria-label="Audio settings">
                      <div className="si-settings-header">
                        <span>Speech settings</span>
                        <button type="button" className="si-settings-close" onClick={() => setSettingsOpen(false)} aria-label="Close settings">×</button>
                      </div>
                      <div className="si-settings-body">
                        <label htmlFor="speech-model-room">Speech model</label>
                        {highEndEligible ? (
                          <div className="si-speech-model-picker">
                            <select
                              id="speech-model-room"
                              aria-label="Speech model"
                              value={speechChoice}
                              disabled={step === 'answering' || transcribing || followUpActive}
                              onChange={(event) => void switchSpeechModel(event.target.value as SpeechModelChoice)}
                            >
                              <option value="default">Standard</option>
                              <option value="turbo">High accuracy · {QUALITY_PROFILES.best.downloadSizeMB}</option>
                            </select>
                            <SpeechModelStatus ready={speechReady} loading={speechLoading} progress={speechProgress} />
                          </div>
                        ) : (
                          <div className="si-speech-model-fixed">
                            <span>Standard</span>
                            <SpeechModelStatus ready={speechReady} loading={speechLoading} progress={speechProgress} />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3-Step Indicator: Listen -> Answer -> Review */}
            <div className="si-step-indicator" role="navigation" aria-label="Interview stages">
              <div className={`si-step-item${step === 'asking' ? ' active' : ''}${step === 'answering' || step === 'code' || step === 'answer' ? ' completed' : ''}`}>
                <span className="si-step-badge">1</span>
                <span className="si-step-text">Listen</span>
              </div>
              <span className="si-step-line" aria-hidden="true" />
              <div className={`si-step-item${step === 'answering' || step === 'code' ? ' active' : ''}${step === 'answer' ? ' completed' : ''}`}>
                <span className="si-step-badge">2</span>
                <span className="si-step-text">Answer</span>
              </div>
              <span className="si-step-line" aria-hidden="true" />
              <div className={`si-step-item${step === 'answer' ? ' active' : ''}`}>
                <span className="si-step-badge">3</span>
                <span className="si-step-text">Review</span>
              </div>
            </div>

            {step !== 'answer' && (
              <>
                <div className="si-question-row">
                  <h2 className="si-question-title">
                    {question.title}
                    {question.problemId && hasAward(events, `/interview#${question.id}`, 'interview') && (
                      <span className="si-solved-badge"><span className="si-tick">✓</span> Solved in editor</span>
                    )}
                  </h2>
                </div>
                <LearnLinks questionId={question.id} topicQuestionIds={topic.questions.map(q => q.id)} />
                {question.options && (
                  <ol className="si-options" type="A">
                    {question.options.map((o) => (
                      <li key={o}>{o}</li>
                    ))}
                  </ol>
                )}
              </>
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
                <span className="si-speaker-label">{readAloud ? 'Interviewer speaking' : 'Your question'}</span>
                <p className="si-status" role="status">
                  {readAloud
                    ? voiceLoading === null
                      ? 'The interviewer is reading the question aloud…'
                      : voiceLoading < 1
                        ? `Preparing the voice on your device (${Math.round(voiceLoading * 100)}%)…`
                        : 'Preparing the voice…'
                    : 'Read the question above, then begin answering.'}
                </p>
              </div>
            </div>
            <div className="si-speaker-wave" aria-hidden="true">
              <LiveWaveform active={Boolean(readAloud && reading)} stream={null} height={46} barColor="var(--accent)" />
            </div>
            <div className="si-actions si-bottom-bar-fixed">
              <nav className="si-bottom-nav" aria-label="Question navigation">
                <button
                  type="button"
                  className="si-link"
                  id="previous-question"
                  disabled={!previousItem}
                  onClick={previousQuestion}
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  className="si-link"
                  id="next-question"
                  disabled={!nextItem}
                  onClick={nextQuestion}
                >
                  Next →
                </button>
              </nav>
              <button
                type="button"
                className="si-primary"
                onClick={() => {
                  stopAudio();
                  handleStartAnswering();
                }}
              >
                Skip to answering <span className="si-key-hint">Space</span>
              </button>
              {question.problemId && (
                <button
                  type="button"
                  className="si-code-button"
                  id="open-code-editor-asking"
                  onClick={() => {
                    stopAudio();
                    previousStepRef.current = 'asking';
                    setStep('code');
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                  <span>Open code editor</span>
                </button>
              )}
            </div>
          </div>
        )}

        {step === 'answering' && (
          <div className="si-speaker-card si-speaker-answering">
            {showInputPrimer ? (
              <div className="si-primer-card" role="region" aria-label="Answer method selection">
                <h3 className="si-primer-title">Speak your answer or type it</h3>
                <p className="si-primer-text">Choose how you prefer to answer questions. You can switch between voice and typing anytime.</p>
                <div className="si-primer-actions">
                  <button
                    type="button"
                    className="si-primary"
                    id="primer-speak"
                    onClick={chooseVoice}
                  >
                    Speak answer
                  </button>
                  <button
                    type="button"
                    className="si-secondary-btn"
                    id="primer-type"
                    onClick={chooseType}
                  >
                    Type instead
                  </button>
                </div>
              </div>
            ) : (
              <>
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

                {micError && (
                  <div className="si-error-banner" role="alert">
                    <div className="si-error-content">
                      <strong className="si-error-title">Microphone unavailable</strong>
                      <p className="si-error-desc">Typing your answer below.</p>
                    </div>
                    <button
                      type="button"
                      className="si-error-action"
                      onClick={() => {
                        setMicError(null);
                        setTyping(false);
                        void startAnswering(undefined, true);
                      }}
                    >
                      Try microphone again
                    </button>
                  </div>
                )}

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

                {question.rounds?.includes('system-design') && <SystemDesignCanvas key={questionId} value={sketch} onChange={setSketch} />}

                <div className="si-actions si-bottom-bar-fixed si-sticky">
                  <nav className="si-bottom-nav" aria-label="Question navigation">
                    <button
                      type="button"
                      className="si-link"
                      id="previous-question"
                      disabled={!previousItem}
                      onClick={previousQuestion}
                    >
                      ← Previous
                    </button>
                    <button
                      type="button"
                      className="si-link"
                      id="next-question"
                      disabled={!nextItem}
                      onClick={nextQuestion}
                    >
                      Next →
                    </button>
                  </nav>

                  <button
                    type="button"
                    className="si-primary"
                    id="done"
                    aria-label="Done"
                    onClick={finishAnswer}
                  >
                    <span>Done</span>
                    <span className="si-key-hint" aria-hidden="true">Space</span>
                  </button>

                  {question.problemId && (
                    <button
                      type="button"
                      className="si-code-button"
                      id="open-code-editor-answering"
                      onClick={() => {
                        answeringRef.current = false;
                        void engineRef.current?.stop().catch(() => undefined);
                        stopMic();
                        previousStepRef.current = 'answering';
                        setStep('code');
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="16 18 22 12 16 6" />
                        <polyline points="8 6 2 12 8 18" />
                      </svg>
                      <span>Open code editor</span>
                    </button>
                  )}

                  {!typing ? (
                    <button
                      type="button"
                      onClick={() => {
                        answeringRef.current = false;
                        void engineRef.current?.stop().catch(() => undefined);
                        stopMic();
                        setTyping(true);
                        setInputMode('type');
                        try { localStorage.setItem(INPUT_MODE_KEY, 'type'); } catch {}
                      }}
                    >
                      Type instead
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setTyping(false);
                        setInputMode('voice');
                        try { localStorage.setItem(INPUT_MODE_KEY, 'voice'); } catch {}
                        void startAnswering(undefined, true);
                      }}
                    >
                      Use microphone
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}


        {step === 'answer' && (
          <div className="si-answer-stage">
            <div className="si-answer-col-left">
              {/* 1. QUESTION PANEL */}
              <section className="si-answer-question-panel" aria-label="Question details">
                <div className="si-question-row">
                  <h2 className="si-question-title">
                    {question.title}
                    {question.problemId && hasAward(events, `/interview#${question.id}`, 'interview') && (
                      <span className="si-solved-badge"><span className="si-tick">✓</span> Solved in editor</span>
                    )}
                  </h2>
                </div>
                <LearnLinks questionId={question.id} topicQuestionIds={topic.questions.map(q => q.id)} />
                {question.options && (
                  <ol className="si-options" type="A">
                    {question.options.map((o) => (
                      <li key={o}>{o}</li>
                    ))}
                  </ol>
                )}
              </section>

              {/* 2. YOUR ANSWER / LIVE TRANSCRIPT */}
              <section className="si-col-yours" aria-label="Your answer">
                <div className="si-panel-header">
                  <h3>Your answer</h3>
                  <span className="si-type-tag">{typing ? 'Typed' : 'Spoken'}</span>
                </div>
                <p className="si-yours">{transcript || (transcribing ? '' : 'No answer was captured.')}</p>
                {transcribing && (
                  <p className="si-status" role="status">
                    Finishing your transcript…
                  </p>
                )}
              </section>

              {/* 3. SELF-RATING */}
              <fieldset className="si-self-rating">
                <legend>How did your answer go?</legend>
                <p>Choose a rating. Rating completes this question and saves your progress.</p>
                <div className="si-actions">
                  {(Object.entries(RATING_LABELS) as [SelfRating, string][]).map(([value, label]) => (
                    <button
                      key={value}
                      disabled={!attemptId || transcribing}
                      aria-pressed={selfRating?.value === value}
                      onClick={() => {
                        if (attemptId) {
                          const now = Date.now();
                          awardInterviewCompleted(questionId);
                          saveLearning([
                            { questionId, completion: { time: latest?.time ?? now, attemptId } },
                            rateQuestion(learning, questionId, attemptId, value, now),
                          ]);
                        }
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="si-status" role="status">
                  {selfRating
                    ? `Self-rating saved. Question completed (+${INTERVIEW_COMPLETED_POINTS} points). Next review: ${new Date(reviewDueAt(currentLearning!)!).toLocaleDateString()}.`
                    : ''}
                </p>
              </fieldset>

              {/* 4. BUTTONS & ACTIONS */}
              <div className="si-actions si-bottom-bar-fixed si-sticky si-answer-actions">
                <nav className="si-bottom-nav" aria-label="Question navigation">
                  <button
                    type="button"
                    className="si-link"
                    id="previous-question"
                    disabled={!previousItem}
                    onClick={previousQuestion}
                  >
                    ← Previous
                  </button>
                  <button
                    type="button"
                    className="si-link"
                    id="next-question"
                    disabled={!nextItem}
                    onClick={nextQuestion}
                  >
                    Next →
                  </button>
                </nav>

                {question.problemId && (
                  <button
                    type="button"
                    className="si-code-button"
                    id="open-code-editor-answer"
                    onClick={() => {
                      stopAudio();
                      previousStepRef.current = 'answer';
                      setStep('code');
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="16 18 22 12 16 6" />
                      <polyline points="8 6 2 12 8 18" />
                    </svg>
                    <span>Open code editor</span>
                  </button>
                )}
                <button type="button" className="si-primary" id="next" onClick={nextQuestion}>
                  {questionIndex + 1 < topic.questions.length ? 'Next question' : 'Finish topic'}{' '}
                  <span className="si-key-hint">N</span>
                </button>
                <button type="button" id="practice-again" onClick={() => goToQuestion(questionIndex)}>
                  Practice again
                </button>
                {hasAward(events, `/interview#${questionId}`, 'interview') && (
                  <span className="si-done" role="status">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }} aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Completed · +{INTERVIEW_COMPLETED_POINTS} points
                  </span>
                )}
              </div>
            </div>

            <div className="si-answer-col-right">
              {/* 5. KEY-POINT CHECK */}
              {check === 'checking' && (
                <div className="si-check-loading">
                  <p className="si-status" role="status">
                    Checking key points…
                  </p>
                </div>
              )}
              {check === 'failed' && (
                <p className="si-status si-failed-status">Answer checking could not load on this device.</p>
              )}
              {check && typeof check === 'object' && (
                <div className="si-check si-keypoints-card">
                  <div className="si-check-header">
                    <h3>Key points</h3>
                    {SHOW_COVERAGE_SCORE && <span className="si-score-pill">{check.score}% coverage</span>}
                  </div>
                  <div className="si-keypoints-grid">
                    <div className="si-keypoints-col covered">
                      <h4>Covered</h4>
                      {check.points.filter((p) => p.verdict === 'covered').length > 0 ? (
                        <ul className="si-points">
                          {check.points
                            .filter((p) => p.verdict === 'covered')
                            .map((p) => (
                              <li key={p.point} className="covered">
                                <span className="si-verdict">Covered</span>
                                <span className="si-point-title">{p.point}</span>
                                {p.evidence && (
                                  <blockquote className="si-point-evidence">
                                    <span>In your answer</span>
                                    {p.evidence}
                                  </blockquote>
                                )}
                              </li>
                            ))}
                        </ul>
                      ) : (
                        <p className="si-empty-points">No key points covered in this attempt.</p>
                      )}
                    </div>
                    <div className="si-keypoints-col missed">
                      <h4>Not heard</h4>
                      {check.points.filter((p) => p.verdict !== 'covered').length > 0 ? (
                        <ul className="si-points">
                          {check.points
                            .filter((p) => p.verdict !== 'covered')
                            .map((p) => (
                              <li key={p.point} className="undetected">
                                <span className="si-verdict">Not heard</span>
                                <span className="si-point-title">{p.point}</span>
                              </li>
                            ))}
                        </ul>
                      ) : (
                        <p className="si-empty-points">All key points covered!</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 6. MODEL ANSWER & FOLLOW-UPS */}
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
                      disabled={followUpActive}
                      aria-label="Read model answer aloud"
                    >
                      Read aloud
                    </button>
                  )}
                </div>
                <div className="si-model" id="model-answer">
                  {question.answer}
                </div>

                {/* Trade-offs */}
                {question.tradeOffs && question.tradeOffs.length > 0 && (
                  <div className="si-sub-section si-tradeoffs">
                    <h4>Trade-offs</h4>
                    <ul className="si-bullets">
                      {question.tradeOffs.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {latest && !transcribing && question.followUps?.length ? (
                  <FollowUpAnswer
                    key={latest.id} attempt={latest} followUps={question.followUps}
                    points={check && typeof check === 'object' ? check.points : undefined}
                    prepareSpeech={prepareFollowUpSpeech} stopReading={stopAudio}
                    pauseMusic={pauseForFollowUp} resumeMusic={resumeAfterFollowUp} save={saveAttempt}
                    onActive={setFollowUpActive}
                    onFinalizing={pending => { finishingRef.current = pending; }}
                  />
                ) : null}
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
              </section>

              {/* 7. EARLIER ATTEMPTS & COMPARISON */}
              {(comparison || earlier.length > 0) && (
                <section className="si-sub-section si-earlier-section" aria-label="Earlier attempts">
                  {comparison && (
                    <section className="si-sub-section" aria-label="Change since your previous attempt" aria-live="polite">
                      <h3>Since your previous attempt</h3>
                      {comparison.comparable ? (
                        <>
                          <p>{comparison.gained.length ? 'Newly detected points:' : 'No newly detected points.'}</p>
                          {comparison.gained.length > 0 && (
                            <ul className="si-bullets">
                              {comparison.gained.map(point => <li key={point}>{point}</li>)}
                            </ul>
                          )}
                        </>
                      ) : (
                        <p>{latest?.status !== 'checked' ? 'The comparison will appear after this answer is checked.' : 'These attempts used different checks, or the previous answer was not checked.'}</p>
                      )}
                      <p>Previous answer</p><p className="si-previous-transcript">{earlier[0].transcript || 'No answer was captured.'}</p>
                      <p>Current answer</p><p>{transcript || 'No answer was captured.'}</p>
                    </section>
                  )}
                  {earlier.length > 0 && (
                    <>
                      <h3>Earlier attempts</h3>
                      {earlier.map(attempt => (
                        <details key={attempt.id} className="si-attempt">
                          <summary>
                            <time dateTime={new Date(attempt.time).toISOString()}>{new Date(attempt.time).toLocaleString()}</time>
                            {attempt.status === 'checked' ? (attempt.source === 'rubric' ? ' · Key points checked' : (!SHOW_COVERAGE_SCORE || attempt.score === undefined) ? ' · Checked against model answer' : ` · ${attempt.score}% coverage`) : ' · Not checked'}
                          </summary>
                          <DeliveryRow delivery={attempt.delivery} />
                          {attempt.sketch && <details><summary>Saved sketch</summary><SystemDesignCanvas value={attempt.sketch} /></details>}
                          <p className="si-yours">{attempt.transcript || 'No answer was captured.'}</p>
                          {attempt.followUp && <div><h4>Follow-up</h4><p>{attempt.followUp.question}</p><p>{attempt.followUp.transcript || 'No follow-up answer was captured.'}</p></div>}
                          <ul className="si-points">{attempt.points.map(point => <li key={point.point}><span className="si-verdict">{point.verdict === 'covered' ? 'Covered' : 'Not detected'}</span>{point.point}{point.verdict === 'covered' && point.evidence && <blockquote className="si-point-evidence"><span>In your answer</span>{point.evidence}</blockquote>}</li>)}</ul>
                        </details>
                      ))}
                    </>
                  )}
                  {syncState === 'syncing' && <p className="si-status" role="status">Syncing attempt history…</p>}
                  {syncState === 'synced' && <p className="si-status" role="status">Attempt history synced.</p>}
                </section>
              )}

              {/* 8. DELIVERY & SYSTEM DESIGN */}
              <DeliveryRow delivery={latest?.delivery} />
              {question.rounds?.includes('system-design') && (
                <div className="sd-comparison">
                  <SystemDesignCanvas value={latest?.sketch ?? sketch} />
                  {referenceDiagram ? (
                    <div>
                      <SystemDesignCanvas value={referenceDiagram} title="Reference architecture" />
                      <p>{referenceDiagram.note}</p>
                    </div>
                  ) : (
                    <p>No reference diagram for this question yet. Compare your sketch with the model answer above.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'code' && question.problemId && (
          <div className="si-code-overlay" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--nm-bg, #090d16)' }}>
            <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: 'var(--nm-text-muted)' }}>Loading code editor…</div>}>
              <PracticeWorkspace
                problemId={question.problemId}
                onReturn={() => setStep(previousStepRef.current === 'code' ? 'asking' : previousStepRef.current)}
                returnLabel="Return to interview question"
                onSolve={handleComplete}
              />
            </Suspense>
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
