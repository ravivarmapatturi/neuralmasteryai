// Dialogue management, term correction, buzzword guard, and debrief generation
// for the Neural Mastery Interview Room.
// Content and rubrics are AI-written and not expert-reviewed.

import rawQuestions from '../../data/interviewRoomQuestions.json';
import type {
  InterviewRoomQuestion,
  QuestionPoint,
  EvaluatedPoint,
  DetectedMisconception,
  TurnRecord,
  QuestionDebrief,
  DebriefSignalRow,
  QuestionSessionRecord,
  SessionDebrief,
} from './types';
import type { JudgeModels } from '../answerJudge';
import { splitAnswer } from '../answerJudge';

export const END_OF_ANSWER_PAUSE_SECONDS = 6.0;

/**
 * Common technical terms and question-specific corrections for speech-to-text output.
 * For example, Whisper or Moonshine often transcribes "LoRA" as "Laura" or "lora".
 */
export function correctInterviewTerms(text: string, questionId?: string): string {
  if (!text) return '';
  let res = text;

  // General AI Engineering abbreviations and casing
  const generalTerms: [RegExp, string][] = [
    [/\b(rag|rags)\b/gi, 'RAG'],
    [/\bretrieval augmented generation\b/gi, 'Retrieval-Augmented Generation'],
    [/\b(llm|llms)\b/gi, 'LLM'],
    [/\b(gpu|gpus)\b/gi, 'GPU'],
    [/\b(cpu|cpus)\b/gi, 'CPU'],
    [/\bvram\b/gi, 'VRAM'],
    [/\b(xg\s*boost|xg\s*b[o0]+[a-z]*)\b/gi, 'XGBoost'],
    [/\bpy\s*torch\b/gi, 'PyTorch'],
    [/\bonnx\b/gi, 'ONNX'],
    [/\badam\s*w\b/gi, 'AdamW'],
    [/\bq\s*lora\b/gi, 'QLoRA'],
    [/\bgbdt\b/gi, 'GBDT'],
  ];

  for (const [re, rep] of generalTerms) {
    res = res.replace(re, rep);
  }

  // Question-specific replacements
  if (questionId === 'genai-lora-production-serving' || /lora/i.test(questionId || '')) {
    res = res.replace(/\b(laura|lora|laura's|lora's)\b/gi, 'LoRA');
    res = res.replace(/\blow[- ]rank adaptation\b/gi, 'Low-Rank Adaptation');
  }

  if (questionId === 'genai-fm-fundamentals') {
    res = res.replace(/\bfoundational models?\b/gi, 'foundation model');
  }

  return res.trim();
}

/**
 * Key terms associated with each point claim to guard against buzzword-only answers.
 * Dynamically populated from all questions in interviewRoomQuestions.json.
 */
const POINT_KEY_TERMS: Record<string, string[]> = {};
for (const q of (rawQuestions as any).questions || []) {
  for (const pt of q.points || []) {
    if (pt.id && Array.isArray(pt.key_terms)) {
      const terms = new Set<string>(pt.key_terms.map((k: string) => k.toLowerCase()));
      for (const k of pt.key_terms) {
        for (const w of k.toLowerCase().split(/\s+/)) {
          if (w.length > 3 && !['with', 'from', 'than', 'into', 'that', 'data', 'model', 'models', 'using', 'also', 'over', 'more', 'most'].includes(w)) {
            terms.add(w);
          }
        }
      }
      if (pt.id === 'p1_pretraining_scale') {
        terms.add('representation');
        terms.add('representations');
        terms.add('vision');
        terms.add('audio');
      }
      if (pt.id === 'p4_engineering_tradeoffs' || pt.id.includes('tradeoff')) {
        terms.add('cheap');
        terms.add('cheaper');
        terms.add('cost');
        terms.add('faster');
      }
      POINT_KEY_TERMS[pt.id] = Array.from(terms);
    }
  }
}

export const TRADEOFF_KEYWORDS = [
  'trade-off', 'tradeoff', 'trade off', 'cost', 'cheaper', 'expensive',
  'latency', 'throughput', 'overhead', 'hardware', 'gpu', 'cpu', 'vram',
  'memory footprint', 'xgboost', 'tabular', 'structured data', 'deterministic',
  'logistic regression', 'simpler model', 'lightgbm', 'catboost', 'faster',
  'accuracy vs', 'precision vs', 'speed vs', 'cost vs', 'batch vs', 'real-time',
];

