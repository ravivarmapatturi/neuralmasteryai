// Dialogue management, term correction, buzzword guard, and debrief generation
// for the Neural Mastery Interview Room.
// Content and rubrics are AI-written and not expert-reviewed.

import type {
  InterviewRoomQuestion,
  QuestionPoint,
  EvaluatedPoint,
  DetectedMisconception,
  TurnRecord,
  QuestionDebrief,
  DebriefSignalRow,
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
    [/\bxg\s*boost\b/gi, 'XGBoost'],
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
 * A point is not covered by similarity alone unless the answer has substantive length
 * and contains at least one relevant anchor term.
 */
const POINT_KEY_TERMS: Record<string, string[]> = {
  // genai-fm-fundamentals
  p1_pretraining_scale: ['pretrain', 'scale', 'massive', 'broad', 'general', 'large data', 'huge'],
  p2_downstream_adaptability: ['adapt', 'downstream', 'prompt', 'fine-tun', 'transfer', 'base model', 'multiple task'],
  p3_scratch_vs_adaptation: ['scratch', 'bespoke', 'adapt', 'maintain', 'single task', 'specific model'],
  p4_engineering_tradeoffs: ['trade-off', 'cheap', 'cost', 'latency', 'hardware', 'cpu', 'gpu', 'xgboost', 'tabular', 'deterministic'],

  // genai-rag-vs-finetuning
  p1_knowledge_vs_behavior: ['dynamic', 'frequent', 'update', 'style', 'tone', 'format', 'behavior', 'knowledge'],
  p2_freshness_update_speed: ['re-index', 'index', 'retrain', 'expensive', 'fresh', 'daily', 'vector'],
  p3_verifiability_citations: ['citation', 'cite', 'verifi', 'source', 'hallucinat', 'trace', 'access control'],
  p4_combining_both: ['combin', 'hybrid', 'both', 'style', 'document', 'together'],

  // genai-lora-production-serving
  p1_matrix_decomposition: ['freeze', 'matrix', 'matrices', 'rank', 'low-rank', 'decompose', 'delta', 'a and b', 'small'],
  p2_optimizer_memory_savings: ['memory', 'vram', 'optimizer', 'gradient', 'adam', 'footprint', 'saving'],
  p3_zero_latency_merge: ['merge', 'latency', 'inference', 'forward', 'zero', 'base weight', 'add no'],
  p4_multitenant_serving: ['multi-tenant', 'swap', 'dynamic', 'adapter', 'single base', 'multiple adapter', 'serve'],
};

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
  | { type: 'follow_up'; spokenQuestion: string; textQuestion: string; probedPointId?: string; probedMisconceptionId?: string }
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

  // Rule 3: Misconception priority on turn 0 -> follow-up on turn 1
  if (turnIndex === 0 && misconception) {
    return {
      type: 'follow_up',
      spokenQuestion: misconception.spokenQuestion,
      textQuestion: misconception.spokenQuestion,
      probedMisconceptionId: misconception.probe.id,
    };
  }

  // Rule 5: If previous turn probed a point or misconception and learner addressed it
  if (turnIndex === 1 && history.length > 0) {
    const lastTurn = history[history.length - 1];
    if (lastTurn.probedPointId) {
      const point = evaluatedPoints.find(p => p.point.id === lastTurn.probedPointId);
      if (point && point.status === 'covered') {
        // Learner clarified probed point! If remaining points are reasonably covered, advance
        const remainingUnaddressed = evaluatedPoints.filter(p => p.status === 'not_heard_yet');
        if (remainingUnaddressed.length <= 1) {
          return { type: 'debrief' };
        }
      }
    }
  }

  // Rule 4: Probe single most critical unaddressed claim
  const unaddressed = evaluatedPoints.find(p => p.status === 'not_heard_yet') ||
                      evaluatedPoints.find(p => p.status === 'partial');

  if (unaddressed) {
    return {
      type: 'follow_up',
      spokenQuestion: unaddressed.point.follow_up_spoken,
      textQuestion: unaddressed.point.follow_up_spoken,
      probedPointId: unaddressed.point.id,
    };
  }

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

/**
 * Extracts a concise human-readable topic name from a point's claim.
 */
export function getPointShortName(point: QuestionPoint): string {
  const match = point.claim.split(/[,;]|\brather than\b|\binstead of\b/i)[0].trim();
  return match.charAt(0).toLowerCase() + match.slice(1);
}

/**
 * Generate debrief scorecard matching the reference mock-up:
 * - Overall call (Strong, Getting there, Needs work) via clear tested rule
 * - Overall summary built sentence-by-sentence from what actually happened
 * - Next practice topic & action
 * - Signal rows with pre-written rubric text and candidate evidence (or explicit 'No evidence heard')
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

  // 2. Build summary sentence-by-sentence from empirical results:
  // Sentence 1: Points covered
  let sentCovered = '';
  if (coveredCount === totalCount) {
    sentCovered = `You covered all ${totalCount} core dimensions: ${coveredPoints.map(p => getPointShortName(p.point)).join('; ')}.`;
  } else if (coveredCount > 0) {
    sentCovered = `You covered ${coveredCount} of ${totalCount} evaluation points: ${coveredPoints.map(p => getPointShortName(p.point)).join('; ')}.`;
  } else {
    sentCovered = `You did not address any of the ${totalCount} core evaluation points in your answer.`;
  }

  // Sentence 2: Points not heard
  let sentNotHeard = '';
  if (notHeardPoints.length > 0) {
    sentNotHeard = `We did not hear evidence for: ${notHeardPoints.map(p => getPointShortName(p.point)).join('; ')}.`;
  } else {
    sentNotHeard = `No core technical criteria were left unaddressed.`;
  }

  // Sentence 3: Evidence or probes
  let sentEvidence = '';
  const probedMisconceptionTurn = turns.find(t => t.probedMisconceptionId);
  const bestQuotePoint = coveredPoints.find(p => p.evidenceQuote && p.evidenceQuote.trim().length > 0);

  if (probedMisconceptionTurn) {
    const probe = question.wrong_answer_probes.find(w => w.id === probedMisconceptionTurn.probedMisconceptionId);
    const probeDesc = probe ? `misconception (${probe.misconception})` : 'misconception';
    if (bestQuotePoint?.evidenceQuote) {
      sentEvidence = `Your opening included a ${probeDesc} that was probed in follow-up. Demonstrated evidence heard: "${bestQuotePoint.evidenceQuote.trim()}".`;
    } else {
      sentEvidence = `Your opening included a ${probeDesc} that was probed during the interview.`;
    }
  } else if (bestQuotePoint?.evidenceQuote) {
    sentEvidence = `Demonstrated evidence heard: "${bestQuotePoint.evidenceQuote.trim()}".`;
  } else if (coveredCount === 0) {
    sentEvidence = `No direct evidence or verifiable technical claims were observed in your response.`;
  }

  const overallSummary = [sentCovered, sentNotHeard, sentEvidence].filter(Boolean).join(' ');

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
  const p1Evidence = p1?.evidenceQuote ? `"${p1.evidenceQuote.trim()}"` : undefined;
  if (p1?.status === 'covered') {
    rows.push({
      label: 'Fundamentals',
      pill: 'Strong',
      pillClass: 'strong',
      text: question.signals.fundamentals.strong,
      quote: p1Evidence,
    });
  } else if (p1?.status === 'partial') {
    rows.push({
      label: 'Fundamentals',
      pill: 'Partly there',
      pillClass: 'ok',
      text: question.signals.fundamentals.solid,
      quote: p1Evidence || 'No direct evidence heard in answer.',
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

  // 2. Depth when probed
  const probedTurns = turns.filter(t => t.isFollowUp && t.learnerAnswer.trim().length > 0);
  const probedQuote = probedTurns.length > 0 ? `"${probedTurns[0].learnerAnswer.trim().slice(0, 120)}..."` : undefined;

  if (probedTurns.length > 0) {
    if (coveredCount >= 2) {
      rows.push({
        label: 'Depth when probed',
        pill: 'Solid',
        pillClass: 'strong',
        text: question.signals.depth_when_probed.solid,
        quote: probedQuote,
      });
    } else {
      rows.push({
        label: 'Depth when probed',
        pill: 'Partly there',
        pillClass: 'ok',
        text: question.signals.depth_when_probed.weak,
        quote: probedQuote || 'No substantive evidence heard when probed.',
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
  const tradeOffPoint = evaluatedPoints.find(p => p.point.id.includes('tradeoffs') || p.point.id.includes('p4') || p.point.id.includes('p2'));
  const tradeOffQuote = tradeOffPoint?.evidenceQuote ? `"${tradeOffPoint.evidenceQuote.trim()}"` : undefined;
  if (tradeOffPoint?.status === 'covered') {
    rows.push({
      label: 'Trade-offs',
      pill: 'Strong',
      pillClass: 'strong',
      text: question.signals.trade_offs.strong,
      quote: tradeOffQuote,
    });
  } else if (tradeOffPoint?.status === 'partial') {
    rows.push({
      label: 'Trade-offs',
      pill: 'Partly there',
      pillClass: 'ok',
      text: question.signals.trade_offs.solid,
      quote: tradeOffQuote || 'No direct evidence heard in answer.',
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
  const sentences = splitAnswer(allAnswers);
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
