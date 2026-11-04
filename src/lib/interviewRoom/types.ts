// Data types and structures for the Neural Mastery Interview Room
// Content synthesized for the GenAI Engineer track.
// Note: Core questions and rubrics are AI-written and not expert-reviewed as per source metadata.

export interface NextPractice {
  route: string;
  title: string;
  action: string;
}

export interface QuestionPoint {
  id: string;
  claim: string;
  follow_up_spoken: string;
  follow_up_template: string;
  next_practice: NextPractice;
}

export interface WrongAnswerProbe {
  id: string;
  misconception: string;
  regex_patterns: string[];
  spoken_probe: string;
  spoken_probe_template: string;
}

export interface QuestionSignals {
  fundamentals: { weak: string; solid: string; strong: string };
  depth_when_probed: { weak: string; solid: string; strong: string };
  trade_offs: { weak: string; solid: string; strong: string };
}

export interface InterviewRoomQuestion {
  id: string;
  title: string;
  spoken_question: string;
  points: QuestionPoint[];
  wrong_answer_probes: WrongAnswerProbe[];
  signals: QuestionSignals;
}

export type PointStatus = 'covered' | 'partial' | 'not_heard_yet';

export interface EvaluatedPoint {
  point: QuestionPoint;
  status: PointStatus;
  confidence: number;
  evidenceQuote?: string;
}

export interface DetectedMisconception {
  probe: WrongAnswerProbe;
  matchedPhrase: string;
  spokenQuestion: string;
}

export interface TurnRecord {
  turnIndex: number;
  questionText: string;
  spokenText: string;
  isFollowUp: boolean;
  probedPointId?: string;
  probedMisconceptionId?: string;
  learnerAnswer: string;
}

export interface DebriefSignalRow {
  label: string;
  pill: string; // 'Strong' | 'Solid' | 'Partly there' | 'Needs work' | 'Not heard yet'
  pillClass: 'strong' | 'ok' | 'gap';
  text: string;
  quote?: string;
}

export interface QuestionDebrief {
  overallCall: 'Strong' | 'Getting there' | 'Needs work';
  overallSummary: string;
  practiceTitle: string;
  practiceAction: string;
  practiceRoute: string;
  rows: DebriefSignalRow[];
  markedAnswerHtml: string;
  cleanTranscript: string;
}