export function findSensibleTradeoffSentence(sentences: string[]): string | undefined {
  return sentences.find(s => {
    const lower = s.toLowerCase();
    const hits = TRADEOFF_KEYWORDS.filter(kw => lower.includes(kw));
    return (
      hits.length >= 2 ||
      (hits.length >= 1 &&
        (lower.includes('cheap') ||
          lower.includes('cost') ||
          lower.includes('tabular') ||
          lower.includes('latency') ||
          lower.includes('xgboost') ||
          lower.includes('cpu') ||
          lower.includes('gpu')))
    );
  });
}

/**
 * Guard against buzzword answers:
 * A point isn't covered by similarity alone unless the answer is long enough (>= 12 words)
 * and contains a key anchor term from that point.
 */
export function guardBuzzwords(answer: string, pointId: string): boolean {
  const clean = answer.trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length < 12) return false;

  const keyTerms = POINT_KEY_TERMS[pointId];
  if (!keyTerms || keyTerms.length === 0) return true;

  const lower = clean.toLowerCase();
  return keyTerms.some(term => lower.includes(term.toLowerCase()));
}

/**
 * Validates that an evidence quote is not noise (e.g. STT hallucination, garbled words,
 * or unrelated sentence). A valid quote must contain at least 4 words and match a known
 * key term from the evaluated point or domain.
 */
export function isValidEvidenceQuote(sentence: string | undefined, pointId?: string): boolean {
  if (!sentence) return false;
  const clean = sentence.trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length < 4) return false;

  const lower = clean.toLowerCase();

  // If pointId is provided, check strictly if it contains any key term for that point
  if (pointId) {
    const keyTerms = POINT_KEY_TERMS[pointId];
    if (!keyTerms || keyTerms.length === 0) return false;
    return keyTerms.some(k => lower.includes(k.toLowerCase()));
  }

  // Otherwise check across known technical terms
  return Object.values(POINT_KEY_TERMS).some(terms =>
    terms.some(k => lower.includes(k.toLowerCase()))
  );
}

/**
 * Detect misconceptions defined for the question using regex patterns.
 */
export function detectMisconceptions(
  answer: string,
  question: InterviewRoomQuestion
): DetectedMisconception | null {
  const clean = answer.trim();
  if (!clean) return null;
  const noPunctuation = clean.replace(/[.!?,;:]+/g, ' ').replace(/\s+/g, ' ');

  for (const probe of question.wrong_answer_probes) {
    for (const pattern of probe.regex_patterns) {
      try {
        const rx = new RegExp(pattern, 'i');
        const match = clean.match(rx) || noPunctuation.match(rx);
        if (match) {
          const matchedPhrase = match[0].trim();
          let spokenQuestion = probe.spoken_probe;
          if (probe.spoken_probe_template && probe.spoken_probe_template.includes('{phrase}')) {
            spokenQuestion = probe.spoken_probe_template.replace('{phrase}', matchedPhrase);
          }
          return { probe, matchedPhrase, spokenQuestion };
        }
      } catch {
        // Skip invalid pattern if any
      }
    }
  }

  return null;
}

const dot = (a: ArrayLike<number>, b: ArrayLike<number>) => {
  let t = 0;
  for (let i = 0; i < a.length; i++) t += a[i] * b[i];
  return t;
};

/**
 * Evaluate learner answer against the question's criteria points.
 * Calibrated thresholds:
 * covered >= 0.50
 * partial >= 0.35
 * not heard yet < 0.35 (or buzzword check failed)
 */
export async function evaluatePoints(
  answer: string,
  question: InterviewRoomQuestion,
  models?: JudgeModels
): Promise<EvaluatedPoint[]> {
  const sentences = splitAnswer(answer);
  if (!sentences.length || !answer.trim()) {
    return question.points.map(point => ({
      point,
      status: 'not_heard_yet',
      confidence: 0,
    }));
  }

  // If models are provided, compute real embeddings and NLI
  const candidateTradeoff = findSensibleTradeoffSentence(sentences);
  if (models) {
    try {
      const claims = question.points.map(p => p.claim);
      const vectors = await models.embed([...claims, ...sentences]);
      const claimVecs = vectors.slice(0, claims.length);
      const sentVecs = vectors.slice(claims.length);

      const bestOf = (target: ArrayLike<number>, pool: ArrayLike<number>[]) =>
        pool.reduce(
          (best, v, i) => {
            const s = dot(target, v);
            return s > best.sim ? { sim: s, at: i } : best;
          },
          { sim: -1, at: 0 }
        );

      const matches = claimVecs.map(v => bestOf(v, sentVecs));
      const nliScores = await models.nli(matches.map((m, i) => [sentences[m.at], claims[i]]));

      return question.points.map((point, i) => {
        const { sim, at } = matches[i];
        const { entails } = nliScores[i];
        const evidenceQuote = sentences[at];
        const passesBuzzwords = guardBuzzwords(answer, point.id);

        const isTradeoffPt =
          point.id.includes('tradeoff') ||
          point.id.includes('trade_off') ||
          point.id.includes('engineering_tradeoffs');
        if (isTradeoffPt && candidateTradeoff) {
          return {
            point,
            status: 'covered' as const,
            confidence: 85,
            evidenceQuote: candidateTradeoff,
          };
        }

        if (sim < 0.35 || !passesBuzzwords) {
          return {
            point,
            status: 'not_heard_yet',
            confidence: Math.round(Math.min(30, sim * 100)),
            evidenceQuote: passesBuzzwords ? evidenceQuote : undefined,
          };
        }

        const confidence = Math.round(Math.max(entails, sim) * 100);
        if (sim >= 0.50 || entails >= 0.6) {
          return {
            point,
            status: 'covered',
            confidence,
            evidenceQuote,
          };
        }

        return {
          point,
          status: 'partial',
          confidence,
          evidenceQuote,
        };
      });
    } catch {
      // Fallback to keyword heuristics if models threw
    }
  }

  // Keyword heuristic evaluation (fallback or when models not yet loaded)
  const lowerAnswer = answer.toLowerCase();
  return question.points.map(point => {
    const isTradeoffPt =
      point.id.includes('tradeoff') ||
      point.id.includes('trade_off') ||
      point.id.includes('engineering_tradeoffs');
    if (isTradeoffPt && candidateTradeoff) {
      return {
        point,
        status: 'covered' as const,
        confidence: 85,
        evidenceQuote: candidateTradeoff,
      };
    }

    const keyTerms = POINT_KEY_TERMS[point.id] || [];
    const hitCount = keyTerms.filter(k => lowerAnswer.includes(k.toLowerCase())).length;
    const passesBuzzwords = guardBuzzwords(answer, point.id);

    // Find sentence containing the most key terms for evidence quote
    let bestSent = '';
    let bestCount = 0;
    for (const sent of sentences) {
      const sentLower = sent.toLowerCase();
      const count = keyTerms.filter(k => sentLower.includes(k.toLowerCase())).length;
      if (count > bestCount) {
        bestCount = count;
        bestSent = sent;
      }
    }

    if (!passesBuzzwords || hitCount === 0) {
      return { point, status: 'not_heard_yet', confidence: 15 };
    }
    if (hitCount >= 2 && passesBuzzwords) {
      return {
        point,
        status: 'covered',
        confidence: 85,
        evidenceQuote: bestSent || sentences[0],
      };
    }
    return {
      point,
      status: 'partial',
      confidence: 50,
      evidenceQuote: bestSent || sentences[0],
    };
  });
}

export type DialogueAction =
  | {
      type: 'follow_up';
      spokenQuestion: string;
      textQuestion: string;
      probedPointId?: string;
      probedMisconceptionId?: string;
      clipId?: string;
    }
  | { type: 'debrief' };

/**
 * Determine dialogue flow according to the 5 Dialogue Rules:
 * Rule 1: Advance immediately on excellent answer (all covered, no misconceptions).
 * Rule 2: Max 2 follow-ups per question.
 * Rule 3: Detected misconception takes priority on turn 1.
 * Rule 4: Single gap probe for unaddressed claims in under 20 words.
 * Rule 5: Progressive resolution if candidate clarifies on turn 2.
 */
export function chooseDialogueAction(
  turnIndex: number,
  history: TurnRecord[],
  _currentAnswer: string,
  question: InterviewRoomQuestion,
  evaluatedPoints: EvaluatedPoint[],
  misconception: DetectedMisconception | null
): DialogueAction {
  // Rule 2: Max 2 follow-ups (turns 0, 1, 2)
  if (turnIndex >= 2) {
    return { type: 'debrief' };
  }

  const coveredCount = evaluatedPoints.filter(p => p.status === 'covered').length;
  const isExcellent = coveredCount === question.points.length && !misconception;

  // Rule 1: Advance on excellent
  if (isExcellent) {
    return { type: 'debrief' };
  }

  // Collect all previously asked probe IDs and probe questions to ensure no probe is ever repeated
  const probedPointIds = new Set(
    history.map(h => h.probedPointId).filter((id): id is string => Boolean(id))
  );
  const probedMisconceptionIds = new Set(
    history.map(h => h.probedMisconceptionId).filter((id): id is string => Boolean(id))
  );
  const askedQuestions = new Set(
    history.map(h => h.spokenText?.trim()).filter(Boolean)
  );

  // Rule 3: Misconception priority on turn 0 -> follow-up on turn 1 (if not already probed)
  if (
    turnIndex === 0 &&
    misconception &&
    !probedMisconceptionIds.has(misconception.probe.id) &&
    !askedQuestions.has(misconception.probe.spoken_probe.trim())
  ) {
    const fixedProbe = misconception.probe.spoken_probe;
    return {
      type: 'follow_up',
      spokenQuestion: fixedProbe,
      textQuestion: fixedProbe,
      probedMisconceptionId: misconception.probe.id,
      clipId: `${question.id}_${misconception.probe.id}_p`,
    };
  }

  // Rule 5: If previous turn probed a point or misconception and learner addressed it
  if (turnIndex === 1 && history.length > 0) {
    const lastTurn = history[history.length - 1];
    if (lastTurn.probedPointId) {
      const point = evaluatedPoints.find(p => p.point.id === lastTurn.probedPointId);
      if (point && point.status === 'covered') {
        // Learner clarified probed point! If remaining points are reasonably covered, advance
        const remainingUnaddressed = evaluatedPoints.filter(
          p => p.status === 'not_heard_yet' && !probedPointIds.has(p.point.id)
        );
        if (remainingUnaddressed.length <= 1) {
          return { type: 'debrief' };
        }
      }
    }
  }

  // Rule 4: Probe single most critical unaddressed claim that has NOT already been probed
  const unaddressed = evaluatedPoints.find(
    p => p.status === 'not_heard_yet' &&
         !probedPointIds.has(p.point.id) &&
         !askedQuestions.has(p.point.follow_up_spoken.trim())
  ) || evaluatedPoints.find(
    p => p.status === 'partial' &&
         !probedPointIds.has(p.point.id) &&
         !askedQuestions.has(p.point.follow_up_spoken.trim())
  );

  if (unaddressed) {
    return {
      type: 'follow_up',
      spokenQuestion: unaddressed.point.follow_up_spoken,
      textQuestion: unaddressed.point.follow_up_spoken,
      probedPointId: unaddressed.point.id,
      clipId: `${question.id}_${unaddressed.point.id}_f`,
    };
  }

  // If no unprobed claims remain, move on to debrief
  return { type: 'debrief' };
}

/**
 * Call rule:
 * - 'Strong': candidate covered >= 75% of evaluation points (e.g. 3 of 4, or 4 of 4)
 * - 'Getting there': candidate covered at least 1 evaluation point (between 25% and 74%)
 * - 'Needs work': candidate covered 0 evaluation points (0%)
 */
export function computeOverallCall(
  coveredCount: number,
  totalCount: number
): 'Strong' | 'Getting there' | 'Needs work' {
  if (totalCount === 0 || coveredCount === 0) return 'Needs work';
  const ratio = coveredCount / totalCount;
  if (ratio >= 0.75) return 'Strong';
  return 'Getting there';
}

const POINT_SHORT_LABELS: Record<string, string> = {
  p1_pretraining_scale: 'pre-training at scale',
  p2_downstream_adaptability: 'downstream adaptability',
  p3_scratch_vs_adaptation: 'adapting vs training from scratch',
  p4_engineering_tradeoffs: 'engineering trade-offs',
  p1_knowledge_vs_behavior: 'knowledge vs behavior',
  p2_citations_and_acls: 'citations and access controls',
  p3_maintenance_and_retraining: 'maintenance and retraining',
  p4_combining_both: 'combining RAG and fine-tuning',
  p1_low_rank_decomposition: 'low-rank decomposition',
  p2_optimizer_memory_savings: 'optimizer memory savings',
  p3_zero_latency_merge: 'zero-latency weight merging',
  p4_multi_tenant_adapter_swapping: 'multi-tenant adapter swapping',
  p1_fixed_vs_structure: 'fixed vs structure-aware chunking',
  p2_chunk_size_tradeoff: 'chunk size trade-offs',
  p3_sliding_window_overlap: 'sliding window overlap',
  p4_parent_child_retrieval: 'parent-child retrieval',
  p1_semantic_vs_exact_match: 'semantic vs exact match',
  p2_out_of_vocabulary_handling: 'out-of-vocabulary handling',
  p3_reciprocal_rank_fusion: 'reciprocal rank fusion',
  p4_two_stage_reranking: 'two-stage reranking',
};

/**
 * Returns a short, natural human label for an evaluation point.
 */
export function getPointShortLabel(point: QuestionPoint): string {
  if (POINT_SHORT_LABELS[point.id]) return POINT_SHORT_LABELS[point.id];
  const raw = point.id.replace(/^p\d+_/, '').replace(/_/g, ' ');
  return raw
    .replace(/\brag\b/gi, 'RAG')
    .replace(/\bllm\b/gi, 'LLM')
    .replace(/\bacls?\b/gi, 'ACLs')
    .replace(/\bkv\b/gi, 'KV')
    .replace(/\bdpo\b/gi, 'DPO')
    .replace(/\brlhf\b/gi, 'RLHF')
    .replace(/\bhyde\b/gi, 'HyDE')
    .replace(/\bttft\b/gi, 'TTFT')
    .replace(/\btpot\b/gi, 'TPOT')
    .replace(/\bpeft\b/gi, 'PEFT')
    .replace(/\bpii\b/gi, 'PII')
    .replace(/\bcpu\b/gi, 'CPU')
    .replace(/\bgpu\b/gi, 'GPU');
}

export function getPointShortName(point: QuestionPoint): string {
  return getPointShortLabel(point);
}

export function formatNaturalList(items: string[], conjunction: 'and' | 'or' = 'and'): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, ${conjunction} ${items[items.length - 1]}`;
}

/**
 * Generate debrief scorecard matching the reference mock-up:
 * - Overall call (Strong, Getting there, Needs work) via clear tested rule
 * - Overall summary in natural English prose without semicolon lists or truncated phrases
 * - Next practice topic & action
 * - Signal rows with pre-written rubric text and candidate evidence
 * - Marked transcript
 */
export function generateDebrief(
  question: InterviewRoomQuestion,
  turns: TurnRecord[],
  evaluatedPoints: EvaluatedPoint[]
): QuestionDebrief {
  const allAnswers = turns.map(t => t.learnerAnswer).filter(Boolean).join(' ');
  const coveredPoints = evaluatedPoints.filter(p => p.status === 'covered');
  const notHeardPoints = evaluatedPoints.filter(p => p.status !== 'covered');
  const coveredCount = coveredPoints.length;
  const totalCount = evaluatedPoints.length;

  // 1. Overall call: strictly evaluated via computeOverallCall
  const overallCall = computeOverallCall(coveredCount, totalCount);

  // 2. Build natural prose summary (1-2 sentences, no semicolon lists)
  const coveredLabels = coveredPoints.map(p => getPointShortLabel(p.point));
  const notHeardLabels = notHeardPoints.map(p => getPointShortLabel(p.point));
  const summaryParts: string[] = [];

  if (coveredCount === totalCount) {
    summaryParts.push(
      `You covered all ${totalCount} core dimensions: ${formatNaturalList(coveredLabels)}. Your explanation addressed each key requirement cleanly.`
    );
  } else if (coveredCount > 0) {
    if (notHeardLabels.length > 0) {
      summaryParts.push(
        `You covered ${formatNaturalList(coveredLabels)}, but we did not hear evidence for ${formatNaturalList(notHeardLabels, 'or')}.`
      );
    } else {
      summaryParts.push(
        `You covered ${formatNaturalList(coveredLabels)} with solid technical detail.`
      );
    }
  } else {
    summaryParts.push(
      `You did not address any of the ${totalCount} core evaluation points in your answer, such as ${formatNaturalList(notHeardLabels.slice(0, 2), 'or')}.`
    );
  }

  // Evidence or probes sentence
  const probedMisconceptionTurn = turns.find(t => t.probedMisconceptionId);
  const bestQuotePoint = coveredPoints.find(p => p.evidenceQuote && isValidEvidenceQuote(p.evidenceQuote, p.point.id));

  if (probedMisconceptionTurn) {
    const probe = question.wrong_answer_probes.find(w => w.id === probedMisconceptionTurn.probedMisconceptionId);
    const probeDesc = probe ? `misconception (${probe.misconception})` : 'misconception';
    if (bestQuotePoint?.evidenceQuote) {
      summaryParts.push(
        `Your opening included a ${probeDesc} that was probed in follow-up. Demonstrated evidence heard: "${bestQuotePoint.evidenceQuote.trim()}".`
      );
    } else {
      summaryParts.push(
        `Your opening included a ${probeDesc} that was probed during the interview.`
      );
    }
  } else if (bestQuotePoint?.evidenceQuote) {
    summaryParts.push(
      `Demonstrated evidence heard: "${bestQuotePoint.evidenceQuote.trim()}".`
    );
  } else if (coveredCount === 0) {
    summaryParts.push(
      `No direct evidence or verifiable technical claims were observed in your response.`
    );
  }

  const overallSummary = summaryParts.join(' ');

  // Next practice recommendation from first unaddressed or partial point
  const gapPoint = evaluatedPoints.find(p => p.status === 'not_heard_yet') ||
                   evaluatedPoints.find(p => p.status === 'partial') ||
                   evaluatedPoints[0];

  const practiceTitle = gapPoint.point.next_practice.title;
  const practiceAction = gapPoint.point.next_practice.action;
  const practiceRoute = gapPoint.point.next_practice.route;

  // Signal rows from question.signals rubrics
  const rows: DebriefSignalRow[] = [];

  // 1. Fundamentals
  const p1 = evaluatedPoints.find(p => p.point.id.includes('p1')) || evaluatedPoints[0];
  const p1HasValidQuote = p1?.status === 'covered' && isValidEvidenceQuote(p1.evidenceQuote, p1.point.id);
  const p1Evidence = p1HasValidQuote ? `"${p1.evidenceQuote!.trim()}"` : undefined;
  if (p1?.status === 'covered') {
    rows.push({
      label: 'Fundamentals',
      pill: 'Strong',
      pillClass: 'strong',
      text: question.signals.fundamentals.strong,
      quote: p1Evidence || 'No evidence heard in answer.',
    });
  } else if (p1?.status === 'partial') {
    rows.push({
      label: 'Fundamentals',
      pill: 'Partly there',
      pillClass: 'ok',
      text: question.signals.fundamentals.solid,
      quote: p1Evidence || 'No evidence heard in answer.',
    });
  } else {
    rows.push({
      label: 'Fundamentals',
      pill: 'Not heard yet',
      pillClass: 'gap',
      text: question.signals.fundamentals.weak,
      quote: 'No evidence heard in answer.',
    });
  }

  // 2. Depth when probed: strictly rests ONLY on answers given after a follow-up
  const followUpTurns = turns.filter(t => t.isFollowUp && t.learnerAnswer && t.learnerAnswer.trim().length > 0);
  const followUpText = followUpTurns.map(t => t.learnerAnswer.trim()).join(' ');
  const followUpSentences = splitAnswer(followUpText);

  if (followUpTurns.length > 0) {
    const followUpLower = followUpText.toLowerCase();
    let followUpCoveredPoint = false;
    let matchingProbedSentence: string | undefined;

    for (const sent of followUpSentences) {
      for (const ep of evaluatedPoints) {
        if (isValidEvidenceQuote(sent, ep.point.id)) {
          if (!matchingProbedSentence) {
            matchingProbedSentence = sent;
          }
          const keyTerms = POINT_KEY_TERMS[ep.point.id] || [];
          const matchesInFollowUp = keyTerms.filter(k => followUpLower.includes(k.toLowerCase())).length;
          if (ep.status === 'covered' && matchesInFollowUp >= 2 && guardBuzzwords(followUpText, ep.point.id)) {
            followUpCoveredPoint = true;
          }
        }
      }
    }

    if (matchingProbedSentence) {
      if (followUpCoveredPoint) {
        rows.push({
          label: 'Depth when probed',
          pill: 'Solid',
          pillClass: 'strong',
          text: question.signals.depth_when_probed.solid,
          quote: `"${matchingProbedSentence.trim()}"`,
        });
      } else {
        rows.push({
          label: 'Depth when probed',
          pill: 'Partly there',
          pillClass: 'ok',
          text: question.signals.depth_when_probed.weak,
          quote: `"${matchingProbedSentence.trim()}"`,
        });
      }
    } else {
      // Probed answer did not match any point or key term (noise, unaddressed, or silence)
      rows.push({
        label: 'Depth when probed',
        pill: 'Not heard yet',
        pillClass: 'gap',
        text: question.signals.depth_when_probed.weak,
        quote: 'No evidence heard when probed.',
      });
    }
  } else if (coveredCount === totalCount) {
    rows.push({
      label: 'Depth when probed',
      pill: 'Not probed',
      pillClass: 'strong',
      text: 'Candidate addressed all core points on opening turn without requiring a follow-up probe.',
      quote: 'Not probed — criteria satisfied on opening turn.',
    });
  } else {
    rows.push({
      label: 'Depth when probed',
      pill: 'Not heard yet',
      pillClass: 'gap',
      text: question.signals.depth_when_probed.weak,
      quote: 'No evidence heard when probed.',
    });
  }

  // 3. Trade-offs
  const tradeOffPoint = evaluatedPoints.find(
    p =>
      p.point.id.includes('tradeoff') ||
      p.point.id.includes('trade_off') ||
      p.point.id.includes('engineering_tradeoffs') ||
      p.point.claim.toLowerCase().includes('trade-off') ||
      p.point.claim.toLowerCase().includes('tradeoff') ||
      p.point.id.endsWith('_p4') ||
      p.point.id.includes('p4')
  );

  const sentences = splitAnswer(allAnswers);
  const candidateTradeoffSentence = findSensibleTradeoffSentence(sentences);
  const isCoveredByRubric = tradeOffPoint?.status === 'covered';
  const isPartialByRubric = tradeOffPoint?.status === 'partial';
  const hasSensibleTradeoff = Boolean(candidateTradeoffSentence);

  if (isCoveredByRubric || hasSensibleTradeoff) {
    const quote =
      candidateTradeoffSentence ||
      (isCoveredByRubric && tradeOffPoint?.evidenceQuote ? tradeOffPoint.evidenceQuote : undefined);
    rows.push({
      label: 'Trade-offs',
      pill: 'Strong',
      pillClass: 'strong',
      text: question.signals.trade_offs.strong || 'Evaluates total cost of ownership, cold-start latency, memory constraints, and data governance boundaries.',
      quote: quote ? `"${quote.trim()}"` : 'Demonstrated trade-off in response.',
    });
  } else if (isPartialByRubric) {
    rows.push({
      label: 'Trade-offs',
      pill: 'Partly there',
      pillClass: 'ok',
      text: question.signals.trade_offs.solid,
      quote: tradeOffPoint?.evidenceQuote ? `"${tradeOffPoint.evidenceQuote.trim()}"` : 'No evidence heard in answer.',
    });
  } else {
    rows.push({
      label: 'Trade-offs',
      pill: 'Not heard yet',
      pillClass: 'gap',
      text: question.signals.trade_offs.weak,
      quote: 'No evidence heard in answer.',
    });
  }

  // Marked transcript HTML: highlight strong evidence in green, gaps/misconceptions in amber
  let markedHtml = '';
  for (const sent of sentences) {
    const isCovered = evaluatedPoints.some(p => p.status === 'covered' && p.evidenceQuote?.includes(sent));
    const isPartial = evaluatedPoints.some(p => p.status === 'partial' && p.evidenceQuote?.includes(sent));
    if (isCovered) {
      markedHtml += `<mark>${sent}</mark> `;
    } else if (isPartial) {
      markedHtml += `<mark class="w">${sent}</mark> `;
    } else {
      markedHtml += `${sent} `;
    }
  }

  return {
    overallCall,
    overallSummary,
    practiceTitle,
    practiceAction,
    practiceRoute,
    rows,
    markedAnswerHtml: markedHtml.trim() || allAnswers,
    cleanTranscript: allAnswers,
  };
}

/**
 * Generate session debrief aggregating performance across multiple questions:
 * - One overall call across questions
 * - Cross-question summary highlighting covered concepts and priority gaps
 * - Single priority "Practise this next" link
 * - Preserves detailed per-question record for deep review
 */
export function generateSessionDebrief(
  records: QuestionSessionRecord[]
): SessionDebrief {
  if (records.length === 0) {
    return {
      overallCall: 'Needs work',
      overallSummary: 'No questions were completed in this session.',
      practiceTitle: 'LLM & Foundation Models Quick Reference',
      practiceAction: 'Review foundational concepts and trade-offs before starting an interview round.',
      practiceRoute: '/docs/interview-prep/qa-quick-reference',
      questionDebriefs: [],
    };
  }

  if (records.length === 1) {
    const single = records[0].debrief;
    return {
      overallCall: single.overallCall,
      overallSummary: single.overallSummary,
      practiceTitle: single.practiceTitle,
      practiceAction: single.practiceAction,
      practiceRoute: single.practiceRoute,
      questionDebriefs: records,
    };
  }

  let totalPoints = 0;
  let totalCovered = 0;
  const coveredTopics: string[] = [];
  const missedTopics: string[] = [];

  for (const r of records) {
    const covered = r.evaluatedPoints.filter(p => p.status === 'covered');
    const missed = r.evaluatedPoints.filter(p => p.status !== 'covered');
    totalPoints += r.evaluatedPoints.length;
    totalCovered += covered.length;
    for (const c of covered) coveredTopics.push(getPointShortLabel(c.point));
    for (const m of missed) missedTopics.push(getPointShortLabel(m.point));
  }

  const overallCall = computeOverallCall(totalCovered, totalPoints);
  const qCount = records.length;
  const strongCount = records.filter(r => r.debrief.overallCall === 'Strong').length;

  const summaryParts: string[] = [];
  if (overallCall === 'Strong') {
    summaryParts.push(
      `Strong performance across the session: you answered with authority on ${strongCount} of ${qCount} questions, covering ${totalCovered} of ${totalPoints} technical dimensions.`
    );
    if (coveredTopics.length > 0) {
      summaryParts.push(
        `Demonstrated depth on ${formatNaturalList(coveredTopics.slice(0, 3))}.`
      );
    }
    if (missedTopics.length > 0) {
      summaryParts.push(
        `To reach senior bar, tighten up on ${formatNaturalList(missedTopics.slice(0, 2), 'and')}.`
      );
    }
  } else if (overallCall === 'Getting there') {
    summaryParts.push(
      `You showed working engineering knowledge across ${qCount} questions, covering ${totalCovered} of ${totalPoints} core evaluation criteria.`
    );
    if (coveredTopics.length > 0) {
      summaryParts.push(
        `Clear answers on ${formatNaturalList(coveredTopics.slice(0, 2))}.`
      );
    }
    if (missedTopics.length > 0) {
      summaryParts.push(
        `Focus follow-up practice on ${formatNaturalList(missedTopics.slice(0, 3), 'and')}.`
      );
    }
  } else {
    summaryParts.push(
      `Across ${qCount} questions, your answers remained mostly high-level or ungrounded, covering ${totalCovered} of ${totalPoints} technical criteria.`
    );
    if (missedTopics.length > 0) {
      summaryParts.push(
        `Review the core mechanisms for ${formatNaturalList(missedTopics.slice(0, 3), 'and')}.`
      );
    }
  }

  const prioritizedRecord =
    records.find(r => r.debrief.overallCall === 'Needs work') ||
    records.find(r => r.debrief.overallCall === 'Getting there') ||
    records[0];

  return {
    overallCall,
    overallSummary: summaryParts.join(' '),
    practiceTitle: prioritizedRecord.debrief.practiceTitle,
    practiceAction: prioritizedRecord.debrief.practiceAction,
    practiceRoute: prioritizedRecord.debrief.practiceRoute,
    questionDebriefs: records,
  };
}
